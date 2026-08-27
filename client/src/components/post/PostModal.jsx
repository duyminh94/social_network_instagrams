// components/post/PostModal.jsx
// Modal xem chi tiết bài viết: media + comments + like + edit/delete (chủ bài)
//
// Khóa scroll trang nền khi modal mở (document.body.style.overflow = 'hidden')
// Click bên ngoài dialog → đóng modal
// Click-outside cho menu 3 chấm dùng ref + mousedown event

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'
import CaptionText from '../common/CaptionText'
import CommentList from '../comment/CommentList'
import ConfirmModal from '../common/ConfirmModal'
import ReportModal from '../common/ReportModal'
import { timeAgo } from '../../utils/formatTime'
import { likePost, unlikePost, deletePost, updatePost, savePost, unsavePost } from '../../features/post/postAPI'
import { formatNumber } from '../../utils/formatNumber'
import styles from './PostModal.module.css'
import cardStyles from './PostCard.module.css'

function HeartIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
      fill={filled ? '#ff3b5c' : 'none'} stroke={filled ? '#ff3b5c' : 'currentColor'} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function BookmarkIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

export default function PostModal({ post, onClose, onDelete, onUpdated, onSavedChange }) {
  var { user } = useAuth()
  var { t } = useLanguage()
  var [liked, setLiked] = useState(post.isLiked || false)
  var [likesCount, setLikesCount] = useState(post.likesCount || 0)
  var [saved, setSaved] = useState(post.isSaved || false)
  var [comment, setComment] = useState('')
  var [replyTarget, setReplyTarget] = useState(null)
  var [replyParentId, setReplyParentId] = useState(null)
  var [submitting, setSubmitting] = useState(false)
  var [refreshKey, setRefreshKey] = useState(0)
  var [showMenu, setShowMenu] = useState(false)
  var [showConfirmDelete, setShowConfirmDelete] = useState(false)
  var [showEdit, setShowEdit] = useState(false)
  var [showReport, setShowReport] = useState(false)
  var [editCaption, setEditCaption] = useState(post.caption || '')
  var [caption, setCaption] = useState(post.caption || '')
  var [editLoading, setEditLoading] = useState(false)
  var [mediaIndex, setMediaIndex] = useState(0)
  var [showLikeBurst, setShowLikeBurst] = useState(false)
  var menuRef = useRef(null)
  var commentInputRef = useRef(null)

  var myId = String(user?._id || user?.id || '')
  var postOwnerId = String(post.user?._id || post.user?.id || '')
  var isOwner = !!myId && !!postOwnerId && myId === postOwnerId
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

  // Khóa scroll trang nền khi modal mở để tránh người dùng cuộn trang phía sau
  useEffect(function () {
    var prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return function () {
      document.body.style.overflow = prev
    }
  }, [])

  // Đóng menu 3 chấm khi click ra ngoài
  useEffect(function () {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return function () {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Optimistic update: đổi state ngay, nếu API lỗi thì revert về cũ
  async function handleLike() {
    var prev = liked
    setLiked(!liked)
    setLikesCount(liked ? likesCount - 1 : likesCount + 1)
    try {
      if (prev) {
        await unlikePost('post', post._id)
      } else {
        await likePost('post', post._id)
      }
    } catch {
      setLiked(prev)
      setLikesCount(post.likesCount || 0)
    }
  }

  // Lưu / bỏ lưu bài viết — optimistic, báo cho cha biết để refetch danh sách đã lưu
  async function handleBookmark() {
    var prev = saved
    setSaved(!saved)
    try {
      if (prev) {
        await unsavePost(post._id)
      } else {
        await savePost(post._id)
      }
      if (onSavedChange) onSavedChange(post._id, !prev)
    } catch {
      setSaved(prev)
      toast.error(t.post.bookmarkFailed)
    }
  }

  function handleMediaDoubleClick(e) {
    e.stopPropagation()

    // Double click trên ảnh/video: like nếu chưa like, không unlike nếu đã like.
    if (!liked) {
      handleLike()
    }

    setShowLikeBurst(true)
    setTimeout(function () {
      setShowLikeBurst(false)
    }, 650)
  }

  async function handleDelete() {
    try {
      await deletePost(post._id)
      toast.success(t.post.deleted)
      setShowConfirmDelete(false)
      if (onDelete) onDelete(post._id)
      onClose()
    } catch {
      toast.error(t.post.deleteFailed)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditLoading(true)
    try {
      await updatePost(post._id, editCaption)
      setCaption(editCaption)
      setShowEdit(false)
      toast.success(t.post.updated)
      if (onUpdated) onUpdated()
    } catch {
      toast.error(t.post.updateFailed)
    } finally {
      setEditLoading(false)
    }
  }

  function handleReply(commentItem, parentId) {
    var username = commentItem?.user?.username
    if (!username) return

    setReplyTarget(commentItem)
    setReplyParentId(parentId || commentItem._id)
    // Khi reply, tự tag @username vào đầu input để người đọc biết đang trả lời ai.
    setComment('@' + username + ' ')
    setTimeout(function () {
      commentInputRef.current?.focus()
    }, 0)
  }

  function clearReply() {
    setReplyTarget(null)
    setReplyParentId(null)
    setComment('')
  }

  // Gửi comment/reply — nếu có replyTarget thì gửi thêm parentId để backend lưu là reply.
  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      await api.post('/comments', {
        postId: post._id,
        content: comment.trim(),
        parentId: replyParentId || undefined,
      })
      setComment('')
      setReplyTarget(null)
      setReplyParentId(null)
      // Tăng refreshKey để CommentList tự fetch lại danh sách comment mới
      setRefreshKey(function (k) { return k + 1 })
      toast.success(replyTarget ? t.post.replyAdded : t.post.commentAdded)
    } catch {
      toast.error(t.post.commentFailed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className={styles.overlay} onClick={function (e) { if (e.target === e.currentTarget) onClose() }}>
        <div className={styles.dialog}>
          {/* Media panel */}
          <div className={styles.mediaPanel} onDoubleClick={handleMediaDoubleClick}>
            {mediaUrl ? (
              <>
                {mediaType === 'video' ? (
                  <video src={mediaUrl} poster={thumbnailUrl || undefined} className={styles.media} controls autoPlay muted />
                ) : (
                  <img src={mediaUrl} alt="post" className={styles.media} />
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
              </>
            ) : (
              <div className={styles.noMedia}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                </svg>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className={styles.sidePanel}>
            {/* Header */}
            <div className={styles.sideHeader}>
              <Link to={'/' + post.user?.username} onClick={onClose} className={styles.userRow}>
                {/* FIX: ưu tiên avatarUrl, fallback avatar cho tương thích ngược */}
                <Avatar src={post.user?.avatarUrl || post.user?.avatar} username={post.user?.username} size="sm" />
                <span className={styles.username}>{post.user?.username}</span>
                {post.user?.isTrusted && <Icon name="verified" size={14} />}
              </Link>
              <div className={styles.headerRight}>
                <div className={styles.menuWrap} ref={menuRef}>
                  <button className={styles.menuBtn} onClick={function () { setShowMenu(function (v) { return !v }) }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                  {showMenu && (
                    <div className={styles.menu}>
                      {isOwner ? (
                        <>
                          <button className={styles.menuItem} onClick={function () { setEditCaption(caption); setShowEdit(true); setShowMenu(false) }}>
                            ✏️ {t.post.editCaption}
                          </button>
                          <button className={styles.menuItem + ' ' + styles.menuItemDanger} onClick={function () { setShowConfirmDelete(true); setShowMenu(false) }}>
                            🗑️ {t.post.deletePost}
                          </button>
                        </>
                      ) : (
                        <button className={styles.menuItem + ' ' + styles.menuItemDanger} onClick={function () { setShowReport(true); setShowMenu(false) }}>
                          {t.post.reportPost}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button className={styles.closeBtn} onClick={onClose}>✕</button>
              </div>
            </div>

            {/* Caption + comments */}
            <div className={styles.scrollArea}>
              {caption && (
                <div className={styles.captionRow}>
                  <p className={styles.captionText}><CaptionText text={caption} /></p>
                </div>
              )}
              <CommentList postId={post._id} refreshKey={refreshKey} onReply={handleReply} onClose={onClose} />
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <div className={styles.likeRow}>
                <button className={cardStyles.likeBtn + (liked ? ' ' + cardStyles.liked : '')} onClick={handleLike}>
                  <HeartIcon filled={liked} />
                </button>
                <span className={styles.likesCount}>{formatNumber(likesCount)} {t.post.likes}</span>
                <button
                  className={cardStyles.likeBtn}
                  onClick={handleBookmark}
                  title={saved ? t.post.unsave : t.post.save}
                  style={{ marginLeft: 'auto' }}
                >
                  <BookmarkIcon filled={saved} />
                </button>
              </div>
              <div className={styles.timeAgo}>{timeAgo(post.createdAt)}</div>
              <form onSubmit={handleComment} className={styles.commentForm}>
                {replyTarget && (
                  <div className={styles.replyTag}>
                    <span>{t.post.replyTo}{replyTarget.user?.username}</span>
                    <button type="button" onClick={clearReply}>{t.post.cancel}</button>
                  </div>
                )}
                <input
                  ref={commentInputRef}
                  className={styles.commentInput}
                  placeholder={replyTarget ? t.post.commentPlaceholder : t.post.addComment}
                  value={comment}
                  onChange={function (e) { setComment(e.target.value) }}
                />
                <button type="submit" className={styles.postBtn} disabled={!comment.trim() || submitting}>
                  {t.post.postBtn}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <ConfirmModal
          message={t.post.deleteConfirm}
          onConfirm={handleDelete}
          onCancel={function () { setShowConfirmDelete(false) }}
        />
      )}

      {showEdit && (
        <div className={styles.editOverlay} onClick={function () { setShowEdit(false) }}>
          <div className={styles.editBox} onClick={function (e) { e.stopPropagation() }}>
            <div className={styles.editHeader}>
              <span>{t.post.editCaption}</span>
              <button className={styles.closeBtn} onClick={function () { setShowEdit(false) }}>✕</button>
            </div>
            <form onSubmit={handleEdit}>
              <textarea
                className={styles.editTextarea}
                value={editCaption}
                onChange={function (e) { setEditCaption(e.target.value) }}
                rows={4}
                maxLength={2200}
                autoFocus
                placeholder={t.post.captionPlaceholder}
              />
              <div className={styles.editCount}>{editCaption.length} / 2200</div>
              <div className={styles.editActions}>
                <button type="button" className={styles.editCancel} onClick={function () { setShowEdit(false) }}>{t.post.cancel}</button>
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
