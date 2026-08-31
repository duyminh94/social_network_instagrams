// ReelViewerModal.jsx
// Modal xem reel từ profile — owner thấy nút ⋯ để sửa caption hoặc xóa reel

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { likePost, unlikePost } from '../../features/post/postAPI'
import { updateReel, deleteReel } from '../../features/reel/reelAPI'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'
import { formatNumber } from '../../utils/formatNumber'
import { useLanguage } from '../../i18n/LanguageContext'
import ReelCommentPanel from './ReelCommentPanel'
import ReportModal from '../common/ReportModal'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { fadeIn, scaleIn, DUR } from '../../theme/animations'

// Toàn bộ modal nằm trên nền video đen nên màu ghi cứng, không lấy từ theme —
//   dùng token sáng/tối của app sẽ thành chữ đen trên nền đen khi bật giao diện sáng
var MOBILE = '@media (max-width:600px)'

var DANGER = '#ff4d5e'

// Nút tròn mờ dùng cho: đóng, tắt tiếng, menu ⋯, điều hướng trước/sau
function roundBtnSx(size, bg) {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    bgcolor: bg,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(6px)',
  }
}

// Một hành động ở cột phải: nút + con số bên dưới
var actionItemSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: .5,
}

var actionBtnSx = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  p: .625,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.12s',
  '&:active': { transform: 'scale(0.88)' },
}

var actionLabelSx = {
  fontSize: 12,
  fontWeight: 700,
  color: '#fff',
  textShadow: '0 1px 3px rgba(0,0,0,.7)',
}

// Hộp nổi lên từ đáy player: sửa caption hoặc xác nhận xoá
var overlayBoxSx = {
  animation: 'reelBoxIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
  '@keyframes reelBoxIn': {
    from: { opacity: 0, transform: 'translateY(16px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  width: 'calc(100% - 32px)',
  bgcolor: '#1c1c1f',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4,
  p: 2.5,
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5,
}

var editOverlaySx = {
  position: 'absolute',
  inset: 0,
  bgcolor: 'rgba(0,0,0,0.75)',
  zIndex: 6,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  pb: 4,
}

var cancelBtnSx = {
  px: 2.25, py: 1,
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 2,
  background: 'transparent',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  '&:disabled': { opacity: .6, cursor: 'not-allowed' },
}

// Nút hành động chính trong hộp — nhận màu nền để dùng chung cho Lưu và Xoá
function primaryBtnSx(bg) {
  return {
    px: 2.5, py: 1,
    border: 'none',
    borderRadius: 2,
    bgcolor: bg,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    '&:disabled': { opacity: .6, cursor: 'not-allowed' },
  }
}

// Nút chuyển reel trước/sau — vị trí trái/phải đặt riêng tại chỗ dùng
var navBtnSx = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 44,
  height: 44,
  borderRadius: '50%',
  bgcolor: 'rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.2)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
  backdropFilter: 'blur(6px)',
  transition: 'background 0.15s',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
}

var menuItemSx = {
  width: '100%',
  px: 1.75, py: 1.25,
  border: 'none',
  background: 'transparent',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: 2,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
}

// ── Player một reel ────────────────────────────────────────────────────────────
function ReelPlayer({ reel, isOwn, onDeleted, onUpdated }) {
  const { t } = useLanguage()
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  const [liked, setLiked]                 = useState(reel.isLiked || false)
  const [likesCount, setLikesCount]       = useState(reel.likesCount || 0)
  const [commentsCount, setCommentsCount] = useState(reel.commentsCount || 0)
  const [muted, setMuted]                 = useState(false)
  const [isLandscape, setIsLandscape]     = useState(false)
  const [showComments, setShowComments]   = useState(false)
  const [showReport, setShowReport]       = useState(false)

  // Menu ⋯
  const [showMenu, setShowMenu]   = useState(false)
  // Trạng thái: null | 'edit' | 'confirmDelete'
  const [mode, setMode]           = useState(null)
  const [caption, setCaption]     = useState(reel.caption || '')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)

  const filterCss = reel.filter || 'none'
  const trimStart = reel.trimStart ?? 0
  const trimEnd   = reel.trimEnd   ?? null
  const hasAudio  = !!reel.audioUrl
  const audioSrc  = reel.audioUrl  || ''
  const audioName = reel.audioName || ''
  const mediaUrl  = reel.videoUrl  || reel.mediaUrl      || reel.media?.[0]?.url

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = trimStart
    video.play().catch(() => {})
    return () => { video.pause() }
  }, [trimStart])

  function handleTimeUpdate() {
    const video = videoRef.current
    const audio = audioRef.current
    if (!video || !trimEnd) return
    if (video.currentTime >= trimEnd) {
      video.currentTime = trimStart
      if (audio) audio.currentTime = trimStart
    }
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    if (videoRef.current) videoRef.current.muted = next || hasAudio
    if (audioRef.current) {
      if (next) audioRef.current.pause()
      else audioRef.current.play().catch(() => {})
    }
  }

  async function handleLike() {
    const prev = liked
    setLiked(!liked)
    setLikesCount(prev ? likesCount - 1 : likesCount + 1)
    try {
      if (prev) await unlikePost('reel', reel._id)
      else       await likePost('reel', reel._id)
    } catch {
      setLiked(prev)
      setLikesCount(reel.likesCount || 0)
      toast.error(t.reelViewer.likeFailed)
    }
  }

  async function handleSaveCaption() {
    setSaving(true)
    try {
      await updateReel(reel._id, { caption })
      toast.success(t.reelViewer.captionUpdated)
      onUpdated?.(reel._id, { caption })
      setMode(null)
    } catch {
      toast.error(t.reelViewer.updateFailed)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteReel(reel._id)
      toast.success(t.reelViewer.deleted)
      onDeleted?.(reel._id)
    } catch {
      toast.error(t.reelViewer.deleteFailed)
      setDeleting(false)
      setMode(null)
    }
  }

  return (
    <Box
      sx={{
        ...scaleIn(DUR.slow),
        position: 'relative',
        height: '100dvh',
        width: 'calc(100dvh * 9 / 16)',
        maxWidth: 420,
        overflow: 'hidden',
        bgcolor: '#000',
        flexShrink: 0,
        [MOBILE]: { width: '100dvw', maxWidth: '100dvw' },
      }}
    >
      {/* Video */}
      {mediaUrl ? (
        <Box
          component="video"
          ref={videoRef}
          src={mediaUrl}
          style={{ filter: filterCss }}
          loop={!trimEnd}
          muted={muted || hasAudio}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={e => setIsLandscape(e.target.videoWidth > e.target.videoHeight)}
          sx={{
            width: '100%',
            height: '100%',
            display: 'block',
            // Video ngang thì để nguyên khung cho khỏi cắt mất hai bên
            objectFit: isLandscape ? 'contain' : 'cover',
            bgcolor: isLandscape ? '#000' : undefined,
          }}
        />
      ) : (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 }}>
          {t.reelViewer.noVideo}
        </Box>
      )}

      {hasAudio && <audio ref={audioRef} src={audioSrc} loop style={{ display: 'none' }} />}

      {/* Gradient đáy — làm nền cho chữ trắng đọc được trên video sáng */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.2) 35%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ── Nút ⋯ (chủ sở hữu) ── */}
      {isOwn && (
        <Box sx={{ position: 'absolute', top: 14, left: 14, zIndex: 5 }}>
          <Box
            component="button"
            type="button"
            onClick={() => { setShowMenu(v => !v); setMode(null) }}
            title={t.reelViewer.options}
            sx={{ ...roundBtnSx(38, 'rgba(0,0,0,0.45)'), '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </Box>

          {showMenu && (
            <Box
              sx={{
                position: 'absolute',
                top: 46,
                left: 0,
                minWidth: 200,
                bgcolor: '#1c1c1f',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 3,
                p: .75,
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                zIndex: 10,
              }}
            >
              <Box component="button" type="button" sx={menuItemSx} onClick={() => { setMode('edit'); setShowMenu(false) }}>
                ✏️ {t.reelViewer.editCaption}
              </Box>
              <Box component="button" type="button" sx={{ ...menuItemSx, color: DANGER }} onClick={() => { setMode('confirmDelete'); setShowMenu(false) }}>
                🗑️ {t.reelViewer.deleteReel}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* ── Thông tin trái dưới ── */}
      <Box sx={{ position: 'absolute', bottom: 80, left: 14, right: 68, color: '#fff', zIndex: 2 }}>
        <Box
          component={Link}
          to={'/' + reel.user?.username}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1, textDecoration: 'none' }}
        >
          <Avatar src={reel.user?.avatarUrl} username={reel.user?.username} size="sm" />
          <Typography component="span" sx={{ fontWeight: 700, fontSize: 15, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>
            {reel.user?.username}
          </Typography>
          {reel.user?.isTrusted && <Icon name="verified" size={14} />}
        </Box>

        {caption && mode !== 'edit' && (
          <Box
            sx={{
              fontSize: 14,
              lineHeight: 1.55,
              mb: .75,
              textShadow: '0 1px 3px rgba(0,0,0,.6)',
              // Cắt caption còn 3 dòng để không che mất video
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {caption}
          </Box>
        )}

        {audioName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: .625, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
            <Box component="span">🎵</Box>
            <Box component="span" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 160, textOverflow: 'ellipsis' }}>
              {audioName}
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Hành động phải dưới ── */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 80,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2.25,
          zIndex: 2,
        }}
      >
        <Box sx={actionItemSx}>
          <Box component="button" type="button" sx={actionBtnSx} onClick={handleLike}>
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"
              fill={liked ? '#E1306C' : 'none'} stroke={liked ? '#E1306C' : 'white'} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </Box>
          <Typography component="span" sx={actionLabelSx}>{formatNumber(likesCount)}</Typography>
        </Box>

        {!isOwn && (
          <Box sx={actionItemSx}>
            <Box component="button" type="button" sx={actionBtnSx} onClick={() => setShowReport(true)} title={t.common.report}>
              <Icon name="flag" size={25} />
            </Box>
            <Typography component="span" sx={actionLabelSx}>{t.common.report}</Typography>
          </Box>
        )}

        <Box sx={actionItemSx}>
          <Box component="button" type="button" sx={actionBtnSx} onClick={() => setShowComments(v => !v)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </Box>
          <Typography component="span" sx={actionLabelSx}>{formatNumber(commentsCount)}</Typography>
        </Box>

        <Box component="button" type="button" sx={roundBtnSx(40, 'rgba(255,255,255,0.2)')} onClick={toggleMute}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            {muted
              ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
              : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>
            }
          </svg>
        </Box>
      </Box>

      {/* ── Overlay chỉnh sửa caption ── */}
      {mode === 'edit' && (
        <Box sx={editOverlaySx}>
          <Box sx={overlayBoxSx}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{t.reelViewer.editTitle}</Typography>
            <Box
              component="textarea"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={2200}
              rows={4}
              autoFocus
              sx={{
                width: '100%',
                bgcolor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 2.5,
                color: '#fff',
                fontSize: 14,
                p: 1.5,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                lineHeight: 1.5,
                '&:focus': { borderColor: 'rgba(255,255,255,0.35)' },
              }}
            />
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'right', mt: '-6px' }}>
              {caption.length} / 2200
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.25, justifyContent: 'flex-end' }}>
              <Box component="button" type="button" sx={cancelBtnSx} onClick={() => { setMode(null); setCaption(reel.caption || '') }} disabled={saving}>
                {t.common.cancel}
              </Box>
              <Box component="button" type="button" sx={primaryBtnSx('#0095f6')} onClick={handleSaveCaption} disabled={saving}>
                {saving ? t.reelViewer.saving : t.reelViewer.save}
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Overlay xác nhận xóa ── */}
      {mode === 'confirmDelete' && (
        <Box sx={editOverlaySx}>
          <Box sx={overlayBoxSx}>
            <Box sx={{ fontSize: 36, textAlign: 'center' }}>🗑️</Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{t.reelViewer.deleteTitle}</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{t.reelViewer.deleteDesc}</Typography>
            <Box sx={{ display: 'flex', gap: 1.25, justifyContent: 'flex-end' }}>
              <Box component="button" type="button" sx={cancelBtnSx} onClick={() => setMode(null)} disabled={deleting}>
                {t.common.cancel}
              </Box>
              <Box component="button" type="button" sx={primaryBtnSx(DANGER)} onClick={handleDelete} disabled={deleting}>
                {deleting ? t.reelViewer.deleting : t.common.delete}
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Comment panel ── */}
      {showComments && (
        <ReelCommentPanel
          reelId={reel._id}
          onClose={() => setShowComments(false)}
          onCommentsCountChange={delta => setCommentsCount(c => c + delta)}
        />
      )}
      {showReport && <ReportModal targetId={reel._id} targetType="reel" onClose={() => setShowReport(false)} />}
    </Box>
  )
}

// ── Modal bao ngoài: backdrop + nav prev/next ──────────────────────────────────
export default function ReelViewerModal({ reels, initialIndex = 0, isOwn, onClose, onDeleted, onUpdated }) {
  const [index, setIndex]     = useState(initialIndex)
  const [localReels, setLocalReels] = useState(reels)

  const reel = localReels[index]

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setIndex(i => Math.min(i + 1, localReels.length - 1))
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [localReels.length, onClose])

  function handleDeleted(reelId) {
    onDeleted?.(reelId)
    const next = localReels.filter(r => r._id !== reelId)
    if (next.length === 0) { onClose(); return }
    setLocalReels(next)
    setIndex(i => Math.min(i, next.length - 1))
  }

  function handleUpdated(reelId, changes) {
    onUpdated?.(reelId, changes)
    setLocalReels(prev => prev.map(r => r._id === reelId ? { ...r, ...changes } : r))
  }

  if (!reel) return null

  return (
    <Box
      onClick={e => e.target === e.currentTarget && onClose()}
      sx={{
        ...fadeIn(DUR.slow),
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(0, 0, 0, 0.88)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', width: '100%' }}>

        {/* Nút đóng */}
        <Box
          component="button"
          type="button"
          onClick={onClose}
          sx={{
            ...roundBtnSx(40, 'rgba(0,0,0,0.5)'),
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 10,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </Box>

        {/* Prev */}
        {index > 0 && (
          <Box component="button" type="button" sx={{ ...navBtnSx, left: 'calc(50% - 210px - 56px)', [MOBILE]: { left: 8 } }} onClick={() => setIndex(i => i - 1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Box>
        )}

        {/* Player — key=reel._id để unmount/mount khi đổi reel → video reset */}
        <ReelPlayer
          key={reel._id}
          reel={reel}
          isOwn={isOwn}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />

        {/* Next */}
        {index < localReels.length - 1 && (
          <Box component="button" type="button" sx={{ ...navBtnSx, right: 'calc(50% - 210px - 56px)', [MOBILE]: { right: 8 } }} onClick={() => setIndex(i => i + 1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Box>
        )}

        {localReels.length > 1 && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              px: 1.5, py: .5,
              borderRadius: '20px',
              backdropFilter: 'blur(6px)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            {index + 1} / {localReels.length}
          </Box>
        )}
      </Box>
    </Box>
  )
}
