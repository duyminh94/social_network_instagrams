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
// Lưu trữ bài: ẩn khỏi profile công khai và feed, chỉ chủ tài khoản xem lại được
export function archivePost(id) {
  return api.patch('/posts/' + id + '/archive')
}

// Bỏ lưu trữ: đưa bài trở lại profile
export function unarchivePost(id) {
  return api.patch('/posts/' + id + '/unarchive')
}

// Danh sách bài đã lưu trữ của chính mình
export function getArchivedPosts(page = 1, limit = 12) {
  return api.get('/posts/archived', { params: { page, limit } })
}

// Bài viết có gắn thẻ mình trên ảnh — chỉ xem được danh sách của chính mình
export function getPostsTaggingMe(page = 1, limit = 12) {
  return api.get('/posts/tagged/me', { params: { page, limit } })
}

// Nội dung nhắc @tên mình. Server trả kèm preview và postId/reelId để mở đúng nguồn
export function getMentionsOfMe(page = 1, limit = 20) {
  return api.get('/posts/mentions/me', { params: { page, limit } })
}

// Danh sách người được gắn thẻ trên các ảnh của một bài
export function getPhotoTags(postId) {
  return api.get('/posts/' + postId + '/tags')
}

// Gắn thẻ một người vào toạ độ trên ảnh — x, y là tỉ lệ 0→1 so với kích thước ảnh
export function addPhotoTag(postId, mediaId, userId, x, y) {
  return api.post('/posts/' + postId + '/tags', { mediaId, userId, x, y })
}

// Gỡ thẻ — chủ bài gỡ thẻ bất kỳ, người bị gắn thẻ tự gỡ thẻ của mình
export function removePhotoTag(postId, tagId) {
  return api.delete('/posts/' + postId + '/tags/' + tagId)
}

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
