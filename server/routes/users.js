// routes/users.js
// Quản lý profile người dùng: xem, sửa, upload avatar, đặt riêng tư, tìm kiếm, danh sách follow
//
// Route /search phải đặt trước /:username để Express không nhận nhầm "search" là username
// updateAvatar dùng upload.single('avatar') — multer xử lý multipart/form-data

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const upload = require('../middleware/upload');
const {
  searchUsers,
  getSuggestions,
  getProfile,
  updateProfile,
  updateAvatar,
  removeAvatar,
  updatePrivacy,
  getFollowers,
  getFollowing,
} = require('../controllers/userController');

// Đặt /search trước /:username để tránh bị hiểu nhầm "search" là username
// Dùng optionalAuth để nhận diện viewer nếu có token — cần biết ai đang follow ai
router.get('/search', optionalAuth, searchUsers);
router.get('/suggestions', authMiddleware, getSuggestions);

// Route cần đăng nhập
router.patch('/profile', authMiddleware, updateProfile);
router.patch('/avatar', authMiddleware, upload.single('avatar'), updateAvatar);
router.delete('/avatar', authMiddleware, removeAvatar);
router.patch('/privacy', authMiddleware, updatePrivacy);

// Route công khai — dùng optionalAuth để nhận diện user nếu có token
// Cần biết viewer là ai để: check block, ẩn/hiện email+phone, nhận diện owner
router.get('/:username', optionalAuth, getProfile);
router.get('/:id/followers', optionalAuth, getFollowers);
router.get('/:id/following', optionalAuth, getFollowing);

module.exports = router;
