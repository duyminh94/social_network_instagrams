// routes/messages.js
// Tin nhắn REST API: quản lý conversation, gửi/xóa tin, quản lý thành viên nhóm
//
// REST API chỉ xử lý CRUD — gửi tin nhắn realtime dùng Socket.IO (index.js)
// updateGroup dùng upload.single('avatar') để đổi ảnh nhóm
// Tất cả route cần đăng nhập (auth middleware truyền trực tiếp vào từng route)

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getConversations,
  getPendingConversations,
  createConversation,
  getMessages,
  sendMessage,
  sendMediaMessage,
  deleteMessage,
  addMember,
  removeMember,
  changeMemberRole,
  updateGroup,
  getMembers,
  acceptConversation,
  declineConversation,
  deleteConversation,
  deleteGroup,
  reactToMessage,
  removeMessageReaction,
  getMessageReactions,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  setMemberNickname,
  forwardMessage,
} = require('../controllers/messageController');

// --- 4.2 Message API ---
// GET    /api/messages/conversations           — danh sách conversation (accepted)
// GET    /api/messages/conversations/pending   — tin nhắn đang chờ (pending)
// POST   /api/messages/conversations           — tạo conversation mới
// GET    /api/messages/conversations/:id       — lấy tin nhắn trong conversation
// POST   /api/messages/conversations/:id       — gửi tin nhắn
// PATCH  /api/messages/conversations/:id/accept  — chấp nhận tin nhắn đang chờ
// DELETE /api/messages/conversations/:id/decline — từ chối tin nhắn đang chờ
// DELETE /api/messages/:messageId              — xóa tin nhắn

// QUAN TRỌNG: /pending phải đặt TRƯỚC /:id để Express không match 'pending' như một :id
router.get('/conversations', auth, getConversations);
router.get('/conversations/pending', auth, getPendingConversations);
router.post('/conversations', auth, createConversation);
// /pinned phải đứng trước /:id vì Express khớp theo thứ tự
router.get('/conversations/:id/pinned', auth, getPinnedMessages);
router.get('/conversations/:id', auth, getMessages);
router.post('/conversations/:id/media', auth, upload.single('file'), sendMediaMessage);
router.post('/conversations/:id', auth, sendMessage);
router.patch('/conversations/:id/accept', auth, acceptConversation);
router.delete('/conversations/:id/decline', auth, declineConversation);
router.delete('/conversations/:id', auth, deleteConversation);

// --- 4.2c Thao tác trên từng tin nhắn ---
// POST   /api/messages/:messageId/reactions  — thả / đổi cảm xúc
// DELETE /api/messages/:messageId/reactions  — gỡ cảm xúc của mình
// GET    /api/messages/:messageId/reactions  — ai đã thả cảm xúc gì
// PATCH  /api/messages/:messageId/pin        — ghim tin nhắn
// DELETE /api/messages/:messageId/pin        — bỏ ghim
// POST   /api/messages/:messageId/forward    — chuyển tiếp sang chat khác
//
// Các route này phải đứng TRƯỚC DELETE /:messageId, nếu không Express khớp
// 'reactions'/'pin' vào route xoá tin nhắn
router.get('/:messageId/reactions', auth, getMessageReactions);
router.post('/:messageId/reactions', auth, reactToMessage);
router.delete('/:messageId/reactions', auth, removeMessageReaction);
router.patch('/:messageId/pin', auth, pinMessage);
router.delete('/:messageId/pin', auth, unpinMessage);
router.post('/:messageId/forward', auth, forwardMessage);

router.delete('/:messageId', auth, deleteMessage);

// --- 4.2b Group Chat API ---
// GET    /api/messages/conversations/:id/members              — danh sách thành viên
// POST   /api/messages/conversations/:id/members              — thêm thành viên
// DELETE /api/messages/conversations/:id/members/:memberId    — xóa/rời nhóm
// PATCH  /api/messages/conversations/:id/members/:memberId/role — đổi role
// PATCH  /api/messages/conversations/:id                      — đổi tên/ảnh nhóm

router.get('/conversations/:id/members', auth, getMembers);
router.post('/conversations/:id/members', auth, addMember);
router.delete('/conversations/:id/members/:memberId', auth, removeMember);
router.patch('/conversations/:id/members/:memberId/role', auth, changeMemberRole);
// PATCH /api/messages/conversations/:id/members/:memberId/nickname — đặt biệt danh
router.patch('/conversations/:id/members/:memberId/nickname', auth, setMemberNickname);
// DELETE /api/messages/conversations/:id/group — người tạo nhóm xóa cả nhóm
router.delete('/conversations/:id/group', auth, deleteGroup);
router.patch('/conversations/:id', auth, upload.single('avatar'), updateGroup);

module.exports = router;
