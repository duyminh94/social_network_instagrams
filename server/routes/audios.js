// routes/audios.js
// Thư viện nhạc nền cho reel
//
// /trending phải đứng TRƯỚC /:id để Express không hiểu 'trending' là một id

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const upload = require('../middleware/upload');
const {
  getAudios,
  getTrendingAudios,
  getAudio,
  getReelsByAudio,
  createAudio,
} = require('../controllers/audioController');

// Route cố định — đặt trước /:id
router.get('/trending', optionalAuth, getTrendingAudios);
router.get('/', optionalAuth, getAudios);
router.post('/', authMiddleware, upload.single('audio'), createAudio);

// Route có tham số
router.get('/:id/reels', optionalAuth, getReelsByAudio);
router.get('/:id', optionalAuth, getAudio);

module.exports = router;
