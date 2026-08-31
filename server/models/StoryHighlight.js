// models/StoryHighlight.js
// Bộ sưu tập story được giữ lại vĩnh viễn trên trang cá nhân
//
// Story gốc bị MongoDB TTL index tự xoá sau 24 giờ (xem models/Story.js).
// Vì vậy highlight KHÔNG ref tới Story — nếu ref, sau 24h highlight sẽ rỗng.
// Thay vào đó mỗi mục highlight lưu bản sao (snapshot) media của story:
// mediaUrl, mediaType, caption được chép lại lúc thêm vào highlight.
//
// storyId chỉ giữ để tham chiếu lịch sử, có thể trỏ tới story đã bị xoá.

const mongoose = require('mongoose');

// Một mục trong highlight — bản sao của story tại thời điểm được thêm vào
const highlightItemSchema = new mongoose.Schema(
  {
    // Story gốc — có thể đã bị TTL xoá, chỉ dùng để tra cứu lịch sử
    storyId:           { type: mongoose.Schema.Types.ObjectId, default: null },
    // Bản sao nội dung: giữ lại kể cả khi story gốc biến mất
    mediaUrl:          { type: String, required: true },
    mediaType:         { type: String, enum: ['image', 'video'], required: true },
    caption:           { type: String, default: '' },
    // Thời điểm đăng story gốc — để hiển thị đúng thứ tự thời gian
    originalCreatedAt: { type: Date, default: Date.now },
  },
  { _id: true, timestamps: false }
);

const storyHighlightSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:    { type: String, required: true, trim: true, maxlength: 30 },
    // Ảnh bìa hiện trên trang cá nhân — mặc định lấy media của mục đầu tiên
    coverUrl: { type: String, default: '' },
    // Các mục nhúng thẳng vào đây: mỗi highlight chỉ vài chục mục,
    // luôn đọc/ghi cả cụm nên không cần tách collection riêng
    items:    { type: [highlightItemSchema], default: [] },
  },
  { timestamps: true }
);

// Danh sách highlight trên trang cá nhân, mới nhất lên đầu
storyHighlightSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('StoryHighlight', storyHighlightSchema);
