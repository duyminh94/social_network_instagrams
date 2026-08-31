// models/Block.js
// Danh sách chặn — blockerId chặn blockedId
//
// Khi block: tự động xóa Follow 2 chiều (nếu đang follow nhau)
// Người bị chặn không thấy bài, profile, không follow được người đã chặn

const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema(
  {
    blockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Không cho chặn 1 người 2 lần
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
// Feed, profile, chat đều hỏi "ai đã chặn tôi" — query theo blockedId đứng một mình,
// index ghép ở trên không dùng được vì blockedId không phải field đầu tiên
blockSchema.index({ blockedId: 1 });

module.exports = mongoose.model('Block', blockSchema);
