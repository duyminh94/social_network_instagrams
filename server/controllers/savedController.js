// savedController.js
// Lưu bài viết / reel vào bộ sưu tập cá nhân và quản lý bộ sưu tập
//
// Mỗi user có sẵn 1 bộ sưu tập mặc định 'Tất cả' (Collection.isDefault=true),
// tạo tự động ở lần lưu đầu tiên — user không phải tạo trước mới lưu được bài.
//
// SavedPost dùng targetType ('post' | 'reel') + targetId, giống cách model Like làm.
// Response vẫn trả field postId (object Post) để client hiện tại dùng nguyên như cũ.

const SavedPost = require('../models/SavedPost');
const Collection = require('../models/Collection');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const PostMedia = require('../models/PostMedia');
const { getPagination } = require('../utils/pagination');

const DEFAULT_COLLECTION_NAME = Collection.DEFAULT_COLLECTION_NAME;

// Lấy bộ sưu tập mặc định 'Tất cả' của user, tạo mới nếu chưa có.
// Dùng ở mọi chỗ cần một bộ sưu tập nhưng user không chỉ định cụ thể.
async function getOrCreateDefaultCollection(userId) {
  var existing = await Collection.findOne({ userId: userId, isDefault: true });
  if (existing) {
    return existing;
  }

  try {
    return await Collection.create({
      userId: userId,
      name: DEFAULT_COLLECTION_NAME,
      isDefault: true,
    });
  } catch (error) {
    // 11000 = 2 request cùng lúc cùng tạo bộ sưu tập mặc định → lấy lại cái đã có
    if (error.code !== 11000) throw error;
    return await Collection.findOne({ userId: userId, isDefault: true });
  }
}

// Kiểm tra target (post hoặc reel) có tồn tại và chưa bị xoá không.
// Trả về document nếu hợp lệ, null nếu không.
async function findLiveTarget(targetType, targetId) {
  if (targetType === 'reel') {
    return Reel.findOne({ _id: targetId, isDeleted: false }).lean();
  }
  return Post.findOne({ _id: targetId, isDeleted: false }).lean();
}

// POST /api/saved
// Body: { postId?, targetId?, targetType?, collectionId?, collectionName? }
// Giữ tương thích: client cũ gửi { postId, collectionName }
async function savePost(req, res, next) {
  try {
    var userId = req.user.id;
    var targetType = req.body.targetType || 'post';
    // postId là tên field client hiện tại đang gửi cho bài viết
    var targetId = req.body.targetId || req.body.postId;

    if (!targetId) {
      return res.status(400).json({ message: 'Thiếu targetId' });
    }
    if (targetType !== 'post' && targetType !== 'reel') {
      return res.status(400).json({ message: 'targetType phải là post hoặc reel' });
    }

    var target = await findLiveTarget(targetType, targetId);
    if (!target) {
      return res.status(404).json({ message: 'Nội dung không tồn tại hoặc đã bị xóa' });
    }

    var existing = await SavedPost.findOne({ userId: userId, targetType: targetType, targetId: targetId });
    if (existing) {
      return res.status(400).json({ message: 'Đã lưu nội dung này rồi' });
    }

    // Xác định bộ sưu tập đích: theo collectionId → theo tên → mặc định 'Tất cả'
    var collection = null;
    if (req.body.collectionId) {
      collection = await Collection.findOne({ _id: req.body.collectionId, userId: userId });
      if (!collection) {
        return res.status(404).json({ message: 'Bộ sưu tập không tồn tại' });
      }
    } else if (req.body.collectionName && req.body.collectionName !== DEFAULT_COLLECTION_NAME) {
      // Tên chưa có thì tạo mới — giữ đúng hành vi cũ là lưu kèm tên tự do
      collection = await Collection.findOne({ userId: userId, name: req.body.collectionName.trim() });
      if (!collection) {
        collection = await Collection.create({ userId: userId, name: req.body.collectionName.trim() });
      }
    } else {
      collection = await getOrCreateDefaultCollection(userId);
    }

    var saved = await SavedPost.create({
      userId: userId,
      targetType: targetType,
      targetId: targetId,
      collectionId: collection._id,
    });

    // Cập nhật counter và ảnh bìa của bộ sưu tập
    var coverUrl = '';
    if (targetType === 'reel') {
      coverUrl = target.videoUrl || '';
    } else {
      var firstMedia = await PostMedia.findOne({ postId: target._id }).sort({ displayOrder: 1 }).lean();
      coverUrl = firstMedia ? firstMedia.url : '';
    }

    var collectionUpdate = { $inc: { itemsCount: 1 } };
    if (coverUrl) {
      collectionUpdate.$set = { coverUrl: coverUrl };
    }
    await Collection.updateOne({ _id: collection._id }, collectionUpdate);

    return res.status(201).json({ message: 'Đã lưu nội dung', saved: saved });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/saved/:postId?targetType=post|reel
// :postId giữ tên cũ để client hiện tại không phải đổi — thực chất là targetId
async function unsavePost(req, res, next) {
  try {
    var userId = req.user.id;
    var targetType = req.query.targetType || 'post';
    var targetId = req.params.postId;

    var saved = await SavedPost.findOne({ userId: userId, targetType: targetType, targetId: targetId });
    if (!saved) {
      return res.status(404).json({ message: 'Chưa lưu nội dung này' });
    }

    var collectionId = saved.collectionId;
    await saved.deleteOne();

    // Không để itemsCount xuống âm nếu dữ liệu lệch
    await Collection.updateOne(
      { _id: collectionId, itemsCount: { $gt: 0 } },
      { $inc: { itemsCount: -1 } }
    );

    return res.json({ message: 'Đã bỏ lưu nội dung' });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/saved/:postId
// Body: { collectionId }, query: ?targetType=post|reel
// Chuyển một mục đã lưu sang bộ sưu tập khác.
// Làm trong 1 request thay vì để client xoá rồi lưu lại — cách kia mà lỗi giữa chừng
//   thì mục đã lưu biến mất khỏi tài khoản user.
async function moveSavedItem(req, res, next) {
  try {
    var userId = req.user.id;
    var targetType = req.query.targetType || 'post';
    var targetId = req.params.postId;
    var collectionId = req.body.collectionId;

    if (!collectionId) {
      return res.status(400).json({ message: 'Thiếu collectionId' });
    }

    var saved = await SavedPost.findOne({ userId: userId, targetType: targetType, targetId: targetId });
    if (!saved) {
      return res.status(404).json({ message: 'Chưa lưu nội dung này' });
    }

    // Chỉ cho chuyển sang bộ sưu tập của chính user
    var collection = await Collection.findOne({ _id: collectionId, userId: userId });
    if (!collection) {
      return res.status(404).json({ message: 'Bộ sưu tập không tồn tại' });
    }

    var oldCollectionId = saved.collectionId;

    // Đã nằm sẵn trong bộ sưu tập đích → không đụng counter, tránh lệch số liệu
    if (String(oldCollectionId) === String(collection._id)) {
      return res.json({ message: 'Nội dung đã ở trong bộ sưu tập này', saved: saved });
    }

    saved.collectionId = collection._id;
    await saved.save();

    // Không để itemsCount xuống âm nếu dữ liệu lệch
    await Collection.updateOne(
      { _id: oldCollectionId, itemsCount: { $gt: 0 } },
      { $inc: { itemsCount: -1 } }
    );
    await Collection.updateOne({ _id: collection._id }, { $inc: { itemsCount: 1 } });

    return res.json({ message: 'Đã chuyển sang bộ sưu tập khác', saved: saved });
  } catch (error) {
    return next(error);
  }
}

// GET /api/saved?collectionId=&page=&limit=
// Trả về mục đã lưu kèm nội dung đầy đủ. Field postId được giữ nguyên tên
// để PostModal/PostCard bên client dùng lại không phải sửa.
async function getSavedPosts(req, res, next) {
  try {
    var userId = req.user.id;
    var { page, limit, skip } = getPagination(req, 12);

    var filter = { userId: userId };
    if (req.query.collectionId) {
      filter.collectionId = req.query.collectionId;
    }

    var total = await SavedPost.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var savedItems = await SavedPost.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Tách id theo loại rồi query mỗi loại 1 lần — không lặp query theo từng mục
    var postIds = [];
    var reelIds = [];
    savedItems.forEach(function (item) {
      if (item.targetType === 'reel') {
        reelIds.push(item.targetId);
      } else {
        postIds.push(item.targetId);
      }
    });

    var posts = await Post.find({ _id: { $in: postIds }, isDeleted: false })
      .populate('userId', 'username fullName avatarUrl isTrusted')
      .lean();
    var reels = await Reel.find({ _id: { $in: reelIds }, isDeleted: false })
      .populate('userId', 'username fullName avatarUrl isTrusted')
      .lean();

    // Gắn media cho các bài viết
    var allMedia = await PostMedia.find({ postId: { $in: postIds } })
      .sort({ displayOrder: 1 })
      .lean();
    var mediaMap = {};
    allMedia.forEach(function (m) {
      var key = m.postId.toString();
      if (!mediaMap[key]) { mediaMap[key] = []; }
      mediaMap[key].push(m);
    });

    // Map id → nội dung đã chuẩn hoá, để ghép lại đúng thứ tự đã lưu
    var contentMap = {};

    posts.forEach(function (post) {
      var media = mediaMap[post._id.toString()] || [];
      post.media = media;
      post.mediaUrl = media.length > 0 ? media[0].url : null;
      post.mediaType = media.length > 0 ? media[0].mediaType : null;
      // Đây là danh sách đã lưu → luôn đánh dấu isSaved để UI hiện đúng nút bỏ lưu
      post.isSaved = true;
      if (post.userId && typeof post.userId === 'object') {
        post.user = post.userId;
        if (!post.user.avatar) { post.user.avatar = post.user.avatarUrl; }
      }
      contentMap[post._id.toString()] = post;
    });

    reels.forEach(function (reel) {
      reel.mediaUrl = reel.videoUrl || null;
      reel.mediaType = 'video';
      reel.isSaved = true;
      if (reel.userId && typeof reel.userId === 'object') {
        reel.user = reel.userId;
        if (!reel.user.avatar) { reel.user.avatar = reel.user.avatarUrl; }
      }
      contentMap[reel._id.toString()] = reel;
    });

    // Bỏ mục có nội dung đã bị xoá mềm (không có trong contentMap)
    var result = [];
    savedItems.forEach(function (item) {
      var content = contentMap[item.targetId.toString()];
      if (!content) {
        return;
      }
      result.push({
        _id: item._id,
        targetType: item.targetType,
        collectionId: item.collectionId,
        createdAt: item.createdAt,
        // postId: giữ tên field cũ cho client hiện tại
        postId: content,
      });
    });

    return res.json({ saved: result, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// GET /api/saved/collections
// Trả danh sách bộ sưu tập đầy đủ (id, tên, ảnh bìa, số mục)
async function getCollections(req, res, next) {
  try {
    var userId = req.user.id;

    // Đảm bảo user luôn thấy ít nhất bộ sưu tập mặc định
    await getOrCreateDefaultCollection(userId);

    var collections = await Collection.find({ userId: userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return res.json({ collections: collections });
  } catch (error) {
    return next(error);
  }
}

// POST /api/saved/collections
// Body: { name }
async function createCollection(req, res, next) {
  try {
    var name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Tên bộ sưu tập không được rỗng' });
    }

    var existing = await Collection.findOne({ userId: req.user.id, name: name });
    if (existing) {
      return res.status(400).json({ message: 'Bộ sưu tập trùng tên đã tồn tại' });
    }

    var collection = await Collection.create({ userId: req.user.id, name: name });
    return res.status(201).json({ message: 'Đã tạo bộ sưu tập', collection: collection });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/saved/collections/:id
// Body: { name }
async function updateCollection(req, res, next) {
  try {
    var name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Tên bộ sưu tập không được rỗng' });
    }

    var collection = await Collection.findOne({ _id: req.params.id, userId: req.user.id });
    if (!collection) {
      return res.status(404).json({ message: 'Bộ sưu tập không tồn tại' });
    }
    if (collection.isDefault) {
      return res.status(400).json({ message: 'Không thể đổi tên bộ sưu tập mặc định' });
    }

    var duplicated = await Collection.findOne({
      userId: req.user.id,
      name: name,
      _id: { $ne: collection._id },
    });
    if (duplicated) {
      return res.status(400).json({ message: 'Bộ sưu tập trùng tên đã tồn tại' });
    }

    collection.name = name;
    await collection.save();

    return res.json({ message: 'Đã đổi tên bộ sưu tập', collection: collection });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/saved/collections/:id
// Xoá bộ sưu tập nhưng KHÔNG xoá bài đã lưu — chuyển hết về bộ sưu tập mặc định
async function deleteCollection(req, res, next) {
  try {
    var userId = req.user.id;

    var collection = await Collection.findOne({ _id: req.params.id, userId: userId });
    if (!collection) {
      return res.status(404).json({ message: 'Bộ sưu tập không tồn tại' });
    }
    if (collection.isDefault) {
      return res.status(400).json({ message: 'Không thể xoá bộ sưu tập mặc định' });
    }

    var defaultCollection = await getOrCreateDefaultCollection(userId);

    var moved = await SavedPost.updateMany(
      { userId: userId, collectionId: collection._id },
      { $set: { collectionId: defaultCollection._id } }
    );

    if (moved.modifiedCount > 0) {
      await Collection.updateOne(
        { _id: defaultCollection._id },
        { $inc: { itemsCount: moved.modifiedCount } }
      );
    }

    await collection.deleteOne();

    return res.json({
      message: 'Đã xoá bộ sưu tập',
      movedItems: moved.modifiedCount,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  savePost,
  unsavePost,
  moveSavedItem,
  getSavedPosts,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
};
