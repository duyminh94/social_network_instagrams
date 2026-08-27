// pages/reels/Reels.jsx
// Feed reels cuộn dọc kiểu Instagram — video 9:16 portrait, căn giữa màn hình

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getReels, getReel, recordReelView } from '../../features/reel/reelAPI'
import { likePost, unlikePost } from '../../features/post/postAPI'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import CaptionText from '../../components/common/CaptionText'
import ReelCreator from '../../components/reel/ReelCreator'
import ReelCommentPanel from '../../components/reel/ReelCommentPanel'
import ReportModal from '../../components/common/ReportModal'
import { useAuth } from '../../hooks/useAuth'
import { formatNumber } from '../../utils/formatNumber'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './Reels.module.css'

function ReelItem({ reel, isVisible }) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const videoRef    = useRef(null)
  const audioRef    = useRef(null)
  const playingRef  = useRef(false) // track thực tế không qua state để tránh stale closure
  const [liked, setLiked]                 = useState(reel.isLiked || false)
  const [likesCount, setLikesCount]       = useState(reel.likesCount || 0)
  const [commentsCount, setCommentsCount] = useState(reel.commentsCount || 0)
  const [showComments, setShowComments]   = useState(false)
  const [muted, setMuted]                 = useState(false)
  const [isLandscape, setIsLandscape]     = useState(false)
  const [isPlaying, setIsPlaying]         = useState(false)
  const [showHint, setShowHint]           = useState(false) // icon play/pause thoáng hiện
  const [showReport, setShowReport]       = useState(false)
  const reelOwnerId = reel.user?._id || reel.userId?._id || reel.userId
  const isOwn = !!user?._id && !!reelOwnerId && String(user._id) === String(reelOwnerId)

  const filterCss = reel.filter  || reel.reelFilter || 'none'
  const trimStart = reel.trimStart ?? reel.reelTrimStart ?? 0
  const trimEnd   = reel.trimEnd   ?? reel.reelTrimEnd   ?? null
  const hasAudio  = !!(reel.audioUrl || reel.reelAudioUrl)
  const audioSrc  = reel.audioUrl  || reel.reelAudioUrl  || ''
  const audioName = reel.audioName || reel.reelAudioName || ''
  const mediaUrl  = reel.videoUrl  || reel.mediaUrl      || reel.media?.[0]?.url

  // ── Khi slide vào / ra viewport: reset về đầu và play/pause ──
  useEffect(() => {
    const video = videoRef.current
    const audio = audioRef.current
    if (!video) return

    if (isVisible) {
      video.currentTime = trimStart
      video.play().catch(() => {
        // browser chặn autoplay có tiếng → fallback về muted
        video.muted = true
        setMuted(true)
        video.play().catch(() => {})
      })
      if (audio) { audio.currentTime = trimStart; if (!muted) audio.play().catch(() => {}) }
      playingRef.current = true
      setIsPlaying(true)
    } else {
      video.pause()
      audio?.pause()
      playingRef.current = false
      setIsPlaying(false)
    }
  }, [isVisible, trimStart, muted])

  // ── Đo thời gian dừng xem reel → gửi tín hiệu "thích xem" cho gợi ý ──
  const watchStartRef = useRef(0)
  useEffect(() => {
    if (isVisible) {
      watchStartRef.current = Date.now()
    }
    // cleanup chạy khi reel rời viewport hoặc component unmount
    return function () {
      if (!watchStartRef.current) return
      const watchedMs = Date.now() - watchStartRef.current
      watchStartRef.current = 0
      if (watchedMs < 800) return // lướt nhanh → bỏ qua, không tính là "xem"
      if (isOwn) return            // reel của mình → không định hình gợi ý

      // Thời lượng hiệu dụng: ưu tiên đoạn trim, rồi reel.duration, rồi duration thật của video
      let durationSec = reel.duration || reel.reelDuration || 0
      if (trimEnd != null && trimStart != null && trimEnd > trimStart) {
        durationSec = trimEnd - trimStart
      } else if (!durationSec && videoRef.current && isFinite(videoRef.current.duration)) {
        durationSec = videoRef.current.duration
      }
      recordReelView(reel._id, watchedMs, durationSec).catch(function () {})
    }
  }, [isVisible])

  // ── Trim loop ──
  function handleTimeUpdate() {
    const video = videoRef.current
    const audio = audioRef.current
    if (!video || trimEnd == null) return
    if (video.currentTime >= trimEnd) {
      video.pause()
      video.currentTime = trimStart
      if (audio) { audio.pause(); audio.currentTime = trimStart }
      video.play().catch(() => {})
      if (audio && !muted) audio.play().catch(() => {})
    }
  }

  // ── Click vào video để play / pause ──
  function togglePlay() {
    if (!isVisible) return
    const video = videoRef.current
    const audio = audioRef.current
    if (!video) return

    const next = !playingRef.current
    playingRef.current = next
    setIsPlaying(next)

    if (next) {
      video.play().catch(() => {})
      if (audio && !muted) audio.play().catch(() => {})
    } else {
      video.pause()
      audio?.pause()
    }

    // Hiện icon thoáng 700ms
    setShowHint(true)
    setTimeout(() => setShowHint(false), 700)
  }

  function toggleMute() {
    const audio = audioRef.current
    const video = videoRef.current
    const next = !muted
    setMuted(next)
    if (video) video.muted = next || hasAudio
    if (audio) {
      if (next) audio.pause()
      else if (isVisible) audio.play().catch(() => {})
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
      toast.error('Thất bại')
    }
  }

  return (
    <div className={styles.slide}>
      {/* Khung 9:16 portrait */}
      <div className={styles.frame} onClick={togglePlay}>

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
            onLoadedMetadata={e => {
              setIsLandscape(e.target.videoWidth > e.target.videoHeight)
              if (trimStart > 0) e.target.currentTime = trimStart
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14 }}>
            {t.reel.noVideo}
          </div>
        )}

        {/* Overlay play / pause hint khi click */}
        {showHint && (
          <div className={styles.playHint}>
            {isPlaying
              ? <svg width="52" height="52" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="52" height="52" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            }
          </div>
        )}

        {/* Gradient đáy */}
        <div className={styles.gradient} />

        {/* Audio ẩn */}
        {hasAudio && (
          <audio ref={audioRef} src={audioSrc} loop style={{ display: 'none' }} />
        )}

        {/* ── Thông tin trái dưới ── */}
        <div className={styles.info}>
          <Link to={'/' + reel.user?.username} className={styles.userRow}>
            <Avatar src={reel.user?.avatarUrl} username={reel.user?.username} size="sm" />
            <span className={styles.username}>{reel.user?.username}</span>
            {reel.user?.isTrusted && <Icon name="verified" size={14} />}
          </Link>

          {reel.caption && (
            <div className={styles.caption}><CaptionText text={reel.caption} /></div>
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

          {/* Like */}
          <div className={styles.actionItem}>
            <button className={styles.actionBtn} onClick={handleLike}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                fill={liked ? '#E1306C' : 'none'}
                stroke={liked ? '#E1306C' : 'white'}
                strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <span className={styles.actionLabel}>{formatNumber(likesCount)}</span>
          </div>

          {/* Comment */}
          <div className={styles.actionItem}>
            <button className={styles.actionBtn} onClick={() => setShowComments(v => !v)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <span className={styles.actionLabel}>{formatNumber(commentsCount)}</span>
          </div>

          {!isOwn && (
            <div className={styles.actionItem}>
              <button className={styles.actionBtn} onClick={function (event) { event.stopPropagation(); setShowReport(true) }} title={t.common.report}>
                <Icon name="flag" size={27} />
              </button>
              <span className={styles.actionLabel}>{t.common.report}</span>
            </div>
          )}

          {/* Đĩa nhạc / Mute toggle */}
          {hasAudio ? (
            <div
              className={`${styles.audioDisc} ${muted ? styles.audioDiscPaused : ''}`}
              onClick={toggleMute}
              title={muted ? 'Bật nhạc' : 'Tắt nhạc'}
            >
              🎵
            </div>
          ) : (
            <button
              className={styles.muteBtn}
              onClick={toggleMute}
              title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                {muted
                  ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
                  : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                }
              </svg>
            </button>
          )}

        </div>

        {showReport && <ReportModal targetId={reel._id} targetType="reel" onClose={function () { setShowReport(false) }} />}
      </div>

      {/* Panel bình luận nằm cạnh phải video (không đè lên video) */}
      {showComments && (
        <ReelCommentPanel
          reelId={reel._id}
          onClose={() => setShowComments(false)}
          onCommentsCountChange={delta => setCommentsCount(c => c + delta)}
        />
      )}
    </div>
  )
}

export default function Reels() {
  const { t } = useLanguage()
  const { reelId } = useParams()
  const navigate = useNavigate()
  const [visibleIndex, setVisibleIndex] = useState(0)
  const [showCreator, setShowCreator]   = useState(false)
  const containerRef  = useRef(null)
  const scrollingRef  = useRef(false) // chặn wheel spam
  const wheelTimerRef = useRef(null)  // timer mở khoá, reset mỗi khi còn lăn
  const queryClient   = useQueryClient()
  const initialScrollDone = useRef(false)
  // Khóa reelId deep-link ban đầu (lúc mount). Effect cập nhật URL sẽ ghi đè `reelId`
  // mỗi khi cuộn → nếu fetch lẻ bám theo `reelId` sống, reel deep-link sẽ bị loại khỏi
  // danh sách khi cuộn sang reel khác. Dùng ref cố định để tránh điều đó.
  const deepLinkIdRef = useRef(reelId || null)

  const { data, isLoading } = useQuery({
    queryKey: ['reels'],
    queryFn: () => getReels(1, 30).then(r => r.data),
  })

  // Deep-link: vào /reels/:reelId mà reel không nằm trong feed → fetch lẻ reel đó
  const deepLinkId = deepLinkIdRef.current
  const { data: singleData } = useQuery({
    queryKey: ['reel', deepLinkId],
    queryFn: () => getReel(deepLinkId).then(r => r.data),
    enabled: !!deepLinkId,
  })

  const reels = useMemo(function () {
    const feed = data?.reels || []
    const single = singleData?.reel
    // Nếu reel deep-link chưa có trong feed → ghép lên đầu để hiển thị + scroll tới
    if (single && !feed.some(function (r) { return r._id === single._id })) {
      return [single].concat(feed)
    }
    return feed
  }, [data?.reels, singleData?.reel])

  // ── Khi load lần đầu với reelId: scroll đến đúng reel đó ──
  useEffect(() => {
    if (!reelId || reels.length === 0 || initialScrollDone.current) return
    const index = reels.findIndex(r => r._id === reelId)
    if (index < 0) return
    initialScrollDone.current = true
    const container = containerRef.current
    if (!container) return
    // scroll ngay không có animation vì đây là lần đầu load
    container.scrollTop = index * container.clientHeight
    setVisibleIndex(index)
  }, [reelId, reels])

  // ── Cập nhật URL khi visibleIndex thay đổi ──
  useEffect(() => {
    if (reels.length === 0) return
    const currentReel = reels[visibleIndex]
    if (!currentReel) return
    navigate('/reels/' + currentReel._id, { replace: true })
  }, [visibleIndex, reels, navigate])

  // ── Scroll sync: cập nhật index khi native scroll xảy ra (swipe / touch) ──
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function onScroll() {
      const index = Math.round(container.scrollTop / container.clientHeight)
      setVisibleIndex(index)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // ── Wheel event: bắt mouse wheel trước khi parent layout xử lý ──
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function onWheel(e) {
      e.preventDefault()

      // Đang khoá: mỗi wheel event (kể cả quán tính lăn) chỉ đẩy lùi thời điểm
      // mở khoá, KHÔNG chuyển video. Nhờ vậy 1 cú lăn dài = đúng 1 video,
      // dù lăn nhanh hay có momentum kéo dài.
      if (scrollingRef.current) {
        clearTimeout(wheelTimerRef.current)
        wheelTimerRef.current = setTimeout(() => { scrollingRef.current = false }, 700)
        return
      }

      const direction = e.deltaY > 0 ? 1 : -1
      // Lấy index hiện tại từ vị trí scroll thực tế, không dựa vào state có thể bị trễ
      const current = Math.round(container.scrollTop / container.clientHeight)
      const next = Math.max(0, Math.min(reels.length - 1, current + direction))
      if (next === current) return

      // Khoá ngay (đồng bộ) để các wheel event tiếp theo không cộng dồn index
      scrollingRef.current = true
      container.scrollTo({ top: next * container.clientHeight, behavior: 'smooth' })
      setVisibleIndex(next)
      wheelTimerRef.current = setTimeout(() => { scrollingRef.current = false }, 700)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', onWheel)
      clearTimeout(wheelTimerRef.current)
    }
  }, [reels.length])

  // ── Di chuyển đến reel theo index ──
  function goTo(index) {
    const container = containerRef.current
    if (!container) return
    const clamped = Math.max(0, Math.min(reels.length - 1, index))
    container.scrollTo({ top: clamped * container.clientHeight, behavior: 'smooth' })
    setVisibleIndex(clamped)
  }

  // Còn tải VÀ chưa có reel nào → spinner. Nếu reel deep-link đã có thì hiện ngay.
  if (isLoading && reels.length === 0) return <Spinner fullPage />

  if (reels.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🎬</div>
        <div className={styles.emptyTitle}>{t.reel.emptyTitle}</div>
        <div className={styles.emptyDesc}>{t.reel.emptyDesc}</div>
        <button className={styles.emptyBtn} onClick={() => setShowCreator(true)}>
          🎬 {t.reel.emptyBtn}
        </button>
        {showCreator && (
          <ReelCreator
            onClose={() => setShowCreator(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ['reels'] })}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <button className={styles.createBtn} onClick={() => setShowCreator(true)}>
        <span style={{ fontSize: 16 }}>+</span> {t.reel.createBtn}
      </button>

      <div ref={containerRef} className={styles.container}>
        {reels.map((reel, i) => (
          <ReelItem key={reel._id || i} reel={reel} isVisible={i === visibleIndex} />
        ))}
      </div>

      {/* Nút lên / xuống — ngoài frame, bên phải */}
      {reels.length > 1 && (
        <div className={styles.navBtns}>
          <button
            className={styles.navBtn}
            onClick={() => goTo(visibleIndex - 1)}
            disabled={visibleIndex === 0}
            title="Reel trước"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button
            className={styles.navBtn}
            onClick={() => goTo(visibleIndex + 1)}
            disabled={visibleIndex === reels.length - 1}
            title="Reel tiếp"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      )}

      {showCreator && (
        <ReelCreator
          onClose={() => setShowCreator(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['reels'] })}
        />
      )}
    </>
  )
}
