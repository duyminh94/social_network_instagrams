// components/story/StoryBar.jsx
// Thanh story ở đầu trang feed
// - Bubble đầu: story của mình + nút "+" để đăng tin mới
// - Các bubble sau: story gom theo user (1 bubble = 1 người, click xem tất cả story của họ)
// - StoryViewer là modal overlay — mở/đóng qua state, không navigate URL

import { useState, useRef, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { getStoryFeed, getMyStories, createStory } from '../../features/story/storyAPI'
import Avatar from '../common/Avatar'
import StoryViewer from './StoryViewer'
import Box from '@mui/material/Box'
import * as s from './storyStyles'

export default function StoryBar() {
  var { user } = useAuth()
  var myId = user?._id
  var queryClient = useQueryClient()
  var { t } = useLanguage()

  // State upload modal
  var [isUploadOpen, setIsUploadOpen] = useState(false)
  var [previewFile, setPreviewFile] = useState(null)
  var [allowComments, setAllowComments] = useState(true) // công tắc cho phép bình luận story
  var fileInputRef = useRef(null)
  // Lưu URL trước khi mở story để restore lại khi đóng
  var prevPathRef = useRef('/')

  // State xem story
  var [viewingStories, setViewingStories] = useState(null)
  var [viewingIndex, setViewingIndex] = useState(0)
  var [viewingGroups, setViewingGroups] = useState([])
  var [viewingGroupIndex, setViewingGroupIndex] = useState(0)

  // Theo dõi userId đã bấm xem — để hiện vòng ring xám "đã xem"
  var [viewedUserIds, setViewedUserIds] = useState(new Set())

  // Story của mình: server không ghi nhận lượt xem khi là chủ story, nên lưu
  // id story đã xem vào localStorage để vòng ring nhớ trạng thái xám qua reload
  var [seenOwnStoryIds, setSeenOwnStoryIds] = useState(function () {
    try {
      var saved = localStorage.getItem('seenOwnStoryIds')
      return new Set(saved ? JSON.parse(saved) : [])
    } catch {
      return new Set()
    }
  })

  var { data: feedData } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: function () { return getStoryFeed().then(function (r) { return r.data }) },
    enabled: !!myId,
    // staleTime: 0 → luôn fetch lại trạng thái seen mới nhất khi mount/quay lại trang,
    // tránh vòng ring kẹt ở data cũ (chưa xem) dù server đã ghi nhận lượt xem
    staleTime: 0,
    refetchOnMount: 'always',
  })

  var { data: myData } = useQuery({
    queryKey: ['stories', 'my', myId],
    queryFn: function () { return getMyStories(myId).then(function (r) { return r.data }) },
    enabled: !!myId,
  })

  var feedStories = useMemo(function () {
    return feedData?.stories || feedData || []
  }, [feedData])

  var myStories = useMemo(function () {
    return myData?.stories || myData || []
  }, [myData])

  // Story của mình coi là "đã xem" khi mọi story hiện có đều nằm trong danh sách
  // đã xem — đăng story mới (id mới) sẽ làm vòng có màu lại
  var myStorySeen = myStories.length > 0 && myStories.every(function (s) {
    return seenOwnStoryIds.has(s._id)
  })

  // Gom feedStories theo từng user — 1 bubble = 1 người dùng
  var groupedFeed = useMemo(function () {
    var groups = []
    var userIndexMap = {}
    feedStories.forEach(function (story) {
      var uid = story.user?._id
      if (!uid) return
      if (userIndexMap[uid] === undefined) {
        userIndexMap[uid] = groups.length
        groups.push({ user: story.user, stories: [story] })
      } else {
        groups[userIndexMap[uid]].stories.push(story)
      }
    })
    return groups
  }, [feedStories])

  var uploadMutation = useMutation({
    mutationFn: createStory,
    onSuccess: function (res) {
      toast.success(t.story.posted)

      var newStory = res?.data?.story
      if (newStory) {
        queryClient.setQueryData(['stories', 'my', myId], function (old) {
          var oldStories = old?.stories || old || []
          var storyWithUser = Object.assign({}, newStory, {
            user: newStory.user || user,
          })
          return { stories: [storyWithUser].concat(oldStories) }
        })
      }

      queryClient.invalidateQueries({ queryKey: ['stories'] })
      closeUploadModal()
    },
    onError: function () {
      toast.error(t.story.postFailed)
    },
  })

  function openFileSelector() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    var file = e.target.files[0]
    if (!file) return
    var url = URL.createObjectURL(file)
    var type = file.type.startsWith('video') ? 'video' : 'image'
    setPreviewFile({ url: url, type: type, raw: file })
    setIsUploadOpen(true)
    e.target.value = ''
  }

  function closeUploadModal() {
    setIsUploadOpen(false)
    setPreviewFile(null)
    setAllowComments(true) // reset về mặc định cho lần đăng sau
  }

  function handleUpload() {
    if (!previewFile || uploadMutation.isPending) return
    var formData = new FormData()
    formData.append('media', previewFile.raw)
    formData.append('allowComments', allowComments ? 'true' : 'false')
    uploadMutation.mutate(formData)
  }

  function openMyStory() {
    if (myStories.length === 0) {
      openFileSelector()
      return
    }
    // Đánh dấu tất cả story của mình là đã xem + lưu localStorage để nhớ qua reload
    var ids = myStories.map(function (s) { return s._id })
    setSeenOwnStoryIds(function (prev) {
      var next = new Set(prev)
      ids.forEach(function (id) { next.add(id) })
      try {
        localStorage.setItem('seenOwnStoryIds', JSON.stringify(Array.from(next)))
      } catch { /* localStorage đầy/bị chặn — bỏ qua */ }
      return next
    })
    prevPathRef.current = window.location.pathname
    if (user?.username) {
      window.history.replaceState(window.history.state, '', '/stories/' + user.username)
    }
    var groups = [{ user: user, stories: myStories }].concat(groupedFeed)
    setViewingStories(myStories)
    setViewingGroups(groups)
    setViewingGroupIndex(0)
    setViewingIndex(0)
  }

  function openFeedStoryGroup(group, groupIndex) {
    var uid = group.user?._id
    if (uid) {
      setViewedUserIds(function (prev) {
        var next = new Set(prev)
        next.add(uid)
        return next
      })
    }
    prevPathRef.current = window.location.pathname
    if (group.user?.username) {
      window.history.replaceState(window.history.state, '', '/stories/' + group.user.username)
    }
    setViewingStories(group.stories)
    setViewingGroups(groupedFeed)
    setViewingGroupIndex(groupIndex)
    setViewingIndex(0)
  }

  // Modal đóng — reset state + restore URL về trang trước
  var closeStoryViewer = useCallback(function () {
    setViewingStories(null)
    setViewingGroups([])
    setViewingGroupIndex(0)
    window.history.replaceState(window.history.state, '', prevPathRef.current || '/')
    prevPathRef.current = '/'
    // Refetch feed để vòng ring trên avatar bài viết cập nhật trạng thái đã xem
    queryClient.invalidateQueries({ queryKey: ['feed'] })
    // Refetch luôn story feed (['stories', 'feed']) để vòng ring story bar
    // lấy lại trạng thái seen thật từ server — nếu không, story đã xem vẫn còn vòng
    queryClient.invalidateQueries({ queryKey: ['stories'] })
  }, [queryClient])

  // Khi chuyển group — cập nhật URL + ring "đã xem"
  var handleStoryGroupChange = useCallback(function (group) {
    var uid = group?.user?._id
    if (uid) {
      setViewedUserIds(function (prev) {
        var next = new Set(prev)
        next.add(uid)
        return next
      })
    }
    if (group?.user?.username) {
      window.history.replaceState(window.history.state, '', '/stories/' + group.user.username)
    }
  }, [])

  if (!myId) return null

  return (
    <>
      <input
        type="file"
        accept="image/*,video/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Box sx={s.storyBar}>
        {/* Bubble của chính mình — luôn đứng đầu */}
        <Box sx={s.storyItem}>
          <Box sx={s.storyAvatarSlot}>
            <Box sx={s.myStoryWrapper} onClick={openMyStory}>
              <Avatar
                src={user?.avatarUrl}
                username={user?.username}
                size="lg"
                hasStory={myStories.length > 0}
                seenStory={myStorySeen}
              />
              <Box
                component="button"
                type="button"
                sx={s.addStoryBtn}
                onClick={function (e) { e.stopPropagation(); openFileSelector() }}
                title={t.story.addStory}
              >
                +
              </Box>
            </Box>
          </Box>
          <Box component="span" sx={s.storyName}>{t.story.myStory}</Box>
        </Box>

        {/* Feed stories — 1 bubble = 1 user */}
        {groupedFeed.map(function (group, i) {
          var isSeenFromServer = group.stories.every(function (story) {
            return story.seen
          })
          var isSeen = viewedUserIds.has(group.user?._id) || isSeenFromServer
          return (
            <Box
              key={group.user?._id || i}
              sx={s.storyItem}
              onClick={function () { openFeedStoryGroup(group, i) }}
            >
              <Box sx={s.storyAvatarSlot}>
                <Avatar
                  src={group.user?.avatarUrl}
                  username={group.user?.username}
                  size="lg"
                  hasStory
                  seenStory={isSeen}
                />
              </Box>
              <Box component="span" sx={s.storyName}>{group.user?.username}</Box>
            </Box>
          )
        })}
      </Box>

      {/* Upload modal */}
      {isUploadOpen && (
        <Box sx={s.uploadOverlay} onClick={closeUploadModal}>
          <Box sx={s.uploadModal} onClick={function (e) { e.stopPropagation() }}>
            <Box sx={s.uploadModalHeader}>
              <span>{t.story.createTitle}</span>
              <Box component="button" type="button" sx={s.uploadCloseBtn} onClick={closeUploadModal}>✕</Box>
            </Box>

            {previewFile && (
              <Box sx={s.uploadPreviewWrapper}>
                {previewFile.type === 'video' ? (
                  <Box component="video" src={previewFile.url} sx={s.uploadPreview} controls muted />
                ) : (
                  <Box component="img" src={previewFile.url} alt="preview" sx={s.uploadPreview} />
                )}
              </Box>
            )}

            <Box component="label" sx={s.allowCommentRow}>
              <input
                type="checkbox"
                checked={allowComments}
                onChange={function (e) { setAllowComments(e.target.checked) }}
              />
              <span>{t.story.allowComments}</span>
            </Box>

            <Box sx={s.uploadActions}>
              <Box component="button" type="button" sx={s.cancelBtn} onClick={closeUploadModal}>{t.story.cancel}</Box>
              <Box
                component="button"
                type="button"
                sx={s.submitBtn}
                onClick={handleUpload}
                disabled={!previewFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? t.story.posting : t.story.postBtn}
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {viewingStories !== null && (
        <StoryViewer
          stories={viewingStories}
          storyGroups={viewingGroups}
          initialGroupIndex={viewingGroupIndex}
          initialIndex={viewingIndex}
          onClose={closeStoryViewer}
          onGroupChange={handleStoryGroupChange}
        />
      )}
    </>
  )
}
