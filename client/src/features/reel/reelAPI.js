import api from '../../services/api'

export function createReel(formData) {
  return api.post('/reels', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function getReels(page = 1, limit = 15) {
  return api.get('/reels', { params: { page, limit } })
}

// Lấy lẻ 1 reel theo id — dùng cho deep-link /reels/:reelId khi reel không có trong feed
export function getReel(reelId) {
  return api.get('/reels/' + reelId)
}

export function getUserReels(userId, page = 1, limit = 12) {
  return api.get('/reels/user/' + userId, { params: { page, limit } })
}

// Danh sách reel công khai gắn 1 hashtag — tab Reels trong trang hashtag
export function getReelsByHashtag(tag, page = 1, limit = 30) {
  return api.get('/reels/hashtag/' + encodeURIComponent(tag), { params: { page, limit } })
}

export function updateReel(id, data) {
  return api.patch('/reels/' + id, data)
}

export function deleteReel(id) {
  return api.delete('/reels/' + id)
}

// Ghi nhận thời gian xem reel (tín hiệu "thích xem" cho gợi ý)
// Gọi lúc reel rời viewport — fire-and-forget, lỗi mạng thì bỏ qua
export function recordReelView(reelId, watchedMs, duration) {
  return api.post('/reels/' + reelId + '/view', { watchedMs, duration })
}

export function getReelComments(reelId, page = 1, limit = 20) {
  return api.get('/reels/' + reelId + '/comments', { params: { page, limit } })
}

export function createReelComment(reelId, data) {
  return api.post('/reels/' + reelId + '/comments', data)
}

export function deleteReelComment(commentId) {
  return api.delete('/reels/comments/' + commentId)
}

export function getReelCommentReplies(commentId, page = 1, limit = 10) {
  return api.get('/reels/comments/' + commentId + '/replies', { params: { page, limit } })
}
