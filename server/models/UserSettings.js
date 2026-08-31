// models/UserSettings.js
// Tuỳ chọn cá nhân của người dùng — tách khỏi User để bảng User không phình to
//
// User chứa dữ liệu định danh (được đọc ở hầu hết mọi query, cần nhẹ);
// UserSettings chứa cấu hình chỉ đọc khi vào trang Cài đặt hoặc khi tạo thông báo.
//
// Mỗi user có tối đa 1 document. Chưa có thì coi như dùng toàn bộ giá trị mặc định —
// controller tạo document lúc user mở trang Cài đặt lần đầu.

const mongoose = require('mongoose');

// Nhóm bật/tắt từng loại thông báo — createNotification() đọc để quyết định có gửi hay không
const notificationPrefsSchema = new mongoose.Schema(
  {
    like:          { type: Boolean, default: true },
    comment:       { type: Boolean, default: true },
    follow:        { type: Boolean, default: true },
    mention:       { type: Boolean, default: true },
    photo_tag:     { type: Boolean, default: true },
    message:       { type: Boolean, default: true },
  },
  { _id: false }
);

const userSettingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    notifications: { type: notificationPrefsSchema, default: function () { return {}; } },

    // Giao diện — khớp với ThemeContext và LanguageContext bên client
    language: { type: String, enum: ['vi', 'en'], default: 'vi' },
    theme:    { type: String, enum: ['light', 'dark', 'system'], default: 'system' },

    // Hiện trạng thái đang hoạt động cho người khác thấy
    showActivityStatus: { type: Boolean, default: true },
    // Ai được nhắn tin cho mình: everyone = tất cả, following = chỉ người mình đang follow
    allowMessagesFrom:  { type: String, enum: ['everyone', 'following'], default: 'everyone' },
    // Hiện gợi ý tài khoản tương tự trên trang cá nhân của mình
    showSuggestions:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Mỗi user chỉ có 1 bản cấu hình
userSettingsSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('UserSettings', userSettingsSchema);
