// models/Notification.js
// Thông báo gửi đến người dùng
//
// Server tự tạo qua utils/notification.js — user KHÔNG gọi API để tạo thông báo
//
// type: 'like' | 'comment' | 'follow' | 'follow_request' | 'account_banned' | 'post_removed' | ...
// referenceId + referenceType: trỏ đến đối tượng liên quan (vd: post, comment, follow)
//   → dùng để frontend điều hướng khi user bấm vào thông báo
//
// senderId=null: thông báo hệ thống (account_banned, post_removed do admin)
// Realtime: mỗi khi tạo notification, server emit 'new_notification' qua Socket.IO

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // like, comment, follow, follow_request, tag, ban
    type:          { type: String, required: true },
    // referenceId + referenceType: trỏ đến đối tượng liên quan (post, comment, follow...)
    referenceId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    referenceType: { type: String, default: '' },
    // message: nội dung tự do kèm theo (vd: lý do admin thu hồi tích xanh)
    message:       { type: String, default: '' },
    isRead:        { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Tăng tốc query thông báo của 1 user, lọc theo trạng thái đọc
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
