// components/reel/ReelCommentPanel.jsx
// Panel bình luận của Reels: desktop nằm dọc bên phải video, mobile trượt lên
//   từ đáy che một phần video
//
// Màu ở đây ghi cứng theo tông tối (trắng + rgba trắng) chứ KHÔNG lấy từ theme.
//   Lý do: panel luôn nằm cạnh trình phát video nền đen, kể cả khi app đang bật
//   giao diện sáng. Dùng text.primary sẽ thành chữ đen trên nền đen

import { useState, useRef, useEffect, useContext } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
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

// Dưới ngưỡng này không đủ chỗ đặt panel bên cạnh video nên đổi sang bottom-sheet.
// Viết tay vì CSS gốc dùng 768px, còn md của MUI là 900px
import { DUR, EASE } from '../../theme/animations'

var MOBILE = '@media (max-width:768px)'

var LIKE_COLOR = '#E1306C'

// Nút chữ nhỏ dưới mỗi bình luận: Trả lời / Xoá / huỷ xác nhận
var metaBtnSx = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.5)',
  p: 0,
  '&:hover': { color: '#fff' },
}

// Ô nhập chung cho form trả lời và form gửi bình luận
function inputSx(big) {
  return {
    flex: 1,
    minWidth: 0,
    bgcolor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: big ? '22px' : '20px',
    px: big ? 1.75 : 1.5,
    py: big ? 1 : .625,
    fontSize: big ? 13 : 12,
    fontFamily: 'inherit',
    color: '#fff',
    outline: 'none',
    '&::placeholder': { color: 'rgba(255, 255, 255, 0.4)' },
    '&:focus': {
      borderColor: 'rgba(255, 255, 255, 0.3)',
      bgcolor: big ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.08)',
    },
  }
}

// Nút Gửi — dùng ở cả form trả lời lẫn form bình luận chính
var sendBtnSx = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  color: '#0095f6',
  p: 0,
  flexShrink: 0,
  '&:disabled': { color: 'rgba(0, 149, 246, 0.4)', cursor: 'default' },
  '&:not(:disabled):hover': { color: '#1aa3ff' },
}

function HeartIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
      fill={filled ? LIKE_COLOR : 'none'} stroke={filled ? LIKE_COLOR : 'currentColor'} strokeWidth="2">
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
    <Box
      sx={{
        display: 'flex',
        gap: isReply ? 1 : 1.25,
        // Trả lời thụt vào 46px cho thẳng hàng với nội dung của bình luận cha
        pl: isReply ? '46px' : 2,
        pr: 2,
        py: isReply ? .75 : 1,
        alignItems: 'flex-start',
        position: 'relative',
      }}
    >
      <Box component={RouterLink} to={'/' + comment.user?.username} sx={{ flexShrink: 0 }}>
        <Avatar src={comment.user?.avatarUrl} username={comment.user?.username} size="sm" />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: .5, alignItems: 'baseline' }}>
          <Typography component="span" sx={{ fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
            {comment.user?.username}
          </Typography>
          {comment.user?.isTrusted && <Icon name="verified" size={13} />}
          <Typography component="span" sx={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', wordBreak: 'break-word' }}>
            {comment.content}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: .5 }}>
          <Typography component="span" sx={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>
            {timeAgo(comment.createdAt)}
          </Typography>
          {likesCount > 0 && (
            <Typography component="span" sx={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
              {formatNumber(likesCount)} ♡
            </Typography>
          )}
          {!isReply && (
            <Box component="button" type="button" sx={metaBtnSx} onClick={() => setReplying(v => !v)}>
              {t.reelComment.reply}
            </Box>
          )}
          {isOwn && !confirmDelete && (
            <Box component="button" type="button" sx={metaBtnSx} onClick={() => setConfirmDelete(true)}>
              {t.reelComment.delete}
            </Box>
          )}
          {confirmDelete && (
            <>
              <Box component="button" type="button" sx={{ ...metaBtnSx, color: LIKE_COLOR, '&:hover': { color: LIKE_COLOR } }} onClick={handleDelete}>✓</Box>
              <Box component="button" type="button" sx={metaBtnSx} onClick={() => setConfirmDelete(false)}>✕</Box>
            </>
          )}
        </Box>

        {replying && (
          <Box component="form" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: .75 }} onSubmit={handleReply}>
            <Box
              component="input"
              sx={inputSx(false)}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={t.reelComment.replyPlaceholder}
              maxLength={500}
              autoFocus
            />
            <Box component="button" sx={sendBtnSx} type="submit" disabled={submittingReply || !replyText.trim()}>
              {t.reelComment.send}
            </Box>
          </Box>
        )}

        {!isReply && (
          <>
            {showReplies && replies.length > 0 && (
              <Box sx={{ mt: .5 }}>
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
              </Box>
            )}
            {(repliesData?.total > 0 || (showReplies && replies.length > 0)) && (
              <Box component="button" type="button" sx={{ ...metaBtnSx, mt: .5 }} onClick={() => setShowReplies(v => !v)}>
                {showReplies ? t.reelComment.hideReplies : t.reelComment.replies}
              </Box>
            )}
          </>
        )}
      </Box>

      <Box
        component="button"
        type="button"
        onClick={handleLike}
        sx={{
          position: 'absolute',
          right: 16,
          top: 10,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          p: .5,
          color: 'rgba(255, 255, 255, 0.6)',
          display: 'flex',
          alignItems: 'center',
          '&:hover': { color: LIKE_COLOR },
        }}
      >
        <HeartIcon filled={liked} />
      </Box>
    </Box>
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
    <Box
      onClick={e => e.stopPropagation()}
      sx={{
        // Trượt vào từ phải ở desktop; ở mobile nó là bottom-sheet nên trượt từ dưới lên
        animation: 'reelCommentIn ' + DUR.normal + 'ms ' + EASE + ' both',
        '@keyframes reelCommentIn': {
          from: { opacity: 0, transform: 'translateX(24px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        // Desktop: là flex con của .slide nên tự nằm cạnh khung video, không che video
        width: 380,
        flexShrink: 0,
        height: '100dvh',
        bgcolor: 'rgba(18, 18, 18, 0.98)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        color: '#fff',
        [MOBILE]: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: 'auto',
          height: '65%',
          borderLeft: 'none',
          borderRadius: '16px 16px 0 0',
          backdropFilter: 'blur(8px)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pt: 1.5, px: 2, pb: 1,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
        }}
      >
        <Typography component="span" sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
          {t.reelComment.title}
        </Typography>
        <Box
          component="button"
          type="button"
          onClick={onClose}
          sx={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            p: .5,
            color: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            '&:hover': { color: '#fff' },
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 1,
          // Thanh cuộn mảnh cho hợp với panel hẹp
          '&::-webkit-scrollbar': { width: 3 },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
          },
        }}
      >
        {isLoading && (
          <Typography sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, px: 2, py: 3 }}>...</Typography>
        )}
        {!isLoading && comments.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, px: 2, py: 3 }}>
            {t.reelComment.empty}
          </Typography>
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
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          pt: 1.25, px: 2, pb: 1.75,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
        }}
      >
        <Avatar src={currentUser?.avatarUrl} username={currentUser?.username} size="sm" />
        <Box
          component="input"
          ref={inputRef}
          sx={inputSx(true)}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t.reelComment.placeholder}
          maxLength={500}
        />
        <Box component="button" sx={sendBtnSx} type="submit" disabled={submitting || !text.trim()}>
          {t.reelComment.send}
        </Box>
      </Box>
    </Box>
  )
}
