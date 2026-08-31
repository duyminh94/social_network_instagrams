// models/Collection.js
// Bộ sưu tập bài viết đã lưu — mỗi user tự tạo và đặt tên
//
// Trước đây tên bộ sưu tập chỉ là chuỗi lặp lại trong từng SavedPost.
// Tách thành collection riêng để:
//   - Đổi tên bộ sưu tập chỉ cần update 1 document thay vì update hàng loạt SavedPost
//   - Xoá bộ sưu tập mà không mất bài đã lưu (bài được gom về bộ sưu tập mặc định)
//   - Lưu được ảnh bìa và đếm số mục sẵn, không phải count mỗi lần mở trang
//
// isDefault=true: bộ sưu tập 'Tất cả' hệ thống tự tạo cho mỗi user, không cho xoá/đổi tên
// itemsCount: tăng/giảm qua $inc mỗi khi lưu/bỏ lưu, giống các counter khác trong dự án

const mongoose = require('mongoose');

// Tên bộ sưu tập mặc định — dùng chung cho controller và migration
const DEFAULT_COLLECTION_NAME = 'Tất cả';

const collectionSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:       { type: String, required: true, trim: true, maxlength: 50 },
    // Ảnh bìa: URL của media thuộc bài mới nhất trong bộ sưu tập, cập nhật khi lưu bài
    coverUrl:   { type: String, default: '' },
    itemsCount: { type: Number, default: 0 },
    // Bộ sưu tập 'Tất cả' — không cho user xoá hoặc đổi tên
    isDefault:  { type: Boolean, default: false },
    // isPrivate=true: chỉ chủ tài khoản xem được (mặc định bộ sưu tập luôn riêng tư)
    isPrivate:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Trong cùng 1 user không được có 2 bộ sưu tập trùng tên
collectionSchema.index({ userId: 1, name: 1 }, { unique: true });
// Danh sách bộ sưu tập của user, mới nhất lên đầu
collectionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Collection', collectionSchema);
module.exports.DEFAULT_COLLECTION_NAME = DEFAULT_COLLECTION_NAME;
