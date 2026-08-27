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

module.exports = mongoose.model('Block', blockSchema);
