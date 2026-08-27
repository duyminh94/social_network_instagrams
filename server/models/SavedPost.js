// models/SavedPost.js
// Bài viết đã lưu của người dùng, phân vào bộ sưu tập
//
// collectionName: tên bộ sưu tập do user tự đặt khi lưu
//   → mặc định 'Tất cả' nếu không truyền
//   → dùng distinct('collectionName') để lấy danh sách không trùng lặp
// Unique index ngăn lưu cùng 1 bài 2 lần

const mongoose = require('mongoose');

const savedPostSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    collectionName: { type: String, default: 'Tất cả' },
  },
  { timestamps: true }
);

// Một user không lưu 1 bài 2 lần
savedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('SavedPost', savedPostSchema);
