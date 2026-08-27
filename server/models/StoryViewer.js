// models/StoryViewer.js
// Ghi lại ai đã xem story — dùng để hiển thị danh sách người xem cho chủ story
//
// Unique index ngăn tính 2 lần nếu cùng người xem lại
// Mỗi lần tạo StoryViewer mới: tăng viewsCount trong Story tương ứng ($inc)
// viewerId !== storyOwner — chủ story tự xem không tính lượt

const mongoose = require('mongoose');

const storyViewerSchema = new mongoose.Schema(
  {
    storyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Mỗi người chỉ được tính 1 lượt xem
storyViewerSchema.index({ storyId: 1, viewerId: 1 }, { unique: true });

module.exports = mongoose.model('StoryViewer', storyViewerSchema);
