// components/post/PostModal.jsx
// Modal xem chi tiết bài viết: media + comments + like + edit/delete (chủ bài)
//
// Dựng trên Dialog của MUI thay cho overlay tự viết. Dialog lo sẵn 3 việc mà
//   bản cũ phải tự làm bằng useEffect: khoá cuộn trang nền, bấm ra ngoài để
//   đóng, và nhấn Esc để đóng
//
// Menu 3 chấm dùng Menu + anchorEl của MUI nên bỏ được useEffect bắt sự kiện
//   mousedown để phát hiện click ra ngoài
//
// Modal sửa caption là một Dialog lồng bên trong. MUI tự xếp Dialog mở sau
//   nằm trên Dialog mở trước nên không cần tự chỉnh z-index

import { useState, useRef, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import InputBase from '@mui/material/InputBase'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import CloseIcon from '@mui/icons-material/Close'
import VerifiedIcon from '@mui/icons-material/Verified'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../common/Avatar'
import Button from '../common/Button'
import CaptionText from '../common/CaptionText'
import CommentList from '../comment/CommentList'
import ConfirmModal from '../common/ConfirmModal'
import ReportModal from '../common/ReportModal'
import SaveToCollectionModal from './SaveToCollectionModal'
import { timeAgo } from '../../utils/formatTime'
import {
  likePost, unlikePost, deletePost, updatePost, savePost, unsavePost,
  archivePost, unarchivePost, getPhotoTags, addPhotoTag, removePhotoTag,
} from '../../features/post/postAPI'
import PhotoTagLayer from './PhotoTagLayer'
import PhotoTagPicker from './PhotoTagPicker'
import { formatNumber } from '../../utils/formatNumber'
import { mediaNavSx, actionBtnSx, likedSx } from './postStyles'

// Ngưỡng gập modal thành 1 cột. Viết tay vì breakpoint sm của MUI là 600px,
//   còn CSS gốc của modal này gập ở 640px — dùng sm sẽ lệch ở khoảng giữa
var MOBILE = '@media (max-width:640px)'

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

// onArchivedChange(postId, isArchived): báo cho trang cha biết bài vừa đổi trạng thái lưu trữ,
// vì bài sẽ rời khỏi danh sách đang xem (tab Bài viết hoặc tab Lưu trữ)
export default function PostModal({ post, onClose, onDelete, onUpdated, onSavedChange, onArchivedChange }) {
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
  var [menuAnchor, setMenuAnchor] = useState(null)
  var [showConfirmDelete, setShowConfirmDelete] = useState(false)
  var [showEdit, setShowEdit] = useState(false)
  var [showReport, setShowReport] = useState(false)
  // Dialog chọn bộ sưu tập khi lưu bài
  var [showSaveCollection, setShowSaveCollection] = useState(false)
  var [editCaption, setEditCaption] = useState(post.caption || '')
  var [caption, setCaption] = useState(post.caption || '')
  var [editLoading, setEditLoading] = useState(false)
  var [mediaIndex, setMediaIndex] = useState(0)
  var [showLikeBurst, setShowLikeBurst] = useState(false)
  var commentInputRef = useRef(null)

  // --- Gắn thẻ người trên ảnh ---
  var [photoTags, setPhotoTags] = useState([])
  var [showTags, setShowTags] = useState(false)
  // tagging: chủ bài đang chờ bấm chọn vị trí trên ảnh
  var [tagging, setTagging] = useState(false)
  // Toạ độ vừa bấm, giữ lại để gắn cho người được chọn ở dialog
  var [pendingPosition, setPendingPosition] = useState(null)
  // Giữ chính thẻ <img> để PhotoTagLayer đo được vùng ảnh thật
  var [imgEl, setImgEl] = useState(null)
  // Đổi giá trị để lớp phủ đo lại: ảnh vừa tải xong hoặc vừa chuyển sang ảnh khác
  var [imgRefreshToken, setImgRefreshToken] = useState(0)

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

  // Chỉ gắn thẻ được lên ảnh, và ảnh đó phải là media thật trong DB (mediaItems dựng tạm
  // từ post.mediaUrl thì không có _id nên không gắn được)
  var currentMediaId = currentMedia?._id || null
  var canTagPhoto = isOwner && mediaType === 'image' && !!currentMediaId

  // Bài carousel: mỗi ảnh giữ bộ thẻ riêng nên phải lọc theo ảnh đang xem
  var tagsOfCurrentMedia = photoTags.filter(function (tag) {
    return String(tag.mediaId) === String(currentMediaId)
  })

  // Tải danh sách thẻ một lần khi mở bài
  useEffect(function () {
    var stillMounted = true

    getPhotoTags(post._id)
      .then(function (res) {
        if (stillMounted) setPhotoTags(res.data?.tags || [])
      })
      .catch(function (error) {
        console.error('Không tải được danh sách gắn thẻ', error)
      })

    return function () { stillMounted = false }
  }, [post._id])

  // Đóng menu trước rồi mới chạy hành động, tránh menu còn mở đè lên modal vừa bật
  function runFromMenu(action) {
    setMenuAnchor(null)
    action()
  }

  async function reloadPhotoTags() {
    try {
      var res = await getPhotoTags(post._id)
      setPhotoTags(res.data?.tags || [])
    } catch (error) {
      console.error('Không tải lại được danh sách gắn thẻ', error)
    }
  }

  // Bấm xong một điểm trên ảnh: thoát chế độ gắn thẻ và mở dialog chọn người
  function handlePickPosition(ratioX, ratioY) {
    setPendingPosition({ x: ratioX, y: ratioY })
    setTagging(false)
  }

  async function handleSelectTagUser(selectedUser) {
    if (!pendingPosition || !currentMediaId) return

    try {
      await addPhotoTag(post._id, currentMediaId, selectedUser._id, pendingPosition.x, pendingPosition.y)
      toast.success(t.post.tagAdded)
      // Gắn xong thì bật hiển thị để người dùng thấy ngay kết quả
      setShowTags(true)
      await reloadPhotoTags()
    } catch (error) {
      toast.error(error.response?.data?.message || t.post.tagFailed)
    } finally {
      setPendingPosition(null)
    }
  }

  async function handleRemoveTag(tag) {
    try {
      await removePhotoTag(post._id, tag._id)
      toast.success(t.post.tagRemoved)
      await reloadPhotoTags()
    } catch (error) {
      toast.error(error.response?.data?.message || t.post.tagRemoveFailed)
    }
  }

  // Chủ bài gỡ được thẻ bất kỳ, người bị gắn thẻ gỡ được thẻ của chính mình
  function canRemoveTag(tag) {
    return isOwner || String(tag.user?._id || '') === myId
  }

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

  // Lưu trữ / bỏ lưu trữ — đóng modal sau khi xong vì bài không còn thuộc danh sách đang mở
  async function handleToggleArchive() {
    try {
      post.isArchived ? await unarchivePost(post._id) : await archivePost(post._id)
      toast.success(post.isArchived ? t.post.unarchived : t.post.archived)
      if (onArchivedChange) onArchivedChange(post._id, !post.isArchived)
      onClose()
    } catch {
      toast.error(t.post.archiveFailed)
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
      <Dialog
        open
        onClose={onClose}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
              maxWidth: 960,
              maxHeight: '90vh',
              m: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              [MOBILE]: { flexDirection: 'column', maxHeight: '95vh' },
            },
          },
          backdrop: {
            sx: { bgcolor: 'rgba(0,0,0,.75)', backdropFilter: 'blur(3px)' },
          },
        }}
      >
        {/* Cột trái: media */}
        <Box
          onDoubleClick={handleMediaDoubleClick}
          sx={{
            flex: 1,
            bgcolor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            overflow: 'hidden',
            position: 'relative',
            [MOBILE]: { minHeight: 260, maxHeight: '50vh' },
          }}
        >
          {mediaUrl ? (
            <>
              <Box
                component={mediaType === 'video' ? 'video' : 'img'}
                src={mediaUrl}
                poster={mediaType === 'video' ? (thumbnailUrl || undefined) : undefined}
                alt={mediaType === 'video' ? undefined : 'post'}
                controls={mediaType === 'video'}
                autoPlay={mediaType === 'video'}
                muted={mediaType === 'video'}
                ref={setImgEl}
                onLoad={function () { setImgRefreshToken(function (n) { return n + 1 }) }}
                sx={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />

              {/* Lớp phủ người được gắn thẻ — chỉ dựng trên ảnh, video không gắn thẻ được */}
              {mediaType === 'image' && (
                <PhotoTagLayer
                  imgEl={imgEl}
                  // Kèm mediaIndex vì ảnh đã nằm trong cache có thể không bắn onLoad,
                  // lúc đó chỉ dựa vào imgRefreshToken thì lớp phủ giữ nguyên vùng đo của ảnh cũ
                  refreshToken={String(imgRefreshToken) + '-' + mediaIndex}
                  tags={tagsOfCurrentMedia}
                  visible={showTags}
                  tagging={tagging}
                  onPickPosition={handlePickPosition}
                  canRemoveTag={canRemoveTag}
                  onRemoveTag={handleRemoveTag}
                />
              )}

              {/* Đường thoát khỏi chế độ gắn thẻ: lớp phủ đang nuốt hết click trên ảnh,
                  không có nút này thì phải bấm đúng một điểm mới ra được */}
              {tagging && (
                <Box
                  component="button"
                  type="button"
                  onClick={function (e) {
                    e.stopPropagation()
                    setTagging(false)
                  }}
                  sx={{
                    position: 'absolute', right: 16, bottom: 14,
                    px: 1.5, py: 0.5, borderRadius: 1,
                    border: 'none', cursor: 'pointer',
                    bgcolor: 'rgba(255,255,255,.9)', color: '#000',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  {t.post.tagDone}
                </Box>
              )}

              {/* Nút bật/tắt hiện thẻ — chỉ mọc lên khi ảnh này thật sự có thẻ */}
              {tagsOfCurrentMedia.length > 0 && !tagging && (
                <Box
                  component="button"
                  type="button"
                  aria-label={showTags ? t.post.hideTags : t.post.showTags}
                  onClick={function (e) {
                    e.stopPropagation()
                    setShowTags(function (open) { return !open })
                  }}
                  sx={{
                    position: 'absolute', left: 16, bottom: 14,
                    width: 30, height: 30, p: 0,
                    borderRadius: '50%', border: 'none', cursor: 'pointer',
                    bgcolor: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 14,
                    opacity: showTags ? 1 : 0.75,
                  }}
                >
                  🏷️
                </Box>
              )}

              {/* Trái tim phóng to khi double-click vào media */}
              {showLikeBurst && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    color: '#fff',
                    fontSize: 104,
                    lineHeight: 1,
                    textShadow: '0 8px 30px rgba(0,0,0,.48)',
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
                  <Box component="button" type="button" onClick={goPrevMedia} sx={{ ...mediaNavSx, left: 16 }}>‹</Box>
                  <Box component="button" type="button" onClick={goNextMedia} sx={{ ...mediaNavSx, right: 16 }}>›</Box>

                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0, right: 0, bottom: 14,
                      display: 'flex',
                      justifyContent: 'center',
                      gap: .875,
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
                            width: 8, height: 8, p: 0,
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
            </>
          ) : (
            <Box
              sx={{
                color: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                minHeight: 400,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
              </svg>
            </Box>
          )}
        </Box>

        {/* Cột phải: thông tin bài viết */}
        <Box
          sx={{
            width: 340,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            [MOBILE]: {
              width: '100%',
              borderLeft: 'none',
              borderTop: '1px solid',
              borderTopColor: 'divider',
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 2, py: 1.75,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Link
              component={RouterLink}
              to={'/' + post.user?.username}
              onClick={onClose}
              underline="none"
              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}
            >
              {/* FIX: ưu tiên avatarUrl, fallback avatar cho tương thích ngược */}
              <Avatar src={post.user?.avatarUrl || post.user?.avatar} username={post.user?.username} size="sm" />
              <Typography component="span" sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>
                {post.user?.username}
              </Typography>
              {post.user?.isTrusted && (
                <Tooltip title="Tài khoản đã xác minh" arrow>
                  <VerifiedIcon sx={{ fontSize: 14, color: 'primary.main', flexShrink: 0 }} />
                </Tooltip>
              )}
            </Link>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
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
                {/* Lưu vào bộ sưu tập cụ thể — nút bookmark vẫn lưu nhanh vào mục mặc định */}
                <MenuItem
                  key="save-collection"
                  onClick={function () { runFromMenu(function () { setShowSaveCollection(true) }) }}
                >
                  🔖 {t.post.saveToCollection}
                </MenuItem>
                <Divider key="div-save-collection" />

                {isOwner
                  ? [
                      <MenuItem
                        key="edit"
                        onClick={function () { runFromMenu(function () { setEditCaption(caption); setShowEdit(true) }) }}
                      >
                        ✏️ {t.post.editCaption}
                      </MenuItem>,
                      canTagPhoto ? (
                        <MenuItem
                          key="tag-people"
                          onClick={function () { runFromMenu(function () { setTagging(true) }) }}
                        >
                          🏷️ {t.post.tagPeople}
                        </MenuItem>
                      ) : null,
                      <MenuItem
                        key="archive"
                        onClick={function () { runFromMenu(handleToggleArchive) }}
                      >
                        🗄️ {post.isArchived ? t.post.unarchivePost : t.post.archivePost}
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

              <IconButton size="small" onClick={onClose} aria-label={t.post.cancel}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Caption + danh sách comment, phần duy nhất cuộn được */}
          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            {caption && (
              <Box sx={{ px: 2, pt: 1, pb: 1.5 }}>
                <Typography sx={{ fontSize: 14, lineHeight: 1.5, color: 'text.primary' }}>
                  <CaptionText text={caption} />
                </Typography>
              </Box>
            )}
            <CommentList
              postId={post._id}
              refreshKey={refreshKey}
              onReply={handleReply}
              onClose={onClose}
              canPin={isOwner}
              onPinChanged={function () { setRefreshKey(function (k) { return k + 1 }) }}
            />
          </Box>

          {/* Khu hành động dưới cùng */}
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 1.75, pt: 1.25, pb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: .5, mb: .5 }}>
              <Box component="button" onClick={handleLike} sx={{ ...actionBtnSx, ...(liked ? likedSx : null) }}>
                <HeartIcon filled={liked} />
              </Box>
              <Typography component="span" sx={{ fontSize: 14, fontWeight: 600 }}>
                {formatNumber(likesCount)} {t.post.likes}
              </Typography>
              <Box
                component="button"
                onClick={handleBookmark}
                title={saved ? t.post.unsave : t.post.save}
                sx={{ ...actionBtnSx, ml: 'auto' }}
              >
                <BookmarkIcon filled={saved} />
              </Box>
            </Box>

            <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.25 }}>
              {timeAgo(post.createdAt)}
            </Typography>

            <Box
              component="form"
              onSubmit={handleComment}
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
                pt: 1.25,
              }}
            >
              {replyTarget && (
                <Box
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.25,
                    color: 'text.secondary',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <Box component="span">{t.post.replyTo}{replyTarget.user?.username}</Box>
                  <Box
                    component="button"
                    type="button"
                    onClick={clearReply}
                    sx={{
                      border: 'none',
                      background: 'transparent',
                      color: 'primary.main',
                      font: 'inherit',
                      fontWeight: 700,
                      cursor: 'pointer',
                      p: 0,
                    }}
                  >
                    {t.post.cancel}
                  </Box>
                </Box>
              )}

              <InputBase
                inputRef={commentInputRef}
                placeholder={replyTarget ? t.post.commentPlaceholder : t.post.addComment}
                value={comment}
                onChange={function (e) { setComment(e.target.value) }}
                sx={{ flex: 1, fontSize: 14, color: 'text.primary' }}
              />

              <Box
                component="button"
                type="submit"
                disabled={!comment.trim() || submitting}
                sx={{
                  background: 'none',
                  border: 'none',
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  p: 0,
                  transition: 'opacity .15s',
                  '&:disabled': { opacity: .35, cursor: 'not-allowed' },
                }}
              >
                {t.post.postBtn}
              </Box>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {showConfirmDelete && (
        <ConfirmModal
          message={t.post.deleteConfirm}
          onConfirm={handleDelete}
          onCancel={function () { setShowConfirmDelete(false) }}
        />
      )}

      {/* Form sửa caption */}
      <Dialog open={showEdit} onClose={function () { setShowEdit(false) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.75, pr: 1 }}>
          <Typography component="span" sx={{ fontSize: 15, fontWeight: 600 }}>{t.post.editCaption}</Typography>
          <IconButton size="small" onClick={function () { setShowEdit(false) }} aria-label={t.post.cancel}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleEdit}>
          <DialogContent dividers>
            <TextField
              value={editCaption}
              onChange={function (e) { setEditCaption(e.target.value) }}
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
            <Button variant="outline-secondary" onClick={function () { setShowEdit(false) }}>
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

      {showSaveCollection && (
        <SaveToCollectionModal
          targetId={post._id}
          targetType="post"
          isSaved={saved}
          onClose={function () { setShowSaveCollection(false) }}
          onSaved={function () {
            setSaved(true)
            // Báo cho trang cha (Profile) biết bài này giờ đã nằm trong mục đã lưu
            if (onSavedChange) onSavedChange(post._id, true)
          }}
        />
      )}

      {/* Chọn người cho điểm vừa bấm trên ảnh — đóng dialog là bỏ luôn điểm đó */}
      <PhotoTagPicker
        open={!!pendingPosition}
        onClose={function () { setPendingPosition(null) }}
        onSelect={handleSelectTagUser}
        excludeUserIds={tagsOfCurrentMedia.map(function (tag) { return tag.user?._id })}
      />
    </>
  )
}
