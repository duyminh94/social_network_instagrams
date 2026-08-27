// adminController.js
// Các chức năng quản trị viên: quản lý user, xử lý báo cáo, xóa nội dung vi phạm, xem logs/stats
//
// Middleware adminAuth.js kiểm tra role admin trước khi vào đây
// Roles: 'moderator' | 'super_admin'
// super_admin toàn quyền; moderator chỉ xử lý report/nội dung vi phạm
//
// Mọi hành động admin đều được ghi log vào AdminLog (logAction)
// Log dùng để kiểm soát lạm quyền và truy vết sự cố
//
// isTrusted = tick xanh xác thực tài khoản (do admin cấp, không tự xin được)
// isBanned = khóa tài khoản vĩnh viễn, không đăng nhập lại được

const User = require('../models/User');
const Post = require('../models/Post');
const PostMedia = require('../models/PostMedia');
const { getPagination } = require('../utils/pagination');
const Reel = require('../models/Reel');
const Comment = require('../models/Comment');
const ReelComment = require('../models/ReelComment');
const Like = require('../models/Like');
const Report = require('../models/Report');
const AdminLog = require('../models/AdminLog');
const Story = require('../models/Story');
const StoryLike = require('../models/StoryLike');
const StoryComment = require('../models/StoryComment');
const UserChangeLog = require('../models/UserChangeLog');
const VerificationRequest = require('../models/VerificationRequest');
const { createNotification } = require('../utils/notification');
const { sendBanNotificationEmail } = require('../utils/mailer');

// Gửi email báo khóa tài khoản + hướng dẫn kháng cáo — KHÔNG chặn luồng ban nếu mail lỗi
async function notifyBanByEmail(user, reason) {
  if (!user || !user.email) return;
  try {
    await sendBanNotificationEmail(user.email, user.username, reason);
  } catch (mailErr) {
    console.warn('Gửi email khóa tài khoản thất bại:', mailErr.message);
  }
}

// Ghi lại hành động admin vào AdminLog để kiểm soát lạm quyền
async function logAction(adminUserId, action, targetId, targetType, note) {
  await AdminLog.create({
    adminId: adminUserId,
    action: action,
    targetId: targetId || null,
    targetType: targetType || '',
    note: note || '',
  });
}

// GET /api/admin/users?page=&limit=&q=&isBanned=
// q: tìm theo username/email/fullName
// isBanned: lọc 'true'/'false' hoặc để trống để lấy tất cả
async function getUsers(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 20);
    var filter = {};

    if (req.query.isBanned === 'true') { filter.isBanned = true; }
    else if (req.query.isBanned === 'false') { filter.isBanned = false; }

    if (req.query.q) {
      filter.$or = [
        { username: { $regex: req.query.q, $options: 'i' } },
        { email: { $regex: req.query.q, $options: 'i' } },
        { fullName: { $regex: req.query.q, $options: 'i' } },
      ];
    }

    var total = await User.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({ users, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

async function getUserReportedTargetFilter(userId) {
  var ids = await Promise.all([
    Post.find({ userId: userId }).distinct('_id'),
    Reel.find({ userId: userId }).distinct('_id'),
    Story.find({ userId: userId }).distinct('_id'),
    Comment.find({ userId: userId }).distinct('_id'),
  ]);

  return {
    $or: [
      { targetType: 'user', targetId: userId },
      { targetType: 'post', targetId: { $in: ids[0] } },
      { targetType: 'reel', targetId: { $in: ids[1] } },
      { targetType: 'story', targetId: { $in: ids[2] } },
      { targetType: 'comment', targetId: { $in: ids[3] } },
    ],
  };
}

// GET /api/admin/users/:id
async function getUserDetail(req, res, next) {
  try {
    var user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    var reportedTargetFilter = await getUserReportedTargetFilter(user._id);
    var counts = await Promise.all([
      Post.countDocuments({ userId: user._id, isDeleted: false }),
      Like.countDocuments({ userId: user._id, targetType: 'post' }),
      Comment.countDocuments({ userId: user._id, isDeleted: false }),
      Story.countDocuments({ userId: user._id, isDeleted: false }),
      StoryLike.countDocuments({ userId: user._id }),
      StoryComment.countDocuments({ userId: user._id, isDeleted: false }),
      Reel.countDocuments({ userId: user._id, isDeleted: false }),
      Like.countDocuments({ userId: user._id, targetType: 'reel' }),
      ReelComment.countDocuments({ userId: user._id, isDeleted: false }),
      UserChangeLog.countDocuments({ userId: user._id }),
      Report.countDocuments({ reporterId: user._id }),
      Report.countDocuments(reportedTargetFilter),
    ]);

    return res.json({
      user: user,
      activityCounts: {
        posts: { posted: counts[0], liked: counts[1], commented: counts[2] },
        stories: { posted: counts[3], liked: counts[4], commented: counts[5] },
        reels: { posted: counts[6], liked: counts[7], commented: counts[8] },
        changes: counts[9],
        reports: { reported: counts[10], reportedBy: counts[11] },
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function logUserChange(userId, changeType, oldValue, newValue, changedBy) {
  await UserChangeLog.create({
    userId: userId,
    changeType: changeType,
    oldValue: String(oldValue ?? ''),
    newValue: String(newValue ?? ''),
    changedBy: changedBy,
    source: 'admin',
  });
}

function toContentItem(content, contentType, media) {
  return {
    _id: content._id,
    contentType: contentType,
    caption: content.caption || '',
    mediaUrl: contentType === 'reel' ? content.videoUrl : (contentType === 'story' ? content.mediaUrl : (media?.url || '')),
    thumbnailUrl: contentType === 'post' ? (media?.thumbnailUrl || '') : '',
    mediaType: contentType === 'reel' ? 'video' : (contentType === 'story' ? content.mediaType : (media?.mediaType || content.type || 'image')),
    likesCount: content.likesCount || 0,
    commentsCount: content.commentsCount || 0,
    viewsCount: content.viewsCount || 0,
    createdAt: content.createdAt,
  };
}

async function attachContentDetails(rows) {
  var postIds = rows.filter(function (row) { return row.contentType === 'post'; }).map(function (row) { return row.contentId; });
  var reelIds = rows.filter(function (row) { return row.contentType === 'reel'; }).map(function (row) { return row.contentId; });
  var storyIds = rows.filter(function (row) { return row.contentType === 'story'; }).map(function (row) { return row.contentId; });

  var results = await Promise.all([
    Post.find({ _id: { $in: postIds }, isDeleted: false }).lean(),
    Reel.find({ _id: { $in: reelIds }, isDeleted: false }).lean(),
    PostMedia.find({ postId: { $in: postIds } }).sort({ displayOrder: 1 }).lean(),
    Story.find({ _id: { $in: storyIds }, isDeleted: false }).lean(),
  ]);
  var postMap = {};
  var reelMap = {};
  var mediaMap = {};
  var storyMap = {};

  results[0].forEach(function (item) { postMap[item._id.toString()] = item; });
  results[1].forEach(function (item) { reelMap[item._id.toString()] = item; });
  results[2].forEach(function (item) {
    var key = item.postId.toString();
    if (!mediaMap[key]) mediaMap[key] = item;
  });
  results[3].forEach(function (item) { storyMap[item._id.toString()] = item; });

  return rows.map(function (row) {
    var key = row.contentId.toString();
    var content = row.contentType === 'reel' ? reelMap[key] : (row.contentType === 'story' ? storyMap[key] : postMap[key]);
    if (!content) return null;
    return Object.assign({}, row, { content: toContentItem(content, row.contentType, mediaMap[key]) });
  }).filter(Boolean);
}

async function getUserActivity(req, res, next) {
  try {
    var user = await User.findById(req.params.id).select('_id');
    if (!user) return res.status(404).json({ message: 'Khong tim thay user' });

    var contentType = req.query.contentType;
    var action = req.query.action;
    var page = Math.max(parseInt(req.query.page) || 1, 1);
    var limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    var skip = (page - 1) * limit;
    var total = 0;
    var rows = [];

    if (contentType === 'changes') {
      total = await UserChangeLog.countDocuments({ userId: user._id });
      var changes = await UserChangeLog.find({ userId: user._id })
        .sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('changedBy', 'username fullName').lean();
      return res.json({ items: changes, page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit) });
    }

    if (contentType === 'reports') {
      if (!['reported', 'reportedBy'].includes(action)) {
        return res.status(400).json({ message: 'action khong hop le' });
      }
      var reportFilter = action === 'reported'
        ? { reporterId: user._id }
        : await getUserReportedTargetFilter(user._id);
      total = await Report.countDocuments(reportFilter);
      var reports = await Report.find(reportFilter)
        .sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('reporterId', 'username fullName email avatarUrl').lean();
      await attachReportedUsers(reports);
      return res.json({ items: reports, page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit) });
    }

    var configs = {
      post: { model: Post, likeModel: Like, likeFilter: { targetType: 'post' }, likeIdField: 'targetId', commentModel: Comment, commentIdField: 'postId' },
      story: { model: Story, likeModel: StoryLike, likeFilter: {}, likeIdField: 'storyId', commentModel: StoryComment, commentIdField: 'storyId' },
      reel: { model: Reel, likeModel: Like, likeFilter: { targetType: 'reel' }, likeIdField: 'targetId', commentModel: ReelComment, commentIdField: 'reelId' },
    };
    var config = configs[contentType];
    if (!config || !['posted', 'liked', 'commented'].includes(action)) {
      return res.status(400).json({ message: 'contentType hoac action khong hop le' });
    }

    if (action === 'posted') {
      var postedFilter = { userId: user._id, isDeleted: false };
      total = await config.model.countDocuments(postedFilter);
      var posted = await config.model.find(postedFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
      rows = posted.map(function (item) {
        return { _id: item._id, contentId: item._id, contentType: contentType, createdAt: item.createdAt };
      });
    } else if (action === 'liked') {
      var likeFilter = Object.assign({ userId: user._id }, config.likeFilter);
      total = await config.likeModel.countDocuments(likeFilter);
      var likes = await config.likeModel.find(likeFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
      rows = likes.map(function (item) {
        return { _id: item._id, contentId: item[config.likeIdField], contentType: contentType, createdAt: item.createdAt };
      });
    } else {
      var commentFilter = { userId: user._id, isDeleted: false };
      total = await config.commentModel.countDocuments(commentFilter);
      var comments = await config.commentModel.find(commentFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
      rows = comments.map(function (item) {
        return { _id: item._id, contentId: item[config.commentIdField], contentType: contentType, commentText: item.content, createdAt: item.createdAt };
      });
    }

    var items = await attachContentDetails(rows);
    return res.json({ items: items, page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/admin/users/:id/ban
// Sau khi ban: user không đăng nhập được nữa (middleware auth.js kiểm tra isBanned)
// Gửi thông báo để user biết tài khoản bị khóa
async function banUser(req, res, next) {
  try {
    var user = await User.findById(req.params.id);
    if (!user) { return res.status(404).json({ message: 'Không tìm thấy user' }); }
    if (req.user.id === req.params.id) { return res.status(400).json({ message: 'Không thể tự ban tài khoản của mình' }); }
    if (req.user.role === 'moderator' && user.role !== 'user') {
      return res.status(403).json({ message: 'Moderator chỉ được ban tài khoản user thường' });
    }
    if (user.isBanned) { return res.status(400).json({ message: 'Tài khoản đã bị ban rồi' }); }

    user.isBanned = true;
    await user.save();

    await logAction(req.user.id, 'ban_user', req.params.id, 'user', req.body.note || '');
    await logUserChange(user._id, 'banned', false, true, req.user.id);
    await createNotification(req.params.id, req.user.id, 'account_banned', null, '');
    // Gửi email báo lý do bị khóa + cho phép trả lời để kháng cáo
    await notifyBanByEmail(user, req.body.note);

    return res.json({ message: 'Đã ban tài khoản' });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/admin/users/:id/unban
async function unbanUser(req, res, next) {
  try {
    var user = await User.findById(req.params.id);
    if (!user) { return res.status(404).json({ message: 'Không tìm thấy user' }); }
    if (!user.isBanned) { return res.status(400).json({ message: 'Tài khoản chưa bị ban' }); }

    user.isBanned = false;
    await user.save();

    await logAction(req.user.id, 'unban_user', req.params.id, 'user', req.body.note || '');
    await logUserChange(user._id, 'unbanned', true, false, req.user.id);

    return res.json({ message: 'Đã gỡ ban tài khoản' });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/admin/users/:id/trust — cấp tick xanh
async function trustUser(req, res, next) {
  try {
    var user = await User.findById(req.params.id);
    if (!user) { return res.status(404).json({ message: 'Không tìm thấy user' }); }

    user.isTrusted = true;
    await user.save();
    await logAction(req.user.id, 'trust_user', req.params.id, 'user', '');
    await logUserChange(user._id, 'verified', false, true, req.user.id);

    return res.json({ message: 'Đã cấp tick xanh' });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/admin/users/:id/untrust — thu hồi tick xanh
async function untrustUser(req, res, next) {
  try {
    var reason = String(req.body.reason || '').trim();
    var user = await User.findById(req.params.id);
    if (!user) { return res.status(404).json({ message: 'Không tìm thấy user' }); }

    user.isTrusted = false;
    await user.save();
    await logAction(req.user.id, 'untrust_user', req.params.id, 'user', reason);
    await logUserChange(user._id, 'verification_revoked', true, false, req.user.id);
    // Gửi thông báo cho user kèm lý do thu hồi
    await createNotification(req.params.id, req.user.id, 'verification_revoked', null, '', reason);

    return res.json({ message: 'Đã thu hồi tick xanh' });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/admin/users/:id/role
// Các role hợp lệ: 'user' | 'moderator' | 'super_admin'
async function updateRole(req, res, next) {
  try {
    var newRole = req.body.role;
    if (!['user', 'moderator', 'super_admin'].includes(newRole)) {
      return res.status(400).json({ message: 'Role không hợp lệ. Chỉ chấp nhận: user, moderator, super_admin' });
    }

    var user = await User.findById(req.params.id);
    if (!user) { return res.status(404).json({ message: 'Không tìm thấy user' }); }

    user.role = newRole;
    await user.save();
    await logAction(req.user.id, 'update_role', req.params.id, 'user', 'role: ' + newRole);

    return res.json({ message: 'Đã cập nhật role', role: user.role });
  } catch (error) {
    return next(error);
  }
}

async function getReportedUserId(report) {
  if (report.targetType === 'user') return report.targetId;

  var modelMap = {
    post: Post,
    reel: Reel,
    story: Story,
    comment: Comment,
  };
  var model = modelMap[report.targetType];
  if (!model) return null;
  var target = await model.findById(report.targetId).select('userId').lean();
  return target?.userId || null;
}

async function attachReportedUsers(reports) {
  var reportedUserIds = await Promise.all(reports.map(getReportedUserId));
  var users = await User.find({ _id: { $in: reportedUserIds.filter(Boolean) } })
    .select('username fullName email avatarUrl isBanned isTrusted').lean();
  var userMap = {};
  users.forEach(function (user) { userMap[user._id.toString()] = user; });
  reports.forEach(function (report, index) {
    var userId = reportedUserIds[index];
    report.reportedUser = userId ? (userMap[userId.toString()] || null) : null;
  });
  return reports;
}

// Report do AI tự quét không có reporterId → gắn "người báo cáo" ảo tên AI
// để admin nhìn rõ là báo cáo tự động. Không có _id nên frontend không cho click sang user.
function attachAiReporter(reports) {
  reports.forEach(function (report) {
    if (!report.reporterId && report.isAuto) {
      report.reporterId = { username: 'AI', fullName: 'AI', avatarUrl: null };
    }
  });
  return reports;
}

// GET /api/admin/reports?status=&targetType=&page=
// status: 'pending' | 'resolved' | 'dismissed'
async function getReports(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 20);
    var filter = {};

    var statusFilter = req.query.status || 'pending';
    if (statusFilter === 'pending') filter.status = 'pending';
    else if (statusFilter === 'processed') filter.status = { $in: ['resolved', 'dismissed'] };
    if (req.query.targetType) { filter.targetType = req.query.targetType; }

    var total = await Report.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporterId', 'username fullName email avatarUrl')
      .populate('reviewedBy', 'username fullName email avatarUrl')
      .lean();
    await attachReportedUsers(reports);
    attachAiReporter(reports);

    return res.json({ reports, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

async function getReportDetail(req, res, next) {
  try {
    var report = await Report.findById(req.params.id)
      .populate('reporterId', 'username fullName email avatarUrl isTrusted')
      .populate('reviewedBy', 'username fullName email avatarUrl')
      .lean();
    if (!report) return res.status(404).json({ message: 'Không tìm thấy báo cáo' });

    await attachReportedUsers([report]);
    attachAiReporter([report]);
    return res.json({ report: report });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/admin/reports/:id
// Body: { action: 'resolve'|'dismiss', deleteContent?: boolean }
// FIX: frontend gửi 'action' nhưng backend cũ đọc 'status' → không khớp
// FIX: xử lý deleteContent: true để xóa nội dung bị báo cáo (chỉ hỗ trợ post)
// Chỉ xử lý được report đang ở status 'pending'
async function handleReport(req, res, next) {
  try {
    var resolutionAction = req.body.resolutionAction;
    var resolutionNote = String(req.body.resolutionNote || '').trim();
    var validActions = ['no_action', 'hide_content', 'ban_user', 'hide_and_ban'];
    if (!validActions.includes(resolutionAction)) {
      return res.status(400).json({ message: 'Loại xử lý không hợp lệ' });
    }
    if (!resolutionNote) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung xử lý báo cáo' });
    }

    var report = await Report.findById(req.params.id);
    if (!report) { return res.status(404).json({ message: 'Không tìm thấy báo cáo' }); }
    if (report.status !== 'pending') { return res.status(400).json({ message: 'Báo cáo này đã được xử lý rồi' }); }

    var reportedUserId = await getReportedUserId(report);
    var shouldHide = ['hide_content', 'hide_and_ban'].includes(resolutionAction);
    var shouldBan = ['ban_user', 'hide_and_ban'].includes(resolutionAction);
    var contentModels = { post: Post, reel: Reel, story: Story };
    var contentModel = contentModels[report.targetType];

    if (shouldHide && !contentModel) {
      return res.status(400).json({ message: 'Loại báo cáo này không có nội dung để ẩn' });
    }
    if (shouldBan && !reportedUserId) {
      return res.status(400).json({ message: 'Không tìm thấy tài khoản cần khóa' });
    }

    var reportedUser = null;
    if (shouldBan) {
      reportedUser = await User.findById(reportedUserId);
      if (!reportedUser) return res.status(404).json({ message: 'Không tìm thấy tài khoản cần khóa' });
      if (reportedUser._id.toString() === req.user.id) {
        return res.status(400).json({ message: 'Không thể tự khóa tài khoản của mình' });
      }
      if (req.user.role === 'moderator' && reportedUser.role !== 'user') {
        return res.status(403).json({ message: 'Moderator chỉ được khóa tài khoản user thường' });
      }
    }

    if (shouldHide) {
      var content = await contentModel.findById(report.targetId);
      if (!content) return res.status(404).json({ message: 'Không tìm thấy nội dung bị báo cáo' });
      if (!content.isDeleted) {
        content.isDeleted = true;
        if ('deletedBy' in content) content.deletedBy = req.user.id;
        await content.save();
        if (report.targetType === 'post') {
          await User.findByIdAndUpdate(content.userId, { $inc: { postsCount: -1 } });
        }
      }
    }

    if (shouldBan) {
      if (!reportedUser.isBanned) {
        reportedUser.isBanned = true;
        await reportedUser.save();
        await logUserChange(reportedUser._id, 'banned', false, true, req.user.id);
        await createNotification(reportedUser._id, req.user.id, 'account_banned', null, '', resolutionNote);
        // Gửi email báo lý do bị khóa (dùng nội dung xử lý báo cáo) + cho kháng cáo
        await notifyBanByEmail(reportedUser, resolutionNote);
      }
    }

    report.status = 'resolved';
    report.reviewedBy = req.user.id;
    report.resolutionAction = resolutionAction;
    report.resolutionNote = resolutionNote;
    report.reviewedAt = new Date();
    await report.save();

    await logAction(req.user.id, 'handle_report', report._id, 'report', resolutionNote);

    return res.json({ message: 'Đã xử lý báo cáo', report });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/admin/posts/:id — xóa mềm bài vi phạm, thông báo cho chủ bài
// FIX: thêm giảm postsCount — user-side delete có làm điều này nhưng admin-side không
async function deletePost(req, res, next) {
  try {
    var post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) { return res.status(404).json({ message: 'Không tìm thấy bài viết' }); }

    post.isDeleted = true;
    post.deletedBy = req.user.id;
    await post.save();

    // Giảm postsCount trên User — giữ đồng bộ với số bài thực tế
    await User.findByIdAndUpdate(post.userId, { $inc: { postsCount: -1 } });

    await logAction(req.user.id, 'delete_post', req.params.id, 'post', req.body.note || '');
    await createNotification(post.userId, req.user.id, 'post_removed', post._id, 'post');

    return res.json({ message: 'Đã xóa bài viết' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/admin/comments/:id
// FIX: thêm giảm commentsCount trên bài viết cha
async function deleteComment(req, res, next) {
  try {
    var comment = await Comment.findById(req.params.id);
    if (!comment || comment.isDeleted) { return res.status(404).json({ message: 'Không tìm thấy comment' }); }

    comment.isDeleted = true;
    comment.deletedBy = req.user.id;
    await comment.save();

    // Giảm commentsCount — chỉ giảm nếu là comment gốc (parentId = null)
    // commentsCount trên Post chỉ đếm top-level comment, không đếm reply
    if (comment.postId && !comment.parentId) {
      await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
    }

    await logAction(req.user.id, 'delete_comment', req.params.id, 'comment', req.body.note || '');

    return res.json({ message: 'Đã xóa comment' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/admin/stories/:id
async function deleteStory(req, res, next) {
  try {
    var story = await Story.findById(req.params.id);
    if (!story || story.isDeleted) { return res.status(404).json({ message: 'Không tìm thấy story' }); }

    story.isDeleted = true;
    await story.save();

    await logAction(req.user.id, 'delete_story', req.params.id, 'story', req.body.note || '');

    return res.json({ message: 'Đã xóa story' });
  } catch (error) {
    return next(error);
  }
}

// GET /api/admin/logs?page=&limit=&adminId=&action=
// Lọc theo adminId hoặc loại action để kiểm tra hành vi của từng admin
async function getLogs(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 30);
    var filter = {};

    if (req.query.adminId) { filter.adminId = req.query.adminId; }
    if (req.query.action) { filter.action = req.query.action; }

    var total = await AdminLog.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var logs = await AdminLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('adminId', 'username email');

    return res.json({ logs, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// GET /api/admin/stats — thống kê tổng quan cho dashboard admin
async function getStats(req, res, next) {
  try {
    var totalUsers = await User.countDocuments();
    var bannedUsers = await User.countDocuments({ isBanned: true });
    var trustedUsers = await User.countDocuments({ isTrusted: true });
    var totalPosts = await Post.countDocuments({ isDeleted: false });
    var pendingReports = await Report.countDocuments({ status: 'pending' });
    var totalReports = await Report.countDocuments();

    return res.json({
      users: { total: totalUsers, banned: bannedUsers, trusted: trustedUsers },
      content: { posts: totalPosts },
      reports: { total: totalReports, pending: pendingReports },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/admin/verifications?status=&page=&limit=
// status: 'pending' (mặc định) | 'processed' (approved + rejected)
async function getVerificationRequests(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 20);
    var filter = {};

    var statusFilter = req.query.status || 'pending';
    if (statusFilter === 'pending') filter.status = 'pending';
    else if (statusFilter === 'processed') filter.status = { $in: ['approved', 'rejected'] };

    var total = await VerificationRequest.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var requests = await VerificationRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName email avatarUrl isTrusted')
      .populate('reviewedBy', 'username fullName email avatarUrl')
      .lean();

    return res.json({ requests, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/admin/verifications/:id
// Body: { action: 'approve'|'reject', note? }
// approve → set user.isTrusted = true. Chỉ xử lý được yêu cầu đang 'pending'.
async function handleVerificationRequest(req, res, next) {
  try {
    var action = req.body.action;
    var note = String(req.body.note || '').trim();
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ message: 'Hành động không hợp lệ (approve hoặc reject)' });
    }

    var request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu này đã được xử lý' });
    }

    request.status = action === 'approve' ? 'approved' : 'rejected';
    request.reviewedBy = req.user.id;
    request.reviewNote = note;
    request.reviewedAt = new Date();
    await request.save();

    if (action === 'approve') {
      // Cấp tích xanh cho user (dùng chung cơ chế với trustUser)
      var user = await User.findById(request.userId);
      if (user && !user.isTrusted) {
        user.isTrusted = true;
        await user.save();
        await logUserChange(user._id, 'verified', false, true, req.user.id);
      }
      await logAction(req.user.id, 'approve_verification', request._id, 'verification', note);
      await createNotification(request.userId, req.user.id, 'verification_approved', request._id, 'verification');
      return res.json({ message: 'Đã duyệt và cấp tích xanh' });
    }

    // Từ chối
    await logAction(req.user.id, 'reject_verification', request._id, 'verification', note);
    await createNotification(request.userId, req.user.id, 'verification_rejected', request._id, 'verification');
    return res.json({ message: 'Đã từ chối yêu cầu' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUsers, getUserDetail, getUserActivity,
  banUser, unbanUser,
  trustUser, untrustUser, updateRole,
  getReports, getReportDetail, handleReport,
  getVerificationRequests, handleVerificationRequest,
  deletePost, deleteComment, deleteStory,
  getLogs, getStats,
};
