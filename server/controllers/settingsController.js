// settingsController.js
// Cài đặt cá nhân, phiên đăng nhập, lịch sử tìm kiếm, tắt tiếng, hạn chế, kháng cáo
//
// Gom vào một controller vì đây đều là các chức năng thuộc trang "Cài đặt" của user.

const crypto = require('crypto');
const UserSettings = require('../models/UserSettings');
const LoginSession = require('../models/LoginSession');
const SearchHistory = require('../models/SearchHistory');
const Mute = require('../models/Mute');
const Restrict = require('../models/Restrict');
const Appeal = require('../models/Appeal');
const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Comment = require('../models/Comment');
const TokenBlacklist = require('../models/TokenBlacklist');
const { getPagination } = require('../utils/pagination');

// Số mục lịch sử tìm kiếm tối đa giữ lại cho mỗi user
const MAX_SEARCH_HISTORY = 50;

// ────────────────────────── CÀI ĐẶT CÁ NHÂN ──────────────────────────

// Lấy cấu hình của user, tạo bản mặc định nếu chưa có
async function getOrCreateSettings(userId) {
  var settings = await UserSettings.findOne({ userId: userId });
  if (settings) {
    return settings;
  }

  try {
    return await UserSettings.create({ userId: userId });
  } catch (error) {
    // 11000 = 2 request cùng lúc cùng tạo → lấy lại bản đã có
    if (error.code !== 11000) throw error;
    return await UserSettings.findOne({ userId: userId });
  }
}

// GET /api/settings
async function getSettings(req, res, next) {
  try {
    var settings = await getOrCreateSettings(req.user.id);
    return res.json({ settings: settings });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/settings
// Body: { notifications?, language?, theme?, showActivityStatus?, allowMessagesFrom?, showSuggestions? }
async function updateSettings(req, res, next) {
  try {
    var settings = await getOrCreateSettings(req.user.id);

    // Chỉ gán các field client thực sự gửi lên — không ghi đè bằng undefined
    if (req.body.language !== undefined) settings.language = req.body.language;
    if (req.body.theme !== undefined) settings.theme = req.body.theme;
    if (req.body.showActivityStatus !== undefined) settings.showActivityStatus = req.body.showActivityStatus;
    if (req.body.allowMessagesFrom !== undefined) settings.allowMessagesFrom = req.body.allowMessagesFrom;
    if (req.body.showSuggestions !== undefined) settings.showSuggestions = req.body.showSuggestions;

    // Gộp từng công tắc thông báo, giữ nguyên những cái không gửi lên
    if (req.body.notifications && typeof req.body.notifications === 'object') {
      var allowedKeys = ['like', 'comment', 'follow', 'mention', 'photo_tag', 'message'];
      allowedKeys.forEach(function (key) {
        if (req.body.notifications[key] !== undefined) {
          settings.notifications[key] = !!req.body.notifications[key];
        }
      });
    }

    await settings.save();
    return res.json({ message: 'Đã cập nhật cài đặt', settings: settings });
  } catch (error) {
    return next(error);
  }
}

// ────────────────────────── PHIÊN ĐĂNG NHẬP ──────────────────────────

// GET /api/settings/sessions — danh sách thiết bị đang đăng nhập
async function getSessions(req, res, next) {
  try {
    // Băm token hiện tại để đánh dấu phiên đang dùng
    var currentToken = (req.headers.authorization || '').replace('Bearer ', '');
    var currentHash = crypto.createHash('sha256').update(currentToken).digest('hex');

    var sessions = await LoginSession.find({ userId: req.user.id })
      .sort({ lastActiveAt: -1 })
      .lean();

    var result = sessions.map(function (s) {
      return {
        _id: s._id,
        device: s.device,
        ipAddress: s.ipAddress,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        // Đánh dấu để UI không cho user tự đăng xuất chính thiết bị đang dùng nhầm lẫn
        isCurrent: s.tokenHash === currentHash,
      };
    });

    return res.json({ sessions: result, total: result.length });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/settings/sessions/:id — đăng xuất một thiết bị từ xa
async function revokeSession(req, res, next) {
  try {
    var session = await LoginSession.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ message: 'Không tìm thấy phiên đăng nhập' });
    }

    // Token của phiên đó phải vào blacklist, nếu không nó vẫn dùng được tới khi hết hạn.
    // Chỉ có hash nên lưu hash — middleware/auth.js đối chiếu thêm theo hash.
    await TokenBlacklist.create({
      token: session.tokenHash,
      expiresAt: session.expiresAt,
    }).catch(function (error) {
      // 11000 = đã có trong blacklist, bỏ qua
      if (error.code !== 11000) throw error;
    });

    await session.deleteOne();
    return res.json({ message: 'Đã đăng xuất thiết bị' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/settings/sessions — đăng xuất tất cả thiết bị khác (giữ thiết bị hiện tại)
async function revokeOtherSessions(req, res, next) {
  try {
    var currentToken = (req.headers.authorization || '').replace('Bearer ', '');
    var currentHash = crypto.createHash('sha256').update(currentToken).digest('hex');

    var others = await LoginSession.find({
      userId: req.user.id,
      tokenHash: { $ne: currentHash },
    }).lean();

    for (var i = 0; i < others.length; i++) {
      try {
        await TokenBlacklist.create({
          token: others[i].tokenHash,
          expiresAt: others[i].expiresAt,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    await LoginSession.deleteMany({ userId: req.user.id, tokenHash: { $ne: currentHash } });

    return res.json({ message: 'Đã đăng xuất các thiết bị khác', count: others.length });
  } catch (error) {
    return next(error);
  }
}

// ────────────────────────── LỊCH SỬ TÌM KIẾM ──────────────────────────

// GET /api/settings/search-history
async function getSearchHistory(req, res, next) {
  try {
    var history = await SearchHistory.find({ userId: req.user.id })
      .sort({ searchedAt: -1 })
      .limit(20)
      .populate('targetId', 'username fullName avatarUrl isTrusted')
      .lean();

    var normalized = history.map(function (h) {
      h.user = h.targetId || null;
      return h;
    });

    return res.json({ history: normalized });
  } catch (error) {
    return next(error);
  }
}

// POST /api/settings/search-history
// Body: { targetType, targetId?, text }
async function addSearchHistory(req, res, next) {
  try {
    var targetType = req.body.targetType;
    var text = (req.body.text || '').trim();

    if (['user', 'hashtag', 'keyword'].indexOf(targetType) === -1) {
      return res.status(400).json({ message: 'targetType không hợp lệ' });
    }
    if (!text) {
      return res.status(400).json({ message: 'Thiếu nội dung tìm kiếm' });
    }

    // Tìm lại cùng một thứ → chỉ cập nhật thời điểm, không tạo bản ghi trùng
    await SearchHistory.updateOne(
      { userId: req.user.id, targetType: targetType, text: text },
      {
        $set: { searchedAt: new Date(), targetId: req.body.targetId || null },
        $setOnInsert: { userId: req.user.id, targetType: targetType, text: text },
      },
      { upsert: true }
    );

    // Giữ tối đa MAX_SEARCH_HISTORY mục — xoá bớt mục cũ nhất
    var count = await SearchHistory.countDocuments({ userId: req.user.id });
    if (count > MAX_SEARCH_HISTORY) {
      var oldest = await SearchHistory.find({ userId: req.user.id })
        .sort({ searchedAt: 1 })
        .limit(count - MAX_SEARCH_HISTORY)
        .select('_id')
        .lean();
      await SearchHistory.deleteMany({ _id: { $in: oldest.map(function (o) { return o._id; }) } });
    }

    return res.status(201).json({ message: 'Đã lưu lịch sử tìm kiếm' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/settings/search-history/:id — xoá 1 mục
async function deleteSearchHistoryItem(req, res, next) {
  try {
    var deleted = await SearchHistory.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy mục lịch sử' });
    }

    return res.json({ message: 'Đã xoá mục lịch sử' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/settings/search-history — xoá toàn bộ
async function clearSearchHistory(req, res, next) {
  try {
    var result = await SearchHistory.deleteMany({ userId: req.user.id });
    return res.json({ message: 'Đã xoá lịch sử tìm kiếm', count: result.deletedCount });
  } catch (error) {
    return next(error);
  }
}

// ────────────────────────── TẮT TIẾNG (MUTE) ──────────────────────────

// GET /api/settings/mutes
async function getMutes(req, res, next) {
  try {
    var mutes = await Mute.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('mutedUserId', 'username fullName avatarUrl isTrusted')
      .lean();

    var normalized = mutes
      .filter(function (m) { return m.mutedUserId; })
      .map(function (m) {
        return {
          _id: m._id,
          user: m.mutedUserId,
          mutePosts: m.mutePosts,
          muteStories: m.muteStories,
        };
      });

    return res.json({ mutes: normalized, total: normalized.length });
  } catch (error) {
    return next(error);
  }
}

// POST /api/settings/mutes/:userId
// Body: { mutePosts?, muteStories? } — mặc định tắt tiếng cả hai
async function muteUser(req, res, next) {
  try {
    var mutedUserId = req.params.userId;

    if (mutedUserId === req.user.id) {
      return res.status(400).json({ message: 'Không thể tắt tiếng chính mình' });
    }

    var target = await User.findById(mutedUserId).select('username').lean();
    if (!target) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    var mutePosts = req.body.mutePosts !== undefined ? !!req.body.mutePosts : true;
    var muteStories = req.body.muteStories !== undefined ? !!req.body.muteStories : true;

    // Đã tắt tiếng rồi thì cập nhật lại 2 công tắc (upsert)
    await Mute.updateOne(
      { userId: req.user.id, mutedUserId: mutedUserId },
      {
        $set: { mutePosts: mutePosts, muteStories: muteStories },
        $setOnInsert: { userId: req.user.id, mutedUserId: mutedUserId },
      },
      { upsert: true }
    );

    return res.status(201).json({ message: 'Đã tắt tiếng người dùng' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/settings/mutes/:userId
async function unmuteUser(req, res, next) {
  try {
    var deleted = await Mute.deleteOne({ userId: req.user.id, mutedUserId: req.params.userId });
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ message: 'Bạn chưa tắt tiếng người này' });
    }

    return res.json({ message: 'Đã bỏ tắt tiếng' });
  } catch (error) {
    return next(error);
  }
}

// ────────────────────────── HẠN CHẾ (RESTRICT) ──────────────────────────

// GET /api/settings/restricts
async function getRestricts(req, res, next) {
  try {
    var restricts = await Restrict.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('restrictedUserId', 'username fullName avatarUrl isTrusted')
      .lean();

    var users = restricts
      .filter(function (r) { return r.restrictedUserId; })
      .map(function (r) { return r.restrictedUserId; });

    return res.json({ restricted: users, total: users.length });
  } catch (error) {
    return next(error);
  }
}

// POST /api/settings/restricts/:userId
async function restrictUser(req, res, next) {
  try {
    var restrictedUserId = req.params.userId;

    if (restrictedUserId === req.user.id) {
      return res.status(400).json({ message: 'Không thể hạn chế chính mình' });
    }

    var target = await User.findById(restrictedUserId).select('username').lean();
    if (!target) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    var existing = await Restrict.findOne({ userId: req.user.id, restrictedUserId: restrictedUserId });
    if (existing) {
      return res.status(400).json({ message: 'Bạn đã hạn chế người này rồi' });
    }

    await Restrict.create({ userId: req.user.id, restrictedUserId: restrictedUserId });

    // Không gửi thông báo — người bị hạn chế không được biết
    return res.status(201).json({ message: 'Đã hạn chế người dùng' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/settings/restricts/:userId
async function unrestrictUser(req, res, next) {
  try {
    var deleted = await Restrict.deleteOne({
      userId: req.user.id,
      restrictedUserId: req.params.userId,
    });
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ message: 'Bạn chưa hạn chế người này' });
    }

    return res.json({ message: 'Đã bỏ hạn chế' });
  } catch (error) {
    return next(error);
  }
}

// ────────────────────────── KHÁNG CÁO (APPEAL) ──────────────────────────

// POST /api/settings/appeals
// Body: { targetType, targetId?, reason }
async function createAppeal(req, res, next) {
  try {
    var targetType = req.body.targetType;
    var reason = (req.body.reason || '').trim();

    if (['account', 'post', 'reel', 'comment'].indexOf(targetType) === -1) {
      return res.status(400).json({ message: 'targetType không hợp lệ' });
    }
    if (!reason) {
      return res.status(400).json({ message: 'Vui lòng nêu lý do kháng cáo' });
    }

    // Kháng cáo tài khoản thì đối tượng chính là user gửi
    var targetId = targetType === 'account' ? req.user.id : req.body.targetId;
    if (!targetId) {
      return res.status(400).json({ message: 'Thiếu targetId' });
    }

    // Với nội dung: phải là nội dung của chính mình và đã thực sự bị gỡ
    if (targetType !== 'account') {
      var content = null;
      if (targetType === 'post') {
        content = await Post.findById(targetId).select('userId isDeleted').lean();
      } else if (targetType === 'reel') {
        content = await Reel.findById(targetId).select('userId isDeleted').lean();
      } else {
        content = await Comment.findById(targetId).select('userId isDeleted').lean();
      }

      if (!content) {
        return res.status(404).json({ message: 'Không tìm thấy nội dung' });
      }
      if (content.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Chỉ kháng cáo được nội dung của mình' });
      }
      if (!content.isDeleted) {
        return res.status(400).json({ message: 'Nội dung này chưa bị gỡ' });
      }
    }

    // Mỗi đối tượng chỉ có 1 kháng cáo đang chờ tại một thời điểm
    var pending = await Appeal.findOne({
      userId: req.user.id,
      targetType: targetType,
      targetId: targetId,
      status: 'pending',
    });
    if (pending) {
      return res.status(400).json({ message: 'Bạn đã có một kháng cáo đang chờ xử lý' });
    }

    var appeal = await Appeal.create({
      userId: req.user.id,
      targetType: targetType,
      targetId: targetId,
      reason: reason,
    });

    return res.status(201).json({ message: 'Đã gửi kháng cáo', appeal: appeal });
  } catch (error) {
    return next(error);
  }
}

// GET /api/settings/appeals — kháng cáo mình đã gửi
async function getMyAppeals(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 20);

    var total = await Appeal.countDocuments({ userId: req.user.id });
    var totalPages = Math.ceil(total / limit);

    var appeals = await Appeal.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ appeals: appeals, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOrCreateSettings,
  getSettings,
  updateSettings,
  getSessions,
  revokeSession,
  revokeOtherSessions,
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory,
  getMutes,
  muteUser,
  unmuteUser,
  getRestricts,
  restrictUser,
  unrestrictUser,
  createAppeal,
  getMyAppeals,
};
