// models/Like.js
// Like bài viết hoặc comment — dùng chung 1 model qua targetType + targetId
//
// targetType='post': like bài viết, targetId là Post._id
// targetType='comment': like comment, targetId là Comment._id
//
// Khi like: tăng likesCount trong Post hoặc Comment tương ứng ($inc)
// Unique index ngăn like 2 lần cùng 1 target

const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // targetType: like bài viết hoặc comment
    targetType:  { type: String, enum: ['post', 'comment', 'reel', 'reelComment'], required: true },
    targetId:    { type: mongoose.Schema.Types.ObjectId, required: true },
    // reactionType: loại cảm xúc (like/love/haha/wow/sad/angry).
    //   Mỗi user vẫn chỉ 1 bản ghi Like/target → đổi cảm xúc = đổi trường này, KHÔNG tăng likesCount.
    reactionType: {
      type: String,
      enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
      default: 'like',
    },
  },
  { timestamps: true }
);

// Một user chỉ like 1 lần trên cùng 1 target
likeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
