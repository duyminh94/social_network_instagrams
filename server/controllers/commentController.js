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
const { syncMentions, removeMentions } = require('../utils/mentions');
const Restrict = require('../models/Restrict');

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

    // Ghi nhận @username trong bình luận và báo cho người được nhắc
    await syncMentions('comment', comment._id, comment.content, req.user.id, true);

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

    var viewerId = req.user?.id || null;
    var commentFilter = { postId: req.params.postId, parentId: null, isDeleted: false };

    // Hạn chế (Restrict): bình luận của người bị chủ bài hạn chế chỉ hiện với
    // chính người đó và với chủ bài — người ngoài không thấy, và người bị hạn chế
    // cũng không biết mình đang bị hạn chế.
    var post = await Post.findById(req.params.postId).select('userId').lean();
    if (post) {
      var isPostOwner = viewerId && post.userId.toString() === viewerId;

      if (!isPostOwner) {
        var restricts = await Restrict.find({ userId: post.userId }).select('restrictedUserId').lean();
        var restrictedIds = restricts
          .map(function (r) { return r.restrictedUserId.toString(); })
          // Người đang xem vẫn thấy bình luận của chính mình
          .filter(function (id) { return id !== viewerId; });

        if (restrictedIds.length > 0) {
          commentFilter.userId = { $nin: restrictedIds };
        }
      }
    }

    var total = await Comment.countDocuments(commentFilter);
    var totalPages = Math.ceil(total / limit);

    // isPinned: -1 đưa bình luận được chủ bài ghim lên đầu, phần còn lại vẫn mới nhất trước
    const comments = await Comment.find(commentFilter)
      .sort({ isPinned: -1, createdAt: -1 })
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

    // Nội dung đổi → tính lại danh sách người được nhắc
    await syncMentions('comment', comment._id, comment.content, req.user.id, true);

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

    await removeMentions('comment', comment._id);

    res.json({ message: 'Đã xóa bình luận' });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/comments/:id/pin
// Chủ bài viết ghim 1 bình luận lên đầu — mỗi bài chỉ ghim được 1 cái
async function pinComment(req, res, next) {
  try {
    var comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }

    // Chỉ ghim comment gốc, không ghim reply
    if (comment.parentId) {
      return res.status(400).json({ message: 'Không thể ghim một reply' });
    }

    var post = await Post.findById(comment.postId).select('userId').lean();
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Chỉ chủ bài viết mới ghim được bình luận' });
    }

    // Bỏ ghim bình luận đang được ghim trước đó (nếu có) — mỗi bài chỉ 1 cái
    await Comment.updateMany(
      { postId: comment.postId, isPinned: true },
      { $set: { isPinned: false, pinnedAt: null } }
    );

    comment.isPinned = true;
    comment.pinnedAt = new Date();
    await comment.save();

    return res.json({ message: 'Đã ghim bình luận', comment: comment });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/comments/:id/pin
async function unpinComment(req, res, next) {
  try {
    var comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }

    var post = await Post.findById(comment.postId).select('userId').lean();
    if (!post || post.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Chỉ chủ bài viết mới bỏ ghim được' });
    }
    if (!comment.isPinned) {
      return res.status(400).json({ message: 'Bình luận này chưa được ghim' });
    }

    comment.isPinned = false;
    comment.pinnedAt = null;
    await comment.save();

    return res.json({ message: 'Đã bỏ ghim bình luận' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createComment, getComments, getReplies, updateComment, deleteComment,
  pinComment, unpinComment,
};
