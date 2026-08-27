// routes/auth.js
// Đăng ký, đăng nhập, xác thực email, quên/đặt lại mật khẩu, đổi mật khẩu
//
// Route công khai (không cần token): register, login, verify-email, resend-verification, forgot-password, reset-password
// Route cần đăng nhập: /me, logout, change-password
//
// resend-verification bị giới hạn 2 lần/giờ/IP bằng express-rate-limit
// Lý do: tránh spam gửi email kích hoạt, không lưu đếm vào DB

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { register, login, getMe, logout, changePassword, verifyEmail, resendVerification, forgotPassword, resetPassword, googleAuth } = require('../controllers/authController');

// Giới hạn gửi lại email kích hoạt: tối đa 2 lần mỗi giờ theo IP
var resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 2,
  message: { message: 'Bạn đã yêu cầu quá 2 lần. Vui lòng thử lại sau 1 giờ.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Route công khai
router.post('/google', googleAuth);
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendLimiter, resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Route cần đăng nhập
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);
router.patch('/change-password', authMiddleware, changePassword);

module.exports = router;
