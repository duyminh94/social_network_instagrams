// routes/notifications.js
// Đọc, đánh dấu đọc, xóa thông báo
//
// User không tự tạo thông báo — server tự tạo qua utils/notification.js
// /unread-count và /read-all phải đứng trước /:id để tránh Express nhầm route

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

// GET  /api/notifications              — danh sách thông báo (phân trang)
// GET  /api/notifications/unread-count — đếm chưa đọc
// PATCH /api/notifications/read-all   — đánh dấu tất cả đã đọc
// PATCH /api/notifications/:id/read   — đánh dấu 1 thông báo đã đọc
// DELETE /api/notifications/:id       — xóa thông báo

router.get('/', auth, getNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.patch('/read-all', auth, markAllAsRead);
router.patch('/:id/read', auth, markAsRead);
router.delete('/:id', auth, deleteNotification);

module.exports = router;
