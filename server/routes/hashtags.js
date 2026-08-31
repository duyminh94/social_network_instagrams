// routes/hashtags.js
// Gợi ý hashtag, xếp hạng trending, theo dõi hashtag
//
// /search, /trending, /following phải đứng TRƯỚC /:name — nếu không Express sẽ
// hiểu 'search' là tên một hashtag và gọi nhầm getHashtag

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const {
  searchHashtags,
  getTrendingHashtags,
  getFollowedHashtags,
  getHashtag,
  followHashtag,
  unfollowHashtag,
} = require('../controllers/hashtagController');

// Route cố định — phải đặt trước /:name
router.get('/search', optionalAuth, searchHashtags);
router.get('/trending', optionalAuth, getTrendingHashtags);
router.get('/following', authMiddleware, getFollowedHashtags);

// Route có tham số
router.get('/:name', optionalAuth, getHashtag);
router.post('/:name/follow', authMiddleware, followHashtag);
router.delete('/:name/follow', authMiddleware, unfollowHashtag);

module.exports = router;
