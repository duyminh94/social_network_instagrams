// models/Conversation.js
// Cuộc trò chuyện — 1-1 (direct) hoặc nhóm (group)
//
// type='direct': 2 người, không có tên/ảnh nhóm
// type='group': nhiều người, có name và avatarUrl
//
// lastActivityAt: cập nhật mỗi khi có tin nhắn mới
//   → dùng để sắp xếp danh sách conversation theo tin nhắn gần nhất
// Thành viên lưu riêng trong ConversationMember

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // direct: nhắn tin 1-1, group: nhóm chat
    type:           { type: String, enum: ['direct', 'group'], default: 'direct' },
    name:           { type: String, default: '' },       // tên nhóm (chỉ dùng cho group)
    avatarUrl:      { type: String, default: '' },       // ảnh nhóm
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastActivityAt: { type: Date, default: Date.now },   // cập nhật mỗi khi có tin nhắn mới
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
