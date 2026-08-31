// models/StoryPoll.js
// Sticker bình chọn gắn trên story
//
// Mỗi story có tối đa 1 poll. Câu hỏi + các lựa chọn nhúng thẳng vào document
// vì luôn đọc cả cụm và số lựa chọn rất nhỏ (2-4 phương án).
//
// votesCount trong từng option: tăng/giảm qua $inc khi có người bình chọn.
// Ai chọn phương án nào lưu riêng ở StoryPollVote (để biết user đã vote chưa,
// và đổi phương án thì trừ đúng chỗ cũ).
//
// expiresAt khớp với story: poll hết hiệu lực khi story hết hạn.

const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema(
  {
    text:       { type: String, required: true, trim: true, maxlength: 50 },
    votesCount: { type: Number, default: 0 },
  },
  { _id: true }
);

const storyPollSchema = new mongoose.Schema(
  {
    storyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question:   { type: String, required: true, trim: true, maxlength: 100 },
    // 2 đến 4 phương án — kiểm tra số lượng ở controller
    options:    { type: [pollOptionSchema], default: [] },
    totalVotes: { type: Number, default: 0 },
    // Hết hạn cùng lúc với story
    expiresAt:  { type: Date, required: true },
  },
  { timestamps: true }
);

// Mỗi story chỉ có 1 poll
storyPollSchema.index({ storyId: 1 }, { unique: true });
// Poll tự xoá khi story hết hạn (TTL index, giống models/Story.js)
storyPollSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('StoryPoll', storyPollSchema);
