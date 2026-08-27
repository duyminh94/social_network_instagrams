// routes/likes.js
// Like/unlike bài viết hoặc comment, xem danh sách người đã like
//
// Dùng body { targetType, targetId } thay vì params vì like/unlike là cùng 1 resource
// GET /:targetType/:targetId là route công khai — không cần đăng nhập để xem ai đã like

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { likeTarget, unlikeTarget, getLikes } = require('../controllers/likeController');

router.post('/', authMiddleware, likeTarget);
router.delete('/', authMiddleware, unlikeTarget);
router.get('/:targetType/:targetId', getLikes);

module.exports = router;
