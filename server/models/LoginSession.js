// models/LoginSession.js
// Phiên đăng nhập — mỗi lần đăng nhập thành công tạo 1 bản ghi
//
// Khác TokenBlacklist: blacklist chỉ ghi token ĐÃ logout để chặn dùng lại,
// còn model này ghi các phiên ĐANG hoạt động để user xem và tự đăng xuất từ xa.
//
// KHÔNG lưu token gốc — chỉ lưu bản băm SHA-256 (tokenHash).
// Nếu database bị lộ, kẻ tấn công không dùng hash để đăng nhập được.
//
// TTL index trên expiresAt: phiên hết hạn tự biến mất, không cần dọn thủ công.

const mongoose = require('mongoose');

const loginSessionSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Băm SHA-256 của JWT — dùng để đối chiếu khi user bấm "đăng xuất thiết bị này"
    tokenHash: { type: String, required: true },
    // Thông tin thiết bị lấy từ header User-Agent
    device:    { type: String, default: '' },   // vd: 'Chrome trên macOS'
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    lastActiveAt: { type: Date, default: Date.now },
    // Khớp thời hạn của JWT — TTL index xoá bản ghi khi tới hạn
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Danh sách phiên của một user, hoạt động gần nhất lên đầu
loginSessionSchema.index({ userId: 1, lastActiveAt: -1 });
// Tra phiên theo token khi đăng xuất
loginSessionSchema.index({ tokenHash: 1 }, { unique: true });
// TTL: MongoDB tự xoá phiên hết hạn
loginSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LoginSession', loginSessionSchema);
