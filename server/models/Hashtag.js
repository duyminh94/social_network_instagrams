// models/Hashtag.js
// Hashtag dùng chung cho bài viết và reel
//
// Trước đây hashtag chỉ là mảng chuỗi trong Post/Reel. Muốn biết "tag nào đang hot"
// phải aggregate $unwind toàn bộ collection posts — chậm và không mở rộng được.
// Tách thành collection riêng để:
//   - Gợi ý hashtag khi gõ và xếp hạng trending chỉ đọc counter có sẵn
//   - Cho phép theo dõi hashtag (model HashtagFollow)
//
// name: luôn viết thường, KHÔNG chứa dấu '#' — chuẩn hoá bởi utils/hashtags.js
// postsCount / reelsCount: cập nhật qua $inc mỗi khi bài/reel được tạo, sửa caption, xoá
// lastUsedAt: dùng để xếp hạng trending — tag nhiều bài nhưng lâu rồi thì không còn hot

const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, lowercase: true, trim: true },
    postsCount:     { type: Number, default: 0 },
    reelsCount:     { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    // Lần gần nhất có nội dung mới dùng tag này
    lastUsedAt:     { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Mỗi tag chỉ có 1 document
hashtagSchema.index({ name: 1 }, { unique: true });
// Gợi ý hashtag khi gõ: lọc theo tên rồi xếp theo độ phổ biến
hashtagSchema.index({ postsCount: -1, reelsCount: -1 });
// Trending: tag được dùng gần đây, nhiều bài nhất lên đầu
hashtagSchema.index({ lastUsedAt: -1, postsCount: -1 });

module.exports = mongoose.model('Hashtag', hashtagSchema);
