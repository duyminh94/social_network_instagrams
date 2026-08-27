// models/MessageRead.js
// Ghi lại trạng thái đã đọc từng tin nhắn của từng thành viên
//
// Khi user đọc: tạo 1 record MessageRead (messageId + userId)
// Unique index: mỗi user chỉ có 1 record đã đọc trên 1 tin nhắn
// Dùng kết hợp với ConversationMember.lastSeenAt để hiện "đã đọc" trên UI

const mongoose = require('mongoose');

const messageReadSchema = new mongoose.Schema(
  {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt:    { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Mỗi user chỉ có 1 record đã đọc cho 1 tin nhắn
messageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MessageRead', messageReadSchema);
