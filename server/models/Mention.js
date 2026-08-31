// models/Mention.js
// Nhắc tên người dùng bằng @username trong caption hoặc bình luận
//
// Trước đây @username trong caption chỉ là chữ thường — không tra ngược được
// "những bài nào đang nhắc đến tôi". Tách thành collection riêng để:
//   - Người bị nhắc xem được danh sách nội dung nhắc tới mình
//   - Gửi thông báo đúng người, không phải quét lại caption
//
// sourceType: 'post' | 'reel' | 'comment'  — loại nội dung chứa lời nhắc
// sourceId  : id của nội dung đó
// mentionedUserId: người ĐƯỢC nhắc tới
// authorId  : người viết nội dung chứa lời nhắc
//
// Khi caption/comment được sửa: xoá hết Mention cũ của nội dung đó rồi tạo lại
// theo danh sách mới (xem utils/mentions.js)

const mongoose = require('mongoose');

const mentionSchema = new mongoose.Schema(
  {
    mentionedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // post: caption bài viết, reel: caption reel, comment: nội dung bình luận
    sourceType:      { type: String, enum: ['post', 'reel', 'comment'], required: true },
    sourceId:        { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

// Một người chỉ được nhắc 1 lần trong cùng một nội dung
mentionSchema.index({ mentionedUserId: 1, sourceType: 1, sourceId: 1 }, { unique: true });
// Xem "ai đang nhắc đến tôi", mới nhất lên đầu
mentionSchema.index({ mentionedUserId: 1, createdAt: -1 });
// Xoá toàn bộ lời nhắc của một nội dung khi nội dung bị sửa hoặc xoá
mentionSchema.index({ sourceType: 1, sourceId: 1 });

module.exports = mongoose.model('Mention', mentionSchema);
