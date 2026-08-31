import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'
import { timeAgo } from '../../utils/formatTime'
import { likePost, unlikePost } from '../../features/post/postAPI'
import api from '../../services/api'

function HeartIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
      fill={filled ? '#E1306C' : 'none'} stroke={filled ? '#E1306C' : 'currentColor'} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

// canPin: người xem là chủ bài viết → được ghim/bỏ ghim bình luận gốc
// onPinChanged: báo lên trên để fetch lại danh sách, vì server sắp xếp lại thứ tự (isPinned lên đầu)
export default function CommentItem({ comment, onReply, refreshKey, isReply = false, rootCommentId, onClose, canPin = false, onPinChanged }) {
  var [liked, setLiked] = useState(comment.isLiked || false)
  var [likesCount, setLikesCount] = useState(comment.likesCount || 0)
  var [pinning, setPinning] = useState(false)
  var parentId = rootCommentId || comment._id
  var { t } = useLanguage()
  // Reply không ghim được (server chặn), nên chỉ hiện nút ở bình luận gốc
  var showPinButton = canPin && !isReply

  var { data: repliesData } = useQuery({
    queryKey: ['comment-replies', comment._id, refreshKey],
    queryFn: function () {
      return api.get('/comments/' + comment._id + '/replies').then(function (r) { return r.data })
    },
    enabled: !isReply,
  })

  var replies = repliesData?.replies || []

  // Optimistic update: đổi state ngay, nếu API lỗi thì revert về cũ
  async function handleLike() {
    var prev = liked
    var prevCount = likesCount
    setLiked(!liked)
    setLikesCount(liked ? likesCount - 1 : likesCount + 1)
    try {
      if (prev) {
        await unlikePost('comment', comment._id)
      } else {
        await likePost('comment', comment._id)
      }
    } catch {
      setLiked(prev)
      setLikesCount(prevCount)
    }
  }

  // Ghim/bỏ ghim: không cập nhật lạc quan vì server còn phải sắp xếp lại thứ tự danh sách
  async function handleTogglePin() {
    if (pinning) return
    setPinning(true)
    try {
      comment.isPinned
        ? await api.delete('/comments/' + comment._id + '/pin')
        : await api.patch('/comments/' + comment._id + '/pin')
      if (onPinChanged) onPinChanged()
    } catch (error) {
      console.error(t.comment.pinFailed, error)
    } finally {
      setPinning(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, padding: isReply ? '6px 16px 6px 54px' : '6px 16px', alignItems: 'flex-start' }}>
        <Link to={'/' + comment.user?.username} onClick={onClose}>
          {/* FIX: backend trả avatarUrl, không phải avatar */}
          <Avatar src={comment.user?.avatarUrl || comment.user?.avatar} username={comment.user?.username} size="sm" />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, lineHeight: 1.4 }}>
            <Link to={'/' + comment.user?.username} onClick={onClose} style={{ fontWeight: 600, marginRight: 4 }}>
              {comment.user?.username}
            </Link>
            {comment.user?.isTrusted && <Icon name="verified" size={13} />}
            {comment.content || comment.text}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
            {comment.isPinned && (
              <span style={{ fontSize: 11, color: 'var(--ig-text-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                📌 {t.comment.pinned}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--ig-text-light)' }}>{timeAgo(comment.createdAt)}</span>
            {likesCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--ig-text-light)', fontWeight: 600 }}>{likesCount} {t.comment.likes}</span>
            )}
            <button
              style={{ fontSize: 11, color: 'var(--ig-text-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              onClick={function () {
                if (onReply) {
                  onReply(comment, parentId)
                }
              }}
            >
              {t.comment.reply}
            </button>
            {showPinButton && (
              <button
                disabled={pinning}
                style={{ fontSize: 11, color: 'var(--ig-text-light)', background: 'none', border: 'none', cursor: pinning ? 'default' : 'pointer', fontWeight: 600, padding: 0, opacity: pinning ? 0.5 : 1 }}
                onClick={handleTogglePin}
              >
                {comment.isPinned ? t.comment.unpin : t.comment.pin}
              </button>
            )}
          </div>
        </div>
        <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 }}>
          <HeartIcon filled={liked} />
        </button>
      </div>

      {!isReply && replies.map(function (reply) {
        return (
          <CommentItem
            key={reply._id}
            comment={reply}
            onReply={onReply}
            onClose={onClose}
            isReply={true}
            rootCommentId={comment._id}
          />
        )
      })}
    </>
  )
}
