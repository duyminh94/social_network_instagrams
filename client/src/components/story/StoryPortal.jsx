// StoryPortal — lắng nghe event story:open từ bất kỳ trang nào, render StoryViewer modal
// Đặt trong MainLayout để luôn mount, không ảnh hưởng layout của trang khác

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import StoryViewer from './StoryViewer'

export default function StoryPortal() {
  var [modal, setModal] = useState(null) // { stories, user }
  var prevPathRef = useRef('/')
  var queryClient = useQueryClient()

  useEffect(function () {
    function handler(e) {
      var stories = e.detail?.stories
      var storyUser = e.detail?.user
      if (!stories || stories.length === 0) return
      prevPathRef.current = window.location.pathname
      if (storyUser?.username) {
        window.history.replaceState(window.history.state, '', '/stories/' + storyUser.username)
      }
      setModal({ stories: stories, user: storyUser })
    }
    window.addEventListener('story:open', handler)
    return function () { window.removeEventListener('story:open', handler) }
  }, [])

  var handleClose = useCallback(function () {
    setModal(null)
    window.history.replaceState(window.history.state, '', prevPathRef.current || '/')
    prevPathRef.current = '/'
    // Refetch feed để vòng ring trên avatar bài viết cập nhật trạng thái đã xem
    queryClient.invalidateQueries({ queryKey: ['feed'] })
  }, [queryClient])

  var handleGroupChange = useCallback(function () {}, [])

  if (!modal) return null

  return (
    <StoryViewer
      stories={modal.stories}
      storyGroups={[{ user: modal.user, stories: modal.stories }]}
      initialGroupIndex={0}
      initialIndex={0}
      onClose={handleClose}
      onGroupChange={handleGroupChange}
    />
  )
}
