// routes/ai.js
// Các endpoint AI — yêu cầu đăng nhập.
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { generateCaption } = require('../controllers/aiController');

// Gợi ý caption + hashtag từ ảnh (Gemini Vision)
router.post('/caption', authMiddleware, generateCaption);

module.exports = router;
