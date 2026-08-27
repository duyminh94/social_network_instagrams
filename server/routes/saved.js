// routes/saved.js
// Lưu/bỏ lưu bài viết và quản lý bộ sưu tập cá nhân
//
// Tất cả route cần đăng nhập — router.use(authMiddleware)
// /collections phải đứng trước / để tránh Express khớp nhầm với GET /

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { savePost, unsavePost, getSavedPosts, getCollections } = require('../controllers/savedController');

router.use(authMiddleware);

router.get('/collections', getCollections);
router.get('/', getSavedPosts);
router.post('/', savePost);
router.delete('/:postId', unsavePost);

module.exports = router;
