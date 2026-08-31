// models/User.js
// Tài khoản người dùng — bảng trung tâm của toàn bộ hệ thống
//
// passwordHash: lưu chuỗi đã hash, KHÔNG lưu plaintext
//   → pre('save') hook tự hash khi passwordHash bị thay đổi
//   → matchPassword() so sánh plaintext với hash khi đăng nhập
//
// isActive=false khi vừa đăng ký — phải kích hoạt email mới đăng nhập được
// isBanned=true thì auth.js từ chối token dù hợp lệ
// isTrusted: tick xanh xác thực, chỉ admin cấp
// role: 'user' | 'moderator' | 'super_admin' — lưu ở đây, không có bảng admins riêng
//
// postsCount / followersCount / followingCount: tăng/giảm trực tiếp ($inc)
//   thay vì đếm mỗi lần query — giữ cho các trang profile nhanh hơn
//
// emailVerifyToken / emailVerifyExpires: dùng cho luồng kích hoạt email (hết hạn 60 phút)
// resetPasswordToken / resetPasswordExpires: dùng cho luồng quên mật khẩu (hết hạn 60 phút)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username:       { type: String, required: true, unique: true, trim: true },
    email:          { type: String, required: true, unique: true, lowercase: true },
    phone:          { type: String, default: '' },
    passwordHash:   { type: String, default: '' },
    // Thông tin profile (gộp vào users, không dùng bảng user_profiles riêng)
    fullName:       { type: String, default: '' },
    avatarUrl:      { type: String, default: '' },
    bio:            { type: String, default: '' },
    website:        { type: String, default: '' },
    gender:         { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    // Quyền & trạng thái
    role:           { type: String, enum: ['user', 'moderator', 'super_admin'], default: 'user' },
    isActive:       { type: Boolean, default: false },  // false khi chưa kích hoạt email
    isPrivate:      { type: Boolean, default: false },
    isTrusted:      { type: Boolean, default: false },  // tick xanh do admin cấp
    isBanned:       { type: Boolean, default: false },
    // Counters
    postsCount:     { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    lastLogin:      { type: Date, default: null },
    // Xác thực email
    emailVerifyToken:   { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },
    // Quên mật khẩu
    resetPasswordToken:   { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    // Google OAuth
    googleId: { type: String, default: null, sparse: true },
    // OTP xác minh tích xanh
    verifyOtp:        { type: String, default: null },
    verifyOtpExpires: { type: Date, default: null },
    verifyOtpSentAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

// Tìm kiếm user lọc theo role + isBanned rồi mới regex trên username.
// Index này cho MongoDB thu hẹp trên index trước, không quét toàn bộ collection users.
userSchema.index({ role: 1, isBanned: 1, username: 1 });
// Gợi ý người dùng (Suggested) sắp theo lượng follower
userSchema.index({ isBanned: 1, isPrivate: 1, followersCount: -1 });

// Hook chạy tự động trước khi save: nếu passwordHash bị thay đổi thì hash lại
// Nhờ hook này, controller chỉ cần gán plaintext vào passwordHash, không cần tự hash
userSchema.pre('save', async function (next) {
  // isModified kiểm tra field có bị thay đổi trong lần save này không
  // Nếu không thay đổi (ví dụ chỉ update bio) thì bỏ qua, không hash lại
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }
  // bcrypt hash với salt round = 10 (cân bằng giữa bảo mật và tốc độ)
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

// So sánh mật khẩu người dùng nhập vào với hash trong DB khi đăng nhập
// bcrypt.compare tự xử lý salt, không cần tách thủ công
userSchema.methods.matchPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
