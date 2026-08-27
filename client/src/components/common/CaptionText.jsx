// components/common/CaptionText.jsx
// Hiển thị caption và biến #hashtag thành link tới trang hashtag.
// Regex dùng cờ Unicode (\p{L}\p{N}) để bắt cả hashtag tiếng Việt.

import { Link } from 'react-router-dom'

export default function CaptionText({ text }) {
  if (!text) return null

  // Tách chuỗi giữ lại cả phần hashtag (nhờ nhóm bắt trong split)
  var parts = String(text).split(/(#[\p{L}\p{N}_]+)/gu)

  return (
    <>
      {parts.map(function (part, i) {
        if (/^#[\p{L}\p{N}_]+$/u.test(part)) {
          var tag = part.slice(1).toLowerCase()
          return (
            <Link
              key={i}
              to={'/hashtag/' + encodeURIComponent(tag)}
              style={{ color: 'var(--accent, #0095f6)', fontWeight: 500 }}
            >
              {part}
            </Link>
          )
        }
        return part
      })}
    </>
  )
}
