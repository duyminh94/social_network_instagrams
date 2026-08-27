// features/block/blockAPI.js
// Gọi API chặn người dùng

import api from '../../services/api'

// Chặn 1 user theo id
export function blockUser(userId) {
  return api.post('/block/' + userId)
}

// Lấy danh sách tài khoản mình đã chặn
export function getBlockedUsers() {
  return api.get('/block')
}

// Bỏ chặn 1 user theo id
export function unblockUser(userId) {
  return api.delete('/block/' + userId)
}
