// models/ReelView.js
// Lượt xem reel — tín hiệu "thích xem" mạnh nhất cho gợi ý nội dung.
//
// Mỗi cặp (userId, reelId) chỉ 1 document, cộng dồn watchedMs qua nhiều lần lướt qua.
// completed = true khi user dừng xem đủ lâu → coi như "thích xem reel này".
// Dùng để cá nhân hoá feed reel (getReels): ưu tiên reel của tác giả / nhóm người
// mà user hay xem hết.

const mongoose = require('mongoose');

const reelViewSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reelId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    // Tổng thời gian user dừng xem reel này (ms) — cộng dồn mỗi lần lướt qua
    watchedMs: { type: Number, default: 0 },
    // Xem đủ lâu (≥ 50% duration hoặc ≥ 3s) → tín hiệu thích xem rõ ràng
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 1 user chỉ có 1 bản ghi cho mỗi reel — upsert + $inc watchedMs
reelViewSchema.index({ userId: 1, reelId: 1 }, { unique: true });
// Truy vấn nhanh các reel mà user đã xem hết (phục vụ gợi ý)
reelViewSchema.index({ userId: 1, completed: 1 });
// Truy vấn collaborative: ai đã xem hết 1 reel cụ thể
reelViewSchema.index({ reelId: 1, completed: 1 });

module.exports = mongoose.model('ReelView', reelViewSchema);
