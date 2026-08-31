// chatAPI.js
// Các hàm gọi API REST cho tính năng chat
// Tất cả đều trả về Promise — dùng .then() hoặc await ở nơi gọi

import api from '../../services/api'

// Lấy danh sách conversation đã accepted (có thể nhắn tin)
export function getConversations() {
  return api.get('/messages/conversations')
}

// Lấy danh sách conversation đang chờ duyệt (pending)
export function getPendingConversations() {
  return api.get('/messages/conversations/pending')
}

// Lấy tin nhắn của một conversation, hỗ trợ phân trang
export function getMessages(conversationId, page) {
  var pageNum = page || 1
  return api.get('/messages/conversations/' + conversationId, { params: { page: pageNum } })
}

// Tạo conversation mới — data: { type: 'direct', targetUserId } hoặc { type: 'group', name, memberIds }
export function createConversation(data) {
  return api.post('/messages/conversations', data)
}

// Gửi tin nhắn text qua REST (dùng khi socket mất kết nối)
// Chat bình thường dùng socket emit 'send_message' thay vì hàm này
export function sendMessage(conversationId, content, messageType) {
  var type = messageType || 'text'
  return api.post('/messages/conversations/' + conversationId, {
    content: content,
    messageType: type,
  })
}

// Gửi ảnh hoặc video — formData phải có field 'file'
export function sendMediaMessage(conversationId, formData) {
  return api.post('/messages/conversations/' + conversationId + '/media', formData)
}

// Xóa mềm tin nhắn (isDeleted = true) — chỉ người gửi mới xóa được
export function deleteMessage(messageId) {
  return api.delete('/messages/' + messageId)
}

// Chấp nhận tin nhắn đang chờ → status chuyển từ 'pending' sang 'accepted'
export function acceptConversation(conversationId) {
  return api.patch('/messages/conversations/' + conversationId + '/accept')
}

// Từ chối tin nhắn đang chờ → xóa toàn bộ conversation + tin nhắn
export function declineConversation(conversationId) {
  return api.delete('/messages/conversations/' + conversationId + '/decline')
}

// Xóa đoạn chat (người dùng chủ động xóa, không phải xóa mềm)
export function deleteConversation(conversationId) {
  return api.delete('/messages/conversations/' + conversationId)
}

// Rời nhóm hoặc admin mời thành viên ra khỏi nhóm
export function removeMemberFromConversation(conversationId, memberId) {
  return api.delete('/messages/conversations/' + conversationId + '/members/' + memberId)
}

// Xóa hẳn cả nhóm — chỉ người tạo nhóm mới gọi được (server kiểm tra createdBy)
export function deleteGroup(conversationId) {
  return api.delete('/messages/conversations/' + conversationId + '/group')
}

// --- Cảm xúc tin nhắn ---
// Chat đang mở dùng socket emit 'react_message' cho nhanh và để mọi thành viên thấy ngay;
// các hàm REST dưới đây dùng khi socket mất kết nối hoặc cần đọc lại danh sách đầy đủ.

// Danh sách ai đã thả cảm xúc gì lên một tin nhắn
export function getMessageReactions(messageId) {
  return api.get('/messages/' + messageId + '/reactions')
}

// Thả cảm xúc — thả lại đúng loại đang có nghĩa là bỏ cảm xúc
export function reactToMessage(messageId, reactionType) {
  return api.post('/messages/' + messageId + '/reactions', { reactionType: reactionType })
}

// Gỡ cảm xúc của mình khỏi tin nhắn
export function removeMessageReaction(messageId) {
  return api.delete('/messages/' + messageId + '/reactions')
}

// --- Ghim tin nhắn ---

// Danh sách tin nhắn đang ghim của một cuộc trò chuyện
export function getPinnedMessages(conversationId) {
  return api.get('/messages/conversations/' + conversationId + '/pinned')
}

export function pinMessage(messageId) {
  return api.patch('/messages/' + messageId + '/pin')
}

export function unpinMessage(messageId) {
  return api.delete('/messages/' + messageId + '/pin')
}

// --- Chuyển tiếp tin nhắn ---
// conversationIds: mảng id các cuộc trò chuyện muốn chuyển tin nhắn tới
export function forwardMessage(messageId, conversationIds) {
  return api.post('/messages/' + messageId + '/forward', { conversationIds: conversationIds })
}

// --- Biệt danh thành viên ---
// Truyền chuỗi rỗng để xoá biệt danh, quay về tên thật
export function setMemberNickname(conversationId, memberId, nickname) {
  return api.patch(
    '/messages/conversations/' + conversationId + '/members/' + memberId + '/nickname',
    { nickname: nickname }
  )
}
