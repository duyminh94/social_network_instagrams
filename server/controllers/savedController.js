// savedController.js
// Lưu bài viết vào bộ sưu tập cá nhân
//
// Mỗi bài được lưu có thể gán vào 1 collectionName (tên bộ sưu tập)
// Mặc định là 'Tất cả' nếu không truyền collectionName
// getCollections dùng distinct() để lấy danh sách tên bộ sưu tập không trùng lặp

const SavedPost = require('../models/SavedPost');
const Post = require('../models/Post');
const { getPagination } = require('../utils/pagination');
const PostMedia = require('../models/PostMedia');

// POST /api/saved
// Body: { postId, collectionName? }
// FIX: kiểm tra bài viết tồn tại và chưa bị xóa trước khi lưu
//      (trước đây có thể lưu postId không tồn tại hoặc đã bị xóa → dữ liệu rác)
async function savePost(req, res, next) {
  try {
    const { postId, collectionName } = req.body;

    if (!postId) {
      return res.status(400).json({ message: 'Thiếu postId' });
    }

    // Kiểm tra bài viết có tồn tại và chưa bị xóa
    var post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: 'Bài viết không tồn tại hoặc đã bị xóa' });
    }

    const existing = await SavedPost.findOne({ userId: req.user.id, postId });
    if (existing) {
      return res.status(400).json({ message: 'Đã lưu bài này rồi' });
    }

    const saved = await SavedPost.create({
      userId: req.user.id,
      postId,
      collectionName: collectionName || 'Tất cả',
    });

    res.status(201).json({ message: 'Đã lưu bài viết', saved });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/saved/:postId
async function unsavePost(req, res, next) {
  try {
    const saved = await SavedPost.findOne({ userId: req.user.id, postId: req.params.postId });

    if (!saved) {
      return res.status(404).json({ message: 'Chưa lưu bài này' });
    }

    await saved.deleteOne();

    res.json({ message: 'Đã bỏ lưu bài viết' });
  } catch (error) {
    next(error);
  }
}

// GET /api/saved
async function getSavedPosts(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 12);

    var total = await SavedPost.countDocuments({ userId: req.user.id });
    var totalPages = Math.ceil(total / limit);

    // FIX: dùng nested populate để lấy luôn userId bên trong Post
    // populate('postId') chỉ populate Post document — userId bên trong vẫn là ObjectId
    // populate path 'postId.userId' để lấy username + avatarUrl cho PostModal
    const saved = await SavedPost.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'postId',
        match: { isDeleted: false },   // bài đã xoá mềm → postId = null, lọc bỏ bên dưới
        populate: {
          path: 'userId',
          select: 'username fullName avatarUrl isTrusted',
        },
      });

    // Attach media vào từng post trong saved — postId chỉ có Post fields, chưa có media
    var postIds = saved.map(function (s) { return s.postId?._id; }).filter(Boolean);
    var allMedia = await PostMedia.find({ postId: { $in: postIds } }).sort({ displayOrder: 1 }).lean();

    // Tạo map: postId (string) → [media]
    var mediaMap = {};
    allMedia.forEach(function (m) {
      var key = m.postId.toString();
      if (!mediaMap[key]) { mediaMap[key] = []; }
      mediaMap[key].push(m);
    });

    // Bỏ các mục mà bài đã bị xoá (postId = null do match isDeleted) → không hiện bài đã xoá
    var visibleSaved = saved.filter(function (s) { return s.postId; });

    // Gắn media vào từng saved item và normalize trường user
    var savedWithMedia = visibleSaved.map(function (s) {
      var sObj = s.toObject();
      var post = sObj.postId;
      if (post) {
        var media = mediaMap[post._id.toString()] || [];
        post.media = media;
        post.mediaUrl = media.length > 0 ? media[0].url : null;
        post.mediaType = media.length > 0 ? media[0].mediaType : null;
        // Đây là danh sách đã lưu → luôn đánh dấu isSaved để UI hiện đúng nút bỏ lưu
        post.isSaved = true;

        // userId giờ là object đã populate — rename sang 'user' cho PostModal/PostCard nhận diện
        if (post.userId && typeof post.userId === 'object') {
          post.user = post.userId;
          // Đảm bảo cả 2 field đều có để component dùng thoải mái
          if (!post.user.avatar) { post.user.avatar = post.user.avatarUrl; }
        }
      }
      return sObj;
    });

    res.json({ saved: savedWithMedia, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// GET /api/saved/collections
// distinct() trả về mảng các giá trị collectionName không trùng lặp của user
async function getCollections(req, res, next) {
  try {
    const collections = await SavedPost.distinct('collectionName', { userId: req.user.id });
    res.json({ collections });
  } catch (error) {
    next(error);
  }
}

module.exports = { savePost, unsavePost, getSavedPosts, getCollections };
