// routes/comments.js
// Bình luận và reply lồng nhau trên bài viết
//
// CẢNH BÁO thứ tự route: /:id/replies phải đứng TRƯỚC /:postId
// Nếu đảo ngược, Express nhận "replies" là một postId và gọi nhầm getComments
// Đây là lỗi từng xảy ra — đã ghi vào CLAUDE.md mục Bugs

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const { createComment, getComments, getReplies, updateComment, deleteComment, pinComment, unpinComment } = require('../controllers/commentController');

router.post('/', authMiddleware, createComment);
// /:id/replies phải đứng trước /:postId để Express không nhầm
router.get('/:id/replies', getReplies);
// optionalAuth: cần biết người xem là ai để áp dụng quy tắc hạn chế (Restrict) —
// người bị hạn chế vẫn thấy bình luận của chính mình
router.get('/post/:postId', optionalAuth, getComments);
// Ghim/bỏ ghim bình luận — đặt trước /:id để 'pin' không bị hiểu là id
router.patch('/:id/pin', authMiddleware, pinComment);
router.delete('/:id/pin', authMiddleware, unpinComment);
router.patch('/:id', authMiddleware, updateComment);
router.delete('/:id', authMiddleware, deleteComment);

module.exports = router;
