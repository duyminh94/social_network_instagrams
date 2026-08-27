// models/VerificationRequest.js
// Yêu cầu cấp tích xanh từ người dùng — admin duyệt hoặc từ chối
//
// Luồng: user gửi yêu cầu (reason) → status 'pending'
//        admin duyệt  → status 'approved' + set user.isTrusted = true
//        admin từ chối → status 'rejected'
//
// Quy tắc: mỗi user chỉ có 1 yêu cầu 'pending' tại một thời điểm (kiểm tra ở controller).
// Sau khi bị từ chối thì được gửi lại → không dùng unique index cứng.

const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason:     { type: String, default: '' }, // user trình bày lý do muốn được xác minh
    status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '' }, // ghi chú của admin khi duyệt/từ chối
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
