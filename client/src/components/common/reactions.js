// components/common/reactions.js
// Cấu hình 6 loại cảm xúc dùng chung (khớp enum reactionType ở backend).

export const REACTIONS = [
  { type: 'like',  emoji: '👍', label: 'Thích' },
  { type: 'love',  emoji: '❤️', label: 'Yêu thích' },
  { type: 'haha',  emoji: '😂', label: 'Haha' },
  { type: 'wow',   emoji: '😮', label: 'Wow' },
  { type: 'sad',   emoji: '😢', label: 'Buồn' },
  { type: 'angry', emoji: '😡', label: 'Phẫn nộ' },
]

// Emoji theo loại — fallback 👍
export function reactionEmoji(type) {
  var r = REACTIONS.find(function (x) { return x.type === type })
  return r ? r.emoji : '👍'
}
