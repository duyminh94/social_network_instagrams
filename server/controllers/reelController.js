// controllers/reelController.js
// CRUD cho Reel — lưu riêng trong collection 'reels', tách khỏi 'posts'
//
// createReel: upload video lên Cloudinary (fallback local), lưu Reel document
// getReels:   danh sách reels công khai, sort createdAt mới nhất trước
//             → không sort theo likes để reel mới không bị chìm

const mongoose = require('mongoose');
const { getPagination } = require('../utils/pagination');
const Reel = require('../models/Reel');
const ReelView = require('../models/ReelView');
const ReelComment = require('../models/ReelComment');
const Like = require('../models/Like');
const User = require('../models/User');
const Block = require('../models/Block');
const Follow = require('../models/Follow');
const Report = require('../models/Report');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { autoModerate } = require('../utils/autoModerate');
const { extractHashtags } = require('../utils/hashtags');

// POST /api/reels
async function createReel(req, res, next) {
  try {
    const videoFile = req.files?.media?.[0];
    const audioFile = req.files?.audio?.[0];

    if (!videoFile) {
      return res.status(400).json({ message: 'Chưa chọn video' });
    }

    const { caption, filter, trimStart, trimEnd, duration, audioName } = req.body;

    const [videoResult, owner] = await Promise.all([
      uploadToCloudinary(videoFile.buffer, 'reels', videoFile.mimetype),
      User.findById(req.user.id).select('isPrivate'),
    ]);

    let audioUrl = '';
    if (audioFile) {
      const audioResult = await uploadToCloudinary(audioFile.buffer, 'reels/audio', audioFile.mimetype);
      audioUrl = audioResult.secure_url;
    } else if (req.body.presetAudioUrl) {
      audioUrl = req.body.presetAudioUrl;
    }

    const reel = await Reel.create({
      userId:    req.user.id,
      videoUrl:  videoResult.secure_url,
      audioUrl,
      audioName: audioName || '',
      filter:    filter || '',
      trimStart: parseFloat(trimStart) || 0,
      trimEnd:   trimEnd ? parseFloat(trimEnd) : null,
      duration:  duration ? parseFloat(duration) : null,
      caption:   caption || '',
      hashtags:  extractHashtags(caption),
      isPrivate: owner?.isPrivate || false,
    });

    // Kiểm duyệt caption reel tự động — fire-and-forget, không chặn đăng
    autoModerate(reel.caption, 'reel', reel._id);

    const creator = await User.findById(req.user.id).select('username fullName avatarUrl isTrusted');
    const reelObj = reel.toObject();
    reelObj.user = creator.toObject();

    res.status(201).json({ message: 'Đăng reel thành công', reel: reelObj });
  } catch (error) {
    next(error);
  }
}

// GET /api/reels?page=&limit=
// optionalAuth — viewerId có thể null
// Helper: dựng tín hiệu "thích xem" của user từ ReelView (completed = đã xem hết)
//   affinityAuthorIds: tác giả của các reel user xem hết → ưu tiên reel cùng tác giả
//   collabReelIds:     reel mà "người xem giống mình" cũng xem hết → gợi ý nội dung tương tự
async function buildWatchSignals(viewerId) {
  const myViews = await ReelView.find({ userId: viewerId, completed: true }).select('reelId').lean();
  const watchedReelIds = myViews.map(function (v) { return v.reelId.toString(); });
  if (watchedReelIds.length === 0) {
    return { affinityAuthorIds: [], collabReelIds: [] };
  }

  // (A) Cùng tác giả: tác giả của các reel mình xem hết
  const watchedReels = await Reel.find({ _id: { $in: watchedReelIds } }).select('userId').lean();
  const affinityAuthorIds = Array.from(new Set(watchedReels.map(function (r) { return r.userId.toString(); })));

  // (B) Collaborative: ai cũng xem hết các reel đó → họ còn xem hết reel nào nữa
  const coViews = await ReelView.find({
    reelId:    { $in: watchedReelIds },
    completed: true,
    userId:    { $ne: viewerId },
  }).select('userId').lean();
  const coViewerIds = Array.from(new Set(coViews.map(function (v) { return v.userId.toString(); })));

  let collabReelIds = [];
  if (coViewerIds.length > 0) {
    const coViewerViews = await ReelView.find({
      userId:    { $in: coViewerIds },
      completed: true,
    }).select('reelId').lean();
    const watchedSet = new Set(watchedReelIds);
    collabReelIds = Array.from(new Set(coViewerViews.map(function (v) { return v.reelId.toString(); })))
      .filter(function (id) { return !watchedSet.has(id); }); // bỏ reel mình đã xem hết
  }

  return { affinityAuthorIds, collabReelIds };
}

async function getReels(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 15);
    const viewerId = req.user?.id || null;

    // Block check + private account list + banned + reel bị AI flag — chạy song song
    const [blocksRaw, privateUsers, bannedUsers, autoFlaggedReports] = await Promise.all([
      viewerId ? Block.find({ $or: [{ blockerId: viewerId }, { blockedId: viewerId }] }).lean() : [],
      User.find({ isPrivate: true }).select('_id').lean(),
      // Tài khoản bị khoá (ban) → ẩn reel của họ, đồng bộ với Story/feed Post
      User.find({ isBanned: true }).select('_id').lean(),
      // Gate chủ động: reel có report tự động (AI) đang chờ duyệt → ẩn khỏi feed công khai.
      // Khi admin dismiss/resolve (status đổi khỏi 'pending') thì reel hiện lại / hoặc bị isDeleted.
      Report.find({ targetType: 'reel', isAuto: true, status: 'pending' }).select('targetId').lean(),
    ]);

    const flaggedReelIds = autoFlaggedReports.map(function (r) { return r.targetId.toString(); });

    const blockedIds = blocksRaw.map(function (b) {
      return b.blockerId.toString() === viewerId ? b.blockedId.toString() : b.blockerId.toString();
    });

    // IDs bị ẩn: tài khoản bị block + tài khoản riêng tư (trừ chính viewer)
    const privateIds = privateUsers
      .map(function (u) { return u._id.toString(); })
      .filter(function (id) { return id !== viewerId; });

    const bannedIds = bannedUsers.map(function (u) { return u._id.toString(); });

    const excludeIds = Array.from(new Set([...blockedIds, ...privateIds, ...bannedIds]));

    // Feed công khai: chỉ reel isPrivate=false; viewer luôn thấy reel của chính mình
    const orConditions = [{ isPrivate: false }];
    if (viewerId) orConditions.push({ userId: viewerId });

    const reelFilter = {
      isDeleted: false,
      $or: orConditions,
    };

    if (excludeIds.length > 0) {
      reelFilter.userId = { $nin: excludeIds };
    }

    // Ẩn reel đang bị AI flag (pending) khỏi feed công khai
    if (flaggedReelIds.length > 0) {
      reelFilter._id = { $nin: flaggedReelIds };
    }

    const total      = await Reel.countDocuments(reelFilter);
    const totalPages = Math.ceil(total / limit);

    // ── Cá nhân hoá theo "thích xem" + follow (chỉ khi đã đăng nhập) ──
    let affinityAuthorIds = [];
    let collabReelIds = [];
    let followingIds = [];
    if (viewerId) {
      const [signals, follows] = await Promise.all([
        buildWatchSignals(viewerId),
        Follow.find({ followerId: viewerId, status: 'accepted' }).select('followingId').lean(),
      ]);
      affinityAuthorIds = signals.affinityAuthorIds;
      collabReelIds = signals.collabReelIds;
      followingIds = follows.map(function (f) { return f.followingId.toString(); });
    }
    // Cold-start (chưa có tín hiệu xem) vẫn cá nhân hoá nếu user đã follow ai đó:
    // reel của người mình follow được cộng điểm để nổi lên đầu, KHÔNG chặn cứng reel
    // công khai khác → giữ tính khám phá For-You.
    const personalize = affinityAuthorIds.length > 0 || collabReelIds.length > 0 || followingIds.length > 0;

    let reelDocs;
    if (personalize) {
      // Aggregation: chấm điểm rồi sort score ↓, createdAt ↓ — vẫn phân trang đúng ở DB.
      // Lưu ý: aggregate KHÔNG tự cast string → ObjectId nên phải convert thủ công.
      const toOid = function (id) { return new mongoose.Types.ObjectId(id); };

      const matchStage = { isDeleted: false };
      const orConds = [{ isPrivate: false }];
      if (viewerId) orConds.push({ userId: toOid(viewerId) });
      matchStage.$or = orConds;
      if (excludeIds.length > 0) matchStage.userId = { $nin: excludeIds.map(toOid) };
      // aggregate không tự cast string → ObjectId nên convert thủ công
      if (flaggedReelIds.length > 0) matchStage._id = { $nin: flaggedReelIds.map(toOid) };

      const affinityOids = affinityAuthorIds.map(toOid);
      const collabOids = collabReelIds.map(toOid);
      const followingOids = followingIds.map(toOid);

      const docs = await Reel.aggregate([
        { $match: matchStage },
        { $addFields: {
            _score: { $add: [
              { $cond: [{ $in: ['$userId', affinityOids] }, 100, 0] }, // reel cùng tác giả mình hay xem hết
              { $cond: [{ $in: ['$userId', followingOids] }, 80, 0] }, // reel của người mình follow
              { $cond: [{ $in: ['$_id', collabOids] }, 50, 0] },        // reel "người giống mình" xem hết
            ] },
        } },
        { $sort: { _score: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      // aggregate trả plain object — populate userId thủ công
      reelDocs = await Reel.populate(docs, { path: 'userId', select: 'username fullName avatarUrl isTrusted' });
    } else {
      // Cold-start (chưa có tín hiệu xem) → giữ nguyên sort mới nhất trước
      const found = await Reel.find(reelFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username fullName avatarUrl isTrusted');
      reelDocs = found.map(function (r) { return r.toObject(); });
    }

    let reelsArr = reelDocs.map(function (obj) {
      obj.user = obj.userId || null;
      if (obj.user && obj.user.avatarUrl) obj.user.avatar = obj.user.avatarUrl;
      delete obj.userId;
      obj.isLiked = false;
      return obj;
    });

    // Đính kèm isLiked nếu đã đăng nhập
    if (viewerId && reelsArr.length > 0) {
      const reelIds = reelsArr.map(function (r) { return r._id; });
      const likes   = await Like.find({
        userId:     viewerId,
        targetType: 'reel',
        targetId:   { $in: reelIds },
      }).lean();
      const likedSet = new Set(likes.map(function (l) { return l.targetId.toString(); }));
      reelsArr = reelsArr.map(function (r) {
        return Object.assign({}, r, { isLiked: likedSet.has(r._id.toString()) });
      });
    }

    res.json({ reels: reelsArr, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// POST /api/reels/:id/view  — ghi nhận thời gian xem (tín hiệu "thích xem")
// Body: { watchedMs, duration } — cộng dồn watchedMs cho cặp (user, reel)
async function recordReelView(req, res, next) {
  try {
    const viewerId = req.user.id;
    const reelId   = req.params.id;
    let watchedMs  = parseInt(req.body.watchedMs) || 0;
    const duration = parseFloat(req.body.duration) || 0;

    if (watchedMs <= 0) {
      return res.json({ ok: true }); // không có gì để ghi
    }
    // Chặn giá trị bất thường (tab để nền lâu...) để tránh nhiễu — tối đa 10 phút
    if (watchedMs > 10 * 60 * 1000) watchedMs = 10 * 60 * 1000;

    const reel = await Reel.findById(reelId).select('userId duration isDeleted').lean();
    if (!reel || reel.isDeleted) {
      return res.status(404).json({ message: 'Không tìm thấy reel' });
    }
    // Bỏ qua reel của chính mình — không định hình gợi ý
    if (reel.userId.toString() === viewerId) {
      return res.json({ ok: true });
    }

    // Ngưỡng "thích xem": ≥ 50% duration, hoặc ≥ 3s nếu không biết duration
    const durMs = (duration || reel.duration || 0) * 1000;
    const existing = await ReelView.findOne({ userId: viewerId, reelId }).lean();
    const totalMs = (existing ? existing.watchedMs : 0) + watchedMs;
    const completed = (existing && existing.completed) ||
      (durMs > 0 ? totalMs >= durMs * 0.5 : totalMs >= 3000);

    await ReelView.updateOne(
      { userId: viewerId, reelId },
      { $inc: { watchedMs: watchedMs }, $set: { completed: completed } },
      { upsert: true }
    );

    res.json({ ok: true });
  } catch (error) {
    // Race tạo trùng (unique index) → bỏ qua, không ảnh hưởng UX
    if (error.code === 11000) return res.json({ ok: true });
    next(error);
  }
}

// GET /api/reels/user/:userId?page=&limit=
// optionalAuth — trả về reels công khai của user; chủ tài khoản thấy cả reel riêng tư
async function getUserReels(req, res, next) {
  try {
    const targetId = req.params.userId;
    const { page, limit, skip } = getPagination(req, 12);
    const viewerId = req.user?.id || null;
    const isOwner  = viewerId && viewerId === targetId;

    // Block check — chỉ khi đã đăng nhập
    if (viewerId && !isOwner) {
      const block = await Block.findOne({
        $or: [
          { blockerId: viewerId, blockedId: targetId },
          { blockerId: targetId, blockedId: viewerId },
        ],
      });
      if (block) {
        return res.status(403).json({ message: 'Không thể xem trang này' });
      }
    }

    // Kiểm tra tài khoản riêng tư — trả [] nếu chưa follow
    if (!isOwner) {
      const targetUser = await User.findById(targetId).select('isPrivate isBanned');
      if (!targetUser || targetUser.isBanned) {
        return res.json({ reels: [], page: 1, limit, total: 0, totalPages: 0 });
      }
      if (targetUser.isPrivate) {
        const follow = await Follow.findOne({
          followerId: viewerId,
          followingId: targetId,
          status: 'accepted',
        });
        if (!follow) {
          return res.json({ reels: [], page: 1, limit, total: 0, totalPages: 0 });
        }
      }
    }

    const reelFilter = {
      userId: targetId,
      isDeleted: false,
      ...(isOwner ? {} : { isPrivate: false }),
    };

    const total      = await Reel.countDocuments(reelFilter);
    const totalPages = Math.ceil(total / limit);

    const reels = await Reel.find(reelFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName avatarUrl isTrusted isBanned');

    let reelsArr = reels.map(function (r) {
      const obj = r.toObject();
      obj.user = obj.userId || null;
      if (obj.user && obj.user.avatarUrl) obj.user.avatar = obj.user.avatarUrl;
      delete obj.userId;
      obj.isLiked = false;
      return obj;
    });

    if (viewerId && reelsArr.length > 0) {
      const reelIds = reelsArr.map(function (r) { return r._id; });
      const likes   = await Like.find({
        userId: viewerId, targetType: 'reel', targetId: { $in: reelIds },
      }).lean();
      const likedSet = new Set(likes.map(function (l) { return l.targetId.toString(); }));
      reelsArr = reelsArr.map(function (r) {
        return Object.assign({}, r, { isLiked: likedSet.has(r._id.toString()) });
      });
    }

    res.json({ reels: reelsArr, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/reels/:id — chỉ chủ sở hữu sửa được caption / isPrivate
async function updateReel(req, res, next) {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ message: 'Không tìm thấy reel' });
    }
    if (reel.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền sửa reel này' });
    }
    if (req.body.caption  !== undefined) {
      reel.caption  = req.body.caption;
      reel.hashtags = extractHashtags(req.body.caption);   // tách lại hashtag theo caption mới
    }
    if (req.body.isPrivate !== undefined) reel.isPrivate = req.body.isPrivate === true || req.body.isPrivate === 'true';
    await reel.save();
    res.json({ message: 'Đã cập nhật reel', reel });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/reels/:id — soft delete
async function deleteReel(req, res, next) {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ message: 'Không tìm thấy reel' });
    }
    if (reel.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền xóa reel này' });
    }

    // Xóa hẳn khỏi DB + dọn likes/comment/view + xóa file trên Cloudinary/local
    await Promise.all([
      reel.deleteOne(),
      Like.deleteMany({ targetType: 'reel', targetId: reel._id }),
      ReelComment.deleteMany({ reelId: reel._id }),
      ReelView.deleteMany({ reelId: reel._id }),
      deleteFromCloudinary(reel.videoUrl, 'video'),
      reel.audioUrl ? deleteFromCloudinary(reel.audioUrl, 'video') : Promise.resolve(),
    ]);

    res.json({ message: 'Đã xóa reel' });
  } catch (error) {
    next(error);
  }
}

// GET /api/reels/hashtag/:tag?page=&limit=  (optionalAuth)
// Danh sách reel công khai gắn 1 hashtag — tab Reels trong trang hashtag
async function getReelsByHashtag(req, res, next) {
  try {
    const viewerId = req.user?.id || null;
    const tag = (req.params.tag || '').toLowerCase();
    const { page, limit, skip } = getPagination(req, 12);

    if (!tag) {
      return res.json({ tag: tag, reels: [], page, limit, total: 0, totalPages: 0 });
    }

    // Loại reel của: người mình chặn / chặn mình, tài khoản riêng tư, tài khoản bị khóa
    // (đồng bộ với getPostsByHashtag — tránh lộ nội dung không nên thấy)
    const [blocksRaw, hiddenUsers] = await Promise.all([
      viewerId ? Block.find({ $or: [{ blockerId: viewerId }, { blockedId: viewerId }] }).lean() : [],
      User.find({ $or: [{ isPrivate: true }, { isBanned: true }] }).select('_id').lean(),
    ]);
    const blockedIds = blocksRaw.map(function (b) {
      return b.blockerId.toString() === viewerId ? b.blockedId.toString() : b.blockerId.toString();
    });
    const hiddenIds = hiddenUsers
      .map(function (u) { return u._id.toString(); })
      .filter(function (id) { return id !== viewerId; });
    const excludeIds = Array.from(new Set(blockedIds.concat(hiddenIds)));

    // Chỉ reel công khai, chưa xóa, gắn đúng hashtag
    const filter = { hashtags: tag, isPrivate: false, isDeleted: false };
    if (excludeIds.length > 0) filter.userId = { $nin: excludeIds };

    const total = await Reel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const reels = await Reel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName avatarUrl isTrusted isBanned');

    let reelsArr = reels.map(function (r) {
      const obj = r.toObject();
      obj.user = obj.userId || null;
      if (obj.user && obj.user.avatarUrl) obj.user.avatar = obj.user.avatarUrl;
      delete obj.userId;
      obj.isLiked = false;
      return obj;
    });

    if (viewerId && reelsArr.length > 0) {
      const reelIds = reelsArr.map(function (r) { return r._id; });
      const likes = await Like.find({
        userId: viewerId, targetType: 'reel', targetId: { $in: reelIds },
      }).lean();
      const likedSet = new Set(likes.map(function (l) { return l.targetId.toString(); }));
      reelsArr = reelsArr.map(function (r) {
        return Object.assign({}, r, { isLiked: likedSet.has(r._id.toString()) });
      });
    }

    res.json({ tag: tag, reels: reelsArr, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// GET /api/reels/:id  (optionalAuth)
// Lấy lẻ 1 reel theo id — phục vụ deep-link /reels/:reelId khi reel không nằm trong feed
async function getReel(req, res, next) {
  try {
    const viewerId = req.user?.id || null;
    const reelId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(reelId)) {
      return res.status(404).json({ message: 'Không tìm thấy reel' });
    }

    const reel = await Reel.findOne({ _id: reelId, isDeleted: false })
      .populate('userId', 'username fullName avatarUrl isTrusted isBanned');
    if (!reel) {
      return res.status(404).json({ message: 'Không tìm thấy reel' });
    }

    const ownerId = (reel.userId?._id || reel.userId).toString();
    const isOwner = viewerId && viewerId === ownerId;
    if (reel.userId?.isBanned && !isOwner) {
      return res.status(404).json({ message: 'Không tìm thấy reel' });
    }

    // Chặn 2 chiều — chỉ kiểm tra khi đã đăng nhập và không phải chủ reel
    if (viewerId && !isOwner) {
      const block = await Block.findOne({
        $or: [
          { blockerId: viewerId, blockedId: ownerId },
          { blockerId: ownerId, blockedId: viewerId },
        ],
      });
      if (block) {
        return res.status(404).json({ message: 'Không tìm thấy reel' });
      }
    }

    // Reel riêng tư: chỉ chủ + người đã được chấp nhận follow mới xem
    if (!isOwner && reel.isPrivate) {
      let allowed = false;
      if (viewerId) {
        const follow = await Follow.findOne({
          followerId: viewerId,
          followingId: ownerId,
          status: 'accepted',
        });
        allowed = !!follow;
      }
      if (!allowed) {
        return res.status(403).json({ message: 'Reel này ở chế độ riêng tư' });
      }
    }

    const obj = reel.toObject();
    obj.user = obj.userId || null;
    if (obj.user && obj.user.avatarUrl) obj.user.avatar = obj.user.avatarUrl;
    delete obj.userId;

    obj.isLiked = false;
    if (viewerId) {
      const liked = await Like.findOne({ userId: viewerId, targetType: 'reel', targetId: reel._id }).lean();
      obj.isLiked = !!liked;
    }

    res.json({ reel: obj });
  } catch (error) {
    next(error);
  }
}

module.exports = { createReel, getReels, getUserReels, updateReel, deleteReel, recordReelView, getReelsByHashtag, getReel };
