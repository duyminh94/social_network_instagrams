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

// Đồng bộ counter trong collection hashtags khi nội dung thay đổi.
//
// Gọi ở 3 tình huống:
//   - Tạo bài/reel   : syncHashtagCounts([], newTags, 'post')
//   - Sửa caption    : syncHashtagCounts(oldTags, newTags, 'post')
//   - Xoá bài/reel   : syncHashtagCounts(oldTags, [], 'post')
//
// Chỉ đụng đến những tag thực sự thay đổi: tag vừa được thêm thì +1,
// tag bị bỏ đi thì -1, tag còn nguyên trong cả 2 danh sách thì không làm gì.
//
// contentType: 'post' → cập nhật postsCount, 'reel' → cập nhật reelsCount
async function syncHashtagCounts(oldTags, newTags, contentType) {
  var Hashtag = require('../models/Hashtag');

  var countField = contentType === 'reel' ? 'reelsCount' : 'postsCount';
  var oldSet = new Set(oldTags || []);
  var newSet = new Set(newTags || []);

  var addedTags = Array.from(newSet).filter(function (tag) { return !oldSet.has(tag); });
  var removedTags = Array.from(oldSet).filter(function (tag) { return !newSet.has(tag); });

  // Tag mới: tạo document nếu chưa có (upsert) rồi tăng counter
  for (var i = 0; i < addedTags.length; i++) {
    await Hashtag.updateOne(
      { name: addedTags[i] },
      {
        $inc: { [countField]: 1 },
        $set: { lastUsedAt: new Date() },
        $setOnInsert: { name: addedTags[i] },
      },
      { upsert: true }
    );
  }

  // Tag bị bỏ: giảm counter, chặn không cho xuống âm nếu dữ liệu lệch
  for (var j = 0; j < removedTags.length; j++) {
    await Hashtag.updateOne(
      { name: removedTags[j], [countField]: { $gt: 0 } },
      { $inc: { [countField]: -1 } }
    );
  }
}

module.exports = { extractHashtags, syncHashtagCounts };
