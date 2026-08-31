// models/Restrict.js
// Hạn chế một người — mức nhẹ hơn chặn, dùng khi không muốn làm căng thẳng
//
// Người bị hạn chế KHÔNG được thông báo. Với họ mọi thứ trông vẫn bình thường:
//   - Bình luận của họ trên bài mình chỉ chính họ và mình nhìn thấy,
//     người khác không thấy (khác Block là chặn hẳn)
//   - Mình không nhận thông báo từ hành động của họ
//
// Đây là công cụ xử lý quấy rối nhẹ mà không cần chặn hẳn.

const mongoose = require('mongoose');

const restrictSchema = new mongoose.Schema(
  {
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restrictedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Không hạn chế cùng một người 2 lần
restrictSchema.index({ userId: 1, restrictedUserId: 1 }, { unique: true });
// Kiểm tra ngược "tôi có đang bị người này hạn chế không" (lọc bình luận)
restrictSchema.index({ restrictedUserId: 1 });

module.exports = mongoose.model('Restrict', restrictSchema);
