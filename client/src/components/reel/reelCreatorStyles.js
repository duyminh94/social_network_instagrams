// components/reel/reelCreatorStyles.js
// Các object sx của modal tạo Reel — thay cho ReelCreator.module.css
//
// Tách ra file riêng vì ReelCreator.jsx đã hơn 700 dòng với 4 bước
//   (source → camera → edit → details)
//
// Lưu ý khi đối chiếu với bản CSS cũ: file CSS định nghĩa .editPreviewWrap,
//   .editPreview và .audioOverlay HAI LẦN. Trình duyệt lấy bản sau, nên ở đây
//   chỉ chép bản sau (khung cao clamp(320px,50vh,480px), video object-fit cover)

import { fadeIn, scaleIn, DUR } from '../../theme/animations'

var MOBILE = '@media (max-width:640px)'

var BLUE = '#0095f6'
var ORANGE = '#f97316'

export var backdrop = {
  ...fadeIn(),
  position: 'fixed',
  inset: 0,
  bgcolor: 'rgba(0, 0, 0, 0.8)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  p: 1.5,
  [MOBILE]: { p: 0 },
}

// Bước edit cần chỗ cho 2 cột nên modal rộng gấp đôi
export function modal(isEditStep) {
  return {
    ...scaleIn(),
    bgcolor: 'background.paper',
    borderRadius: '18px',
    width: '100%',
    maxWidth: isEditStep ? 800 : 420,
    maxHeight: isEditStep ? '96vh' : '92vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.7)',
    [MOBILE]: { maxWidth: '100%', borderRadius: 0, maxHeight: '100vh' },
  }
}

// ── Dùng chung nhiều bước ──

export var stepTitle = {
  fontSize: 16,
  fontWeight: 700,
  color: 'text.primary',
  textAlign: 'center',
}

export var backBtn = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  color: 'text.primary',
  cursor: 'pointer',
  py: .5, px: 1,
  borderRadius: 2,
  transition: 'background 0.12s',
  '&:hover': { bgcolor: 'action.hover' },
}

export var closeBtn = {
  mt: 1, mx: 2.5, mb: 2.5,
  p: 1.375,
  background: 'none',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3,
  fontSize: 14,
  fontWeight: 600,
  color: 'text.secondary',
  cursor: 'pointer',
  transition: 'background 0.15s',
  '&:hover': { bgcolor: 'action.hover' },
}

// Header 3 phần (lùi lại | tiêu đề | hành động) dùng ở camera / edit / details
export var stepHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  py: 1.75, px: 2,
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  flexShrink: 0,
}

// ── Bước chọn nguồn video ──

export var sourceStep = {
  display: 'flex',
  flexDirection: 'column',
  pt: 3, px: 2.5,
  gap: 2,
  flex: 1,
}

export var sourceOptions = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1.25,
}

export var sourceBtn = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: .5,
  width: '100%',
  py: 2, px: 2.25,
  bgcolor: 'background.default',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3.5,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.15s',
  '&:hover': { bgcolor: 'action.hover', borderColor: 'text.secondary' },
}

export var sourceBtnIcon = { fontSize: 28, mb: '2px' }
export var sourceBtnLabel = { fontSize: 15, fontWeight: 700, color: 'text.primary' }
export var sourceBtnDesc = { fontSize: 13, color: 'text.secondary' }

// ── Bước quay video ──

export var cameraStep = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
}

export var flipBtn = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  py: .5, px: 1,
  borderRadius: 2,
  transition: 'background 0.12s',
  '&:hover': { bgcolor: 'action.hover' },
}

export var cameraPreviewWrap = {
  position: 'relative',
  flex: 1,
  bgcolor: '#000',
  overflow: 'hidden',
}

export var cameraPreview = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
}

export var recordingTimer = {
  position: 'absolute',
  top: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  bgcolor: 'rgba(0,0,0,0.55)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  py: .5, px: 1.75,
  borderRadius: '20px',
}

export var cameraError = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ef4444',
  fontSize: 14,
  p: 3,
  textAlign: 'center',
}

export var cameraControls = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: .75,
  p: 2.5,
  flexShrink: 0,
}

// Nút quay: viền đỏ khi chờ, tô đầy đỏ khi đang quay
export function recordBtn(isRecording) {
  return {
    width: 68,
    height: 68,
    borderRadius: '50%',
    border: '4px solid #ef4444',
    background: isRecording ? '#ef4444' : 'none',
    fontSize: 26,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    '&:hover': { bgcolor: isRecording ? '#ef4444' : 'rgba(239,68,68,0.1)' },
  }
}

export var recordLabel = { fontSize: 12, color: 'text.secondary' }

// ── Bước chỉnh sửa: 2 cột video | điều khiển ──

export var editStep = {
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
  overflow: 'hidden',
  minHeight: 0,
  [MOBILE]: { flexDirection: 'column' },
}

export var editLeft = {
  flex: '0 0 auto',
  width: 300,
  bgcolor: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  [MOBILE]: { width: '100%' },
}

export var editPreviewWrap = {
  position: 'relative',
  bgcolor: '#000',
  flexShrink: 0,
  // Khung tự co giãn theo chiều cao màn hình
  height: 'clamp(320px, 50vh, 480px)',
  overflow: 'hidden',
  [MOBILE]: { aspectRatio: '9 / 16', maxHeight: '55vh' },
}

export var editPreview = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

export var audioOverlay = {
  position: 'absolute',
  bottom: 8,
  left: 0,
  right: 0,
  textAlign: 'center',
  fontSize: 12,
  color: '#fff',
  bgcolor: 'rgba(0,0,0,0.45)',
  py: .5, px: 1.25,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export var editRight = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0,
  borderLeft: '1px solid',
  borderLeftColor: 'divider',
  [MOBILE]: { borderLeft: 'none', borderTop: '1px solid', borderTopColor: 'divider' },
}

export var nextBtn = {
  background: 'none',
  border: 'none',
  fontSize: 14,
  fontWeight: 700,
  color: BLUE,
  cursor: 'pointer',
  py: .5, px: 1,
  borderRadius: 2,
  transition: 'background 0.12s',
  '&:hover': { bgcolor: 'action.hover' },
}

export var editTabs = {
  display: 'flex',
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
  flexShrink: 0,
}

export function editTab(isActive) {
  return {
    flex: 1,
    py: 1.25, px: .5,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid',
    borderBottomColor: isActive ? 'text.primary' : 'transparent',
    fontSize: 13,
    fontWeight: 600,
    color: isActive ? 'text.primary' : 'text.secondary',
    cursor: 'pointer',
    transition: 'all 0.15s',
    '&:hover': { color: 'text.primary' },
  }
}

// ── Tab cắt video ──

export var trimPanel = {
  py: 2, px: 2.5,
  display: 'flex',
  flexDirection: 'column',
  gap: 1.25,
  flex: 1,
}

export var trimInfo = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 12,
  color: 'text.secondary',
  fontVariantNumeric: 'tabular-nums',
}

export var trimDuration = { fontSize: 13, fontWeight: 700, color: 'text.primary' }

export var trimTrack = {
  position: 'relative',
  height: 36,
  bgcolor: 'divider',
  borderRadius: 2,
  cursor: 'pointer',
  touchAction: 'none',
}

export var trimFill = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  bgcolor: BLUE,
  borderRadius: 2,
  pointerEvents: 'none',
}

// Tay cầm kéo 2 đầu — vạch xanh ở giữa vẽ bằng ::after
export var trimHandle = {
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: 20,
  height: 36,
  bgcolor: '#fff',
  border: '2px solid ' + BLUE,
  borderRadius: 1.5,
  cursor: 'ew-resize',
  touchAction: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  zIndex: 2,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 3,
    height: 14,
    bgcolor: BLUE,
    borderRadius: '2px',
  },
}

export var trimHint = { fontSize: 12, color: 'text.secondary', textAlign: 'center' }

export var oversizedWarning = {
  bgcolor: 'rgba(251, 146, 60, 0.15)',
  border: '1px solid rgba(251, 146, 60, 0.45)',
  borderRadius: 2.5,
  py: 1.25, px: 1.75,
  fontSize: 13,
  color: '#fb923c',
  lineHeight: 1.5,
  mb: .5,
}

export var exportBtn = {
  mt: 1.25,
  width: '100%',
  p: 1.375,
  border: 'none',
  borderRadius: 2.5,
  bgcolor: ORANGE,
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
  '&:disabled': { opacity: .6, cursor: 'not-allowed' },
  '&:not(:disabled):hover': { opacity: .88 },
}

export var trimProgressOverlay = {
  position: 'absolute',
  inset: 0,
  zIndex: 20,
  bgcolor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '18px',
}

export var trimProgressBox = {
  ...scaleIn(DUR.fast),
  bgcolor: 'background.paper',
  borderRadius: 4,
  py: 3.5, px: 3,
  width: 'calc(100% - 48px)',
  maxWidth: 320,
  display: 'flex',
  flexDirection: 'column',
  gap: 1.75,
  alignItems: 'center',
  textAlign: 'center',
}

export var trimProgressTitle = { fontSize: 16, fontWeight: 700, color: 'text.primary' }

export var trimProgressTrack = {
  width: '100%',
  height: 8,
  borderRadius: 1,
  bgcolor: 'divider',
  overflow: 'hidden',
}

export var trimProgressFill = {
  height: '100%',
  borderRadius: 1,
  bgcolor: ORANGE,
  transition: 'width 0.3s ease',
}

export var trimProgressPct = { fontSize: 22, fontWeight: 800, color: ORANGE }

export var trimProgressHint = { fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }

// ── Tab bộ lọc màu ──

export var filterPanel = {
  display: 'flex',
  gap: 1,
  py: 1.5, px: 2,
  overflowX: 'auto',
  flex: 1,
  alignItems: 'flex-start',
  scrollbarWidth: 'thin',
  '&::-webkit-scrollbar': { height: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' },
}

// Ô lọc đang chọn: viền xanh quanh ảnh mẫu + chữ xanh đậm
export function filterItem(isActive) {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: .75,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    p: .5,
    borderRadius: 2,
    flexShrink: 0,
    transition: 'background 0.12s',
    '&:hover': { bgcolor: 'action.hover' },
    '& .filterThumbWrap': isActive ? { outline: '2px solid ' + BLUE, outlineOffset: '2px' } : {},
    '& .filterName': isActive ? { color: BLUE, fontWeight: 700 } : {},
  }
}

export var filterThumbWrap = {
  width: 70,
  height: 100,
  borderRadius: 2,
  overflow: 'hidden',
  bgcolor: '#000',
}

export var filterThumb = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
}

export var filterName = { fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }

// ── Tab nhạc ──

export var musicPanel = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  py: 1.5, px: 2,
  gap: 1.25,
  overflowY: 'auto',
  minHeight: 0,
}

export var musicSectionTitle = { fontSize: 13, fontWeight: 700, color: 'text.primary', mb: '2px' }

export var trackList = { display: 'flex', flexDirection: 'column', gap: .5 }

export function trackItem(isSelected) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    py: 1, px: 1.25,
    borderRadius: 2.5,
    cursor: 'pointer',
    transition: 'background 0.12s',
    position: 'relative',
    border: '1px solid',
    borderColor: isSelected ? BLUE : 'transparent',
    bgcolor: isSelected ? 'rgba(0, 149, 246, 0.1)' : 'transparent',
    '&:hover': { bgcolor: isSelected ? 'rgba(0, 149, 246, 0.1)' : 'action.hover' },
  }
}

export var trackArt = {
  width: 42,
  height: 42,
  borderRadius: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

export var trackNote = { fontSize: 18 }
export var trackInfo = { flex: 1, minWidth: 0 }
export var trackName = {
  fontSize: 13,
  fontWeight: 600,
  color: 'text.primary',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
export var trackMeta = { display: 'flex', alignItems: 'center', gap: .75, mt: '2px' }
export var trackArtist = { fontSize: 11, color: 'text.secondary' }
export var trackGenreBadge = {
  fontSize: 10,
  py: '1px', px: .75,
  bgcolor: 'action.hover',
  borderRadius: '20px',
  color: 'text.secondary',
}
export var trackRight = { display: 'flex', alignItems: 'center', gap: .75, flexShrink: 0 }
export var trackDuration = { fontSize: 11, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }

export function trackPlayBtn(isPreviewing) {
  return {
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: '1px solid',
    borderColor: isPreviewing ? BLUE : 'divider',
    bgcolor: isPreviewing ? BLUE : 'background.paper',
    color: isPreviewing ? '#fff' : 'inherit',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s',
    '&:hover': { bgcolor: isPreviewing ? BLUE : 'action.hover' },
  }
}

export var trackCheck = {
  position: 'absolute',
  right: 46,
  fontSize: 14,
  fontWeight: 700,
  color: BLUE,
}

// Dòng "hoặc" có gạch ngang hai bên
export var musicDivider = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  color: 'text.secondary',
  fontSize: 12,
  '&::before, &::after': { content: '""', flex: 1, height: '1px', bgcolor: 'divider' },
}

export var audioUploadBtn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  p: 1.25,
  background: 'none',
  border: '1px dashed',
  borderColor: 'divider',
  borderRadius: 2.5,
  fontSize: 13,
  fontWeight: 600,
  color: 'text.secondary',
  cursor: 'pointer',
  transition: 'all 0.15s',
  '&:hover': { borderColor: BLUE, color: BLUE, bgcolor: 'rgba(0, 149, 246, 0.05)' },
}

export var audioSelected = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  bgcolor: 'background.default',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3,
  py: 1.5, px: 1.75,
}

export var audioInfo = { display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }
export var audioIcon = { fontSize: 24, flexShrink: 0 }
export var audioName = {
  fontSize: 13,
  fontWeight: 600,
  color: 'text.primary',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 180,
}
export var audioSize = { fontSize: 11, color: 'text.secondary', mt: '2px' }
export var audioActions = { display: 'flex', alignItems: 'center', gap: .75, flexShrink: 0 }

export var audioPlayBtn = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.12s',
  '&:hover': { bgcolor: 'action.hover' },
}

export var audioRemoveBtn = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: 'none',
  background: 'none',
  color: 'text.secondary',
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.12s, background 0.12s',
  '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' },
}

// ── Bước điền thông tin ──

export var detailsStep = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflowY: 'auto',
}

export var detailsPreview = {
  display: 'flex',
  gap: 1.5,
  alignItems: 'flex-start',
  py: 1.75, px: 2,
  borderBottom: '1px solid',
  borderBottomColor: 'divider',
}

export var detailsMiniVideo = {
  width: 64,
  height: 96,
  objectFit: 'cover',
  borderRadius: 2,
  flexShrink: 0,
}

export var detailsPreviewMeta = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: .75,
  pt: .5,
}

export var metaTag = {
  fontSize: 12,
  bgcolor: 'background.default',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '20px',
  py: '3px', px: 1.25,
  color: 'text.secondary',
}

export var detailsField = { pt: 1.75, px: 2, pb: .5 }

export var detailsLabel = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: 'text.primary',
  mb: 1,
}

export var aiCaptionBtn = {
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: .75,
  m: 0, mb: 1,
  py: .875, px: 1.5,
  background: 'none',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  fontSize: 13,
  fontWeight: 600,
  color: BLUE,
  cursor: 'pointer',
  '&:disabled': { cursor: 'not-allowed', opacity: .6 },
}

export var captionInput = {
  width: '100%',
  py: 1.25, px: 1.5,
  bgcolor: 'background.default',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2.5,
  fontSize: 14,
  fontFamily: 'inherit',
  color: 'text.primary',
  resize: 'none',
  outline: 'none',
  lineHeight: 1.5,
  transition: 'border-color 0.15s',
  '&:focus': { borderColor: 'text.secondary' },
}

export var captionCount = { fontSize: 11, color: 'text.secondary', textAlign: 'right', mt: .5 }

export var postBtn = {
  mt: 1.75, mx: 2, mb: 2.5,
  p: 1.625,
  bgcolor: BLUE,
  border: 'none',
  borderRadius: 3,
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
  cursor: 'pointer',
  transition: 'background 0.15s',
  '&:hover': { bgcolor: '#0081d6' },
  '&:disabled': { opacity: .6, cursor: 'default' },
}
