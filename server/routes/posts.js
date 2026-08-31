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
const {
  createPost, getFeed, getExplore, getPost, updatePost, deletePost, getUserPosts,
  getPostsByHashtag, searchPosts, searchTags,
  archivePost, unarchivePost, getArchivedPosts, recordPostView,
  addPhotoTag, getPhotoTags, removePhotoTag, getPostsTaggingMe, getMentionsOfMe,
} = require('../controllers/postController');

// Đặt các route cố định trước route có tham số
router.get('/feed', authMiddleware, getFeed);
router.get('/archived', authMiddleware, getArchivedPosts);      // bài mình đã lưu trữ
router.get('/tagged/me', authMiddleware, getPostsTaggingMe);    // bài có gắn thẻ mình trên ảnh
router.get('/mentions/me', authMiddleware, getMentionsOfMe);    // nội dung nhắc @tên mình

// Route công khai — dùng optionalAuth để nhận diện user nếu có token
// Cần biết viewer là ai để: check block, check private account, nhận diện owner
router.get('/explore', optionalAuth, getExplore);
router.get('/search', optionalAuth, searchPosts);          // tìm bài theo caption/hashtag
router.get('/tags/search', optionalAuth, searchTags);      // gợi ý hashtag khớp + số bài
router.get('/hashtag/:tag', optionalAuth, getPostsByHashtag); // trang hashtag
router.get('/user/:userId', optionalAuth, getUserPosts);

router.post('/', authMiddleware, upload.array('media', 10), createPost);
// Reel có collection riêng — tạo reel qua POST /api/reels (routes/reels.js)
router.get('/:id', optionalAuth, getPost);
router.patch('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);

// --- Lưu trữ bài viết ---
router.patch('/:id/archive', authMiddleware, archivePost);
router.patch('/:id/unarchive', authMiddleware, unarchivePost);

// --- Ghi nhận lượt xem (tín hiệu cho trang Khám phá) ---
router.post('/:id/view', authMiddleware, recordPostView);

// --- Gắn thẻ người dùng vào ảnh ---
router.get('/:id/tags', optionalAuth, getPhotoTags);
router.post('/:id/tags', authMiddleware, addPhotoTag);
router.delete('/:id/tags/:tagId', authMiddleware, removePhotoTag);

module.exports = router;
