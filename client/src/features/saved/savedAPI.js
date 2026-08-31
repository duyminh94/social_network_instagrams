// features/saved/savedAPI.js
// Gọi API mục đã lưu và bộ sưu tập
//
// Nút bookmark trên PostCard/PostModal vẫn dùng savePost/unsavePost bên postAPI.js
//   (lưu thẳng vào bộ sưu tập mặc định). File này bổ sung phần chọn bộ sưu tập cụ thể.
//
// Bộ sưu tập mặc định 'Tất cả' do server tự tạo, có isDefault=true và không cho đổi tên/xoá.

import api from '../../services/api'

// Danh sách mục đã lưu — truyền collectionId để chỉ lấy mục trong 1 bộ sưu tập
export function getSavedItems(collectionId, page, limit) {
  return api.get('/saved', {
    params: { collectionId: collectionId || undefined, page: page, limit: limit },
  })
}

// Lưu nội dung vào 1 bộ sưu tập cụ thể.
// targetType: 'post' | 'reel' — mặc định là post
export function saveToCollection(targetId, collectionId, targetType) {
  return api.post('/saved', {
    targetId: targetId,
    targetType: targetType || 'post',
    collectionId: collectionId,
  })
}

// Chuyển một mục ĐÃ lưu sang bộ sưu tập khác.
// Dùng khi user đổi bộ sưu tập cho bài đã lưu — server làm gọn trong 1 request
//   nên không có nguy cơ bài rớt khỏi mục đã lưu như cách xoá rồi lưu lại.
export function moveSavedItem(targetId, collectionId, targetType) {
  return api.patch('/saved/' + targetId, { collectionId: collectionId }, {
    params: { targetType: targetType || 'post' },
  })
}

// Danh sách bộ sưu tập của mình (kèm ảnh bìa và số mục)
export function getCollections() {
  return api.get('/saved/collections')
}

// Tạo bộ sưu tập mới
export function createCollection(name) {
  return api.post('/saved/collections', { name: name })
}

// Đổi tên bộ sưu tập
export function updateCollection(collectionId, name) {
  return api.patch('/saved/collections/' + collectionId, { name: name })
}

// Xoá bộ sưu tập — bài bên trong được server chuyển về bộ sưu tập mặc định, không mất
export function deleteCollection(collectionId) {
  return api.delete('/saved/collections/' + collectionId)
}
