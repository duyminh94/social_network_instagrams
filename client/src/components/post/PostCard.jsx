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
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import CloseIcon from '@mui/icons-material/Close'
import VerifiedIcon from '@mui/icons-material/Verified'
import Button from '../common/Button'
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
import { mediaNavSx, actionBtnSx, likedSx, countSx } from './postStyles'

import ReactionBar from '../common/ReactionBar'
import { reactionEmoji } from '../common/reactions'
import { timeAgo } from '../../utils/formatTime'
import { formatNumber } from '../../utils/formatNumber'

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
  // Menu 3 chấm: MUI Menu cần biết neo vào phần tử nào, giữ trong state
  var [menuAnchor, setMenuAnchor] = useState(null)
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

  // Đóng menu rồi mới chạy hành động, tránh menu treo lại khi modal mở đè lên
  function runFromMenu(action) {
    setMenuAnchor(null)
    action()
  }

  return (
    <>
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          mb: 3,
          maxWidth: 614,
          position: 'relative',
        }}
      >
        {/* Header: avatar + username + nút menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}>
            {/* Vùng hover để hiện UserHoverCard, phải relative để popup neo theo */}
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, position: 'relative', cursor: 'default' }}
              onMouseEnter={handleUserMouseEnter}
              onMouseLeave={handleUserMouseLeave}
            >
              <Link component={RouterLink} to={`/${post.user?.username}`}>
                {/* Avatar có gradient ring như story (giống Instagram) */}
                <Avatar
                  src={post.user?.avatarUrl || post.user?.avatar}
                  username={post.user?.username}
                  size="md"
                  hasStory={post.user?.hasActiveStory || false}
                  seenStory={post.user?.storySeen || false}
                />
              </Link>

              <Box sx={{ minWidth: 0 }}>
                {/* Dòng 1: username + verified + dấu chấm + thời gian */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: .625, flexWrap: 'nowrap' }}>
                  <Link
                    component={RouterLink}
                    to={`/${post.user?.username}`}
                    underline="hover"
                    sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary', whiteSpace: 'nowrap' }}
                  >
                    {post.user?.username}
                  </Link>

                  {post.user?.isTrusted && (
                    <Tooltip title="Tài khoản đã xác minh" arrow>
                      <VerifiedIcon sx={{ fontSize: 14, color: 'primary.main', flexShrink: 0 }} />
                    </Tooltip>
                  )}

                  <Typography component="span" sx={{ color: 'text.secondary', fontSize: 12, flexShrink: 0 }}>•</Typography>
                  <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {timeAgo(post.createdAt)}
                  </Typography>
                </Box>

                {/* Dòng 2: suggested reason hoặc location */}
                {suggestedReason && (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{suggestedReason}</Typography>
                )}
                {!suggestedReason && post.location && (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{post.location}</Typography>
                )}
              </Box>

              {/* Hover card popup */}
              {showHoverCard && post.user?.username && (
                <UserHoverCard
                  username={post.user.username}
                  onMouseEnter={handleCardMouseEnter}
                  onMouseLeave={handleCardMouseLeave}
                />
              )}
            </Box>
          </Box>

          {/* Follow button + menu gộp bên phải */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: .75, flexShrink: 0 }}>
            {showFollow && !isOwner && (
              // Nút Follow kiểu Instagram: nền trắng chữ đen, nổi bật trên nền tối
              <Box
                component="button"
                type="button"
                onClick={handleFollowClick}
                sx={{
                  bgcolor: '#fff',
                  color: '#000',
                  border: 'none',
                  borderRadius: 2,
                  px: 2.5,
                  py: .875,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  '&:hover': { bgcolor: '#f0f0f0' },
                }}
              >
                {t.common.follow}
              </Box>
            )}

            {/* Menu bài viết: chủ bài sửa/xóa, người khác báo cáo */}
            <IconButton size="small" onClick={function (e) { setMenuAnchor(e.currentTarget) }} aria-label="menu">
              <MoreHorizIcon />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={!!menuAnchor}
              onClose={function () { setMenuAnchor(null) }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {isOwner
                ? [
                    <MenuItem
                      key="edit"
                      onClick={function () { runFromMenu(function () { setEditCaption(caption); setShowEdit(true) }) }}
                    >
                      ✏️ {t.post.editCaption}
                    </MenuItem>,
                    <Divider key="div" />,
                    <MenuItem
                      key="delete"
                      sx={{ color: 'error.main' }}
                      onClick={function () { runFromMenu(function () { setShowConfirmDelete(true) }) }}
                    >
                      🗑️ {t.post.deletePost}
                    </MenuItem>,
                  ]
                : (
                  <MenuItem
                    sx={{ color: 'error.main' }}
                    onClick={function () { runFromMenu(function () { setShowReport(true) }) }}
                  >
                    {t.post.reportPost}
                  </MenuItem>
                )}
            </Menu>
          </Box>
        </Box>

        {/* Media: nhiều ảnh/video thì hiện carousel có nút qua/lại và chấm trạng thái */}
        {mediaUrl && (
          <Box sx={{ position: 'relative', width: '100%', bgcolor: '#000' }} onDoubleClick={handleMediaDoubleClick}>
            {mediaType === 'video' ? (
              <Box
                component="video"
                src={mediaUrl}
                poster={thumbnailUrl || undefined}
                controls muted loop
                sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Box
                component="img"
                src={mediaUrl}
                alt="post"
                loading="lazy"
                sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
              />
            )}

            {/* Trái tim phóng to khi double-tap */}
            {showLikeBurst && (
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  color: '#fff',
                  fontSize: 96,
                  lineHeight: 1,
                  textShadow: '0 8px 28px rgba(0,0,0,.45)',
                  pointerEvents: 'none',
                  animation: 'likeBurst 650ms ease forwards',
                  '@keyframes likeBurst': {
                    '0%':   { opacity: 0, transform: 'translate(-50%, -50%) scale(0.4)' },
                    '22%':  { opacity: 1, transform: 'translate(-50%, -50%) scale(1.12)' },
                    '55%':  { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
                    '100%': { opacity: 0, transform: 'translate(-50%, -50%) scale(1.25)' },
                  },
                }}
              >
                ♥
              </Box>
            )}

            {hasManyMedia && (
              <>
                <Box component="button" type="button" onClick={goPrevMedia} sx={{ ...mediaNavSx, left: 14 }}>‹</Box>
                <Box component="button" type="button" onClick={goNextMedia} sx={{ ...mediaNavSx, right: 14 }}>›</Box>

                <Box
                  sx={{
                    position: 'absolute',
                    left: 0, right: 0, bottom: 10,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: .75,
                    pointerEvents: 'none',
                  }}
                >
                  {mediaItems.map(function (_, i) {
                    return (
                      <Box
                        key={i}
                        component="button"
                        type="button"
                        aria-label={'Xem media ' + (i + 1)}
                        onClick={function (e) {
                          e.stopPropagation()
                          setMediaIndex(i)
                        }}
                        sx={{
                          width: 7, height: 7, p: 0,
                          border: 'none',
                          borderRadius: '50%',
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                          bgcolor: i === mediaIndex ? '#4f63ff' : 'rgba(255,255,255,.62)',
                        }}
                      />
                    )
                  })}
                </Box>
              </>
            )}
          </Box>
        )}

        {/* Nút tương tác: like, comment, bookmark */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, px: 1.5, pt: 1, pb: .5 }}>
          <Box
            sx={{ position: 'relative', display: 'inline-flex' }}
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
            <Box component="button" onClick={handleToggleLike} sx={{ ...actionBtnSx, ...(liked ? likedSx : null) }}>
              {liked && myReaction ? (
                <Box component="span" sx={{ fontSize: 22, lineHeight: 1 }}>{reactionEmoji(myReaction)}</Box>
              ) : (
                <HeartIcon filled={false} />
              )}
              <Box component="span" sx={countSx}>{formatNumber(likesCount)}</Box>
            </Box>
          </Box>

          <Box component="button" onClick={() => setShowModal(true)} sx={actionBtnSx}>
            <CommentIcon />
            <Box component="span" sx={countSx}>{formatNumber(commentsCount)}</Box>
          </Box>

          <Box component="button" onClick={handleBookmark} sx={{ ...actionBtnSx, ml: 'auto' }}>
            <BookmarkIcon filled={saved} />
          </Box>
        </Box>

        {caption && (
          <Box sx={{ px: 2, pt: .5, pb: 1, fontSize: 14, lineHeight: 1.5 }}>
            <Link
              component={RouterLink}
              to={`/${post.user?.username}`}
              underline="hover"
              sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary', mr: .75 }}
            >
              {post.user?.username}
            </Link>
            <CaptionText text={caption} />
          </Box>
        )}
      </Box>

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
      <Dialog open={showEdit} onClose={() => setShowEdit(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.75, pr: 1 }}>
          <Typography component="span" sx={{ fontSize: 15, fontWeight: 600 }}>{t.post.editCaption}</Typography>
          <IconButton size="small" onClick={() => setShowEdit(false)} aria-label={t.post.cancel}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleEdit}>
          <DialogContent dividers>
            <TextField
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              multiline
              rows={4}
              fullWidth
              autoFocus
              placeholder={t.post.captionPlaceholder}
              slotProps={{ htmlInput: { maxLength: 2200 } }}
              helperText={editCaption.length + ' / 2200'}
            />
          </DialogContent>

          <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
            <Button variant="outline-secondary" onClick={() => setShowEdit(false)}>
              {t.post.cancel}
            </Button>
            <Button type="submit" loading={editLoading}>
              {editLoading ? t.post.saving : t.post.save}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

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
