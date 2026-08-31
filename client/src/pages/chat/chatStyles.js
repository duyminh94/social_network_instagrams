// pages/chat/chatStyles.js
// Các object sx của trang chat đầy đủ — thay cho Chat.module.css
//
// Tách file riêng vì Chat.jsx hơn 1800 dòng: gộp thêm 1100 dòng style vào nữa
//   thì không đọc nổi phần logic socket / react-query
//
// Nền panel và bong bóng tin nhắn lấy theo token theme; riêng màu trạng thái
//   chưa đọc và hộp xác nhận giữ mã màu cứng như bản CSS gốc

import { fadeIn, scaleIn, DUR } from '../../theme/animations'

var MOBILE = '@media (max-width:768px)'

export var layout = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
  bgcolor: 'background.default',
}

// ── Sidebar danh sách hội thoại ──

export var sidebar = {
  width: 340,
  flexShrink: 0,
  borderRight: '1px solid',
  borderRightColor: 'divider',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  [MOBILE]: { width: '100%' },
}

export var sidebarHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  pt: 2, px: 2, pb: 1,
  flexShrink: 0,
}

export var sidebarUsername = {
  display: 'flex',
  alignItems: 'center',
  gap: .5,
  fontSize: 16,
  fontWeight: 700,
  color: 'text.primary',
  cursor: 'pointer',
}

export function iconBtn(isActive) {
  return {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    bgcolor: isActive ? 'action.hover' : 'transparent',
    color: 'text.primary',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 140ms',
    '&:hover': { bgcolor: 'action.hover' },
  }
}

export var searchWrap = {
  position: 'relative',
  mt: .75, mx: 2, mb: 1.5,
  flexShrink: 0,
}

export var searchIcon = {
  position: 'absolute',
  left: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'text.secondary',
  pointerEvents: 'none',
}

export var searchInput = {
  width: '100%',
  height: 36,
  pl: '36px', pr: 2,
  borderRadius: '18px',
  border: 'none',
  bgcolor: 'action.hover',
  color: 'text.primary',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  '&::placeholder': { color: 'text.secondary' },
}

export var notesSection = { px: 2, pb: 1.5, flexShrink: 0 }

export var notesLabel = { fontSize: 12, color: 'text.secondary', mb: 1 }

export var notesItem = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: .5,
  width: 60,
}

// Avatar phải lấp đầy vòng tròn nét đứt — component Avatar tự đặt size cứng
//   nên phải ghi đè cả .MuiAvatar-root (MUI bọc ảnh trong một div)
export var notesAvatar = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  border: '2px dashed',
  borderColor: 'text.secondary',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .MuiAvatar-root, & img': {
    width: '100% !important',
    height: '100% !important',
    objectFit: 'cover',
    borderRadius: '50%',
  },
}

export var notesText = {
  fontSize: 11,
  color: 'text.secondary',
  textAlign: 'center',
  lineHeight: 1.3,
}

export var convListHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  py: 1, px: 2,
  flexShrink: 0,
}

export var convListTitle = { fontSize: 15, fontWeight: 700, color: 'text.primary' }

// ── Panel tạo hội thoại mới ──

export var newConvPanel = {
  pt: 1, px: 2, pb: 1.5,
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  flexShrink: 0,
}

export var newConvInput = {
  width: '100%',
  py: 1, px: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
  color: 'text.primary',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  mb: 1,
  '&::placeholder': { color: 'text.secondary' },
  '&:focus': { borderColor: 'primary.main' },
}

export var newConvSelectedList = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: .75,
  mb: 1,
}

export var newConvSelectedChip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: .75,
  maxWidth: '100%',
  py: .75, px: 1.25,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '999px',
  bgcolor: 'action.hover',
  color: 'text.primary',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

export function newConvUser(isSelected) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    py: 1,
    pl: isSelected ? 1 : 0,
    cursor: 'pointer',
    borderRadius: 2,
    transition: 'background 130ms',
    position: 'relative',
    bgcolor: isSelected ? 'action.hover' : 'transparent',
    '&:hover': { bgcolor: 'action.hover', pl: 1 },
  }
}

export var newConvUserName = { fontWeight: 600, fontSize: 14, color: 'text.primary' }
export var newConvUserSub = { fontSize: 12, color: 'text.secondary' }
export var newConvCheck = {
  ml: 'auto',
  pr: 1,
  color: 'primary.main',
  fontSize: 14,
  fontWeight: 800,
}

export var newConvCreateBtn = {
  width: '100%',
  mt: 1,
  py: 1.125, px: 1.5,
  border: 'none',
  borderRadius: 2,
  bgcolor: 'primary.main',
  color: 'white',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  '&:disabled': { opacity: .55, cursor: 'default' },
}

export var emptyConvMsg = {
  py: 3, px: 2,
  fontSize: 14,
  color: 'text.secondary',
  lineHeight: 1.5,
  m: 0,
}

// ── Một dòng hội thoại ──
// Chưa đọc: nền xanh nhạt + vạch xanh trái. Đang mở: nền hover.
export function convItem(isActive, isUnread) {
  var base = {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    py: 1.25, px: 2,
    cursor: 'pointer',
    transition: 'background 120ms',
  }
  if (isUnread) {
    return {
      ...base,
      bgcolor: isActive ? 'rgba(0, 132, 255, 0.16)' : 'rgba(0, 132, 255, 0.10)',
      boxShadow: 'inset 3px 0 0 #0084ff',
      '&:hover': { bgcolor: 'rgba(0, 132, 255, 0.16)' },
    }
  }
  return {
    ...base,
    bgcolor: isActive ? 'action.hover' : 'transparent',
    '&:hover': { bgcolor: 'action.hover' },
  }
}

export var convMeta = { flex: 1, minWidth: 0 }

export function convName(isActive, isUnread) {
  var color = 'rgba(255, 255, 255, 0.62)'
  if (isUnread) color = '#f5f7fb'
  else if (isActive) color = 'rgba(255, 255, 255, 0.78)'
  return {
    fontSize: 14,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: color,
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
    '& .convPreviewText': { overflow: 'hidden', textOverflow: 'ellipsis' },
    '& .convPreviewDot': { flexShrink: 0 },
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

// ── Cửa sổ chat bên phải ──
// Mobile: ẩn hẳn, chỉ mở đè toàn màn hình khi đã chọn hội thoại
export function chatWindow(isOpen) {
  return {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    [MOBILE]: isOpen
      ? { display: 'flex', position: 'fixed', inset: 0, bgcolor: 'background.default', zIndex: 50 }
      : { display: 'none' },
  }
}

export var windowEmpty = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export var windowEmptyInner = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1.5,
  color: 'text.secondary',
}

export var windowEmptyIcon = {
  width: 96,
  height: 96,
  borderRadius: '50%',
  border: '2px solid',
  borderColor: 'text.secondary',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export var windowEmptyTitle = {
  fontSize: 20,
  fontWeight: 300,
  color: 'text.primary',
  mt: 1,
}

export var windowEmptySub = { fontSize: 14, color: 'text.secondary', textAlign: 'center' }

export var chatHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  py: 1.5, px: 2.5,
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  flexShrink: 0,
}

export var chatHeaderInfo = { display: 'flex', alignItems: 'center', gap: 1.5 }
export var chatHeaderText = { display: 'flex', flexDirection: 'column', gap: '2px' }
export var chatHeaderName = { fontSize: 15, fontWeight: 600, color: 'text.primary' }
export var chatHeaderSub = { fontSize: 13, color: 'text.secondary' }
export var chatHeaderActions = { display: 'flex', alignItems: 'center', gap: .5 }

// ── Panel chi tiết (nút i) ──

export var detailsPanel = {
  animation: 'chatPanelIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
  '@keyframes chatPanelIn': {
    from: { opacity: 0, transform: 'translateX(16px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
  position: 'absolute',
  top: 65,
  right: 0,
  bottom: 0,
  width: 330,
  zIndex: 80,
  bgcolor: 'background.default',
  borderLeft: '1px solid',
  borderLeftColor: 'divider',
  boxShadow: '-8px 0 18px rgba(0,0,0,.28)',
  display: 'flex',
  flexDirection: 'column',
}

export var detailsTitle = {
  minHeight: 72,
  display: 'flex',
  alignItems: 'center',
  px: 3.5,
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  color: 'text.primary',
  fontSize: 24,
  fontWeight: 700,
}

export var detailsNotifyRow = {
  minHeight: 88,
  display: 'flex',
  alignItems: 'center',
  gap: 2.25,
  py: 2, px: 3.5,
  border: 'none',
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  background: 'transparent',
  color: 'text.primary',
  cursor: 'pointer',
  textAlign: 'left',
}

export var detailsNotifyIcon = { display: 'flex', color: 'text.primary', flexShrink: 0 }
export var detailsNotifyText = { flex: 1, fontSize: 18, fontWeight: 700, lineHeight: 1.25 }

// Công tắc tự vẽ — nút tròn trượt sang phải khi bật
export function detailsSwitch(isOn) {
  return {
    width: 52,
    height: 28,
    borderRadius: '999px',
    bgcolor: isOn ? 'primary.main' : '#303741',
    p: '3px',
    flexShrink: 0,
    '& span': {
      display: 'block',
      width: 22,
      height: 22,
      borderRadius: '50%',
      bgcolor: isOn ? '#fff' : '#101418',
      transform: isOn ? 'translateX(24px)' : 'none',
      transition: 'transform 140ms, background 140ms',
    },
  }
}

export var detailsSection = { py: 3, px: 3.5, flex: 1, overflowY: 'auto' }

export var detailsSectionTitle = {
  color: 'text.primary',
  fontSize: 18,
  fontWeight: 700,
  mb: 2.25,
}

export var detailsMember = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 1.75,
  border: 'none',
  background: 'transparent',
  color: 'text.primary',
  py: 1,
  cursor: 'pointer',
  textAlign: 'left',
}

export var detailsMemberRow = { display: 'flex', alignItems: 'center', gap: 1 }

export var detailsMemberText = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: .5,
}

export var detailsMemberName = {
  color: 'text.primary',
  fontSize: 16,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export var detailsMemberUsername = {
  color: 'text.secondary',
  fontSize: 15,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export var detailsKickBtn = {
  border: '1px solid rgba(255,77,94,.35)',
  borderRadius: 2,
  bgcolor: 'rgba(255,77,94,.08)',
  color: '#ff6b7a',
  fontSize: 12,
  fontWeight: 700,
  py: .75, px: 1,
  cursor: 'pointer',
  flexShrink: 0,
  '&:hover': { bgcolor: 'rgba(255,77,94,.16)' },
}

export var detailsBottom = {
  borderTop: '1px solid',
  borderTopColor: 'divider',
  py: 2.75, px: 3.5,
  display: 'flex',
  flexDirection: 'column',
  gap: 2.75,
}

export function detailsAction(isDanger) {
  return {
    border: 'none',
    background: 'transparent',
    color: isDanger ? '#ff4d5e' : 'text.primary',
    fontSize: 18,
    fontWeight: 500,
    textAlign: 'left',
    p: 0,
    cursor: 'pointer',
    '&:disabled': { opacity: .55, cursor: 'not-allowed' },
  }
}

// ── Khu vực tin nhắn ──

export var messages = {
  flex: 1,
  overflowY: 'auto',
  py: 2, px: 2.5,
  display: 'flex',
  flexDirection: 'column',
  gap: .5,
}

export var profileCard = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1,
  pt: 5, pb: 4,
  my: 'auto',
}

export var profileCardName = { fontSize: 18, fontWeight: 700, color: 'text.primary', mt: 1 }
export var profileCardSub = { fontSize: 14, color: 'text.secondary' }

export var profileCardBtn = {
  mt: 1,
  py: 1, px: 2.5,
  borderRadius: 2,
  border: 'none',
  bgcolor: 'action.hover',
  color: 'text.primary',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 140ms',
  '&:hover': { bgcolor: 'rgba(255,255,255,.12)' },
}

// Dòng tin nhắn. Tin của mình đảo chiều để avatar và nút trả lời sang phải
export function messageRow(isMine) {
  return {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 1,
    mb: '2px',
    flexDirection: isMine ? 'row-reverse' : 'row',
    '&:hover .messageReplyBtn': { opacity: 1 },
    '&:hover .messageReactBtn': { opacity: 1 },
  }
}

export var avatarSlot = { width: 28, height: 28, flexShrink: 0 }
export var avatarGap = { width: 28, flexShrink: 0 }

export function bubbleWrap(isMine) {
  return {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '60%',
    alignItems: isMine ? 'flex-end' : 'flex-start',
  }
}

export var senderName = {
  fontSize: 11,
  color: 'text.secondary',
  mb: '2px',
  px: .5,
}

export function bubble(isMine, isMedia) {
  return {
    p: isMedia ? .5 : undefined,
    py: isMedia ? undefined : 1.25,
    px: isMedia ? undefined : 1.75,
    borderRadius: '20px',
    fontSize: 14,
    wordBreak: 'break-word',
    lineHeight: 1.4,
    bgcolor: isMine ? 'primary.main' : 'action.hover',
    color: isMine ? '#fff' : 'text.primary',
    borderBottomRightRadius: isMine ? '4px' : undefined,
    borderBottomLeftRadius: isMine ? undefined : '4px',
  }
}

export var messageReplyBtn = {
  opacity: 0,
  border: 'none',
  background: 'transparent',
  color: 'text.secondary',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  py: .75, px: .5,
  transition: 'opacity 140ms, color 140ms',
  '&:hover': { color: 'text.primary' },
}

// Thanh tin nhắn đã ghim, nằm ngay dưới header và trên danh sách tin nhắn
export var pinnedBar = {
  borderBottom: '1px solid',
  borderColor: 'divider',
  bgcolor: 'action.hover',
  px: 2, py: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: .5,
  flexShrink: 0,
}

export var pinnedItem = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
}

export var pinnedText = {
  flex: 1,
  minWidth: 0,
  textAlign: 'left',
  border: 'none',
  background: 'transparent',
  color: 'text.primary',
  fontSize: 13,
  cursor: 'pointer',
  p: 0,
  // Tin dài chỉ hiện 1 dòng để thanh ghim không đẩy khung chat
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export var pinnedUnpinBtn = {
  border: 'none',
  background: 'transparent',
  color: 'text.secondary',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
  p: 0,
  '&:hover': { color: 'text.primary' },
}

// Nút mở bảng chọn cảm xúc — cùng kiểu ẩn/hiện khi hover như nút trả lời
export var messageReactBtn = {
  opacity: 0,
  border: 'none',
  background: 'transparent',
  fontSize: 14,
  lineHeight: 1,
  cursor: 'pointer',
  py: .75, px: .25,
  transition: 'opacity 140ms',
}

// Bọc bảng chọn cảm xúc: ReactionBar định vị absolute nên cần mốc relative
export var reactionPickerAnchor = {
  position: 'relative',
}

// Hàng emoji hiển thị dưới bong bóng tin nhắn
export function messageReactions(isMine) {
  return {
    display: 'flex',
    gap: .25,
    mt: '2px',
    px: .5,
    fontSize: 13,
    alignSelf: isMine ? 'flex-end' : 'flex-start',
  }
}

export function replyPreviewInBubble(isMine) {
  return {
    maxWidth: 220,
    mb: .75,
    py: .75, px: 1,
    borderRadius: 3,
    bgcolor: isMine ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.08)',
    borderLeft: '3px solid',
    borderLeftColor: isMine ? 'rgba(255,255,255,.45)' : 'primary.main',
    color: 'inherit',
    opacity: .9,
    fontSize: 12,
    lineHeight: 1.3,
    '& span': {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  }
}

export var storyReplyPreview = {
  overflow: 'hidden',
  width: 160,
  height: 210,
  mb: 1,
  borderRadius: '14px',
  bgcolor: 'rgba(0,0,0,.18)',
}

export var storyReplyMedia = {
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

export var systemMessage = {
  alignSelf: 'center',
  maxWidth: '72%',
  my: 1.5, mx: 'auto',
  py: .75, px: 1.5,
  borderRadius: '999px',
  bgcolor: 'rgba(255,255,255,.08)',
  color: 'text.secondary',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.4,
  textAlign: 'center',
}

export var msgImage = {
  display: 'block',
  maxWidth: 240,
  maxHeight: 300,
  borderRadius: '16px',
  objectFit: 'contain',
  cursor: 'pointer',
}

export var msgVideo = {
  display: 'block',
  maxWidth: 240,
  maxHeight: 300,
  borderRadius: '16px',
}

export var typing = {
  display: 'flex',
  gap: .5,
  alignItems: 'center',
  py: 1.25, px: 1.75,
  bgcolor: 'action.hover',
  borderRadius: '20px',
  width: 'fit-content',
  borderBottomLeftRadius: '4px',
}

export function typingDot(index) {
  return {
    width: 6,
    height: 6,
    bgcolor: 'text.secondary',
    borderRadius: '50%',
    animation: 'chatTypingBounce 1.2s infinite',
    animationDelay: (index * 0.2) + 's',
    '@keyframes chatTypingBounce': {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-5px)' },
    },
  }
}

export var readReceipt = {
  width: '100%',
  fontSize: 11,
  color: 'text.secondary',
  textAlign: 'right',
  mt: '2px',
}

// ── Ô nhập tin nhắn ──

export var inputWrap = { position: 'relative', flexShrink: 0 }

export var replyComposer = {
  mx: 2,
  py: 1.25, px: 1.5,
  borderTop: '1px solid',
  borderTopColor: 'divider',
  borderLeft: '3px solid',
  borderLeftColor: 'primary.main',
  bgcolor: 'rgba(255,255,255,.04)',
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
}

export var replyComposerText = {
  minWidth: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  '& strong': { color: 'text.primary', fontSize: 13, fontWeight: 800 },
  '& span': {
    color: 'text.secondary',
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}

export var replyCancelBtn = {
  width: 28,
  height: 28,
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  color: 'text.secondary',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
}

export var emojiPickerWrap = {
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  left: 12,
  zIndex: 200,
  borderRadius: 3,
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,.5)',
}

export var inputArea = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  py: 1.5, px: 2,
  borderTop: '1px solid',
  borderTopColor: 'divider',
  flexShrink: 0,
}

export var inputBox = {
  flex: 1,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  gap: .5,
  pl: 1.25, pr: 1,
  borderRadius: '22px',
  border: '1px solid',
  borderColor: 'divider',
  background: 'transparent',
  transition: 'border-color 140ms',
  '&:focus-within': { borderColor: 'rgba(255,255,255,.25)' },
}

export function inputIconBtn(isActive) {
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
    flexShrink: 0,
    transition: 'background 140ms',
    '&:hover': { bgcolor: 'action.hover' },
  }
}

export var inputField = {
  flex: 1,
  height: '100%',
  minWidth: 0,
  px: .75,
  border: 'none',
  background: 'transparent',
  color: 'text.primary',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  '&::placeholder': { color: 'text.secondary' },
}

export var sendTextBtn = {
  px: 1.5,
  height: 36,
  border: 'none',
  background: 'transparent',
  color: 'primary.main',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'opacity 140ms',
  '&:hover': { opacity: .8 },
}

export var inputRightIcons = {
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  flexShrink: 0,
}

// ── Tin nhắn đang chờ duyệt ──

export var pendingBtn = {
  background: 'none',
  border: 'none',
  color: 'primary.main',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: .75,
  p: 0,
  '&:hover': { opacity: .8 },
}

export var pendingBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 18,
  height: 18,
  px: '5px',
  borderRadius: '9px',
  bgcolor: 'primary.main',
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
}

export var pendingDot = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  bgcolor: 'primary.main',
  flexShrink: 0,
}

export var pendingView = { flex: 1, overflowY: 'auto', pb: 1 }

export var pendingViewTitle = {
  fontSize: 16,
  fontWeight: 700,
  color: 'text.primary',
  pt: 1.5, px: 2, pb: .5,
}

export var pendingViewDesc = {
  fontSize: 13,
  color: 'text.secondary',
  px: 2, pb: 1.5,
  m: 0,
  mb: 1,
  lineHeight: 1.5,
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
}

export var pendingPreviewMsg = {
  display: 'flex',
  justifyContent: 'flex-start',
  px: 2.5,
  mt: 2,
}

export var pendingActions = {
  borderTop: '1px solid',
  borderTopColor: 'divider',
  pt: 2, px: 2.5, pb: 2.5,
  flexShrink: 0,
}

export var pendingActionsHint = {
  fontSize: 13,
  color: 'text.secondary',
  textAlign: 'center',
  m: 0, mb: 1.75,
}

export var pendingActionsRow = { display: 'flex', gap: 1.5, justifyContent: 'center' }

export var acceptBtn = {
  flex: 1,
  maxWidth: 200,
  height: 40,
  border: 'none',
  borderRadius: 2,
  bgcolor: 'primary.main',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 140ms, opacity 140ms',
  '&:hover:not(:disabled)': { bgcolor: 'primary.dark' },
  '&:disabled': { opacity: .6, cursor: 'not-allowed' },
}

export var declineBtn = {
  flex: 1,
  maxWidth: 200,
  height: 40,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  background: 'transparent',
  color: 'text.primary',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 140ms, opacity 140ms',
  '&:hover:not(:disabled)': { bgcolor: 'action.hover' },
  '&:disabled': { opacity: .6, cursor: 'not-allowed' },
}

// ── Hộp xác nhận thay cho window.confirm ──

export var confirmOverlay = {
  ...fadeIn(DUR.fast),
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: 'rgba(0,0,0,.55)',
}

export var confirmBox = {
  ...scaleIn(DUR.fast),
  width: 'min(420px, calc(100vw - 32px))',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 3.5,
  bgcolor: '#1f1f22',
  p: 2.75,
  boxShadow: '0 18px 50px rgba(0,0,0,.55)',
}

export var confirmTitle = { color: 'text.primary', fontSize: 18, fontWeight: 700, mb: 1.25 }
export var confirmMessage = { color: 'text.secondary', fontSize: 14, lineHeight: 1.5 }
export var confirmActions = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 1.25,
  mt: 2.75,
}

var confirmBtnBase = {
  height: 38,
  minWidth: 88,
  borderRadius: '9px',
  border: 'none',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

export var confirmCancel = { ...confirmBtnBase, bgcolor: 'action.hover', color: 'text.primary' }
export var confirmOk = { ...confirmBtnBase, bgcolor: '#ff4d5e', color: '#fff' }
