// routes/saved.js
// Lưu/bỏ lưu bài viết, reel và quản lý bộ sưu tập cá nhân
//
// Tất cả route cần đăng nhập — router.use(authMiddleware)
// /collections phải đứng trước / và /:postId để Express không khớp nhầm
//   'collections' thành một postId

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  savePost,
  unsavePost,
  moveSavedItem,
  getSavedPosts,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} = require('../controllers/savedController');

router.use(authMiddleware);

// --- Bộ sưu tập --- (đặt trước các route có tham số)
router.get('/collections', getCollections);
router.post('/collections', createCollection);
router.patch('/collections/:id', updateCollection);
router.delete('/collections/:id', deleteCollection);

// --- Mục đã lưu ---
router.get('/', getSavedPosts);
router.post('/', savePost);
router.patch('/:postId', moveSavedItem);   // chuyển mục đã lưu sang bộ sưu tập khác
router.delete('/:postId', unsavePost);

module.exports = router;
