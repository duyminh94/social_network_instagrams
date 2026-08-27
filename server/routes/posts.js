// routes/posts.js
// CRUD bài viết, feed cá nhân, trang khám phá, bài của từng user
//
// createPost dùng upload.array('media', 10) — cho phép upload tối đa 10 file ảnh/video 1 lần
// /feed và /explore đặt trước /:id để tránh Express bắt nhầm 'feed'/'explore' là id

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const upload = require('../middleware/upload');
const { createPost, createReel, getFeed, getExplore, getPost, updatePost, deletePost, getUserPosts, getPostsByHashtag, searchPosts, searchTags } = require('../controllers/postController');

// Đặt các route cố định trước route có tham số
router.get('/feed', authMiddleware, getFeed);

// Route công khai — dùng optionalAuth để nhận diện user nếu có token
// Cần biết viewer là ai để: check block, check private account, nhận diện owner
router.get('/explore', optionalAuth, getExplore);
router.get('/search', optionalAuth, searchPosts);          // tìm bài theo caption/hashtag
router.get('/tags/search', optionalAuth, searchTags);      // gợi ý hashtag khớp + số bài
router.get('/hashtag/:tag', optionalAuth, getPostsByHashtag); // trang hashtag
router.get('/user/:userId', optionalAuth, getUserPosts);

router.post('/', authMiddleware, upload.array('media', 10), createPost);
router.post('/reel', authMiddleware, upload.fields([{ name: 'media', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), createReel);
router.get('/:id', optionalAuth, getPost);
router.patch('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);

module.exports = router;
