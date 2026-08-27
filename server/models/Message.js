// models/Message.js
// Tin nhắn trong conversation
//
// messageType: 'text' | 'image' | 'video' | 'post' | 'reel' | 'system'
//   → 'post': chia sẻ bài đăng vào chat, sharedPostId trỏ vào Post
//   → 'reel': chia sẻ reel (Reel đã bỏ khỏi ERD nên sharedReelId không có ref)
// storyMediaUrl/storyMediaType: dùng riêng cho tin nhắn reply story để hiện preview story
//
// replyToId: trỏ đến tin nhắn được reply (giống reply trong Telegram)
// isDeleted=true: xóa mềm — người gửi không thấy nữa nhưng record vẫn trong DB
//
// Tin nhắn realtime qua Socket.IO (event 'send_message' trong index.js)
// REST API chỉ dùng để load lịch sử chat khi mở conversation

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content:        { type: String, default: '' },
    // text: tin nhắn thường, image: ảnh, video: video, post: chia sẻ bài viết, reel: chia sẻ reel
    messageType:    { type: String, enum: ['text', 'image', 'video', 'post', 'reel', 'system'], default: 'text' },
    sharedPostId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    sharedReelId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    storyMediaUrl:  { type: String, default: '' },
    storyMediaType: { type: String, enum: ['image', 'video', ''], default: '' },
    replyToId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    isDeleted:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Tăng tốc query lấy tin nhắn trong conversation
messageSchema.index({ conversationId: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
