// components/common/CaptionText.jsx
// Hiển thị caption và biến #hashtag thành link tới trang hashtag.
// Regex dùng cờ Unicode (\p{L}\p{N}) để bắt cả hashtag tiếng Việt.
//
// Link dùng component Link của MUI gắn với Link của React Router:
//   giữ được điều hướng không tải lại trang, đồng thời lấy màu từ theme
//   thay vì đọc biến CSS bằng tay như bản cũ

import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'

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
              component={RouterLink}
              to={'/hashtag/' + encodeURIComponent(tag)}
              underline="hover"
              sx={{ color: 'primary.main', fontWeight: 500 }}
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
