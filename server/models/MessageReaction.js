// models/MessageReaction.js
// Thả cảm xúc lên một tin nhắn trong chat
//
// Làm giống model Like đã có cho bài viết: mỗi người chỉ 1 cảm xúc trên 1 tin nhắn,
// đổi cảm xúc là cập nhật reactionType chứ không tạo bản ghi mới.
// Dùng chung bộ 6 cảm xúc với Like để client tái sử dụng được ReactionBar sẵn có.
//
// Không denormalize counter vào Message: một tin nhắn thường chỉ có vài cảm xúc,
// và luôn cần biết AI thả cảm xúc gì (để hiện avatar) nên vẫn phải đọc bảng này.

const mongoose = require('mongoose');

const messageReactionSchema = new mongoose.Schema(
  {
    messageId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Cùng bộ giá trị với models/Like.js
    reactionType: {
      type: String,
      enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
      default: 'love',
    },
  },
  { timestamps: true }
);

// Mỗi user chỉ có 1 cảm xúc trên 1 tin nhắn
messageReactionSchema.index({ messageId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MessageReaction', messageReactionSchema);
