// notificationController.js
// Quản lý thông báo của người dùng
//
// Thông báo được tạo tự động phía server (utils/notification.js) khi:
//   - Có người like/comment bài viết
//   - Có người follow hoặc gửi follow request
//   - Admin ban tài khoản, xóa bài vi phạm
//
// User KHÔNG tự tạo thông báo, chỉ đọc/đánh dấu đọc/xóa
// Chỉ người nhận (recipientId) mới được đánh dấu đọc hoặc xóa thông báo của mình

const Notification = require('../models/Notification');
const { getPagination } = require('../utils/pagination');

// GET /api/notifications?page=&limit=
async function getNotifications(req, res, next) {
  try {
    var userId = req.user.id;
    var { page, limit, skip } = getPagination(req, 20);

    var total = await Notification.countDocuments({ recipientId: userId });
    var totalPages = Math.ceil(total / limit);

    var notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username fullName avatarUrl')
      .lean();

    return res.json({ notifications, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// GET /api/notifications/unread-count
// Dùng để hiển thị badge số thông báo chưa đọc trên UI
async function getUnreadCount(req, res, next) {
  try {
    var count = await Notification.countDocuments({ recipientId: req.user.id, isRead: false });
    return res.json({ unreadCount: count });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/notifications/:id/read
async function markAsRead(req, res, next) {
  try {
    var notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }

    // Chỉ người nhận mới được đánh dấu đọc thông báo của mình
    if (notification.recipientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền' });
    }

    notification.isRead = true;
    await notification.save();

    return res.json({ message: 'Đã đánh dấu đọc' });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/notifications/read-all
// updateMany cập nhật tất cả document khớp điều kiện trong 1 lần query
async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, isRead: false },
      { isRead: true }
    );

    return res.json({ message: 'Đã đánh dấu tất cả là đã đọc' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/notifications/:id
async function deleteNotification(req, res, next) {
  try {
    var notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }

    if (notification.recipientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền' });
    }

    await Notification.deleteOne({ _id: req.params.id });

    return res.json({ message: 'Đã xóa thông báo' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };
