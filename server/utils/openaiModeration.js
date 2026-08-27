// utils/openaiModeration.js
// Gọi OpenAI Moderation để phát hiện nội dung vi phạm (miễn phí, không tốn credit).
// Dùng REST API qua fetch (Node 18+) — không cần cài SDK.
//
// Hỗ trợ NHIỀU key dự phòng: OPENAI_API_KEY, OPENAI_API_KEY_2, ... (xem utils/apiKeys.js)
// Key nào hết quota / rate limit (429) hoặc sai (401/403) → tự nhảy sang key kế tiếp.
//
// Cấu hình trong .env:
//   OPENAI_API_KEY (+ _2.._5)  (ít nhất 1 cái)
//   OPENAI_MODERATION_MODEL (tuỳ chọn, mặc định omni-moderation-latest)

const { getKeys } = require('./apiKeys');

const MODERATION_MODEL = process.env.OPENAI_MODERATION_MODEL || 'omni-moderation-latest';

// Ngưỡng riêng tự gắn cờ nội dung tình dục/hở hang.
// OpenAI categories.sexual chỉ bật cờ khi RẤT rõ ràng (khoả thân/khiêu dâm).
// Đo thực tế: ảnh thường ~0.0005, ảnh hở nhẹ ~0.2, ảnh hở rõ ~0.56.
// → Đặt 0.15 để bắt cả ảnh hở nhẹ mà vẫn cách rất xa ảnh thường (không báo nhầm).
// Chỉnh qua .env: MODERATION_SEXUAL_THRESHOLD (càng thấp càng gắt)
const SEXUAL_FLAG_THRESHOLD = parseFloat(process.env.MODERATION_SEXUAL_THRESHOLD || '0.15');

function isConfigured() {
  return getKeys('OPENAI_API_KEY').length > 0;
}

// Lỗi hết quota / rate limit / key sai → nên thử key tiếp theo
function shouldTryNextKey(status) {
  return status === 429 || status === 401 || status === 403;
}

// Gọi endpoint moderation với input bất kỳ (chuỗi hoặc mảng multi-modal), có xoay vòng key.
async function callModeration(input) {
  const keys = getKeys('OPENAI_API_KEY');
  if (keys.length === 0) {
    throw new Error('OPENAI_API_KEY chưa được cấu hình');
  }

  let lastErr;
  for (let i = 0; i < keys.length; i++) {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + keys[i],
      },
      body: JSON.stringify({ model: MODERATION_MODEL, input: input }),
    });

    if (!res.ok) {
      const errText = await res.text();
      lastErr = new Error('OpenAI Moderation lỗi (' + res.status + '): ' + errText.slice(0, 200));
      if (!shouldTryNextKey(res.status)) throw lastErr;
      console.warn('[openai-moderation] key #' + (i + 1) + ' lỗi ' + res.status + ' → thử key dự phòng...');
      continue; // thử key kế tiếp
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('OpenAI Moderation không trả về kết quả');
    }
    return data.results;
  }

  throw lastErr || new Error('Tất cả OPENAI_API_KEY đều lỗi');
}

// Gộp nhiều result (text + nhiều ảnh) → 1 kết luận:
//   flagged = bất kỳ phần nào vi phạm; topCategory/topScore = category điểm cao nhất toàn bộ
function aggregateResults(results) {
  let flagged = false;
  let topCategory = null;
  let topScore = 0;

  results.forEach(function (result) {
    if (result.flagged) flagged = true;
    const scores = result.category_scores || {};

    // Tự gắn cờ nội dung tình dục/hở hang khi điểm vượt ngưỡng riêng
    // (OpenAI flagged quá lỏng — ảnh hở hang sexual ~0.5 vẫn flagged=false)
    const sexualScore = Math.max(scores.sexual || 0, scores['sexual/minors'] || 0);
    if (sexualScore >= SEXUAL_FLAG_THRESHOLD) {
      flagged = true;
    }

    // topCategory/topScore = category điểm cao nhất toàn bộ (dùng cho mô tả report)
    Object.keys(scores).forEach(function (name) {
      if (scores[name] > topScore) {
        topScore = scores[name];
        topCategory = name;
      }
    });
  });

  return { flagged: flagged, topCategory: topCategory, topScore: topScore };
}

// Kiểm duyệt nội dung gồm chữ và/hoặc ảnh trong 1 request.
// { text?: string, imageUrls?: string[] }  (imageUrls phải là URL public OpenAI tải được)
// → { flagged, topCategory, topScore }
async function moderateContent(opts) {
  const text = opts && opts.text;
  const imageUrls = (opts && opts.imageUrls) || [];

  // Quét TỪNG phần riêng (text riêng, mỗi ảnh riêng).
  // Lý do: nếu gộp text + ảnh chung 1 request, OpenAI gộp thành 1 điểm chung →
  // caption sạch sẽ "pha loãng" điểm sexual của ảnh hở hang (0.565 → 0.289) → lọt lưới.
  const inputs = [];
  if (text && text.trim()) {
    inputs.push([{ type: 'text', text: text.trim() }]);
  }
  imageUrls.forEach(function (url) {
    if (url) inputs.push([{ type: 'image_url', image_url: { url: url } }]);
  });

  // Không có gì để quét
  if (inputs.length === 0) {
    return { flagged: false, topCategory: null, topScore: 0 };
  }

  const allResults = [];
  for (let i = 0; i < inputs.length; i++) {
    const results = await callModeration(inputs[i]);
    results.forEach(function (r) { allResults.push(r); });
  }
  return aggregateResults(allResults);
}

// Tương thích ngược: chỉ quét chữ
async function moderateText(text) {
  return moderateContent({ text: text });
}

module.exports = { moderateText, moderateContent, isConfigured };
