// routes/admin.js
// Tất cả API quản trị: user, report, nội dung vi phạm, logs, thống kê
//
// Mọi route dùng adminAuth — kiểm tra token hợp lệ VÀ role không phải 'user'
// Roles được phép: 'moderator' hoặc 'super_admin'
// super_admin toàn quyền; moderator chỉ xử lý report/nội dung vi phạm

const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getUsers,
  getUserDetail,
  getUserActivity,
  banUser,
  unbanUser,
  trustUser,
  untrustUser,
  updateRole,
  getReports,
  getReportDetail,
  handleReport,
  getVerificationRequests,
  handleVerificationRequest,
  deletePost,
  deleteComment,
  deleteStory,
  getLogs,
  getStats,
  getAppeals,
  handleAppeal,
} = require('../controllers/adminController');
const {
  getAdminContentList,
  getAdminContentDetail,
  getAdminContentInteractions,
  hideAdminContent,
  unhideAdminContent,
} = require('../controllers/adminContentController');
const { askAdminAi } = require('../controllers/adminAiController');

function superAdminOnly(req, res, next) {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Chỉ super_admin mới có quyền thực hiện chức năng này' });
  }
  next();
}

// --- Trợ lý AI admin ---
router.post('/ai/ask', adminAuth, askAdminAi);

// --- Quản lý User ---
router.get('/users', adminAuth, superAdminOnly, getUsers);
router.get('/users/:id/activity', adminAuth, getUserActivity);
router.get('/users/:id', adminAuth, getUserDetail);
router.patch('/users/:id/ban', adminAuth, banUser);
router.patch('/users/:id/unban', adminAuth, superAdminOnly, unbanUser);
router.patch('/users/:id/trust', adminAuth, superAdminOnly, trustUser);
router.patch('/users/:id/untrust', adminAuth, superAdminOnly, untrustUser);
router.patch('/users/:id/role', adminAuth, superAdminOnly, updateRole);

// --- Quản lý nội dung ---
router.get('/content/:contentType', adminAuth, getAdminContentList);
router.get('/content/:contentType/:id/interactions', adminAuth, getAdminContentInteractions);
router.get('/content/:contentType/:id', adminAuth, getAdminContentDetail);
router.patch('/content/:contentType/:id/hide', adminAuth, hideAdminContent);
router.patch('/content/:contentType/:id/unhide', adminAuth, unhideAdminContent);

// --- Quản lý Report ---
router.get('/reports', adminAuth, getReports);
router.get('/reports/:id', adminAuth, getReportDetail);
router.patch('/reports/:id', adminAuth, handleReport);

// --- Yêu cầu cấp tích xanh ---
router.get('/verifications', adminAuth, superAdminOnly, getVerificationRequests);
router.patch('/verifications/:id', adminAuth, superAdminOnly, handleVerificationRequest);

// --- Xóa nội dung vi phạm ---
router.delete('/posts/:id', adminAuth, deletePost);
router.delete('/comments/:id', adminAuth, deleteComment);
router.delete('/stories/:id', adminAuth, deleteStory);

// --- Kháng cáo của người dùng (bị khoá tài khoản / bị gỡ nội dung) ---
router.get('/appeals', adminAuth, getAppeals);
router.patch('/appeals/:id', adminAuth, superAdminOnly, handleAppeal);

// --- Logs & Stats ---
router.get('/logs', adminAuth, superAdminOnly, getLogs);
router.get('/stats', adminAuth, getStats);

module.exports = router;
