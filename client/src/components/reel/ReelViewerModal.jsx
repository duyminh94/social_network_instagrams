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
import styles from './ReelViewerModal.module.css'

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

  const filterCss = reel.filter || reel.reelFilter || 'none'
  const trimStart = reel.trimStart ?? reel.reelTrimStart ?? 0
  const trimEnd   = reel.trimEnd   ?? reel.reelTrimEnd   ?? null
  const hasAudio  = !!(reel.audioUrl || reel.reelAudioUrl)
  const audioSrc  = reel.audioUrl  || reel.reelAudioUrl  || ''
  const audioName = reel.audioName || reel.reelAudioName || ''
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
    <div className={styles.player}>
      {/* Video */}
      {mediaUrl ? (
        <video
          ref={videoRef}
          src={mediaUrl}
          className={isLandscape ? styles.videoContain : styles.video}
          style={{ filter: filterCss }}
          loop={!trimEnd}
          muted={muted || hasAudio}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={e => setIsLandscape(e.target.videoWidth > e.target.videoHeight)}
        />
      ) : (
        <div className={styles.noVideo}>{t.reelViewer.noVideo}</div>
      )}

      {hasAudio && <audio ref={audioRef} src={audioSrc} loop style={{ display: 'none' }} />}

      {/* Gradient đáy */}
      <div className={styles.gradient} />

      {/* ── Nút ⋯ (chủ sở hữu) ── */}
      {isOwn && (
        <div className={styles.menuWrap}>
          <button
            className={styles.menuDotBtn}
            onClick={() => { setShowMenu(v => !v); setMode(null) }}
            title={t.reelViewer.options}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </button>

          {showMenu && (
            <div className={styles.menu}>
              <button className={styles.menuItem} onClick={() => { setMode('edit'); setShowMenu(false) }}>
                ✏️ {t.reelViewer.editCaption}
              </button>
              <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { setMode('confirmDelete'); setShowMenu(false) }}>
                🗑️ {t.reelViewer.deleteReel}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Thông tin trái dưới ── */}
      <div className={styles.info}>
        <Link to={'/' + reel.user?.username} className={styles.userRow}>
          <Avatar src={reel.user?.avatarUrl} username={reel.user?.username} size="sm" />
          <span className={styles.username}>{reel.user?.username}</span>
          {reel.user?.isTrusted && <Icon name="verified" size={14} />}
        </Link>
        {caption && mode !== 'edit' && (
          <div className={styles.caption}>{caption}</div>
        )}
        {audioName && (
          <div className={styles.audioRow}>
            <span>🎵</span>
            <span className={styles.audioName}>{audioName}</span>
          </div>
        )}
      </div>

      {/* ── Hành động phải dưới ── */}
      <div className={styles.actions}>
        <div className={styles.actionItem}>
          <button className={styles.actionBtn} onClick={handleLike}>
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"
              fill={liked ? '#E1306C' : 'none'} stroke={liked ? '#E1306C' : 'white'} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <span className={styles.actionLabel}>{formatNumber(likesCount)}</span>
        </div>

        {!isOwn && (
          <div className={styles.actionItem}>
            <button className={styles.actionBtn} onClick={() => setShowReport(true)} title={t.common.report}>
              <Icon name="flag" size={25} />
            </button>
            <span className={styles.actionLabel}>{t.common.report}</span>
          </div>
        )}

        <div className={styles.actionItem}>
          <button className={styles.actionBtn} onClick={() => setShowComments(v => !v)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <span className={styles.actionLabel}>{formatNumber(commentsCount)}</span>
        </div>

        <button className={styles.muteBtn} onClick={toggleMute}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            {muted
              ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
              : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>
            }
          </svg>
        </button>
      </div>

      {/* ── Overlay chỉnh sửa caption ── */}
      {mode === 'edit' && (
        <div className={styles.editOverlay}>
          <div className={styles.editBox}>
            <div className={styles.editTitle}>{t.reelViewer.editTitle}</div>
            <textarea
              className={styles.editTextarea}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={2200}
              rows={4}
              autoFocus
            />
            <div className={styles.editCount}>{caption.length} / 2200</div>
            <div className={styles.editBtns}>
              <button className={styles.editCancelBtn} onClick={() => { setMode(null); setCaption(reel.caption || '') }} disabled={saving}>
                {t.common.cancel}
              </button>
              <button className={styles.editSaveBtn} onClick={handleSaveCaption} disabled={saving}>
                {saving ? t.reelViewer.saving : t.reelViewer.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay xác nhận xóa ── */}
      {mode === 'confirmDelete' && (
        <div className={styles.editOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmIcon}>🗑️</div>
            <div className={styles.confirmTitle}>{t.reelViewer.deleteTitle}</div>
            <div className={styles.confirmDesc}>{t.reelViewer.deleteDesc}</div>
            <div className={styles.editBtns}>
              <button className={styles.editCancelBtn} onClick={() => setMode(null)} disabled={deleting}>
                {t.common.cancel}
              </button>
              <button className={styles.deleteSaveBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? t.reelViewer.deleting : t.common.delete}
              </button>
            </div>
          </div>
        </div>
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
    </div>
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
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* Nút đóng */}
        <button className={styles.closeBtn} onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Prev */}
        {index > 0 && (
          <button className={`${styles.navBtn} ${styles.navLeft}`} onClick={() => setIndex(i => i - 1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
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
          <button className={`${styles.navBtn} ${styles.navRight}`} onClick={() => setIndex(i => i + 1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}

        {localReels.length > 1 && (
          <div className={styles.counter}>{index + 1} / {localReels.length}</div>
        )}
      </div>
    </div>
  )
}
