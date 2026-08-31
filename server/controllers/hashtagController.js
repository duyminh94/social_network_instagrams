// hashtagController.js
// Hashtag: gợi ý khi gõ, xếp hạng trending, theo dõi/bỏ theo dõi
//
// Trước đây gợi ý hashtag phải aggregate $unwind toàn bộ collection posts.
// Giờ đọc thẳng collection hashtags đã có sẵn counter → nhanh và không phụ thuộc số bài.

const Hashtag = require('../models/Hashtag');
const HashtagFollow = require('../models/HashtagFollow');
const { getPagination } = require('../utils/pagination');

// Escape ký tự đặc biệt của regex để người dùng gõ '.' hay '*' không làm hỏng truy vấn
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Chuẩn hoá tag người dùng gửi lên: bỏ '#', về chữ thường, bỏ khoảng trắng thừa
function normalizeTagName(raw) {
  return String(raw || '').trim().replace(/^#/, '').toLowerCase();
}

// GET /api/hashtags/search?q=&limit=
// Gợi ý hashtag khi user đang gõ trong ô tìm kiếm
async function searchHashtags(req, res, next) {
  try {
    var keyword = normalizeTagName(req.query.q);
    var limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);

    if (!keyword) {
      return res.json({ hashtags: [] });
    }

    var hashtags = await Hashtag.find({ name: { $regex: escapeRegex(keyword) } })
      .sort({ postsCount: -1, reelsCount: -1 })
      .limit(limit)
      .lean();

    return res.json({ hashtags: hashtags });
  } catch (error) {
    return next(error);
  }
}

// GET /api/hashtags/trending?limit=
// Tag đang hot: có nội dung mới trong 7 ngày gần đây, nhiều bài nhất lên đầu
async function getTrendingHashtags(req, res, next) {
  try {
    var limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    var sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    var hashtags = await Hashtag.find({
      lastUsedAt: { $gte: sevenDaysAgo },
      // Bỏ qua tag không còn nội dung nào (bài đã xoá hết)
      $or: [{ postsCount: { $gt: 0 } }, { reelsCount: { $gt: 0 } }],
    })
      .sort({ postsCount: -1, reelsCount: -1 })
      .limit(limit)
      .lean();

    // Chưa có tag nào dùng trong 7 ngày → lấy tag phổ biến nhất từ trước tới nay
    if (hashtags.length === 0) {
      hashtags = await Hashtag.find({
        $or: [{ postsCount: { $gt: 0 } }, { reelsCount: { $gt: 0 } }],
      })
        .sort({ postsCount: -1, reelsCount: -1 })
        .limit(limit)
        .lean();
    }

    return res.json({ hashtags: hashtags });
  } catch (error) {
    return next(error);
  }
}

// GET /api/hashtags/following?page=&limit=
// Danh sách hashtag mà user đang theo dõi
async function getFollowedHashtags(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 20);

    var total = await HashtagFollow.countDocuments({ userId: req.user.id });
    var totalPages = Math.ceil(total / limit);

    var follows = await HashtagFollow.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('hashtagId')
      .lean();

    // Bỏ bản ghi có hashtag đã bị xoá khỏi DB
    var hashtags = follows
      .filter(function (f) { return f.hashtagId; })
      .map(function (f) { return f.hashtagId; });

    return res.json({ hashtags: hashtags, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// GET /api/hashtags/:name
// Thông tin 1 hashtag + user hiện tại đã theo dõi chưa
async function getHashtag(req, res, next) {
  try {
    var name = normalizeTagName(req.params.name);
    if (!name) {
      return res.status(400).json({ message: 'Tên hashtag không hợp lệ' });
    }

    var hashtag = await Hashtag.findOne({ name: name }).lean();
    if (!hashtag) {
      // Tag chưa có bài nào — trả về khung rỗng để trang hashtag vẫn hiển thị được
      hashtag = { name: name, postsCount: 0, reelsCount: 0, followersCount: 0 };
    }

    hashtag.isFollowing = false;
    if (req.user && hashtag._id) {
      var following = await HashtagFollow.findOne({ userId: req.user.id, hashtagId: hashtag._id }).lean();
      hashtag.isFollowing = !!following;
    }

    return res.json({ hashtag: hashtag });
  } catch (error) {
    return next(error);
  }
}

// POST /api/hashtags/:name/follow
async function followHashtag(req, res, next) {
  try {
    var name = normalizeTagName(req.params.name);
    if (!name) {
      return res.status(400).json({ message: 'Tên hashtag không hợp lệ' });
    }

    // Tag chưa tồn tại (chưa ai đăng bài) vẫn cho theo dõi → tạo document rỗng
    var hashtag = await Hashtag.findOne({ name: name });
    if (!hashtag) {
      hashtag = await Hashtag.create({ name: name });
    }

    var existing = await HashtagFollow.findOne({ userId: req.user.id, hashtagId: hashtag._id });
    if (existing) {
      return res.status(400).json({ message: 'Bạn đã theo dõi hashtag này rồi' });
    }

    await HashtagFollow.create({
      userId: req.user.id,
      hashtagId: hashtag._id,
      name: hashtag.name,
    });
    await Hashtag.updateOne({ _id: hashtag._id }, { $inc: { followersCount: 1 } });

    return res.status(201).json({ message: 'Đã theo dõi hashtag', name: hashtag.name });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/hashtags/:name/follow
async function unfollowHashtag(req, res, next) {
  try {
    var name = normalizeTagName(req.params.name);

    var hashtag = await Hashtag.findOne({ name: name });
    if (!hashtag) {
      return res.status(404).json({ message: 'Hashtag không tồn tại' });
    }

    var deleted = await HashtagFollow.deleteOne({ userId: req.user.id, hashtagId: hashtag._id });
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ message: 'Bạn chưa theo dõi hashtag này' });
    }

    // Không để followersCount xuống âm nếu dữ liệu lệch
    await Hashtag.updateOne(
      { _id: hashtag._id, followersCount: { $gt: 0 } },
      { $inc: { followersCount: -1 } }
    );

    return res.json({ message: 'Đã bỏ theo dõi hashtag', name: hashtag.name });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  searchHashtags,
  getTrendingHashtags,
  getFollowedHashtags,
  getHashtag,
  followHashtag,
  unfollowHashtag,
};
