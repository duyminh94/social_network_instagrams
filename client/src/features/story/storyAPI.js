// features/story/storyAPI.js
// API calls cho Story — đăng, xem feed, xem chi tiết, xóa, danh sách người xem
import api from '../../services/api'

export function getStoryFeed() {
  return api.get('/stories/feed')
}

// Lấy tất cả story của một user cụ thể (kể cả xem của chính mình)
export function getMyStories(userId) {
  return api.get('/stories/user/' + userId)
}

// GET /api/stories/:id — server tự ghi nhận lượt xem nếu không phải chủ story
export function getStory(id) {
  return api.get('/stories/' + id)
}

// Tạo story mới — gửi FormData chứa file ảnh/video và caption
export function createStory(formData) {
  return api.post('/stories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteStory(id) {
  return api.delete('/stories/' + id)
}

// Lấy danh sách người đã xem story — chỉ chủ story mới được gọi
export function getViewers(id) {
  return api.get('/stories/' + id + '/viewers')
}

export function likeStory(id) {
  return api.post('/stories/' + id + '/like')
}

export function unlikeStory(id) {
  return api.delete('/stories/' + id + '/like')
}

export function getStoryComments(id) {
  return api.get('/stories/' + id + '/comments')
}

export function commentStory(id, content) {
  return api.post('/stories/' + id + '/comments', { content: content })
}
