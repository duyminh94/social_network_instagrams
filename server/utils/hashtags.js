// utils/hashtags.js
// Tách hashtag từ caption → mảng tag (chữ thường, bỏ dấu #, bỏ trùng).
//
// Hỗ trợ Unicode để bắt được tiếng Việt: #ĐàLạt #dulịch #food ...
//   \p{L} = chữ cái mọi ngôn ngữ, \p{N} = số, _ cho phép; cờ 'u' bật Unicode.
// Giới hạn 30 tag/bài để tránh spam caption nhồi hashtag.

function extractHashtags(text) {
  if (!text || typeof text !== 'string') return [];

  var matches = text.match(/#[\p{L}\p{N}_]+/gu);
  if (!matches) return [];

  var tags = matches.map(function (m) {
    return m.slice(1).toLowerCase();   // bỏ ký tự '#', chuẩn hoá chữ thường
  });

  return Array.from(new Set(tags)).slice(0, 30);
}

module.exports = { extractHashtags };
