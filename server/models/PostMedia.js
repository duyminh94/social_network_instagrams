// models/PostMedia.js
// Ảnh hoặc video đính kèm bài viết
//
// Mỗi Post có thể có nhiều PostMedia (carousel tối đa 10 file)
// displayOrder: thứ tự hiển thị trong carousel, bắt đầu từ 0
// thumbnailUrl: chỉ dùng cho video (ảnh preview trước khi play)
// url: đường dẫn file local trong server/uploads/

const mongoose = require('mongoose');

const postMediaSchema = new mongoose.Schema(
  {
    postId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    mediaType:    { type: String, enum: ['image', 'video'], required: true },
    url:          { type: String, required: true },
    thumbnailUrl: { type: String, default: '' }, // dùng cho video
    altText:      { type: String, default: '' },
    width:        { type: Number, default: 0 },
    height:       { type: Number, default: 0 },
    displayOrder: { type: Number, default: 0 }, // thứ tự trong carousel
  },
  { timestamps: true }
);

module.exports = mongoose.model('PostMedia', postMediaSchema);
