// utils/apiKeys.js
// Đọc nhiều API key dự phòng từ .env theo prefix.
// Ví dụ prefix 'GEMINI_API_KEY' → đọc: GEMINI_API_KEY, GEMINI_API_KEY_2, ... GEMINI_API_KEY_5
//
// Mục đích: key free hay hết quota giữa chừng → có key dự phòng để code tự nhảy sang.

const MAX_KEYS = 5;

function getKeys(prefix) {
  var keys = [];
  // Key chính (không hậu tố)
  if (process.env[prefix] && process.env[prefix].trim()) {
    keys.push(process.env[prefix].trim());
  }
  // Key dự phòng: PREFIX_2 ... PREFIX_5
  for (var i = 2; i <= MAX_KEYS; i++) {
    var val = process.env[prefix + '_' + i];
    if (val && val.trim()) {
      keys.push(val.trim());
    }
  }
  return keys;
}

module.exports = { getKeys };
