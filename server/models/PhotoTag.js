// models/PhotoTag.js
// Gắn thẻ người dùng vào một vị trí cụ thể trên ảnh của bài viết
//
// Khác với Mention (nhắc tên trong chữ), PhotoTag gắn vào toạ độ trên ảnh —
// người xem bấm vào ảnh sẽ thấy tên người được gắn thẻ hiện ra đúng chỗ đó.
//
// x, y: toạ độ theo TỈ LỆ phần trăm của ảnh (0 → 1), không phải pixel
//   → ảnh hiển thị ở kích thước nào cũng đặt đúng vị trí, không lệch khi responsive
//
// mediaId: ảnh cụ thể trong bài (bài carousel có nhiều ảnh, mỗi ảnh gắn thẻ riêng)
// Chỉ chủ bài viết mới được gắn/gỡ thẻ.

const mongoose = require('mongoose');

const photoTagSchema = new mongoose.Schema(
  {
    postId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    // Ảnh cụ thể trong bài — bài carousel có nhiều PostMedia
    mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'PostMedia', required: true },
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Toạ độ theo tỉ lệ 0-1 so với kích thước ảnh
    x:       { type: Number, default: 0.5, min: 0, max: 1 },
    y:       { type: Number, default: 0.5, min: 0, max: 1 },
    // Người tạo thẻ (luôn là chủ bài viết)
    taggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Một người chỉ được gắn thẻ 1 lần trên cùng 1 ảnh
photoTagSchema.index({ mediaId: 1, userId: 1 }, { unique: true });
// Lấy toàn bộ thẻ của một bài khi mở bài
photoTagSchema.index({ postId: 1 });
// Xem "những bài nào có gắn thẻ tôi", mới nhất lên đầu
photoTagSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PhotoTag', photoTagSchema);
