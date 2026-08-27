// models/StoryComment.js
// Comment/reply ngắn trên story.
// Tách riêng với Comment bài viết để logic story không ảnh hưởng post commentsCount.

const mongoose = require('mongoose');

const storyCommentSchema = new mongoose.Schema(
  {
    storyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content:   { type: String, required: true, trim: true, maxlength: 500 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

storyCommentSchema.index({ storyId: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('StoryComment', storyCommentSchema);
