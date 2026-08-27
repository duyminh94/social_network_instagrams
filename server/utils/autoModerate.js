// utils/autoModerate.js
// Tự động kiểm duyệt text nội dung do user tạo (bài viết / comment / reel).
// Nếu OpenAI Moderation bật cờ vi phạm → tạo Report tự động (pending) cho admin xử lý.
//
// Thiết kế: fire-and-forget — KHÔNG bao giờ ném lỗi ra ngoài, không chặn việc đăng.
// Gọi không cần await trong controller để khỏi làm chậm response.

const Report = require('../models/Report');
const { moderateContent, isConfigured } = require('./openaiModeration');

// OpenAI phải TẢI được ảnh từ URL → chỉ gửi URL public (https, không phải localhost).
// Ảnh fallback lưu local (localhost/uploads) thì bỏ qua, không quét được.
function isPublicUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.indexOf('https://') !== 0) return false;
  if (url.indexOf('localhost') !== -1 || url.indexOf('127.0.0.1') !== -1) return false;
  return true;
}

// Map category của OpenAI → reason enum sẵn có trong Report
//   enum: spam | harassment | inappropriate | fake | violence | other
function mapCategoryToReason(category) {
  if (!category) return 'other';
  if (category.indexOf('harassment') === 0 || category.indexOf('hate') === 0) return 'harassment';
  if (category.indexOf('violence') === 0) return 'violence';
  if (category.indexOf('sexual') === 0 || category.indexOf('self-harm') === 0) return 'inappropriate';
  return 'other';
}

// text:       nội dung cần quét (caption / comment content)
// targetType: 'post' | 'comment' | 'reel' | 'story'
// targetId:   id của nội dung vừa tạo
// imageUrls:  (tuỳ chọn) URL ảnh kèm theo để quét luôn (omni-moderation đọc được ảnh)
async function autoModerate(text, targetType, targetId, imageUrls) {
  try {
    if (!isConfigured()) return;            // chưa cấu hình key → bỏ qua êm

    const hasText = !!(text && text.trim());
    const publicImages = (imageUrls || []).filter(isPublicUrl);

    // Không có chữ lẫn ảnh public để quét → bỏ qua
    if (!hasText && publicImages.length === 0) return;

    const result = await moderateContent({ text: text, imageUrls: publicImages });
    if (!result.flagged) return;             // sạch → không làm gì

    const reason = mapCategoryToReason(result.topCategory);
    const scorePct = Math.round(result.topScore * 100);
    const description = '[AI] ' + (result.topCategory || 'unknown') + ' ' + (result.topScore.toFixed(2));

    // Upsert: mỗi target chỉ 1 report tự động (chống trùng nếu nội dung bị quét lại)
    await Report.updateOne(
      { targetType: targetType, targetId: targetId, isAuto: true },
      {
        $setOnInsert: {
          targetType: targetType,
          targetId: targetId,
          isAuto: true,
          reporterId: null,
          reason: reason,
          description: description,
          autoFlagScore: scorePct,
          status: 'pending',
        },
      },
      { upsert: true }
    );
  } catch (err) {
    // Không để lỗi kiểm duyệt ảnh hưởng tới luồng đăng bài
    console.error('[autoModerate] lỗi kiểm duyệt:', err.message);
  }
}

module.exports = { autoModerate };
