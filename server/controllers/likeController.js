// likeController.js
// Like/unlike cho cả bài viết lẫn comment (dùng chung 1 endpoint với targetType)
//
// targetType: 'post' | 'comment'
// targetId: _id của post hoặc comment
//
// likesCount trên Post/Comment được cập nhật trực tiếp ($inc) thay vì count lại
// Không gửi thông báo khi tự like bài/comment của mình

const Like = require('../models/Like');
const { getPagination } = require('../utils/pagination');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Reel = require('../models/Reel');
const ReelComment = require('../models/ReelComment');
const { createNotification } = require('../utils/notification');

// POST /api/likes
// Body: { targetType, targetId }
// FIX: kiểm tra target tồn tại và chưa bị xóa TRƯỚC khi tạo Like
//      (trước đây tạo Like rồi mới kiểm tra → dữ liệu rác nếu target không tồn tại)
async function likeTarget(req, res, next) {
  try {
    const { targetType, targetId } = req.body;
    var userId = req.user.id;

    // Validate targetType
    var validTypes = ['post', 'comment', 'reel', 'reelComment'];
    if (!validTypes.includes(targetType)) {
      return res.status(400).json({ message: 'targetType không hợp lệ' });
    }

    // reactionType — mặc định 'like' nếu không gửi hoặc không hợp lệ
    var validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
    var reactionType = validReactions.includes(req.body.reactionType) ? req.body.reactionType : 'like';

    // Kiểm tra target có tồn tại và chưa bị xóa TRƯỚC khi tạo Like
    if (targetType === 'post') {
      var post = await Post.findOne({ _id: targetId, isDeleted: false });
      if (!post) return res.status(404).json({ message: 'Bài viết không tồn tại hoặc đã bị xóa' });
    } else if (targetType === 'reel') {
      var reel = await Reel.findOne({ _id: targetId, isDeleted: false });
      if (!reel) return res.status(404).json({ message: 'Reel không tồn tại hoặc đã bị xóa' });
    } else if (targetType === 'comment') {
      var comment = await Comment.findOne({ _id: targetId, isDeleted: false });
      if (!comment) return res.status(404).json({ message: 'Bình luận không tồn tại hoặc đã bị xóa' });
    } else {
      var reelComment = await ReelComment.findOne({ _id: targetId, isDeleted: false });
      if (!reelComment) return res.status(404).json({ message: 'Bình luận không tồn tại hoặc đã bị xóa' });
    }

    // Đã react chưa? Nếu rồi → CHỈ đổi loại cảm xúc, KHÔNG tăng likesCount (mỗi user đếm 1 lần)
    const existing = await Like.findOne({ userId: userId, targetType, targetId });
    if (existing) {
      if (existing.reactionType !== reactionType) {
        existing.reactionType = reactionType;
        await existing.save();
      }
      return res.json({ message: 'Đã đổi cảm xúc', reactionType: reactionType });
    }

    try {
      await Like.create({ userId: userId, targetType, targetId, reactionType: reactionType });
    } catch (err) {
      // Race 2 request gần nhau → bản ghi đã có (unique index) → đổi loại, không tăng count
      if (err.code === 11000) {
        await Like.updateOne({ userId: userId, targetType, targetId }, { $set: { reactionType: reactionType } });
        return res.json({ message: 'Đã đổi cảm xúc', reactionType: reactionType });
      }
      throw err;
    }

    if (targetType === 'post') {
      // findByIdAndUpdate trả về document CŨ (trước khi update) nên dùng để lấy userId
      var updatedPost = await Post.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } });
      if (updatedPost && updatedPost.userId.toString() !== userId) {
        await createNotification(updatedPost.userId, userId, 'like', targetId, 'post');
      }
    } else if (targetType === 'reel') {
      var updatedReel = await Reel.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } });
      if (updatedReel && updatedReel.userId.toString() !== userId) {
        await createNotification(updatedReel.userId, userId, 'like', targetId, 'reel');
      }
    } else if (targetType === 'comment') {
      var updatedComment = await Comment.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } });
      if (updatedComment && updatedComment.userId.toString() !== userId) {
        await createNotification(updatedComment.userId, userId, 'like', targetId, 'comment');
      }
    } else if (targetType === 'reelComment') {
      var updatedReelComment = await ReelComment.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } });
      if (updatedReelComment && updatedReelComment.userId.toString() !== userId) {
        await createNotification(updatedReelComment.userId, userId, 'like', targetId, 'reelComment');
      }
    }

    res.status(201).json({ message: 'Like thành công', reactionType: reactionType });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/likes
// Body: { targetType, targetId }
async function unlikeTarget(req, res, next) {
  try {
    const { targetType, targetId } = req.body;

    const like = await Like.findOne({ userId: req.user.id, targetType, targetId });
    if (!like) {
      return res.status(404).json({ message: 'Chưa like' });
    }

    await like.deleteOne();

    if (targetType === 'post') {
      await Post.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } });
    } else if (targetType === 'reel') {
      await Reel.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } });
    } else if (targetType === 'comment') {
      await Comment.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } });
    } else if (targetType === 'reelComment') {
      await ReelComment.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } });
    }

    res.json({ message: 'Unlike thành công' });
  } catch (error) {
    next(error);
  }
}

// GET /api/likes/:targetType/:targetId?page=&limit=
async function getLikes(req, res, next) {
  try {
    const { targetType, targetId } = req.params;
    const { page, limit, skip } = getPagination(req, 20);

    var total = await Like.countDocuments({ targetType, targetId });
    var totalPages = Math.ceil(total / limit);

    const likes = await Like.find({ targetType, targetId })
      .populate('userId', 'username avatarUrl isTrusted')
      .skip(skip)
      .limit(limit);

    res.json({ likes, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

module.exports = { likeTarget, unlikeTarget, getLikes };
