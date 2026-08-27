// routes/stories.js
// Story 24h: tạo, xem feed, xem chi tiết, xóa, danh sách người xem
//
// Tất cả route đều cần đăng nhập — router.use(authMiddleware)
// createStory dùng upload.single('media') — chỉ 1 ảnh/video mỗi story
// /:id/viewers phải đứng TRƯỚC /:id — tránh nhầm "viewers" là story id

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createStory,
  getStoriesFeed,
  getStory,
  deleteStory,
  getViewers,
  getUserStories,
  likeStory,
  unlikeStory,
  getStoryComments,
  createStoryComment,
} = require('../controllers/storyController');

router.use(authMiddleware);

// Đặt các route cố định trước /:id để tránh nhầm
router.get('/feed', getStoriesFeed);
router.get('/user/:userId', getUserStories);

router.post('/', upload.single('media'), createStory);
// /:id/viewers phải đứng trước /:id để tránh nhầm "viewers" là một id
router.get('/:id/viewers', getViewers);
router.post('/:id/like', likeStory);
router.delete('/:id/like', unlikeStory);
router.get('/:id/comments', getStoryComments);
router.post('/:id/comments', createStoryComment);
router.get('/:id', getStory);
router.delete('/:id', deleteStory);

module.exports = router;
