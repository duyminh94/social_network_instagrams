// models/SavedPost.js
// Một mục đã lưu của người dùng — có thể là bài viết hoặc reel
//
// targetType + targetId: cùng cách làm với model Like — 1 collection dùng chung
//   targetType='post' → targetId là Post._id
//   targetType='reel' → targetId là Reel._id
// Không dùng ref cố định vì target có 2 loại; controller tự query Post/Reel theo nhóm.
//
// collectionId: bộ sưu tập chứa mục này (ref Collection)
//   → mỗi user luôn có sẵn bộ sưu tập mặc định 'Tất cả' (Collection.isDefault=true)
//
// Unique index ngăn lưu cùng 1 target 2 lần

const mongoose = require('mongoose');

const savedPostSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // post: bài viết thường, reel: video ngắn
    targetType:   { type: String, enum: ['post', 'reel'], default: 'post', required: true },
    targetId:     { type: mongoose.Schema.Types.ObjectId, required: true },
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
  },
  { timestamps: true }
);

// Một user không lưu 1 target 2 lần
savedPostSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
// Mở 1 bộ sưu tập: lấy các mục trong đó, mới nhất lên đầu
savedPostSchema.index({ collectionId: 1, createdAt: -1 });

module.exports = mongoose.model('SavedPost', savedPostSchema);
