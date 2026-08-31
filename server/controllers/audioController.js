// audioController.js
// Thư viện nhạc nền dùng chung cho reel
//
// Trước đây mỗi reel tự lưu audioUrl riêng — không tra được "còn reel nào dùng nhạc này".
// Giờ nhạc nằm trong collection audios, reel trỏ vào qua Reel.audioId.

const Audio = require('../models/Audio');
const Reel = require('../models/Reel');
const User = require('../models/User');
const Block = require('../models/Block');
const { getPagination } = require('../utils/pagination');
const { uploadToCloudinary } = require('../utils/cloudinary');

// Escape ký tự đặc biệt của regex để người dùng gõ '.' hay '*' không làm hỏng truy vấn
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/audios?q=&page=&limit=
// Danh sách nhạc, có thể lọc theo tên/nghệ sĩ. Không có từ khoá → nhạc dùng nhiều nhất
async function getAudios(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 20);
    var keyword = (req.query.q || '').trim();

    var filter = {};
    if (keyword) {
      var safe = escapeRegex(keyword);
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { artist: { $regex: safe, $options: 'i' } },
      ];
    }

    var total = await Audio.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var audios = await Audio.find(filter)
      .sort({ usageCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ audios: audios, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// GET /api/audios/trending?limit= — nhạc đang được dùng nhiều nhất
async function getTrendingAudios(req, res, next) {
  try {
    var limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    var audios = await Audio.find({ usageCount: { $gt: 0 } })
      .sort({ usageCount: -1 })
      .limit(limit)
      .lean();

    return res.json({ audios: audios });
  } catch (error) {
    return next(error);
  }
}

// GET /api/audios/:id — thông tin bài nhạc
async function getAudio(req, res, next) {
  try {
    var audio = await Audio.findById(req.params.id).lean();
    if (!audio) {
      return res.status(404).json({ message: 'Không tìm thấy bài nhạc' });
    }

    return res.json({ audio: audio });
  } catch (error) {
    return next(error);
  }
}

// GET /api/audios/:id/reels?page=&limit=
// Tất cả reel công khai đang dùng bài nhạc này
async function getReelsByAudio(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 15);
    var viewerId = req.user?.id || null;

    var audio = await Audio.findById(req.params.id).lean();
    if (!audio) {
      return res.status(404).json({ message: 'Không tìm thấy bài nhạc' });
    }

    // Ẩn reel của người đã chặn mình hoặc mình đã chặn
    var excludeIds = [];
    if (viewerId) {
      var blocks = await Block.find({
        $or: [{ blockerId: viewerId }, { blockedId: viewerId }],
      }).lean();
      excludeIds = blocks.map(function (b) {
        return b.blockerId.toString() === viewerId ? b.blockedId : b.blockerId;
      });
    }

    // Ẩn reel của tài khoản bị khoá
    var bannedUsers = await User.find({ isBanned: true }, '_id').lean();
    var bannedIds = bannedUsers.map(function (u) { return u._id; });

    var filter = {
      audioId: audio._id,
      isDeleted: false,
      isPrivate: false,
      userId: { $nin: excludeIds.concat(bannedIds) },
    };

    var total = await Reel.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var reels = await Reel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName avatarUrl isTrusted')
      .lean();

    var normalized = reels.map(function (reel) {
      reel.user = reel.userId || null;
      return reel;
    });

    return res.json({ audio: audio, reels: normalized, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// POST /api/audios
// Người dùng tải nhạc lên thư viện — field 'audio' (multipart), body: { title, artist, duration }
async function createAudio(req, res, next) {
  try {
    var title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ message: 'Thiếu tên bài nhạc' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Chưa chọn file nhạc' });
    }

    var uploadResult = await uploadToCloudinary(req.file.buffer, 'reels/audio', req.file.mimetype);

    var audio = await Audio.create({
      title: title,
      artist: (req.body.artist || '').trim(),
      url: uploadResult.secure_url,
      duration: req.body.duration ? parseFloat(req.body.duration) : null,
      source: 'upload',
      uploadedBy: req.user.id,
    });

    return res.status(201).json({ message: 'Đã thêm nhạc vào thư viện', audio: audio });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAudios,
  getTrendingAudios,
  getAudio,
  getReelsByAudio,
  createAudio,
};
