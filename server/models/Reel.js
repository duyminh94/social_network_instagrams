// models/Reel.js
// Reel — video ngắn riêng biệt, lưu trong collection 'reels' (tách khỏi 'posts')
//
// videoUrl: URL Cloudinary hoặc local fallback
// audioUrl: URL nhạc nền — preset URL hoặc file upload
// filter:   CSS filter string áp lên video
// isPrivate: true → chỉ chủ sở hữu xem được
// isDeleted: xóa mềm

const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema(
  {
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    videoUrl:      { type: String, required: true },
    audioUrl:      { type: String, default: '' },
    audioName:     { type: String, default: '' },
    // Bài nhạc trong thư viện chung (models/Audio.js) — null nếu reel cũ hoặc
    // nhạc tải lên chưa đưa vào thư viện. audioUrl/audioName vẫn giữ để reel cũ chạy bình thường.
    audioId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Audio', default: null },
    filter:        { type: String, default: '' },
    trimStart:     { type: Number, default: 0 },
    trimEnd:       { type: Number, default: null },
    duration:      { type: Number, default: null },
    caption:       { type: String, default: '' },
    // hashtags: tách tự động từ caption (chữ thường, bỏ #) — phục vụ trang hashtag
    hashtags:      { type: [String], default: [] },
    isPrivate:     { type: Boolean, default: false },
    likesCount:    { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    isDeleted:     { type: Boolean, default: false },
    deletedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

reelSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
reelSchema.index({ isDeleted: 1, createdAt: -1 });
// Trang "Nhạc": tất cả reel dùng chung một bài nhạc
reelSchema.index({ audioId: 1, isDeleted: 1, createdAt: -1 });
// Tra reel theo hashtag nhanh (trang hashtag — tab Reels)
reelSchema.index({ hashtags: 1, isPrivate: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Reel', reelSchema);
