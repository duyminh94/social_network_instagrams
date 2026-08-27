// routes/comments.js
// Bình luận và reply lồng nhau trên bài viết
//
// CẢNH BÁO thứ tự route: /:id/replies phải đứng TRƯỚC /:postId
// Nếu đảo ngược, Express nhận "replies" là một postId và gọi nhầm getComments
// Đây là lỗi từng xảy ra — đã ghi vào CLAUDE.md mục Bugs

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { createComment, getComments, getReplies, updateComment, deleteComment } = require('../controllers/commentController');

router.post('/', authMiddleware, createComment);
// /:id/replies phải đứng trước /:postId để Express không nhầm
router.get('/:id/replies', getReplies);
router.get('/post/:postId', getComments);
router.patch('/:id', authMiddleware, updateComment);
router.delete('/:id', authMiddleware, deleteComment);

module.exports = router;
