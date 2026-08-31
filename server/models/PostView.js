// models/PostView.js
// Lượt xem bài viết — làm tương tự ReelView đã có sẵn cho reel
//
// Mục đích: biết user đã xem bài nào rồi để trang Khám phá không lặp lại nội dung cũ,
// và biết bài nào được xem nhiều để xếp hạng gợi ý.
//
// Mỗi cặp (userId, postId) chỉ 1 document, cộng dồn viewCount qua nhiều lần xem.
// lastViewedAt: lần xem gần nhất — dùng để ưu tiên nội dung user chưa xem lâu rồi.

const mongoose = require('mongoose');

const postViewSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    // Số lần user này mở/lướt qua bài — cộng dồn qua $inc
    viewCount:    { type: Number, default: 1 },
    lastViewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 1 user chỉ có 1 bản ghi cho mỗi bài — upsert + $inc viewCount
postViewSchema.index({ userId: 1, postId: 1 }, { unique: true });
// Lọc nhanh những bài user đã xem (để loại khỏi trang Khám phá)
postViewSchema.index({ userId: 1, lastViewedAt: -1 });

module.exports = mongoose.model('PostView', postViewSchema);
