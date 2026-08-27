// commentController.js
// Xử lý bình luận và reply lồng nhau (1 cấp)
//
// Cấu trúc:
//   Comment gốc: postId = <id>, parentId = null
//   Reply:       postId = <id>, parentId = <id của comment gốc>
//
// commentsCount trên Post chỉ đếm comment gốc (không đếm reply)
// Thông báo:
//   - Comment gốc  → thông báo cho chủ bài
//   - Reply        → thông báo cho chủ comment gốc
//   - Không gửi thông báo khi tự comment/reply bài/comment của mình

const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { getPagination } = require('../utils/pagination');
const { createNotification } = require('../utils/notification');
const { autoModerate } = require('../utils/autoModerate');

// POST /api/comments
// Body: { postId, content, parentId? }
async function createComment(req, res, next) {
  try {
    const { postId, content, parentId } = req.body;

    var post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    if (post.commentsDisabled) {
      return res.status(403).json({ message: 'Bài viết đã tắt bình luận' });
    }

    const comment = await Comment.create({
      postId: postId,
      userId: req.user.id,
      parentId: parentId || null,
      content: content,
    });

    // Kiểm duyệt nội dung comment tự động — fire-and-forget, không chặn
    autoModerate(comment.content, 'comment', comment._id);

    if (!parentId) {
      // Comment gốc: tăng commentsCount và thông báo chủ bài
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
      if (post.userId.toString() !== req.user.id) {
        await createNotification(post.userId, req.user.id, 'comment', postId, 'post');
      }
    } else {
      // Reply: thông báo cho chủ comment gốc
      var parentComment = await Comment.findById(parentId);
      if (parentComment && parentComment.userId.toString() !== req.user.id) {
        await createNotification(parentComment.userId, req.user.id, 'comment', parentId, 'comment');
      }
    }

    res.status(201).json({ message: 'Bình luận thành công', comment });
  } catch (error) {
    next(error);
  }
}

// GET /api/comments/post/:postId?page=&limit=
// Chỉ lấy comment gốc (parentId = null), client gọi thêm /replies để lấy reply
async function getComments(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 20);

    var commentFilter = { postId: req.params.postId, parentId: null, isDeleted: false };
    var total = await Comment.countDocuments(commentFilter);
    var totalPages = Math.ceil(total / limit);

    const comments = await Comment.find(commentFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username avatarUrl isTrusted');

    // Normalize: populate giữ nguyên tên field 'userId' (không đổi thành 'user')
    // → rename sang 'user' để CommentItem dùng comment.user.username / comment.user.avatarUrl
    var normalizedComments = comments.map(function (c) {
      var obj = c.toObject();
      obj.user = obj.userId || null;
      return obj;
    });

    res.json({ comments: normalizedComments, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// GET /api/comments/:id/replies?page=&limit=
// Route này phải đứng TRƯỚC /:targetType/:targetId trong routes/comments.js
// vì Express sẽ bắt nhầm "replies" là tham số targetId nếu để sau
async function getReplies(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 10);

    var replyFilter = { parentId: req.params.id, isDeleted: false };
    var total = await Comment.countDocuments(replyFilter);
    var totalPages = Math.ceil(total / limit);

    // Reply sắp xếp tăng dần (cũ nhất lên trên) để đọc theo thứ tự hội thoại
    const replies = await Comment.find(replyFilter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username avatarUrl isTrusted');

    // Normalize userId → user (cùng pattern với getComments)
    var normalizedReplies = replies.map(function (r) {
      var obj = r.toObject();
      obj.user = obj.userId || null;
      return obj;
    });

    res.json({ replies: normalizedReplies, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/comments/:id
async function updateComment(req, res, next) {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });

    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }

    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền sửa bình luận này' });
    }

    comment.content = req.body.content || comment.content;
    await comment.save();

    res.json({ message: 'Đã cập nhật bình luận', comment });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/comments/:id
// Xóa mềm, giảm commentsCount chỉ khi là comment gốc
async function deleteComment(req, res, next) {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });

    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }

    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền xóa bình luận này' });
    }

    comment.isDeleted = true;
    comment.deletedBy = req.user.id;
    await comment.save();

    if (!comment.parentId) {
      await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
    }

    res.json({ message: 'Đã xóa bình luận' });
  } catch (error) {
    next(error);
  }
}

module.exports = { createComment, getComments, getReplies, updateComment, deleteComment };
