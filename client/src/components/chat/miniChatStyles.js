// components/chat/miniChatStyles.js
// Các object sx của widget chat nhỏ góc dưới phải — thay cho MiniChat.module.css
//
// Tách ra file riêng vì MiniChat.jsx đã hơn 1100 dòng, nhét sx vào giữa sẽ
//   che mất phần logic socket / query
//
// Panel dùng nền tối cố định (#262626) như bản CSS gốc, còn chữ và viền lấy
//   theo token theme

var MOBILE = '@media (max-width:768px)'

export var wrapper = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  zIndex: 500,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  // Mobile đã có MobileNav ở đáy nên ẩn hẳn widget này
  [MOBILE]: { display: 'none' },
}

// ── Trạng thái thu gọn: nút hình viên thuốc ──

export var pill = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  pl: 2, pr: 2.5,
  height: 52,
  borderRadius: '26px',
  bgcolor: '#2a2a2a',
  border: 'none',
  cursor: 'pointer',
  color: 'text.primary',
  fontSize: 16,
  fontWeight: 600,
  transition: 'background 150ms',
  boxShadow: '0 4px 20px rgba(0,0,0,.5)',
  '&:hover': { bgcolor: '#333' },
}

export var pillText = { whiteSpace: 'nowrap' }

export var pillAvatars = {
  display: 'flex',
  alignItems: 'center',
  ml: .5,
}

// Các avatar chồng lên nhau, cái đầu không lùi
export var pillAvatar = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  overflow: 'hidden',
  border: '2px solid #2a2a2a',
  ml: '-8px',
  '&:first-of-type': { ml: 0 },
}

// ── Khung panel chung cho 3 chế độ: list / new / chat ──

export var panel = {
  position: 'relative',
  width: 360,
  height: 560,
  borderRadius: 4,
  bgcolor: '#262626',
  boxShadow: '0 8px 32px rgba(0,0,0,.6)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

export var panelHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  pt: 2, px: 2, pb: 1.75,
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  flexShrink: 0,
}

export var panelTitle = {
  fontSize: 17,
  fontWeight: 700,
  color: 'text.primary',
}

export var headerActions = {
  display: 'flex',
  alignItems: 'center',
  gap: .5,
}

// Nút icon tròn trên header. isActive dùng cho nút emoji khi picker đang mở
export function iconBtn(isActive) {
  return {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    bgcolor: isActive ? 'rgba(56,151,240,.12)' : 'transparent',
    color: isActive ? 'primary.main' : 'text.primary',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 140ms',
    '&:hover': { bgcolor: 'action.hover' },
  }
}

// ── Chế độ list: danh sách cuộc trò chuyện ──

export var convList = {
  flex: 1,
  overflowY: 'auto',
  py: 1,
}

export var emptyMsg = {
  textAlign: 'center',
  color: 'text.secondary',
  py: 6, px: 2,
  fontSize: 14,
}

// Dòng chưa đọc: nền xanh nhạt + vạch xanh bên trái cho dễ nhận ra
export function convItem(isUnread) {
  if (isUnread) {
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      py: 1.25, px: 2,
      cursor: 'pointer',
      transition: 'background 130ms',
      bgcolor: 'rgba(0, 132, 255, 0.10)',
      boxShadow: 'inset 3px 0 0 #0084ff',
      '&:hover': { bgcolor: 'rgba(0, 132, 255, 0.16)' },
    }
  }
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    py: 1.25, px: 2,
    cursor: 'pointer',
    background: 'transparent',
    transition: 'background 130ms',
    '&:hover': { bgcolor: 'action.hover' },
  }
}

export var convInfo = { flex: 1, minWidth: 0 }

export function convName(isUnread) {
  return {
    fontSize: 15,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: isUnread ? '#f5f7fb' : 'rgba(255, 255, 255, 0.62)',
    fontWeight: isUnread ? 700 : 400,
  }
}

export function convPreview(isUnread) {
  return {
    fontSize: 13,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    mt: '2px',
    display: 'flex',
    color: isUnread ? '#e7f0ff' : 'rgba(255, 255, 255, 0.38)',
    fontWeight: isUnread ? 700 : 400,
    '& .previewText': { overflow: 'hidden', textOverflow: 'ellipsis' },
    '& .previewDot': { flexShrink: 0 },
  }
}

export var unreadDot = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  bgcolor: '#0084ff',
  boxShadow: '0 0 0 2px rgba(0, 132, 255, 0.18)',
  flexShrink: 0,
}

export var composeBtn = {
  position: 'absolute',
  bottom: 16,
  right: 16,
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  bgcolor: 'rgba(255,255,255,.12)',
  color: 'text.primary',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 140ms',
  '&:hover': { bgcolor: 'rgba(255,255,255,.2)' },
}

// ── Chế độ new: soạn tin nhắn mới ──

export var toRow = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: .75,
  py: 1.5, px: 2,
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  flexShrink: 0,
}

export var toLabel = {
  fontSize: 15,
  fontWeight: 600,
  color: 'text.primary',
  flexShrink: 0,
}

export var selectedChip = {
  display: 'flex',
  alignItems: 'center',
  gap: .5,
  bgcolor: 'rgba(56,151,240,.2)',
  border: '1px solid rgba(56,151,240,.5)',
  borderRadius: '20px',
  pl: 1.5, pr: 1.25, py: .25,
  color: 'primary.main',
  fontSize: 14,
  fontWeight: 500,
}

export var chipRemove = {
  background: 'none',
  border: 'none',
  color: 'primary.main',
  cursor: 'pointer',
  fontSize: 16,
  p: 0,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
}

export var toInput = {
  flex: 1,
  minWidth: 80,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'text.primary',
  fontSize: 15,
  fontFamily: 'inherit',
  '&::placeholder': { color: 'text.secondary' },
}

export var groupNameRow = {
  py: 1, px: 2,
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  flexShrink: 0,
}

export var groupNameInput = {
  width: '100%',
  height: 36,
  px: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
  color: 'text.primary',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  '&::placeholder': { color: 'text.secondary' },
  '&:focus': { borderColor: 'primary.main' },
}

export var suggestionList = {
  flex: 1,
  overflowY: 'auto',
  py: 1,
}

export var suggestionLabel = {
  pt: 1, px: 2, pb: .5,
  fontSize: 14,
  fontWeight: 700,
  color: 'text.primary',
}

export var suggestionItem = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  py: 1.25, px: 2,
  cursor: 'pointer',
  transition: 'background 130ms',
  '&:hover': { bgcolor: 'action.hover' },
}

export var suggestionInfo = { flex: 1, minWidth: 0 }

export var suggestionName = {
  fontSize: 15,
  fontWeight: 600,
  color: 'text.primary',
}

export var suggestionUsername = {
  fontSize: 13,
  color: 'text.secondary',
  mt: '1px',
}

export function checkbox(isSelected) {
  return {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid',
    borderColor: isSelected ? 'primary.main' : 'rgba(255,255,255,.35)',
    bgcolor: isSelected ? 'primary.main' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 140ms, border-color 140ms',
  }
}

export var chatBtnWrap = {
  py: 1.5, px: 2,
  flexShrink: 0,
  borderTop: '1px solid',
  borderTopColor: 'divider',
}

export var chatBtn = {
  width: '100%',
  height: 44,
  borderRadius: 2,
  border: 'none',
  bgcolor: 'primary.main',
  color: '#fff',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 140ms, opacity 140ms',
  '&:hover:not(:disabled)': { bgcolor: 'primary.dark' },
  '&:disabled': { opacity: .5, cursor: 'not-allowed' },
}

// ── Chế độ chat: cửa sổ tin nhắn ──

export var chatHeaderInfo = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  flex: 1,
  minWidth: 0,
  textDecoration: 'none',
}

export var miniMessages = {
  flex: 1,
  overflowY: 'auto',
  p: 1.5,
  display: 'flex',
  flexDirection: 'column',
  gap: .5,
}

// Một dòng tin nhắn. Nút trả lời chỉ hiện khi rê chuột vào dòng
export function miniRow(isMine) {
  return {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: isMine ? 'flex-end' : 'flex-start',
    '&:hover .miniReplyBtn': { opacity: 1 },
  }
}

export var miniAvatarSlot = {
  width: 28,
  height: 28,
  flexShrink: 0,
  mr: .75,
}

// Chỗ trống giữ nguyên bề ngang khi tin không phải cuối cụm (không hiện avatar)
export var miniAvatarGap = {
  width: 28,
  flexShrink: 0,
  mr: .75,
}

export function miniBubbleWrap(isMine) {
  return {
    maxWidth: '75%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: isMine ? 'flex-end' : 'flex-start',
  }
}

// Bong bóng tin nhắn: mình màu xanh bo góc phải, người khác màu xám bo góc trái
export function miniBubble(isMine, isMedia) {
  return {
    p: isMedia ? .5 : undefined,
    py: isMedia ? undefined : 1,
    px: isMedia ? undefined : 1.5,
    borderRadius: '18px',
    fontSize: 14,
    maxWidth: '100%',
    wordBreak: 'break-word',
    lineHeight: 1.4,
    bgcolor: isMine ? 'primary.main' : 'action.hover',
    color: isMine ? '#fff' : 'text.primary',
    borderBottomRightRadius: isMine ? '4px' : undefined,
    borderBottomLeftRadius: isMine ? undefined : '4px',
  }
}

export var miniReplyBtn = {
  opacity: 0,
  border: 'none',
  background: 'transparent',
  color: 'text.secondary',
  fontSize: 14,
  cursor: 'pointer',
  py: .5, px: .75,
  flexShrink: 0,
  alignSelf: 'center',
  transition: 'opacity 140ms, color 140ms',
  '&:hover': { color: 'text.primary' },
}

// Trích dẫn tin đang trả lời, nằm bên trong bong bóng
export function miniReplyPreview(isMine) {
  return {
    mb: '5px',
    py: .5, px: 1,
    borderRadius: 2.5,
    bgcolor: isMine ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.08)',
    borderLeft: '3px solid',
    borderLeftColor: isMine ? 'rgba(255,255,255,.45)' : 'primary.main',
    fontSize: 12,
    opacity: .9,
    lineHeight: 1.3,
    '& span': {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: 180,
    },
  }
}

export var miniReplyComposer = {
  py: 1, px: 1.25,
  borderTop: '1px solid',
  borderTopColor: 'divider',
  borderLeft: '3px solid',
  borderLeftColor: 'primary.main',
  bgcolor: 'rgba(255,255,255,.04)',
  display: 'flex',
  alignItems: 'center',
  gap: 1,
}

export var miniReplyComposerText = {
  minWidth: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  '& strong': { color: 'text.primary', fontSize: 12, fontWeight: 700 },
  '& span': {
    color: 'text.secondary',
    fontSize: 11,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}

export var miniReplyCancelBtn = {
  width: 22,
  height: 22,
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  color: 'text.secondary',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
  flexShrink: 0,
  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
}

export var miniInputWrap = {
  position: 'relative',
  flexShrink: 0,
  borderTop: '1px solid',
  borderTopColor: 'divider',
}

export var miniEmojiWrap = {
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  left: 8,
  zIndex: 600,
  borderRadius: 3,
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,.6)',
}

export var miniInputBar = {
  display: 'flex',
  alignItems: 'center',
  gap: .5,
  py: 1, px: 1.5,
}

export var miniInputForm = { flex: 1, display: 'flex' }

export var miniInput = {
  flex: 1,
  height: 38,
  px: 1.75,
  borderRadius: '19px',
  border: '1px solid',
  borderColor: 'divider',
  background: 'transparent',
  color: 'text.primary',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 140ms',
  '&::placeholder': { color: 'text.secondary' },
  '&:focus': { borderColor: 'rgba(255,255,255,.25)' },
}

export var miniSendBtn = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  color: 'primary.main',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 140ms',
  flexShrink: 0,
  '&:hover:not(:disabled)': { bgcolor: 'action.hover' },
  '&:disabled': { opacity: .35, cursor: 'not-allowed' },
}

// Ba chấm nhấp nhô khi người kia đang gõ
export var miniTypingBubble = {
  py: 1.25, px: 1.75,
  display: 'flex',
  alignItems: 'center',
  gap: .5,
  borderRadius: '18px',
  borderBottomLeftRadius: '4px',
  bgcolor: 'action.hover',
}

export function miniTypingDot(index) {
  return {
    width: 7,
    height: 7,
    borderRadius: '50%',
    bgcolor: 'text.secondary',
    animation: 'miniTypingBounce 1.2s infinite',
    animationDelay: (index * 0.2) + 's',
    '@keyframes miniTypingBounce': {
      '0%, 60%, 100%': { transform: 'translateY(0)', opacity: .5 },
      '30%': { transform: 'translateY(-5px)', opacity: 1 },
    },
  }
}

export var miniStoryReplyPreview = {
  overflow: 'hidden',
  width: 150,
  height: 190,
  mb: '7px',
  borderRadius: '13px',
  bgcolor: 'rgba(0,0,0,.18)',
}

export var miniStoryReplyMedia = {
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

export var miniMsgImage = {
  display: 'block',
  maxWidth: 200,
  maxHeight: 240,
  borderRadius: '14px',
  objectFit: 'contain',
  cursor: 'pointer',
}

export var miniMsgVideo = {
  display: 'block',
  maxWidth: 200,
  borderRadius: '14px',
}

export var miniReadReceipt = {
  fontSize: 10,
  color: 'text.secondary',
  textAlign: 'right',
  mt: '2px',
  pr: '2px',
}
