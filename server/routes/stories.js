// routes/stories.js
// Story 24h: tạo, xem feed, xem chi tiết, xóa, danh sách người xem
// Kèm bạn thân (close friends), highlight và sticker bình chọn
//
// Tất cả route đều cần đăng nhập — router.use(authMiddleware)
// createStory dùng upload.single('media') — chỉ 1 ảnh/video mỗi story
//
// THỨ TỰ QUAN TRỌNG: mọi route cố định (/feed, /close-friends, /highlights...)
// phải đứng TRƯỚC /:id, nếu không Express hiểu 'highlights' là một story id

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
  getCloseFriends,
  addCloseFriend,
  removeCloseFriend,
  getHighlights,
  createHighlight,
  updateHighlight,
  removeHighlightItem,
  deleteHighlight,
  getStoryPoll,
  voteStoryPoll,
  getPollVoters,
} = require('../controllers/storyController');

router.use(authMiddleware);

// --- Route cố định (phải đứng trước /:id) ---
router.get('/feed', getStoriesFeed);
router.get('/user/:userId', getUserStories);

// --- Bạn thân: story chỉ hiện cho danh sách này ---
router.get('/close-friends', getCloseFriends);
router.post('/close-friends/:userId', addCloseFriend);
router.delete('/close-friends/:userId', removeCloseFriend);

// --- Highlight: giữ story vĩnh viễn trên trang cá nhân ---
router.get('/highlights/user/:userId', getHighlights);
router.post('/highlights', createHighlight);
router.patch('/highlights/:id', updateHighlight);
router.delete('/highlights/:id/items/:itemId', removeHighlightItem);
router.delete('/highlights/:id', deleteHighlight);

// --- Tạo story ---
router.post('/', upload.single('media'), createStory);

// --- Route có tham số :id ---
// /:id/viewers phải đứng trước /:id để tránh nhầm "viewers" là một id
router.get('/:id/viewers', getViewers);
router.post('/:id/like', likeStory);
router.delete('/:id/like', unlikeStory);
router.get('/:id/comments', getStoryComments);
router.post('/:id/comments', createStoryComment);

// --- Sticker bình chọn ---
router.get('/:id/poll/voters', getPollVoters);
router.post('/:id/poll/vote', voteStoryPoll);
router.get('/:id/poll', getStoryPoll);

router.get('/:id', getStory);
router.delete('/:id', deleteStory);

module.exports = router;
