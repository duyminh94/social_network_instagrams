// features/hashtag/hashtagAPI.js
// Gọi API hashtag: gợi ý khi gõ, trending, theo dõi/bỏ theo dõi
//
// Tên hashtag gửi lên không kèm dấu '#' — server tự chuẩn hoá về chữ thường

import api from '../../services/api'

// Gợi ý hashtag khi user đang gõ trong ô tìm kiếm
export function searchHashtags(keyword, limit) {
  return api.get('/hashtags/search', { params: { q: keyword, limit: limit } })
}

// Danh sách hashtag đang hot (có nội dung mới trong 7 ngày gần đây)
export function getTrendingHashtags(limit) {
  return api.get('/hashtags/trending', { params: { limit: limit } })
}

// Danh sách hashtag mà mình đang theo dõi (có phân trang)
export function getFollowedHashtags(page, limit) {
  return api.get('/hashtags/following', { params: { page: page, limit: limit } })
}

// Thông tin 1 hashtag: số bài, số người theo dõi, mình đã theo dõi chưa
export function getHashtag(name) {
  return api.get('/hashtags/' + encodeURIComponent(name))
}

// Theo dõi 1 hashtag
export function followHashtag(name) {
  return api.post('/hashtags/' + encodeURIComponent(name) + '/follow')
}

// Bỏ theo dõi 1 hashtag
export function unfollowHashtag(name) {
  return api.delete('/hashtags/' + encodeURIComponent(name) + '/follow')
}
