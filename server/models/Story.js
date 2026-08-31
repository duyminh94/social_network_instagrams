// models/Story.js
// Story 24h tự động xóa bằng MongoDB TTL index
//
// expiresAt = createdAt + 24 giờ (tính lúc tạo trong storyController)
// TTL index chạy background job mỗi 60 giây — không xóa chính xác đúng giây
//
// isDeleted=true: admin hoặc chủ story tự xóa trước khi hết hạn
//   → cần lọc isDeleted=false khi query vì TTL chưa kịp xóa document
//
// viewsCount: tăng mỗi khi có người xem, đọc lại bằng {new:true} trong findByIdAndUpdate
// likesCount / commentsCount: tăng/giảm qua $inc giống Post
//   → trước đây phải countDocuments trên StoryLike/StoryComment mỗi lần mở story
// stickerData: JSON string lưu vị trí và nội dung sticker/text overlay trên story

const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl:  { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    caption:   { type: String, default: '' },
    // stickerData: lưu dạng JSON string (vị trí sticker, emoji, text...)
    stickerData: { type: String, default: '' },
    // allowComments=false: chủ story tắt bình luận, không ai trả lời được
    allowComments: { type: Boolean, default: true },
    // public: mọi người follow đều xem được
    // close_friends: chỉ người trong danh sách bạn thân (model CloseFriend) xem được
    audience: { type: String, enum: ['public', 'close_friends'], default: 'public' },
    viewsCount:    { type: Number, default: 0 },
    likesCount:    { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    isDeleted:   { type: Boolean, default: false },
    // MongoDB TTL index sẽ tự xóa story sau 24h
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Tự động xóa document khi đến thời điểm expiresAt
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Story bar và trang profile luôn lấy story còn hạn của một user
storySchema.index({ userId: 1, isDeleted: 1, expiresAt: 1 });

module.exports = mongoose.model('Story', storySchema);
