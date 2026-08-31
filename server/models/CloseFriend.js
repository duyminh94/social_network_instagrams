// models/CloseFriend.js
// Danh sách "bạn thân" — chỉ những người này xem được story riêng tư
//
// Khác Follow ở chỗ đây là danh sách MỘT CHIỀU do chủ tài khoản tự chọn:
//   userId  : người sở hữu danh sách
//   friendId: người được đưa vào danh sách bạn thân
// Người được thêm KHÔNG nhận thông báo và không biết mình có trong danh sách.
//
// Story đăng với audience='close_friends' chỉ hiện cho những người trong danh sách này.

const mongoose = require('mongoose');

const closeFriendSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Không thêm cùng một người vào danh sách 2 lần
closeFriendSchema.index({ userId: 1, friendId: 1 }, { unique: true });
// Kiểm tra ngược "tôi có nằm trong danh sách bạn thân của người này không"
closeFriendSchema.index({ friendId: 1 });

module.exports = mongoose.model('CloseFriend', closeFriendSchema);
