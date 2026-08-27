// routes/reels.js
const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/auth');
const optionalAuth   = require('../middleware/optionalAuth');
const upload         = require('../middleware/upload');
const { createReel, getReels, getUserReels, updateReel, deleteReel, recordReelView, getReelsByHashtag, getReel } = require('../controllers/reelController');
const {
  getReelComments,
  getReelCommentReplies,
  createReelComment,
  deleteReelComment,
} = require('../controllers/reelCommentController');

// ── Comment sub-routes (phải đứng TRƯỚC /:id để tránh nhầm segment) ──
router.get('/comments/:commentId/replies', optionalAuth, getReelCommentReplies);
router.delete('/comments/:commentId',      authMiddleware, deleteReelComment);

// ── Reel CRUD ──
router.get('/hashtag/:tag', optionalAuth, getReelsByHashtag); // tab Reels trong trang hashtag
router.get('/user/:userId', optionalAuth, getUserReels);
router.get('/',    optionalAuth,   getReels);
router.post('/',   authMiddleware, upload.fields([
  { name: 'media', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]), createReel);
router.get('/:id',    optionalAuth,   getReel);   // deep-link lẻ 1 reel
router.patch('/:id',  authMiddleware, updateReel);
router.delete('/:id', authMiddleware, deleteReel);

// ── Ghi nhận lượt xem (tín hiệu "thích xem" cho gợi ý) ──
router.post('/:id/view', authMiddleware, recordReelView);

// ── Comments on a specific reel ──
router.get('/:id/comments',  optionalAuth,   getReelComments);
router.post('/:id/comments', authMiddleware, createReelComment);

module.exports = router;
