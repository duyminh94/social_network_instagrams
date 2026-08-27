const ReelComment = require('../models/ReelComment');
const Reel = require('../models/Reel');
const { getPagination } = require('../utils/pagination');
const { createNotification } = require('../utils/notification');

// GET /api/reels/:id/comments?page=&limit=
async function getReelComments(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 20);

    const filter = { reelId: req.params.id, parentId: null, isDeleted: false };
    const total  = await ReelComment.countDocuments(filter);

    const comments = await ReelComment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username avatarUrl isTrusted');

    const normalized = comments.map(function (c) {
      var obj = c.toObject();
      obj.user = obj.userId || null;
      return obj;
    });

    res.json({ comments: normalized, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

// GET /api/reels/comments/:commentId/replies
async function getReelCommentReplies(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 10);

    const filter = { parentId: req.params.commentId, isDeleted: false };
    const total  = await ReelComment.countDocuments(filter);

    const replies = await ReelComment.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username avatarUrl isTrusted');

    const normalized = replies.map(function (r) {
      var obj = r.toObject();
      obj.user = obj.userId || null;
      return obj;
    });

    res.json({ replies: normalized, total });
  } catch (error) {
    next(error);
  }
}

// POST /api/reels/:id/comments
// Body: { content, parentId? }
async function createReelComment(req, res, next) {
  try {
    const { content, parentId } = req.body;
    const reelId = req.params.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung bình luận không được để trống' });
    }

    const reel = await Reel.findOne({ _id: reelId, isDeleted: false });
    if (!reel) return res.status(404).json({ message: 'Không tìm thấy reel' });

    const comment = await ReelComment.create({
      reelId,
      userId:   req.user.id,
      parentId: parentId || null,
      content:  content.trim(),
    });

    if (!parentId) {
      await Reel.findByIdAndUpdate(reelId, { $inc: { commentsCount: 1 } });
      if (reel.userId.toString() !== req.user.id) {
        await createNotification(reel.userId, req.user.id, 'comment', reelId, 'reel');
      }
    } else {
      const parentComment = await ReelComment.findById(parentId);
      if (parentComment && parentComment.userId.toString() !== req.user.id) {
        await createNotification(parentComment.userId, req.user.id, 'reply', parentId, 'reelComment');
      }
    }

    await comment.populate('userId', 'username avatarUrl isTrusted');
    const obj = comment.toObject();
    obj.user = obj.userId || null;

    res.status(201).json({ message: 'Bình luận thành công', comment: obj });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/reels/comments/:commentId
async function deleteReelComment(req, res, next) {
  try {
    const comment = await ReelComment.findOne({ _id: req.params.commentId, isDeleted: false });
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền xóa bình luận này' });
    }

    comment.isDeleted = true;
    await comment.save();

    if (!comment.parentId) {
      await Reel.findByIdAndUpdate(comment.reelId, { $inc: { commentsCount: -1 } });
    }

    res.json({ message: 'Đã xóa bình luận' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getReelComments, getReelCommentReplies, createReelComment, deleteReelComment };
