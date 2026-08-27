// utils/formatTime.js
// Hàm format thời gian dùng thư viện dayjs
//
// Ví dụ:
//   timeAgo("2024-01-01T10:00:00Z")  → "3 hours ago"
//   timeAgo(null)                    → "Invalid Date" → trả về ""
//   formatDate("2024-05-27")         → "May 27, 2024"

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

// Kích hoạt plugin relativeTime để dùng được .fromNow()
dayjs.extend(relativeTime)

// Trả về thời gian tương đối: "5 minutes ago", "2 hours ago", "3 days ago"...
export function timeAgo(date) {
  if (!date) return ''
  return dayjs(date).fromNow()
}

// Trả về ngày đầy đủ: "May 27, 2026"
export function formatDate(date) {
  if (!date) return ''
  return dayjs(date).format('MMMM D, YYYY')
}

export function formatDateTime(date) {
  if (!date) return ''
  return dayjs(date).format('MMMM D, YYYY HH:mm:ss')
}
