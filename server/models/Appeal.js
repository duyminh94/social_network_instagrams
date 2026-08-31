// models/Appeal.js
// Kháng cáo — người dùng phản hồi khi bị khoá tài khoản hoặc bị gỡ nội dung
//
// Hiện tại admin ban user / xoá bài là quyết định một chiều, người dùng không có
// đường phản hồi. Model này mở kênh khiếu nại và ghi lại kết quả xử lý.
//
// targetType: 'account' → kháng cáo việc bị khoá tài khoản (targetId = userId)
//             'post' | 'reel' | 'comment' → kháng cáo việc nội dung bị gỡ
//
// Luồng: user gửi (pending) → admin duyệt (approved: khôi phục) hoặc từ chối (rejected)
// Quy tắc: mỗi đối tượng chỉ có 1 kháng cáo 'pending' cùng lúc — kiểm tra ở controller,
// vì sau khi bị từ chối vẫn được gửi lại nên không dùng unique index cứng.

const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // account: bị khoá tài khoản; post/reel/comment: nội dung bị gỡ
    targetType: { type: String, enum: ['account', 'post', 'reel', 'comment'], required: true },
    targetId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    // Người dùng trình bày lý do
    reason:     { type: String, required: true, trim: true, maxlength: 1000 },
    // pending: chờ xử lý, approved: chấp nhận và khôi phục, rejected: giữ nguyên quyết định cũ
    status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Kiểm tra "đối tượng này còn kháng cáo đang chờ không"
appealSchema.index({ userId: 1, targetType: 1, targetId: 1, status: 1 });
// Admin lọc danh sách theo trạng thái, mới nhất lên đầu
appealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Appeal', appealSchema);
