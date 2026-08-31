// models/HashtagFollow.js
// Người dùng theo dõi một hashtag
//
// Bài viết mang hashtag đã theo dõi sẽ xuất hiện trong feed (getFeed),
// bên cạnh bài của những người mà user follow.
//
// Lưu cả hashtagId lẫn name: name để lọc bài trong feed mà không phải join lại,
// hashtagId để cập nhật followersCount và điều hướng sang trang hashtag.

const mongoose = require('mongoose');

const hashtagFollowSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hashtagId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hashtag', required: true },
    // Bản sao tên tag — feed lọc Post.hashtags theo chuỗi này, không cần join Hashtag
    name:      { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

// Không theo dõi 1 hashtag 2 lần
hashtagFollowSchema.index({ userId: 1, hashtagId: 1 }, { unique: true });
// Lấy các tag mình đang theo dõi (dùng mỗi lần load feed)
hashtagFollowSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('HashtagFollow', hashtagFollowSchema);
