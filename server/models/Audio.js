// models/Audio.js
// Thư viện nhạc nền dùng chung cho reel
//
// Trước đây mỗi reel lưu audioUrl + audioName riêng — 100 reel dùng cùng bài nhạc
// thì lặp lại 100 lần, và không trả lời được câu hỏi "còn reel nào dùng nhạc này".
// Tách thành collection riêng để:
//   - Xem tất cả reel dùng chung một bài nhạc (trang "Nhạc")
//   - Xếp hạng nhạc đang thịnh hành theo usageCount
//
// source='preset': nhạc có sẵn của hệ thống, mọi người đều dùng được
// source='upload': người dùng tự tải lên khi tạo reel
//
// Reel vẫn giữ audioUrl/audioName để reel cũ không vỡ; reel mới trỏ thêm audioId.

const mongoose = require('mongoose');

const audioSchema = new mongoose.Schema(
  {
    title:      { type: String, required: true, trim: true, maxlength: 100 },
    artist:     { type: String, default: '', trim: true, maxlength: 100 },
    url:        { type: String, required: true },
    // Ảnh bìa bài nhạc (nếu có)
    coverUrl:   { type: String, default: '' },
    // Thời lượng tính bằng giây
    duration:   { type: Number, default: null },
    // preset: nhạc hệ thống, upload: người dùng tự tải lên
    source:     { type: String, enum: ['preset', 'upload'], default: 'preset' },
    // Người tải lên — null với nhạc preset của hệ thống
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Số reel đang dùng bài nhạc này — tăng/giảm qua $inc
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Nhạc thịnh hành: dùng nhiều nhất lên đầu
audioSchema.index({ usageCount: -1 });
// Tìm nhạc theo tên
audioSchema.index({ title: 1 });

module.exports = mongoose.model('Audio', audioSchema);
