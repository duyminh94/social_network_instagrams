import api from '../../services/api'

// Gợi ý caption + hashtag từ ảnh (Gemini Vision)
// image: data URL (data:image/...;base64,...) hoặc base64 thuần
// lang:  'vi' | 'en' — ngôn ngữ caption mong muốn
export function generateCaption(image, mimeType, lang) {
  return api.post('/ai/caption', { image, mimeType, lang })
}
