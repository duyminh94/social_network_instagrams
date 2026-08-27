// components/post/PostCard.jsx
// Thẻ bài viết hiển thị trong feed
//
// Like: optimistic update — cập nhật UI trước, gọi API sau
//   → Nếu API lỗi thì rollback về trạng thái cũ
//
// Bookmark: gọi API /saved để lưu bài, toggle state theo kết quả API
//
// Edit caption: chỉ hiện với chủ bài (isOwner), gọi API PATCH /posts/:id
//
// Delete: hiện ConfirmModal trước, sau đó gọi API DELETE /posts/:id
//   → Sau khi xóa: gọi onDelete(id) để Home.jsx lọc bài ra khỏi danh sách

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Dropdown } from 'react-bootstrap'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { likePost, unlikePost, deletePost, updatePost } from '../../features/post/postAPI'
import { savePost, unsavePost } from '../../features/post/postAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../common/Avatar'
import PostModal from './PostModal'
import ConfirmModal from '../common/ConfirmModal'
import ReportModal from '../common/ReportModal'
import UserHoverCard from '../user/UserHoverCard'
import CaptionText from '../common/CaptionText'
import ReactionBar from '../common/ReactionBar'
import { reactionEmoji } from '../common/reactions'
import { timeAgo } from '../../utils/formatTime'
import { formatNumber } from '../../utils/formatNumber'
import styles from './PostCard.module.css'

const LIKE_COLOR = '#ff3b5c'

// Icon trái tim: filled=true khi đã like
function HeartIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill={filled ? LIKE_COLOR : 'none'} stroke={filled ? LIKE_COLOR : 'currentColor'} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

// Icon comment
function CommentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

// Icon bookmark: filled=true khi đã lưu
function BookmarkIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

export default function PostCard({
  post,
  onDelete,
  onLikeToggle,
  onUpdated,
  suggestedReason,
  showFollow,
  onFollow,
}) {
  const { user } = useAuth()
  var { t } = useLanguage()

  // State like/cảm xúc dùng optimistic update
  const [liked, setLiked] = useState(post.isLiked || false)
  const [myReaction, setMyReaction] = useState(post.myReaction || null)
  const [showReactions, setShowReactions] = useState(false)
  const hoverTimer = useRef(null)
  const [likesCount, setLikesCount] = useState(post.likesCount || 0)
  // commentsCount lấy từ backend. Nếu backend chưa trả field này thì dùng 0 để UI không bị undefined.
  const commentsCount = post.commentsCount || 0

  // State UI
  const [showModal, setShowModal] = useState(false)
  const [saved, setSaved] = useState(post.isSaved || false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [mediaIndex, setMediaIndex] = useState(0)
  const [showLikeBurst, setShowLikeBurst] = useState(false)

  // Hover card: hiện popup khi hover vào avatar/username
  const [showHoverCard, setShowHoverCard] = useState(false)
  const hoverShowTimer = useRef(null)
  const hoverHideTimer = useRef(null)

  // Xóa timer khi component unmount để tránh setState trên component đã destroy
  useEffect(function () {
    return function () {
      clearTimeout(hoverShowTimer.current)
      clearTimeout(hoverHideTimer.current)
    }
  }, [])

  // Bắt đầu đếm giờ 400ms để hiện card
  function handleUserMouseEnter() {
    clearTimeout(hoverHideTimer.current)
    hoverShowTimer.current = setTimeout(function () {
      setShowHoverCard(true)
    }, 400)
  }

  // Khi rời vùng trigger: hủy timer hiện, đặt timer ẩn 200ms
  function handleUserMouseLeave() {
    clearTimeout(hoverShowTimer.current)
    hoverHideTimer.current = setTimeout(function () {
      setShowHoverCard(false)
    }, 200)
  }

  // Khi di chuột vào card: giữ card mở
  function handleCardMouseEnter() {
    clearTimeout(hoverHideTimer.current)
  }

  // Khi rời card: ẩn sau 200ms
  function handleCardMouseLeave() {
    hoverHideTimer.current = setTimeout(function () {
      setShowHoverCard(false)
    }, 200)
  }

  // State edit caption: editCaption là giá trị trong textarea, caption là giá trị đang hiển thị
  const [editCaption, setEditCaption] = useState(post.caption || '')
  const [editLoading, setEditLoading] = useState(false)
  const [caption, setCaption] = useState(post.caption || '')

  // Kiểm tra user hiện tại có phải chủ bài không
  // Dùng String() để tránh lỗi khi so sánh ObjectId với string
  const myId = String(user?._id || user?.id || '')
  const postOwnerId = String(post.user?._id || post.user?.id || '')
  const isOwner = !!myId && !!postOwnerId && myId === postOwnerId

  // Lấy URL media đầu tiên từ nhiều dạng data khác nhau (tùy API trả về)
  var mediaItems = Array.isArray(post.media) ? post.media : []
  if (mediaItems.length === 0 && post.mediaUrl) {
    mediaItems = [{
      url: post.mediaUrl,
      mediaType: post.mediaType || 'image',
      thumbnailUrl: post.thumbnailUrl || '',
    }]
  }

  var currentMedia = mediaItems[mediaIndex] || mediaItems[0] || null
  var mediaUrl = currentMedia?.url || ''
  var mediaType = currentMedia?.mediaType || post.mediaType || 'image'
  var thumbnailUrl = currentMedia?.thumbnailUrl || post.thumbnailUrl || ''
  var hasManyMedia = mediaItems.length > 1

  function goPrevMedia(e) {
    e.stopPropagation()
    setMediaIndex(function (index) {
      if (index <= 0) return mediaItems.length - 1
      return index - 1
    })
  }

  function goNextMedia(e) {
    e.stopPropagation()
    setMediaIndex(function (index) {
      if (index >= mediaItems.length - 1) return 0
      return index + 1
    })
  }

  // Xử lý like/unlike với optimistic update
  // Cập nhật UI ngay lập tức, rollback nếu API lỗi
  // Mở/đóng thanh cảm xúc khi hover (có độ trễ nhỏ tránh nhấp nháy)
  function openReactions() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(function () { setShowReactions(true) }, 200)
  }
  function closeReactions() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(function () { setShowReactions(false) }, 200)
  }

  // Thả 1 cảm xúc cụ thể (từ thanh react hoặc mặc định 'love' khi bấm tim)
  async function handleReact(type) {
    setShowReactions(false)
    const prevReaction = myReaction
    const prevLiked = liked
    const prevCount = likesCount

    // Optimistic: chỉ tăng count nếu trước đó CHƯA react (đổi cảm xúc không tăng)
    setMyReaction(type)
    setLiked(true)
    if (!prevLiked) setLikesCount(likesCount + 1)

    try {
      await likePost('post', post._id, type)
      onLikeToggle?.()
    } catch {
      setMyReaction(prevReaction)
      setLiked(prevLiked)
      setLikesCount(prevCount)
      toast.error(t.post.likeFailed)
    }
  }

  // Bấm nút tim: đã react → bỏ; chưa react → thả 'love' (mặc định kiểu Instagram)
  async function handleToggleLike() {
    if (!liked) {
      handleReact('love')
      return
    }
    const prevReaction = myReaction
    const prevCount = likesCount
    setLiked(false)
    setMyReaction(null)
    setLikesCount(likesCount - 1)
    try {
      await unlikePost('post', post._id)
      onLikeToggle?.()
    } catch {
      setLiked(true)
      setMyReaction(prevReaction)
      setLikesCount(prevCount)
      toast.error(t.post.likeFailed)
    }
  }

  function handleMediaDoubleClick(e) {
    e.stopPropagation()

    // Double click trên ảnh giống Instagram: chỉ thả tim (love) nếu chưa react.
    // Nếu đã react rồi thì giữ nguyên, không bỏ ngược lại.
    if (!liked) {
      handleReact('love')
    }

    setShowLikeBurst(true)
    setTimeout(function () {
      setShowLikeBurst(false)
    }, 650)
  }

  // Xử lý lưu/bỏ lưu bài viết
  async function handleBookmark() {
    const prevSaved = saved
    setSaved(!saved) // optimistic

    try {
      if (prevSaved) {
        await unsavePost(post._id)
      } else {
        await savePost(post._id)
      }
    } catch {
      // Rollback nếu API lỗi
      setSaved(prevSaved)
      toast.error(t.post.bookmarkFailed)
    }
  }

  function handleFollowClick() {
    var userId = post.user?._id
    if (!userId) return
    onFollow?.(userId)
  }

  // Xử lý xóa bài (gọi sau khi user xác nhận qua ConfirmModal)
  async function handleDelete() {
    try {
      await deletePost(post._id)
      toast.success(t.post.deleted)
      setShowConfirmDelete(false)
      // Báo Home.jsx biết để lọc bài này ra khỏi danh sách
      onDelete?.(post._id)
    } catch {
      toast.error(t.post.deleteFailed)
    }
  }

  // Xử lý lưu caption mới
  async function handleEdit(e) {
    e.preventDefault()
    setEditLoading(true)
    try {
      await updatePost(post._id, editCaption)
      setCaption(editCaption) // cập nhật caption hiển thị
      setShowEdit(false)
      toast.success(t.post.updated)
      onUpdated?.()
    } catch {
      toast.error(t.post.updateFailed)
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <>
      <div className={styles.card}>
        {/* Header: avatar + username + nút menu */}
        <div className={styles.header}>
          <div className={styles.userInfo}>
            {/* hoverTrigger: vùng hover để hiện UserHoverCard */}
            <div
              className={styles.hoverTrigger}
              onMouseEnter={handleUserMouseEnter}
              onMouseLeave={handleUserMouseLeave}
            >
              <Link to={`/${post.user?.username}`}>
                {/* Avatar có gradient ring như story (giống Instagram) */}
                <Avatar src={post.user?.avatarUrl || post.user?.avatar} username={post.user?.username} size="md" hasStory={post.user?.hasActiveStory || false} seenStory={post.user?.storySeen || false} />
              </Link>
              <div className={styles.userMeta}>
                {/* Dòng 1: username + verified badge + dấu chấm + thời gian */}
                <div className={styles.headerNameRow}>
                  <Link to={`/${post.user?.username}`}>
                    <span className={styles.username}>{post.user?.username}</span>
                  </Link>
                  {post.user?.isTrusted && (
                    <span className={styles.verifiedBadge} title="Tài khoản đã xác minh">
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="12" fill="#3897f0" />
                        <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                  <span className={styles.headerDot}>•</span>
                  <span className={styles.headerTime}>{timeAgo(post.createdAt)}</span>
                </div>
                {/* Dòng 2: suggested reason hoặc location */}
                {suggestedReason && <div className={styles.suggestedText}>{suggestedReason}</div>}
                {!suggestedReason && post.location && <div className={styles.location}>{post.location}</div>}
              </div>

              {/* Hover card popup */}
              {showHoverCard && post.user?.username && (
                <UserHoverCard
                  username={post.user.username}
                  onMouseEnter={handleCardMouseEnter}
                  onMouseLeave={handleCardMouseLeave}
                />
              )}
            </div>
          </div>

          {/* Follow button + menu gộp bên phải */}
          <div className={styles.headerRight}>
            {showFollow && !isOwner && (
              <button
                type="button"
                className={styles.postFollowBtn}
                onClick={handleFollowClick}
              >
                {t.common.follow}
              </button>
            )}

            {/* Menu bài viết: chủ bài sửa/xóa, người khác báo cáo */}
            <Dropdown align="end">
              <Dropdown.Toggle as="button" className="btn-icon" style={{ background: 'none', border: 'none', color: 'var(--ink)', padding: '4px 6px', cursor: 'pointer' }}>
                {/* 3 chấm ngang (horizontal dots) như Instagram */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                </svg>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {isOwner ? (
                  <>
                    <Dropdown.Item onClick={() => { setEditCaption(caption); setShowEdit(true) }}>
                      ✏️ {t.post.editCaption}
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item className="text-danger" onClick={() => setShowConfirmDelete(true)}>
                      🗑️ {t.post.deletePost}
                    </Dropdown.Item>
                  </>
                ) : (
                  <Dropdown.Item className="text-danger" onClick={function () { setShowReport(true) }}>
                    {t.post.reportPost}
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>

        {/* Media: nhiều ảnh/video thì hiện carousel có nút qua/lại và chấm trạng thái */}
        {mediaUrl && (
          <div className={styles.mediaWrap} onDoubleClick={handleMediaDoubleClick}>
            {mediaType === 'video' ? (
              <video src={mediaUrl} poster={thumbnailUrl || undefined} className={styles.media} controls muted loop />
            ) : (
              <img src={mediaUrl} alt="post" className={styles.media} loading="lazy" />
            )}

            {showLikeBurst && <div className={styles.likeBurst}>♥</div>}

            {hasManyMedia && (
              <>
                <button type="button" className={styles.mediaNavPrev} onClick={goPrevMedia}>‹</button>
                <button type="button" className={styles.mediaNavNext} onClick={goNextMedia}>›</button>
                <div className={styles.mediaDots}>
                  {mediaItems.map(function (_, i) {
                    return (
                      <button
                        key={i}
                        type="button"
                        className={i === mediaIndex ? styles.mediaDotActive : styles.mediaDot}
                        onClick={function (e) {
                          e.stopPropagation()
                          setMediaIndex(i)
                        }}
                        aria-label={'Xem media ' + (i + 1)}
                      />
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Nút tương tác: like, comment, bookmark */}
        <div className={styles.actions}>
          <div
            style={{ position: 'relative', display: 'inline-flex' }}
            onMouseEnter={openReactions}
            onMouseLeave={closeReactions}
          >
            {showReactions && (
              <ReactionBar
                onPick={handleReact}
                onMouseEnter={openReactions}
                onMouseLeave={closeReactions}
              />
            )}
            <button className={`${styles.likeBtn} ${liked ? styles.liked : ''}`} onClick={handleToggleLike}>
              {liked && myReaction ? (
                <span style={{ fontSize: 22, lineHeight: 1 }}>{reactionEmoji(myReaction)}</span>
              ) : (
                <HeartIcon filled={false} />
              )}
              <span className={styles.actionCount}>{formatNumber(likesCount)}</span>
            </button>
          </div>
          <button className={styles.likeBtn} onClick={() => setShowModal(true)}>
            <CommentIcon />
            <span className={styles.actionCount}>{formatNumber(commentsCount)}</span>
          </button>
          <button className={`${styles.likeBtn} ${styles.saveBtn}`} onClick={handleBookmark}>
            <BookmarkIcon filled={saved} />
          </button>
        </div>

        {caption && (
          <div className={styles.caption}>
            <Link to={`/${post.user?.username}`} className={styles.username}>{post.user?.username}</Link>
            <CaptionText text={caption} />
          </div>
        )}

      </div>

      {/* Modal xem chi tiết bài viết */}
      {showModal && (
        <PostModal
          post={post}
          onClose={() => setShowModal(false)}
          onDelete={onDelete}
          onUpdated={onUpdated}
        />
      )}

      {/* Hộp xác nhận xóa */}
      {showConfirmDelete && (
        <ConfirmModal
          message={t.post.deleteConfirm}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}

      {/* Form sửa caption */}
      {showEdit && (
        <div className={styles.editOverlay} onClick={() => setShowEdit(false)}>
          <div className={styles.editBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.editHeader}>
              <span>{t.post.editCaption}</span>
              <button className={styles.editClose} onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form onSubmit={handleEdit}>
              <textarea
                className={styles.editTextarea}
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={4}
                maxLength={2200}
                autoFocus
                placeholder={t.post.captionPlaceholder}
              />
              <div className={styles.editCount}>{editCaption.length} / 2200</div>
              <div className={styles.editActions}>
                <button type="button" className={styles.editCancel} onClick={() => setShowEdit(false)}>
                  {t.post.cancel}
                </button>
                <button type="submit" className={styles.editSave} disabled={editLoading}>
                  {editLoading ? t.post.saving : t.post.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReport && (
        <ReportModal
          targetId={post._id}
          targetType="post"
          onClose={function () { setShowReport(false) }}
        />
      )}
    </>
  )
}
