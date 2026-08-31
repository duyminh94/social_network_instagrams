// models/Message.js
// Tin nhắn trong conversation
//
// messageType: 'text' | 'image' | 'video' | 'post' | 'reel' | 'system'
//   → 'post': chia sẻ bài đăng vào chat, sharedPostId trỏ vào Post
//   → 'reel': chia sẻ reel, sharedReelId trỏ vào Reel
// storyMediaUrl/storyMediaType: dùng riêng cho tin nhắn reply story để hiện preview story
//
// replyToId: trỏ đến tin nhắn được reply (giống reply trong Telegram)
// forwardedFromId: tin nhắn gốc khi người dùng chuyển tiếp sang cuộc trò chuyện khác
// isPinned=true: tin nhắn được ghim lên đầu cuộc trò chuyện
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
    sharedReelId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', default: null },
    storyMediaUrl:  { type: String, default: '' },
    storyMediaType: { type: String, enum: ['image', 'video', ''], default: '' },
    replyToId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    // Tin nhắn gốc khi đây là tin được chuyển tiếp — client hiện nhãn "Đã chuyển tiếp"
    forwardedFromId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    // Người gửi tin nhắn gốc — giữ lại để hiện "Chuyển tiếp từ <tên>" kể cả khi
    // tin gốc bị xoá hoặc người xem không thuộc cuộc trò chuyện gốc
    forwardedFromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Ghim tin nhắn lên đầu cuộc trò chuyện
    isPinned:       { type: Boolean, default: false },
    pinnedAt:       { type: Date, default: null },
    pinnedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Tăng tốc query lấy tin nhắn trong conversation
messageSchema.index({ conversationId: 1, isDeleted: 1, createdAt: -1 });
// Lấy danh sách tin nhắn đã ghim của một cuộc trò chuyện
messageSchema.index({ conversationId: 1, isPinned: 1, pinnedAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
