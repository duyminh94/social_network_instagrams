// utils/gemini.js
// Gọi Gemini Vision để gợi ý caption + hashtag từ ảnh.
// Dùng REST API qua fetch (Node 18+) — không cần cài SDK.
//
// Hỗ trợ NHIỀU key dự phòng: GEMINI_API_KEY, GEMINI_API_KEY_2, ... (xem utils/apiKeys.js)
// Key nào hết quota / rate limit (429) hoặc sai (401/403) → tự nhảy sang key kế tiếp.
//
// Cấu hình trong .env:
//   GEMINI_API_KEY (+ _2.._5)  (ít nhất 1 cái)
//   GEMINI_MODEL    (tuỳ chọn, mặc định gemini-2.0-flash)

const { getKeys } = require('./apiKeys');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function isConfigured() {
  return getKeys('GEMINI_API_KEY').length > 0;
}

// Lỗi hết quota / rate limit / key sai → nên thử key tiếp theo
function shouldTryNextKey(status) {
  return status === 429 || status === 401 || status === 403;
}

async function callGemini(apiKey, prompt, imageBase64, mimeType) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    GEMINI_MODEL + ':generateContent?key=' + apiKey;

  const body = {
    contents: [
      { parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ] },
    ],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
  };

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// imageBase64: chuỗi base64 thuần (KHÔNG kèm tiền tố data:...;base64,)
// → { caption: string, hashtags: string[] }
async function generateCaptionFromImage(imageBase64, mimeType, lang) {
  const keys = getKeys('GEMINI_API_KEY');
  if (keys.length === 0) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình');
  }

  const language = lang === 'en' ? 'English' : 'Vietnamese';
  const prompt =
    'You are a social media assistant for an Instagram-like app. ' +
    'Look at the image and write ONE short, engaging caption (max 150 characters) in ' + language + '. ' +
    'Also suggest 3 to 5 relevant hashtags. ' +
    'Return ONLY JSON with this exact shape: ' +
    '{"caption": "...", "hashtags": ["#tag1", "#tag2"]}. ' +
    'Each hashtag must start with # and contain no spaces.';

  let lastErr;
  for (let i = 0; i < keys.length; i++) {
    const res = await callGemini(keys[i], prompt, imageBase64, mimeType);

    if (!res.ok) {
      const errText = await res.text();
      lastErr = new Error('Gemini API lỗi (' + res.status + '): ' + errText.slice(0, 200));
      // Lỗi khác (vd 400 ảnh hỏng) → dừng luôn, đổi key cũng vô ích
      if (!shouldTryNextKey(res.status)) throw lastErr;
      console.warn('[gemini] key #' + (i + 1) + ' lỗi ' + res.status + ' → thử key dự phòng...');
      continue; // thử key kế tiếp
    }

    const data = await res.json();
    const rawText =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (!rawText) {
      throw new Error('Gemini không trả về nội dung');
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      throw new Error('Không parse được JSON từ Gemini');
    }

    const caption = typeof parsed.caption === 'string' ? parsed.caption.trim() : '';
    let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
    hashtags = hashtags
      .filter(function (h) { return typeof h === 'string' && h.trim(); })
      .map(function (h) {
        const clean = h.trim().replace(/\s+/g, '');
        return clean.charAt(0) === '#' ? clean : '#' + clean;
      })
      .slice(0, 5);

    return { caption, hashtags };
  }

  // Hết key vẫn lỗi
  throw lastErr || new Error('Tất cả GEMINI_API_KEY đều lỗi');
}

// Sinh văn bản từ prompt thuần (không ảnh) — dùng cho trợ lý AI admin.
// jsonMode=true → ép Gemini trả JSON (dùng cho bước "lập kế hoạch").
async function generateText(prompt, jsonMode) {
  const keys = getKeys('GEMINI_API_KEY');
  if (keys.length === 0) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình');
  }

  let lastErr;
  for (let i = 0; i < keys.length; i++) {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      GEMINI_MODEL + ':generateContent?key=' + keys[i];

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: jsonMode
        ? { responseMimeType: 'application/json', temperature: 0.2 }
        : { temperature: 0.4 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      lastErr = new Error('Gemini API lỗi (' + res.status + '): ' + errText.slice(0, 200));
      if (!shouldTryNextKey(res.status)) throw lastErr;
      console.warn('[gemini] key #' + (i + 1) + ' lỗi ' + res.status + ' → thử key dự phòng...');
      continue;
    }

    const data = await res.json();
    const text =
      data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (!text) throw new Error('Gemini không trả về nội dung');
    return text.trim();
  }

  throw lastErr || new Error('Tất cả GEMINI_API_KEY đều lỗi');
}

module.exports = { generateCaptionFromImage, generateText, isConfigured };
