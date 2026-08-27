// components/story/storyStyles.js
// Các object sx dùng chung cho StoryBar và StoryViewer — thay cho Story.module.css
//
// Hai component tách rời nhưng cùng một bộ giao diện Story nên gom style về đây,
//   giống cách postStyles.js phục vụ PostCard và PostModal
//
// Lưu ý về màu: phần trình chiếu story (viewer, khung story, nút điều hướng)
//   luôn nằm trên nền tối #1a1a1a nên màu ghi cứng. Ngược lại các hộp thoại
//   (modal đăng story, panel người xem, hộp xác nhận xoá) là giao diện thường
//   nên dùng token theme để đổi được sáng/tối

import { fadeIn, scaleIn, slideUp, DUR } from '../../theme/animations'

var MOBILE = '@media (max-width:768px)'

var BLUE = '#0095f6'

// ===================== StoryBar =====================

export var storyBar = {
  display: 'flex',
  gap: 1.75,
  p: 2,
  overflowX: 'auto',
  borderRadius: 2,
  mb: 3,
  '&::-webkit-scrollbar': { display: 'none' },
}

export var storyItem = {
  width: 72,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: .75,
  cursor: 'pointer',
  flex: '0 0 72px',
}

export var storyAvatarSlot = {
  width: 66,
  height: 66,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 66px',
}

export var storyName = {
  width: 72,
  fontSize: 12,
  lineHeight: '16px',
  color: 'text.primary',
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

// Bọc avatar của chính mình để đặt được nút "+" ở góc
export var myStoryWrapper = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export var addStoryBtn = {
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 20,
  height: 20,
  borderRadius: '50%',
  bgcolor: BLUE,
  border: '2px solid',
  borderColor: 'background.paper',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  p: 0,
  zIndex: 1,
  '&:hover': { bgcolor: '#0080d6' },
}

// ===================== Modal đăng story =====================

export var uploadOverlay = {
  ...fadeIn(),
  position: 'fixed',
  inset: 0,
  bgcolor: 'rgba(0,0,0,0.7)',
  zIndex: 9998,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export var uploadModal = {
  ...scaleIn(),
  bgcolor: 'background.paper',
  borderRadius: 3,
  width: '90%',
  maxWidth: 420,
  p: 2.5,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

export var uploadModalHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 16,
  fontWeight: 600,
  color: 'text.primary',
}

export var uploadCloseBtn = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  color: 'text.secondary',
  py: .25, px: .75,
  '&:hover': { color: 'text.primary' },
}

export var uploadPreviewWrapper = {
  display: 'flex',
  justifyContent: 'center',
  bgcolor: 'background.default',
  borderRadius: 2,
  overflow: 'hidden',
  maxHeight: 360,
}

export var uploadPreview = {
  maxWidth: '100%',
  maxHeight: 360,
  objectFit: 'contain',
  display: 'block',
}

export var allowCommentRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  cursor: 'pointer',
  fontSize: 14,
  color: 'text.primary',
  userSelect: 'none',
  '& input': { width: 16, height: 16, cursor: 'pointer', accentColor: BLUE },
}

export var uploadActions = {
  display: 'flex',
  gap: 1.25,
  justifyContent: 'flex-end',
}

export var cancelBtn = {
  background: 'none',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  px: 2.5, py: 1,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  color: 'text.primary',
  '&:hover': { bgcolor: 'background.default' },
}

export var submitBtn = {
  bgcolor: BLUE,
  border: 'none',
  borderRadius: 2,
  px: 2.5, py: 1,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  color: '#fff',
  '&:hover:not(:disabled)': { bgcolor: '#0080d6' },
  '&:disabled': { opacity: .6, cursor: 'not-allowed' },
}

// ===================== StoryViewer =====================

export var viewer = {
  ...fadeIn(DUR.slow),
  position: 'fixed',
  inset: 0,
  bgcolor: '#1a1a1a',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  py: 2.25, px: 11,
  boxSizing: 'border-box',
  [MOBILE]: { p: 0 },
}

export var storyFrame = {
  ...scaleIn(DUR.slow),
  position: 'relative',
  height: 'min(92vh, 900px)',
  aspectRatio: '9 / 16',
  maxWidth: 'min(620px, calc(100vw - 180px))',
  overflow: 'hidden',
  bgcolor: '#111',
  borderRadius: 2,
  boxShadow: '0 18px 60px rgba(0,0,0,.55)',
  zIndex: 2,
  [MOBILE]: { width: '100%', height: '100%', maxWidth: 'none', borderRadius: 0 },
}

export var viewerLogo = {
  position: 'absolute',
  top: 22,
  left: 18,
  zIndex: 10006,
  border: 'none',
  background: 'transparent',
  p: 0,
  cursor: 'pointer',
}

// Story kế bên (mờ, nhỏ hơn) — bấm để nhảy sang user trước/sau
export function storySidePreview(isLeft) {
  var offset = 'max(32px, calc(50% - min(310px, 31vw) - 310px))'
  return {
    position: 'absolute',
    top: '50%',
    width: 250,
    height: '55vh',
    maxHeight: 470,
    minHeight: 330,
    transform: 'translateY(-50%)',
    border: 'none',
    borderRadius: 2,
    overflow: 'hidden',
    p: 0,
    bgcolor: '#222',
    cursor: 'pointer',
    opacity: .52,
    zIndex: 1,
    boxShadow: '0 16px 50px rgba(0,0,0,0.35)',
    [isLeft ? 'left' : 'right']: offset,
    '&:hover': { opacity: .72 },
  }
}

export var storySideMedia = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
  filter: 'blur(1px) brightness(0.75)',
  transform: 'scale(1.04)',
}

export var storySideShade = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(circle at center, rgba(0,0,0,0.05), rgba(0,0,0,0.55))',
}

export var storySideUser = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: .75,
  color: '#fff',
  textShadow: '0 2px 10px rgba(0,0,0,0.8)',
  '& strong': {
    maxWidth: 160,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 16,
    lineHeight: '20px',
  },
  '& span': { fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)' },
}

export var viewerMedia = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  display: 'block',
}

// Nút qua/lại story nằm NGOÀI khung story, giống Instagram
export function storyNav(isPrev) {
  var offset = 'max(72px, calc(50% - min(310px, 31vw) - 72px))'
  return {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 46,
    height: 46,
    borderRadius: '50%',
    border: 'none',
    bgcolor: 'rgba(255,255,255,0.94)',
    color: '#111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10005,
    boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
    [isPrev ? 'left' : 'right']: offset,
    '&:hover:not(:disabled)': { bgcolor: '#fff', transform: 'translateY(-50%) scale(1.04)' },
    '&:disabled': { opacity: .25, cursor: 'default' },
  }
}

export var progress = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  display: 'flex',
  gap: .5,
  p: 1.5,
}

export var progressBar = {
  flex: 1,
  height: 2,
  bgcolor: 'rgba(255,255,255,0.4)',
  borderRadius: '2px',
  overflow: 'hidden',
}

// Vạch chạy 5 giây cho story đang xem
export var progressFill = {
  height: '100%',
  bgcolor: 'white',
  animation: 'storyProgress 5s linear forwards',
  '@keyframes storyProgress': { from: { width: '0%' }, to: { width: '100%' } },
}

export var viewerHeader = {
  position: 'absolute',
  top: 32,
  left: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  zIndex: 10000,
}

export var closeBtn = {
  position: 'absolute',
  top: 18,
  right: 22,
  bgcolor: 'rgba(255,255,255,.08)',
  border: 'none',
  color: 'white',
  fontSize: 24,
  cursor: 'pointer',
  zIndex: 10000,
  width: 42,
  height: 42,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': { bgcolor: 'rgba(255,255,255,.16)' },
  [MOBILE]: { top: 14, right: 14, bgcolor: 'rgba(0,0,0,.35)' },
}

export var deleteStoryBtn = {
  position: 'absolute',
  top: 12,
  right: 56,
  bgcolor: 'rgba(0,0,0,0.45)',
  border: 'none',
  color: 'white',
  fontSize: 16,
  cursor: 'pointer',
  zIndex: 10000,
  borderRadius: '50%',
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': { bgcolor: 'rgba(200,30,30,0.75)' },
  '&:disabled': { opacity: .5, cursor: 'not-allowed' },
}

export var playStoryBtn = {
  position: 'absolute',
  top: 12,
  right: 12,
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: 'none',
  bgcolor: 'rgba(0,0,0,0.45)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 10000,
  '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
}

// Hàng trả lời + tim + gửi. Chủ story có thêm thanh người xem nên phải đẩy lên cao
export function storyActions(isOwn) {
  return {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: isOwn ? 64 : 18,
    minHeight: 50,
    display: 'flex',
    alignItems: 'center',
    gap: 1.75,
    zIndex: 10001,
    boxSizing: 'border-box',
  }
}

// Nút tròn trong hàng hành động; isLiked thì tô đỏ icon trái tim
export function storyIconBtn(isLiked) {
  return {
    width: 42,
    height: 42,
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    color: isLiked ? '#ff3040' : '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    p: 0,
    flex: '0 0 42px',
    '&:hover:not(:disabled)': { bgcolor: 'rgba(255,255,255,0.12)' },
    '&:disabled': { opacity: .45, cursor: 'not-allowed' },
  }
}

export var storyCommentForm = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: .75,
}

export var commentsOffNote = {
  flex: 1,
  minWidth: 0,
  color: 'rgba(255,255,255,0.78)',
  fontSize: 14,
  fontStyle: 'italic',
}

export var storyCommentInput = {
  width: '100%',
  height: 48,
  border: '2px solid rgba(255,255,255,0.9)',
  borderRadius: '999px',
  bgcolor: 'rgba(0,0,0,0.12)',
  color: '#fff',
  outline: 'none',
  px: 2.5,
  fontSize: 15,
  fontFamily: 'inherit',
  fontWeight: 600,
  boxSizing: 'border-box',
  '&::placeholder': { color: 'rgba(255,255,255,0.78)' },
  '&:focus': { borderColor: '#fff', bgcolor: 'rgba(0,0,0,0.22)' },
}

export var viewersBar = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  py: 2, px: 2.5,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  color: 'white',
  fontSize: 14,
  cursor: 'pointer',
  background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
  zIndex: 10001,
  '&:hover': { background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' },
}

export var viewersPanel = {
  ...slideUp(DUR.normal, 24),
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  maxHeight: '60vh',
  bgcolor: 'background.paper',
  borderRadius: '16px 16px 0 0',
  zIndex: 10002,
  overflowY: 'auto',
}

export var viewersPanelHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  py: 2, px: 2.5,
  fontWeight: 600,
  fontSize: 15,
  color: 'text.primary',
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  // Dính đầu panel để còn thấy nút đóng khi cuộn danh sách dài
  position: 'sticky',
  top: 0,
  bgcolor: 'background.paper',
}

export var closePanelBtn = {
  background: 'none',
  border: 'none',
  fontSize: 18,
  cursor: 'pointer',
  color: 'text.secondary',
  py: .5, px: .75,
  '&:hover': { color: 'text.primary' },
}

export var viewersEmpty = {
  textAlign: 'center',
  py: 4, px: 2.5,
  color: 'text.secondary',
  fontSize: 14,
}

export var viewerRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  py: 1.25, px: 2.5,
  '&:hover': { bgcolor: 'background.default' },
}

export var viewerName = {
  fontSize: 14,
  fontWeight: 500,
  color: 'text.primary',
}

// ===================== Hộp xác nhận xoá story =====================

export var confirmOverlay = {
  position: 'absolute',
  inset: 0,
  bgcolor: 'rgba(0,0,0,0.55)',
  zIndex: 10003,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export var confirmDialog = {
  ...scaleIn(DUR.fast),
  bgcolor: 'background.paper',
  borderRadius: 3,
  py: 3, px: 3.5,
  minWidth: 260,
  textAlign: 'center',
}

export var confirmText = {
  m: 0,
  mb: 2.5,
  fontSize: 15,
  fontWeight: 500,
  color: 'text.primary',
}

export var confirmActions = {
  display: 'flex',
  gap: 1.25,
  justifyContent: 'center',
}

export var confirmCancelBtn = {
  flex: 1,
  py: 1.125,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  background: 'none',
  fontSize: 14,
  fontWeight: 600,
  color: 'text.primary',
  cursor: 'pointer',
  '&:hover': { bgcolor: 'background.default' },
}

export var confirmDeleteBtn = {
  flex: 1,
  py: 1.125,
  border: 'none',
  borderRadius: 2,
  bgcolor: '#ff4d5e',
  fontSize: 14,
  fontWeight: 600,
  color: '#fff',
  cursor: 'pointer',
  '&:hover:not(:disabled)': { bgcolor: '#e03040' },
  '&:disabled': { opacity: .6, cursor: 'not-allowed' },
}
