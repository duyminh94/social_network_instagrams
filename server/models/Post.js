// models/Post.js
// Bài đăng của người dùng
//
// type: 'image' (1 ảnh), 'carousel' (nhiều ảnh), 'video'
//   → media lưu riêng trong PostMedia, liên kết qua postId
//
// isDeleted=true: xóa mềm — bài vẫn còn trong DB, dùng để admin có thể xem lại
// deletedBy: null nếu chủ sở hữu tự xóa, ObjectId nếu admin xóa
//
// isArchived=true: chủ bài "lưu trữ" bài — ẩn khỏi profile công khai và feed người khác,
//   nhưng chủ tài khoản vẫn xem lại được trong mục Lưu trữ và bỏ lưu trữ bất cứ lúc nào.
//   Khác isDeleted ở chỗ đây là lựa chọn của user, không phải xoá.
//
// likesCount / commentsCount: tăng/giảm qua $inc, không đếm lại mỗi lần query
// commentsCount chỉ đếm comment gốc (parentId=null), không đếm reply

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    caption:          { type: String, default: '' },
    // hashtags: tách tự động từ caption (chữ thường, bỏ #) — phục vụ trang hashtag + tìm kiếm
    hashtags:         { type: [String], default: [] },
    type:             { type: String, enum: ['image', 'carousel', 'video'], default: 'image' },
    location:         { type: String, default: '' },
    commentsDisabled: { type: Boolean, default: false },
    isDeleted:        { type: Boolean, default: false },
    deletedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Bài đã lưu trữ: ẩn khỏi profile công khai, chỉ chủ tài khoản xem được
    isArchived:       { type: Boolean, default: false },
    archivedAt:       { type: Date, default: null },
    viewsCount:       { type: Number, default: 0 },
    likesCount:       { type: Number, default: 0 },
    commentsCount:    { type: Number, default: 0 },
    sharesCount:      { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
// Profile lọc bài chưa lưu trữ; mục Lưu trữ lọc bài đã lưu trữ — cùng dùng index này
postSchema.index({ userId: 1, isArchived: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ isDeleted: 1, likesCount: -1, createdAt: -1 });
// Tra bài theo hashtag nhanh (trang hashtag + tìm kiếm theo tag)
postSchema.index({ hashtags: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
