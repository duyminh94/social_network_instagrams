// features/notification/notificationAPI.js
// Tập hợp các hàm gọi API thông báo

import api from '../../services/api'

// Lấy danh sách thông báo (có phân trang)
export function getNotifications(page = 1) {
  return api.get('/notifications', { params: { page } })
}

// Lấy số thông báo chưa đọc (dùng cho badge ở sidebar)
export function getUnreadCount() {
  return api.get('/notifications/unread-count')
}

// Đánh dấu tất cả thông báo là đã đọc
export function markAllRead() {
  return api.patch('/notifications/read-all')
}

// Đánh dấu 1 thông báo là đã đọc theo id
export function markRead(id) {
  return api.patch('/notifications/' + id + '/read')
}

// Xóa 1 thông báo theo id
export function deleteNotification(id) {
  return api.delete('/notifications/' + id)
}
