// models/StoryLike.js
// Lưu user nào đã thả tim story nào.
// Unique index giúp một user chỉ tim một story một lần.

const mongoose = require('mongoose');

const storyLikeSchema = new mongoose.Schema(
  {
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

storyLikeSchema.index({ storyId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('StoryLike', storyLikeSchema);
