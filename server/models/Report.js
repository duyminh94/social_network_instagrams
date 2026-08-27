// models/Report.js
// Báo cáo nội dung vi phạm từ người dùng
//
// targetType: 'post' | 'reel' | 'story' | 'comment' | 'user'
// reason: giá trị cố định từ enum (spam, harassment, inappropriate, fake, violence, other)
// description: mô tả tự do thêm từ người báo cáo (không bắt buộc)
//
// status: 'pending' → chờ admin xử lý
//         'resolved' → admin xác nhận vi phạm và đã xử lý
//         'dismissed' → admin bác bỏ, không vi phạm
//
// reviewedBy: admin đã xử lý (ref User, không phải bảng Admin riêng)
// Unique index đảm bảo một user chỉ report cùng một target đúng một lần.

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    // reporterId: người báo cáo. Không bắt buộc khi là report do AI tự động tạo (isAuto)
    reporterId:  {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      required: function () { return !this.isAuto; },
    },
    // isAuto: report do hệ thống AI (OpenAI Moderation) tự tạo, không phải user báo cáo
    isAuto:      { type: Boolean, default: false },
    // autoFlagScore: điểm vi phạm AI chấm (0-100), null nếu là report của user
    autoFlagScore: { type: Number, default: null },
    // Đối tượng bị báo cáo
    targetId:    { type: mongoose.Schema.Types.ObjectId, required: true },
    targetType:  { type: String, required: true }, // 'post', 'reel', 'comment', 'user'
    // Lý do báo cáo
    reason:      {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate', 'fake', 'violence', 'other'],
      required: true,
    },
    description: { type: String, default: '' }, // mô tả thêm từ người báo cáo
    // pending: chờ xử lý, resolved: đã xử lý, dismissed: bác bỏ
    status:      { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionAction: {
      type: String,
      enum: ['no_action', 'hide_content', 'ban_user', 'hide_and_ban', ''],
      default: '',
    },
    resolutionNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

reportSchema.index(
  { reporterId: 1, targetType: 1, targetId: 1 },
  { unique: true, name: 'unique_report_per_user_target' }
);

module.exports = mongoose.model('Report', reportSchema);
