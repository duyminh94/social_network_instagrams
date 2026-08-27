// models/TokenBlacklist.js
// Lưu danh sách token đã bị vô hiệu hoá (sau khi logout)
//
// Vấn đề cần giải quyết:
//   JWT là stateless — server không lưu trạng thái, không biết token đã logout hay chưa
//   Nếu không có blacklist: token bị đánh cắp sau logout vẫn dùng được trong 7 ngày
//
// Giải pháp: khi logout, lưu token vào blacklist
//   → middleware/auth.js kiểm tra blacklist mỗi request
//   → Nếu token có trong blacklist → từ chối dù chữ ký còn hợp lệ
//
// TTL index: MongoDB tự xóa document khi expiresAt < thời điểm hiện tại
//   → Không cần xóa thủ công, DB không bị phình to theo thời gian
//   → expiresAt = thời điểm logout + 7 ngày (khớp với JWT_EXPIRES_IN)

const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema(
  {
    // Token JWT đầy đủ (chuỗi ký tự dài)
    token: { type: String, required: true, unique: true },

    // Thời điểm token tự hết hạn — MongoDB TTL index dựa vào field này để tự xóa
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB chạy background job mỗi 60 giây để xóa document hết hạn
// expireAfterSeconds: 0 nghĩa là xóa ngay khi expiresAt đến
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
