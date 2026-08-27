// features/post/postAPI.js
// Tập hợp các hàm gọi API liên quan đến bài viết, like, bookmark

import api from '../../services/api'

// Lấy feed bài viết (chỉ bài của người mình follow)
export function getFeed(page = 1, limit = 10) {
  return api.get('/posts/feed', { params: { page, limit } })
}

// Lấy bài viết trang khám phá (sắp xếp theo lượt like)
export function getExplore(page = 1, limit = 12) {
  return api.get('/posts/explore', { params: { page, limit } })
}

// Lấy bài viết của một user cụ thể theo userId
export function getUserPosts(userId, page = 1, limit = 12) {
  return api.get('/posts/user/' + userId, { params: { page, limit } })
}

// Lấy chi tiết một bài viết theo id
export function getPost(id) {
  return api.get('/posts/' + id)
}

// Lấy bài theo hashtag (trang hashtag)
export function getPostsByHashtag(tag, page = 1, limit = 12) {
  return api.get('/posts/hashtag/' + encodeURIComponent(tag), { params: { page, limit } })
}

// Tìm bài theo caption/hashtag
export function searchPosts(q, page = 1, limit = 12) {
  return api.get('/posts/search', { params: { q, page, limit } })
}

// Gợi ý hashtag khớp + số bài (tab Tags trong tìm kiếm)
export function searchTags(q, limit = 15) {
  return api.get('/posts/tags/search', { params: { q, limit } })
}

// Tạo bài viết mới (formData chứa files + caption + location)
export function createPost(formData) {
  return api.post('/posts', formData)
}

// Sửa caption bài viết (chỉ chủ bài làm được)
export function updatePost(id, caption) {
  return api.patch('/posts/' + id, { caption })
}

// Xóa bài viết (soft delete phía server)
export function deletePost(id) {
  return api.delete('/posts/' + id)
}

// Like / thả cảm xúc cho bài viết hoặc comment
// targetType: 'post' | 'comment' | 'reel' | 'reelComment'
// reactionType: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' (mặc định 'like')
export function likePost(targetType, targetId, reactionType = 'like') {
  return api.post('/likes', { targetType, targetId, reactionType })
}

// Unlike bài viết hoặc comment
// Dùng { data: ... } vì axios DELETE không có body mặc định
export function unlikePost(targetType, targetId) {
  return api.delete('/likes', { data: { targetType, targetId } })
}

// Lưu bài viết vào bộ sưu tập
// collectionName mặc định là 'Tất cả' nếu không truyền
export function savePost(postId, collectionName) {
  return api.post('/saved', { postId, collectionName: collectionName || 'Tất cả' })
}

// Bỏ lưu bài viết
export function unsavePost(postId) {
  return api.delete('/saved/' + postId)
}
