// models/ConversationMember.js
// Thành viên trong một conversation
//
// role='admin': có thể thêm/xóa thành viên, đổi tên/ảnh nhóm
// role='member': chỉ gửi/nhận tin, không quản lý nhóm
//
// status='accepted': conversation hiển thị trong "Tin nhắn" bình thường
// status='pending' : conversation nằm trong "Tin nhắn đang chờ" — người nhận chưa chấp nhận
//   → Xảy ra khi người gửi không được người nhận follow
//   → Người gửi (sender) luôn có status='accepted', chỉ receiver mới có thể 'pending'
//
// nickname: biệt danh của thành viên này TRONG nhóm/cuộc trò chuyện này
//   → chỉ có hiệu lực ở đây, không đổi tên thật của user
//   → bất kỳ thành viên nào cũng đặt được cho người khác (giống Messenger)
//   → chuỗi rỗng nghĩa là dùng lại fullName/username gốc
//
// Khi admin duy nhất rời nhóm: thành viên vào lâu nhất tự động lên làm admin
// lastSeenAt: dùng để tính tin nhắn chưa đọc (so sánh với createdAt của Message)
// Unique index ngăn add cùng 1 user vào conversation 2 lần

const mongoose = require('mongoose');

const conversationMemberSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // admin: có thể thêm/xóa thành viên, đổi tên nhóm; member: thành viên thường
    role:           { type: String, enum: ['admin', 'member'], default: 'member' },
    lastSeenAt:     { type: Date, default: null }, // thời điểm đọc tin nhắn gần nhất
    // Biệt danh riêng trong cuộc trò chuyện này — rỗng thì dùng tên thật
    nickname:       { type: String, default: '', trim: true, maxlength: 40 },
    // accepted: hiện trong "Tin nhắn"; pending: hiện trong "Tin nhắn đang chờ"
    status:         { type: String, enum: ['accepted', 'pending'], default: 'accepted' },
  },
  { timestamps: true }
);

// Mỗi user chỉ có 1 record trong 1 conversation
conversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ConversationMember', conversationMemberSchema);
