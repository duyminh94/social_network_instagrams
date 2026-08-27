// controllers/aiController.js
// Các endpoint AI. Hiện có: gợi ý caption + hashtag từ ảnh (Gemini Vision).

const { generateCaptionFromImage, isConfigured } = require('../utils/gemini');

// Giới hạn kích thước ảnh gửi lên (base64) ~ 5MB ảnh gốc → ~6.8MB base64
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

// POST /api/ai/caption
// Body: { image: dataURL | base64, mimeType?: string, lang?: 'vi'|'en' }
async function generateCaption(req, res, next) {
  try {
    // Chưa cấu hình key → báo rõ thay vì lỗi 500 khó hiểu
    if (!isConfigured()) {
      return res.status(503).json({ message: 'Tính năng AI chưa được cấu hình (thiếu GEMINI_API_KEY)' });
    }

    var image = req.body.image;
    var mimeType = req.body.mimeType || '';
    var lang = req.body.lang === 'en' ? 'en' : 'vi';

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ message: 'Thiếu ảnh' });
    }

    // Nếu là data URL (data:image/jpeg;base64,xxxx) → tách mime + base64
    var base64 = image;
    var match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) {
      if (!mimeType) mimeType = match[1];
      base64 = match[2];
    }

    if (!mimeType) {
      return res.status(400).json({ message: 'Thiếu mimeType của ảnh' });
    }
    if (ALLOWED_MIME.indexOf(mimeType) === -1) {
      return res.status(400).json({ message: 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP' });
    }
    if (base64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({ message: 'Ảnh quá lớn (tối đa ~5MB)' });
    }

    // image/jpg → image/jpeg cho đúng chuẩn Gemini
    if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

    var result = await generateCaptionFromImage(base64, mimeType, lang);
    res.json(result); // { caption, hashtags }
  } catch (error) {
    // Lỗi gọi Gemini → trả 502 với message gọn để frontend hiện toast
    if (error.message && error.message.indexOf('Gemini') !== -1) {
      return res.status(502).json({ message: 'Không tạo được caption. Thử lại sau.' });
    }
    next(error);
  }
}

module.exports = { generateCaption };
