// utils/notification.js
// Tạo thông báo và đẩy realtime — gọi từ controllers, không phải từ client
//
// Luồng: lưu DB → kiểm tra onlineUsers map → emit Socket.IO nếu đang online
//
// Tại sao lazy require('../index')?
//   → index.js import notification.js, notification.js lại cần io từ index.js
//   → Nếu require lúc module load sẽ bị circular dependency (require trả về {})
//   → Lazy require trong function body chạy sau khi cả 2 module đã load xong
//
// Không tạo thông báo khi recipientId === senderId (user tự like/comment bài mình)

const Notification = require('../models/Notification');

// Tạo thông báo và emit realtime nếu người nhận đang online
// Không tạo thông báo nếu người gửi = người nhận (tự thao tác)
async function createNotification(recipientId, senderId, type, referenceId, referenceType, message) {
  if (recipientId.toString() === senderId.toString()) {
    return;
  }

  var notification = await Notification.create({
    recipientId: recipientId,
    senderId: senderId,
    type: type,
    referenceId: referenceId || null,
    referenceType: referenceType || '',
    message: message || '',
  });

  // Lazy require để tránh circular dependency với index.js
  var app = require('../index');

  // FIX: onlineUsers lưu Map<userId, Set<socketId>>, không phải Map<userId, socketId>
  // → Dùng .has() để kiểm tra online, rồi emit đến room userId (user join room = userId lúc connect)
  // → io.to(userId) tự emit đến TẤT CẢ tab/thiết bị của user đó (multi-tab safe)
  if (app.onlineUsers.has(recipientId.toString())) {
    app.io.to(recipientId.toString()).emit('new_notification', notification);
  }

  return notification;
}

module.exports = { createNotification };
