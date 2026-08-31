// models/Mute.js
// Tắt tiếng một người mà KHÔNG bỏ theo dõi họ
//
// Khác Block: người bị tắt tiếng không hề biết, vẫn xem được trang cá nhân của mình,
// vẫn nhắn tin được. Chỉ là nội dung của họ không hiện trong feed/story bar của mình.
//
// Tách 2 công tắc riêng vì người dùng thường muốn ẩn bài nhưng vẫn xem story
// (hoặc ngược lại) — giống Instagram.

const mongoose = require('mongoose');

const muteSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mutedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Ẩn bài viết của người này khỏi feed
    mutePosts:   { type: Boolean, default: true },
    // Ẩn story của người này khỏi story bar
    muteStories: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Không tắt tiếng cùng một người 2 lần
muteSchema.index({ userId: 1, mutedUserId: 1 }, { unique: true });

module.exports = mongoose.model('Mute', muteSchema);
