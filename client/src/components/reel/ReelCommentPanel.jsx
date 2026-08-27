import { useState, useRef, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '../../i18n/LanguageContext'
import { AuthContext } from '../../context/AuthContext'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'
import { timeAgo } from '../../utils/formatTime'
import { formatNumber } from '../../utils/formatNumber'
import { likePost, unlikePost } from '../../features/post/postAPI'
import {
  getReelComments,
  createReelComment,
  deleteReelComment,
  getReelCommentReplies,
} from '../../features/reel/reelAPI'
import styles from './ReelCommentPanel.module.css'

function HeartIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
      fill={filled ? '#E1306C' : 'none'} stroke={filled ? '#E1306C' : 'currentColor'} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ReelCommentItem({ comment, reelId, currentUserId, onDeleted, isReply = false }) {
  const { t } = useLanguage()
  const [liked, setLiked] = useState(comment.isLiked || false)
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0)
  const [showReplies, setShowReplies] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const queryClient = useQueryClient()

  const { data: repliesData } = useQuery({
    queryKey: ['reel-comment-replies', comment._id],
    queryFn: () => getReelCommentReplies(comment._id).then(r => r.data),
    enabled: showReplies && !isReply,
  })

  const replies = repliesData?.replies || []

  async function handleLike() {
    const prev = liked
    const prevCount = likesCount
    setLiked(!liked)
    setLikesCount(liked ? likesCount - 1 : likesCount + 1)
    try {
      if (prev) await unlikePost('reelComment', comment._id)
      else await likePost('reelComment', comment._id)
    } catch {
      setLiked(prev)
      setLikesCount(prevCount)
      toast.error(t.reelComment.likeFailed)
    }
  }

  async function handleDelete() {
    try {
      await deleteReelComment(comment._id)
      toast.success(t.reelComment.deleted)
      onDeleted(comment._id)
      queryClient.invalidateQueries({ queryKey: ['reel-comments', reelId] })
    } catch {
      toast.error(t.reelComment.deleteFailed)
    }
  }

  async function handleReply(e) {
    e.preventDefault()
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      await createReelComment(reelId, { content: replyText.trim(), parentId: comment._id })
      setReplyText('')
      setReplying(false)
      setShowReplies(true)
      queryClient.invalidateQueries({ queryKey: ['reel-comment-replies', comment._id] })
    } catch {
      toast.error(t.reelComment.postFailed)
    } finally {
      setSubmittingReply(false)
    }
  }

  const isOwn = currentUserId && comment.user?._id === currentUserId

  return (
    <div className={isReply ? styles.replyItem : styles.commentItem}>
      <Link to={'/' + comment.user?.username} className={styles.avatarLink}>
        <Avatar src={comment.user?.avatarUrl} username={comment.user?.username} size="sm" />
      </Link>
      <div className={styles.commentBody}>
        <div className={styles.commentBubble}>
          <span className={styles.commentUsername}>{comment.user?.username}</span>
          {comment.user?.isTrusted && <Icon name="verified" size={13} />}
          <span className={styles.commentText}>{comment.content}</span>
        </div>
        <div className={styles.commentMeta}>
          <span className={styles.commentTime}>{timeAgo(comment.createdAt)}</span>
          {likesCount > 0 && (
            <span className={styles.metaLikes}>{formatNumber(likesCount)} ♡</span>
          )}
          {!isReply && (
            <button className={styles.metaBtn} onClick={() => setReplying(v => !v)}>
              {t.reelComment.reply}
            </button>
          )}
          {isOwn && !confirmDelete && (
            <button className={styles.metaBtn} onClick={() => setConfirmDelete(true)}>
              {t.reelComment.delete}
            </button>
          )}
          {confirmDelete && (
            <>
              <button className={styles.metaBtnDanger} onClick={handleDelete}>✓</button>
              <button className={styles.metaBtn} onClick={() => setConfirmDelete(false)}>✕</button>
            </>
          )}
        </div>

        {replying && (
          <form className={styles.replyForm} onSubmit={handleReply}>
            <input
              className={styles.replyInput}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={t.reelComment.replyPlaceholder}
              maxLength={500}
              autoFocus
            />
            <button className={styles.sendBtn} type="submit" disabled={submittingReply || !replyText.trim()}>
              {t.reelComment.send}
            </button>
          </form>
        )}

        {!isReply && (
          <>
            {showReplies && replies.length > 0 && (
              <div className={styles.repliesList}>
                {replies.map(r => (
                  <ReelCommentItem
                    key={r._id}
                    comment={r}
                    reelId={reelId}
                    currentUserId={currentUserId}
                    onDeleted={() => queryClient.invalidateQueries({ queryKey: ['reel-comment-replies', comment._id] })}
                    isReply
                  />
                ))}
              </div>
            )}
            {(repliesData?.total > 0 || (showReplies && replies.length > 0)) && (
              <button className={styles.toggleReplies} onClick={() => setShowReplies(v => !v)}>
                {showReplies ? t.reelComment.hideReplies : t.reelComment.replies}
              </button>
            )}
          </>
        )}
      </div>

      <button className={styles.likeBtn} onClick={handleLike}>
        <HeartIcon filled={liked} />
      </button>
    </div>
  )
}

export default function ReelCommentPanel({ reelId, onClose, onCommentsCountChange }) {
  const { t } = useLanguage()
  const { user: currentUser } = useContext(AuthContext)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localComments, setLocalComments] = useState(null)
  const inputRef = useRef(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reel-comments', reelId],
    queryFn: () => getReelComments(reelId).then(r => r.data),
  })

  const comments = localComments ?? data?.comments ?? []

  useEffect(() => {
    if (data?.comments) setLocalComments(null)
  }, [data])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await createReelComment(reelId, { content: text.trim() })
      const newComment = res.data.comment
      setLocalComments(prev => [newComment, ...(prev ?? data?.comments ?? [])])
      setText('')
      onCommentsCountChange?.(1)
      queryClient.invalidateQueries({ queryKey: ['reel-comments', reelId] })
    } catch {
      toast.error(t.reelComment.postFailed)
    } finally {
      setSubmitting(false)
    }
  }

  function handleDeleted(commentId) {
    setLocalComments(prev => (prev ?? data?.comments ?? []).filter(c => c._id !== commentId))
    onCommentsCountChange?.(-1)
  }

  return (
    <div className={styles.panel} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>{t.reelComment.title}</span>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className={styles.list}>
        {isLoading && <div className={styles.loading}>...</div>}
        {!isLoading && comments.length === 0 && (
          <div className={styles.empty}>{t.reelComment.empty}</div>
        )}
        {comments.map(c => (
          <ReelCommentItem
            key={c._id}
            comment={c}
            reelId={reelId}
            currentUserId={currentUser?._id || currentUser?.id}
            onDeleted={handleDeleted}
          />
        ))}
      </div>

      <form className={styles.inputRow} onSubmit={handleSubmit}>
        <Avatar src={currentUser?.avatarUrl} username={currentUser?.username} size="sm" />
        <input
          ref={inputRef}
          className={styles.input}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t.reelComment.placeholder}
          maxLength={500}
        />
        <button className={styles.sendBtn} type="submit" disabled={submitting || !text.trim()}>
          {t.reelComment.send}
        </button>
      </form>
    </div>
  )
}
