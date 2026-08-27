const mongoose = require('mongoose');

const reelCommentSchema = new mongoose.Schema(
  {
    reelId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'ReelComment', default: null },
    content:    { type: String, required: true },
    likesCount: { type: Number, default: 0 },
    isDeleted:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

reelCommentSchema.index({ reelId: 1, parentId: 1, isDeleted: 1 });

module.exports = mongoose.model('ReelComment', reelCommentSchema);
