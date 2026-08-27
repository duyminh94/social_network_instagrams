// routes/follow.js
// Follow/unfollow người dùng, xét duyệt follow request (tài khoản riêng tư)
//
// Tất cả route đều cần đăng nhập — dùng router.use(authMiddleware) 1 lần cho gọn
// Nếu tài khoản người được follow là riêng tư (isPrivate=true), tạo Follow với status='pending'
// Người bị follow phải vào /requests để chấp nhận hoặc từ chối

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { followUser, unfollowUser, acceptFollow, rejectFollow, getFollowRequests } = require('../controllers/followController');

// Tất cả route follow đều cần đăng nhập
router.use(authMiddleware);

// Đặt /requests trước /:userId để tránh bị hiểu nhầm
router.get('/requests', getFollowRequests);

router.post('/:userId', followUser);
router.delete('/:userId', unfollowUser);
router.patch('/:followerId/accept', acceptFollow);
router.delete('/:followerId/reject', rejectFollow);

module.exports = router;
