// models/AdminLog.js
// Lịch sử hành động của admin — dùng để kiểm soát lạm quyền và truy vết sự cố
//
// action: 'ban_user' | 'unban_user' | 'trust_user' | 'untrust_user' | 'update_role'
//         'delete_post' | 'delete_comment' | 'delete_story' | 'handle_report'
// targetType: 'user' | 'post' | 'comment' | 'story' | 'report'
// note: ghi chú tự do của admin khi thực hiện hành động
//
// adminId ref User (không có bảng admins riêng)
// Mỗi hành động admin đều ghi 1 log — xem qua GET /api/admin/logs

const mongoose = require('mongoose');

// Ghi lại mọi hành động của admin để kiểm tra sau
const adminLogSchema = new mongoose.Schema(
  {
    // adminId trỏ thẳng vào User (không cần bảng admins riêng)
    adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action:     { type: String, required: true },
    targetId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    targetType: { type: String, default: '' }, // 'user', 'post', 'comment', 'story', 'report'
    note:       { type: String, default: '' }, // ghi chú thêm của admin
  },
  { timestamps: true }
);

// Tăng tốc query log theo admin hoặc loại hành động
adminLogSchema.index({ adminId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
