// models/SearchHistory.js
// Lịch sử tìm kiếm gần đây của người dùng
//
// Hiện ô tìm kiếm (SearchPanel) đang trống khi chưa gõ gì. Có model này thì
// mở ra là thấy ngay các tài khoản/hashtag vừa xem.
//
// targetType:
//   'user'    → targetId trỏ vào User
//   'hashtag' → text là tên tag (không có targetId)
//   'keyword' → text là từ khoá tự do người dùng gõ
//
// TTL 90 ngày: lịch sử cũ tự biến mất, không tích tụ vô hạn.
// Mỗi user giữ tối đa 50 mục gần nhất — controller tự xoá bớt mục cũ.

const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // user: tìm tài khoản, hashtag: tìm thẻ, keyword: từ khoá tự do
    targetType: { type: String, enum: ['user', 'hashtag', 'keyword'], required: true },
    // Chỉ có khi targetType='user'
    targetId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Tên tag hoặc từ khoá — cũng lưu username khi targetType='user' để hiện lại nhanh
    text:       { type: String, default: '' },
    // Lần cuối tìm mục này — tìm lại thì cập nhật thay vì tạo bản ghi mới
    searchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Tìm lại cùng một thứ thì cập nhật bản ghi cũ, không tạo trùng
searchHistorySchema.index({ userId: 1, targetType: 1, text: 1 }, { unique: true });
// Danh sách lịch sử: mới nhất lên đầu
searchHistorySchema.index({ userId: 1, searchedAt: -1 });
// TTL 90 ngày kể từ lần tìm cuối
searchHistorySchema.index({ searchedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
