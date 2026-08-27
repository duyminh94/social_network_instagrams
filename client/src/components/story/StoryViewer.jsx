// components/story/StoryViewer.jsx
// Xem story toàn màn hình — tự động chuyển sau 5 giây
//
// Ghi nhận lượt xem: khi story thay đổi và không phải của mình
//   → gọi getStory() (GET /api/stories/:id), server tự ghi nhận
//
// Tính năng chỉ dành cho chủ story:
//   - Nút xóa story (top-right) với confirm dialog inline (không dùng window.confirm)
//   - Thanh người xem ở cuối màn hình — dùng total từ API khi có
//   - Panel slide-up danh sách người đã xem

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../common/Avatar'
import Icon, { Wordmark } from '../common/Icon'
import ReportModal from '../common/ReportModal'
import { timeAgo } from '../../utils/formatTime'
import {
  getStory,
  deleteStory,
  getViewers,
  likeStory,
  unlikeStory,
  commentStory,
} from '../../features/story/storyAPI'
import Box from '@mui/material/Box'
import * as s from './storyStyles'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  )
}

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
      />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15 18-6-6 6-6"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 18 6-6-6-6"
      />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 2 11 13"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m22 2-7 20-4-9-9-4z"
      />
    </svg>
  )
}

export default function StoryViewer({
  stories: inputStories,
  storyGroups,
  initialGroupIndex,
  initialIndex,
  onClose,
  onGroupChange,
}) {
  var { user } = useAuth()
  var { t } = useLanguage()
  var myId = user?._id
  var queryClient = useQueryClient()

  var groups = useMemo(function () {
    if (storyGroups && storyGroups.length > 0) {
      return storyGroups
    }
    return [{ user: inputStories?.[0]?.user, stories: inputStories || [] }]
  }, [storyGroups, inputStories])

  var [groupIndex, setGroupIndex] = useState(initialGroupIndex || 0)
  var [current, setCurrent] = useState(initialIndex || 0)
  var [key, setKey] = useState(0)
  var [isViewersOpen, setIsViewersOpen] = useState(false)
  var [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  var [isPaused, setIsPaused] = useState(false)
  var [commentText, setCommentText] = useState('')
  var [isReportOpen, setIsReportOpen] = useState(false)
  var videoRef = useRef(null)
  var storyTimerRef = useRef(null)

  var activeGroup = useMemo(function () {
    return groups[groupIndex] || groups[0] || { stories: [] }
  }, [groups, groupIndex])
  var stories = activeGroup.stories || []
  var story = stories[current]
  var storyId = story?._id

  var closeViewer = useCallback(function () {
    onClose()
  }, [onClose])

  // Gọi chi tiết story để vừa ghi nhận lượt xem, vừa lấy count tim/comment mới nhất.
  var { data: storyDetailData } = useQuery({
    queryKey: ['story-detail', storyId],
    queryFn: function () { return getStory(storyId).then(function (r) { return r.data }) },
    enabled: !!storyId,
  })

  var detailStory = storyDetailData?.story || story

  // Xác định có phải story của chính mình không
  var storyOwnerId = detailStory?.user?._id || detailStory?.userId?._id
  var isOwn = !!myId && !!storyOwnerId && storyOwnerId.toString() === myId.toString()

  // useCallback cần thiết vì goNext/goPrev dùng trong useEffect deps
  // Nếu không dùng useCallback → hàm mới mỗi render → timer bị reset liên tục
  var goNext = useCallback(function () {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current)
      storyTimerRef.current = null
    }

    if (current < stories.length - 1) {
      setCurrent(function (c) { return c + 1 })
      setKey(function (k) { return k + 1 })
      setIsViewersOpen(false)
      setIsDeleteConfirmOpen(false)
    } else if (groupIndex < groups.length - 1) {
      // Hết story của user hiện tại thì chuyển sang user kế tiếp.
      setGroupIndex(function (g) { return g + 1 })
      setCurrent(0)
      setKey(function (k) { return k + 1 })
      setIsViewersOpen(false)
      setIsDeleteConfirmOpen(false)
    } else {
      closeViewer()
    }
  }, [current, stories.length, groupIndex, groups.length, closeViewer])

  var goPrev = useCallback(function () {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current)
      storyTimerRef.current = null
    }

    if (current > 0) {
      setCurrent(function (c) { return c - 1 })
      setKey(function (k) { return k + 1 })
      setIsViewersOpen(false)
      setIsDeleteConfirmOpen(false)
    } else if (groupIndex > 0) {
      var prevGroup = groups[groupIndex - 1]
      var prevStories = prevGroup?.stories || []
      setGroupIndex(function (g) { return g - 1 })
      setCurrent(prevStories.length > 0 ? prevStories.length - 1 : 0)
      setKey(function (k) { return k + 1 })
      setIsViewersOpen(false)
      setIsDeleteConfirmOpen(false)
    }
  }, [current, groupIndex, groups])

  // Tự động chuyển story sau 5 giây.
  // Khi pause thì không chạy timer, khi play lại thì timer bắt đầu lại cho dễ hiểu.
  useEffect(function () {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current)
      storyTimerRef.current = null
    }

    if (isPaused || !storyId) return

    // Chỉ giữ đúng 1 timer cho story hiện tại.
    // Nếu không clear timer cũ, story có thể tự nhảy liên tục khi render lại nhiều lần.
    storyTimerRef.current = setTimeout(function () {
      goNext()
    }, 5000)

    return function () {
      if (storyTimerRef.current) {
        clearTimeout(storyTimerRef.current)
        storyTimerRef.current = null
      }
    }
  }, [goNext, storyId, key, isPaused])

  useEffect(function () {
    return function () {
      if (storyTimerRef.current) {
        clearTimeout(storyTimerRef.current)
        storyTimerRef.current = null
      }
    }
  }, [])

  useEffect(function () {
    setIsPaused(false)
    setIsViewersOpen(false)
    setIsDeleteConfirmOpen(false)
    setCommentText('')
  }, [storyId])

  useEffect(function () {
    if (!activeGroup) return
    if (onGroupChange) {
      onGroupChange(activeGroup)
    }
  }, [groupIndex, activeGroup, onGroupChange])

  useEffect(function () {
    if (!videoRef.current) return

    if (isPaused) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(function () { })
    }
  }, [isPaused, storyId])

  // Nhấn Escape → đóng viewer
  useEffect(function () {
    function handleKey(e) {
      if (e.key === 'Escape') closeViewer()
    }
    window.addEventListener('keydown', handleKey)
    return function () { window.removeEventListener('keydown', handleKey) }
  }, [closeViewer])

  // Fetch danh sách người xem — chỉ khi panel mở và là chủ story
  var { data: viewersData } = useQuery({
    queryKey: ['story-viewers', storyId],
    queryFn: function () { return getViewers(storyId).then(function (r) { return r.data }) },
    enabled: isViewersOpen && isOwn && !!storyId,
  })

  var deleteMutation = useMutation({
    mutationFn: function () { return deleteStory(storyId) },
    onSuccess: function () {
      toast.success(t.story.deleted)
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      closeViewer()
    },
    onError: function () { toast.error(t.story.deleteFailed) },
  })

  // Đẩy tin nhắn story (reply HOẶC thả tim) vào cache chat để Message + MiniChat thấy ngay.
  // Dùng chung cho cả likeMutation và commentMutation. Unlike không có chatMessage → tự bỏ qua.
  function applyStoryChatResult(res) {
    var chatMessage = res?.data?.chatMessage
    var conversationItem = res?.data?.conversationItem
    if (!chatMessage && !conversationItem) return

    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['conversations-pending'] })

    if (conversationItem?.conversation?._id) {
      // Đưa conversation vừa có tin story lên đầu danh sách chat ngay lập tức.
      queryClient.setQueryData(['conversations'], function (old) {
        if (!old) return old
        var convId = String(conversationItem.conversation._id)
        var oldList = old.conversations || []
        var filtered = oldList.filter(function (item) {
          return String(item.conversation?._id || '') !== convId
        })
        return { ...old, conversations: [conversationItem].concat(filtered) }
      })
    }

    if (chatMessage?.conversationId) {
      queryClient.invalidateQueries({ queryKey: ['messages', String(chatMessage.conversationId)] })
    }
  }

  var likeMutation = useMutation({
    mutationFn: function () {
      if (detailStory?.isLiked) {
        return unlikeStory(storyId)
      }
      return likeStory(storyId)
    },
    onSuccess: function (res) {
      queryClient.invalidateQueries({ queryKey: ['story-detail', storyId] })
      // Thả tim cũng gửi vào chat giống reply (server trả chatMessage khi like mới)
      applyStoryChatResult(res)
    },
    onError: function () { toast.error(t.story.likeFailed) },
  })

  var commentMutation = useMutation({
    mutationFn: function (content) {
      return commentStory(storyId, content)
    },
    onSuccess: function (res) {
      setCommentText('')
      queryClient.invalidateQueries({ queryKey: ['story-comments', storyId] })
      queryClient.invalidateQueries({ queryKey: ['story-detail', storyId] })

      // Reply story được server lưu thành tin nhắn chat → đẩy vào cache chat (Message + MiniChat).
      applyStoryChatResult(res)

      toast.success(t.story.replySent)
    },
    onError: function () { toast.error(t.story.replyFailed) },
  })

  function handleViewerClick(e) {
    // Không chuyển story khi đang mở panel hoặc confirm
    if (isViewersOpen || isDeleteConfirmOpen) return
    var rect = e.currentTarget.getBoundingClientRect()
    if (e.clientX < rect.width / 2) {
      goPrev()
    } else {
      goNext()
    }
  }

  function handleTogglePause(e) {
    e.stopPropagation()

    if (isPaused) {
      // Logic đơn giản: play lại thì chạy lại thanh tiến trình từ đầu.
      setKey(function (k) { return k + 1 })
      setIsPaused(false)
    } else {
      if (storyTimerRef.current) {
        clearTimeout(storyTimerRef.current)
        storyTimerRef.current = null
      }
      setIsPaused(true)
    }
  }

  function handleLikeClick(e) {
    e.stopPropagation()
    if (likeMutation.isPending) return
    likeMutation.mutate()
  }

  function handleCommentSubmit(e) {
    e.preventDefault()
    e.stopPropagation()

    var content = commentText.trim()
    if (!content || commentMutation.isPending) return
    commentMutation.mutate(content)
  }

  function getStoryMediaUrl(item) {
    if (!item) return ''
    return item.mediaUrl || item.imageUrl || item.media?.url || ''
  }

  function renderSidePreview(group, direction) {
    if (!group) return null

    var item = group.stories?.[0]
    if (!item) return null
    var previewMediaUrl = getStoryMediaUrl(item)
    var previewUser = group.user || item.user || item.userId || {}
    return (
      <Box
        component="button"
        type="button"
        sx={s.storySidePreview(direction === 'left')}
        onClick={function (e) {
          e.stopPropagation()
          if (direction === 'left') {
            goPrev()
          } else {
            goNext()
          }
        }}
        title={direction === 'left' ? t.story.prevSide : t.story.nextSide}
      >
        {previewMediaUrl && (
          item.mediaType === 'video' ? (
            <Box component="video" src={previewMediaUrl} sx={s.storySideMedia} muted playsInline />
          ) : (
            <Box component="img" src={previewMediaUrl} alt="story preview" sx={s.storySideMedia} />
          )
        )}
        <Box sx={s.storySideShade} />
        <Box sx={s.storySideUser}>
          <Avatar
            src={previewUser.avatarUrl || previewUser.avatar}
            username={previewUser.username}
            size="sm"
          />
          <strong>{previewUser.username || 'user'}</strong>
          <span>{timeAgo(item.createdAt)}</span>
        </Box>
      </Box>
    )
  }

  if (!story) return null

  var mediaUrl = detailStory.mediaUrl || detailStory.imageUrl || detailStory.media?.url
  var viewers = viewersData?.viewers || []
  var prevGroup = groupIndex > 0 ? groups[groupIndex - 1] : null
  var nextGroup = groupIndex < groups.length - 1 ? groups[groupIndex + 1] : null
  var disablePrev = groupIndex === 0 && current === 0
  var disableNext = groupIndex >= groups.length - 1 && current >= stories.length - 1

  // Ưu tiên dùng total từ API khi đã fetch — chính xác hơn viewsCount từ story cũ
  var viewCount = (viewersData?.total != null) ? viewersData.total : (detailStory.viewsCount || 0)

  return (
    <Box sx={s.viewer} onClick={handleViewerClick}>
      <Box
        component="button"
        type="button"
        sx={s.viewerLogo}
        onClick={function (e) {
          e.stopPropagation()
          closeViewer()
        }}
        title="Đóng story"
      >
        <Wordmark size={28} color="#fff" accent="#ff6b58" />
      </Box>

      {renderSidePreview(prevGroup, 'left')}
      {renderSidePreview(nextGroup, 'right')}

      <Box
        component="button"
        type="button"
        sx={s.storyNav(true)}
        onClick={function (e) { e.stopPropagation(); goPrev() }}
        disabled={disablePrev}
        title={t.story.prevStory}
      >
        <ChevronLeftIcon />
      </Box>

      <Box
        component="button"
        type="button"
        sx={s.storyNav(false)}
        onClick={function (e) { e.stopPropagation(); goNext() }}
        disabled={disableNext}
        title={t.story.nextStory}
      >
        <ChevronRightIcon />
      </Box>

      {/* Nút đóng viewer */}
      <Box
        component="button"
        type="button"
        sx={s.closeBtn}
        onClick={function (e) { e.stopPropagation(); closeViewer() }}
      >
        ✕
      </Box>

      <Box sx={s.storyFrame}>
        {/* Thanh tiến trình */}
        <Box sx={s.progress}>
          {stories.map(function (_, i) {
            return (
              <Box key={i} sx={s.progressBar}>
                <Box
                  sx={s.progressFill}
                  style={{
                    width: i < current ? '100%' : i === current ? undefined : '0%',
                    animation: i === current ? undefined : 'none',
                    animationPlayState: i === current && isPaused ? 'paused' : 'running',
                  }}
                  key={i === current ? key : i}
                />
              </Box>
            )
          })}
        </Box>

        {/* Header: avatar + tên + thời gian */}
        <Box sx={s.viewerHeader}>
          <Link
            to={'/' + detailStory.user?.username}
            onClick={function (e) { e.stopPropagation(); closeViewer() }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <Avatar src={detailStory.user?.avatarUrl || detailStory.user?.avatar} username={detailStory.user?.username} size="sm" />
            <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{detailStory.user?.username}</span>
            {detailStory.user?.isTrusted && <Icon name="verified" size={14} />}
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{timeAgo(detailStory.createdAt)}</span>
        </Box>

        <Box
          component="button"
          type="button"
          sx={s.playStoryBtn}
          onClick={handleTogglePause}
          title={isPaused ? t.story.play : t.story.pause}
        >
          {isPaused ? <PlayIcon /> : <PauseIcon />}
        </Box>

        {/* Nút xóa — chỉ hiện khi xem story của chính mình */}
        {isOwn && (
          <Box
            component="button"
            type="button"
            sx={s.deleteStoryBtn}
            onClick={function (e) { e.stopPropagation(); setIsDeleteConfirmOpen(true) }}
            title={t.story.deleteBtn}
          >
            🗑
          </Box>
        )}

        {/* Ảnh / video */}
        {mediaUrl && (
          detailStory.mediaType === 'video' ? (
            <Box
              component="video"
              ref={videoRef}
              src={mediaUrl}
              sx={s.viewerMedia}
              autoPlay
              muted
              playsInline
              onClick={function (e) { e.stopPropagation() }}
            />
          ) : (
            <Box
              component="img"
              src={mediaUrl}
              alt="story"
              sx={s.viewerMedia}
              onClick={function (e) { e.stopPropagation() }}
            />
          )
        )}

        <Box sx={s.storyActions(isOwn)} onClick={function (e) { e.stopPropagation() }}>
          {detailStory.allowComments === false ? (
            <Box component="span" sx={s.commentsOffNote}>{t.story.commentsOff}</Box>
          ) : (
            <Box component="form" sx={s.storyCommentForm} onSubmit={handleCommentSubmit}>
              <Box
                component="input"
                sx={s.storyCommentInput}
                value={commentText}
                onChange={function (e) { setCommentText(e.target.value) }}
                onFocus={function () { setIsPaused(true) }}
                placeholder={t.story.replyPlaceholder}
                maxLength={500}
              />
            </Box>
          )}

          <Box
            component="button"
            type="button"
            sx={s.storyIconBtn(!!detailStory.isLiked)}
            onClick={handleLikeClick}
            disabled={likeMutation.isPending}
            title={t.story.likeBtn}
          >
            <HeartIcon filled={!!detailStory.isLiked} />
          </Box>

          {!isOwn && (
            <Box
              component="button"
              sx={s.storyIconBtn(false)}
              type="button"
              onClick={function () { setIsPaused(true); setIsReportOpen(true) }}
              title={t.common.report}
            >
              <Icon name="flag" size={23} />
            </Box>
          )}

          {detailStory.allowComments !== false && (
            <Box
              component="button"
              sx={s.storyIconBtn(false)}
              type="button"
              onClick={handleCommentSubmit}
              disabled={!commentText.trim() || commentMutation.isPending}
              title={t.story.sendReply}
            >
              <SendIcon />
            </Box>
          )}
        </Box>

        {/* Thanh người xem ở cuối — chỉ hiện khi xem story của mình */}
        {isOwn && (
          <Box
            sx={s.viewersBar}
            onClick={function (e) {
              e.stopPropagation()
              setIsViewersOpen(function (v) { return !v })
            }}
          >
            <span>👁</span>
            <span>{t.story.viewersLabel.replace('{count}', viewCount)}</span>
          </Box>
        )}

        {/* Panel danh sách người xem — slide up từ dưới */}
        {isOwn && isViewersOpen && (
          <Box sx={s.viewersPanel} onClick={function (e) { e.stopPropagation() }}>
            <Box sx={s.viewersPanelHeader}>
              <span>{t.story.viewersTitle.replace('{count}', viewCount)}</span>
              <Box
                component="button"
                type="button"
                sx={s.closePanelBtn}
                onClick={function () { setIsViewersOpen(false) }}
              >
                ✕
              </Box>
            </Box>

            {viewers.length === 0 ? (
              <Box sx={s.viewersEmpty}>{t.story.noViewers}</Box>
            ) : (
              viewers.map(function (v) {
                var viewerUser = v.viewerId || v.viewer
                return (
                  <Box key={v._id} sx={s.viewerRow}>
                    <Avatar
                      src={viewerUser?.avatarUrl}
                      username={viewerUser?.username}
                      size="sm"
                    />
                    <Box component="span" sx={s.viewerName}>{viewerUser?.username}</Box>
                  </Box>
                )
              })
            )}
          </Box>
        )}
        {isReportOpen && (
          <ReportModal
            targetId={storyId}
            targetType="story"
            onClose={function () { setIsReportOpen(false); setIsPaused(false) }}
          />
        )}

        {/* Confirm dialog xóa story — thay thế window.confirm */}
        {isOwn && isDeleteConfirmOpen && (
          <Box sx={s.confirmOverlay} onClick={function (e) { e.stopPropagation() }}>
            <Box sx={s.confirmDialog}>
              <Box component="p" sx={s.confirmText}>{t.story.deleteConfirm}</Box>
              <Box sx={s.confirmActions}>
                <Box
                  component="button"
                  type="button"
                  sx={s.confirmCancelBtn}
                  onClick={function () { setIsDeleteConfirmOpen(false) }}
                >
                  {t.story.cancel}
                </Box>
                <Box
                  component="button"
                  type="button"
                  sx={s.confirmDeleteBtn}
                  onClick={function () { setIsDeleteConfirmOpen(false); deleteMutation.mutate() }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? t.story.deleting : t.common.delete}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}
