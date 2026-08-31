// models/StoryPollVote.js
// Ghi lại ai đã bình chọn phương án nào trong một poll của story
//
// Unique index (pollId, userId): mỗi người chỉ có 1 phiếu trong 1 poll.
// Đổi phương án = cập nhật optionId của bản ghi này, đồng thời trừ votesCount
// của phương án cũ và cộng cho phương án mới (xử lý trong controller).
//
// Chủ story xem được ai chọn gì — giống danh sách người xem story.

const mongoose = require('mongoose');

const storyPollVoteSchema = new mongoose.Schema(
  {
    pollId:   { type: mongoose.Schema.Types.ObjectId, ref: 'StoryPoll', required: true },
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Id của phương án được chọn (là _id của phần tử trong StoryPoll.options)
    optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // Hết hạn cùng poll để không tích tụ dữ liệu chết
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Mỗi user chỉ 1 phiếu trong 1 poll
storyPollVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });
// TTL: dọn phiếu khi poll hết hạn
storyPollVoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('StoryPollVote', storyPollVoteSchema);
