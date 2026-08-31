// utils/mentions.js
// Tách @username từ caption/bình luận và đồng bộ vào collection mentions
//
// Làm song song với utils/hashtags.js: hashtags tách '#tag', mentions tách '@username'.
// Username trong dự án chỉ gồm chữ, số, dấu chấm và gạch dưới nên regex bám theo đó.

const Mention = require('../models/Mention');
const User = require('../models/User');
const { createNotification } = require('./notification');

// Tách danh sách username được nhắc trong một đoạn text.
// Trả về mảng username (chữ thường, không dấu '@', không trùng, tối đa 20 người).
function extractMentions(text) {
  if (!text || typeof text !== 'string') return [];

  var matches = text.match(/@[a-zA-Z0-9._]+/g);
  if (!matches) return [];

  var usernames = matches.map(function (m) {
    return m.slice(1).toLowerCase();   // bỏ ký tự '@'
  });

  // Giới hạn 20 người/nội dung để tránh spam nhắc tên hàng loạt
  return Array.from(new Set(usernames)).slice(0, 20);
}

// Đồng bộ lời nhắc của một nội dung với text mới nhất của nó.
//
// Cách làm: xoá sạch Mention cũ của nội dung rồi tạo lại theo danh sách mới.
// Đơn giản và luôn đúng kể cả khi user sửa caption nhiều lần — số lời nhắc
// trên một nội dung rất nhỏ (tối đa 20) nên không tốn kém.
//
// sendNotification=true: gửi thông báo cho người MỚI được nhắc (không gửi lại
// cho người đã được nhắc từ trước khi sửa caption).
async function syncMentions(sourceType, sourceId, text, authorId, sendNotification) {
  var usernames = extractMentions(text);

  // Ai đã được nhắc từ trước — để không gửi thông báo trùng khi sửa caption
  var oldMentions = await Mention.find({ sourceType: sourceType, sourceId: sourceId })
    .select('mentionedUserId')
    .lean();
  var oldUserIds = new Set(oldMentions.map(function (m) { return m.mentionedUserId.toString(); }));

  await Mention.deleteMany({ sourceType: sourceType, sourceId: sourceId });

  if (usernames.length === 0) {
    return [];
  }

  // Chỉ nhắc được người có thật và chưa bị khoá
  var users = await User.find({ username: { $in: usernames }, isBanned: { $ne: true } })
    .select('_id username')
    .lean();

  var created = [];
  for (var i = 0; i < users.length; i++) {
    var user = users[i];

    // Không tự nhắc chính mình
    if (user._id.toString() === authorId.toString()) {
      continue;
    }

    await Mention.create({
      mentionedUserId: user._id,
      authorId: authorId,
      sourceType: sourceType,
      sourceId: sourceId,
    });
    created.push(user);

    // Chỉ báo cho người mới được nhắc trong lần sửa này
    if (sendNotification && !oldUserIds.has(user._id.toString())) {
      await createNotification(user._id, authorId, 'mention', sourceId, sourceType);
    }
  }

  return created;
}

// Xoá toàn bộ lời nhắc gắn với một nội dung (dùng khi bài/bình luận bị xoá)
async function removeMentions(sourceType, sourceId) {
  await Mention.deleteMany({ sourceType: sourceType, sourceId: sourceId });
}

module.exports = { extractMentions, syncMentions, removeMentions };
