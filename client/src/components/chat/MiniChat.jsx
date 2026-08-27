// components/chat/MiniChat.jsx
// Widget chat nhỏ góc dưới phải màn hình — giống Instagram web
//
// 4 trạng thái:
//   'collapsed' → pill button nhỏ (icon + "Tin nhắn" + avatar)
//   'list'      → panel danh sách conversation
//   'new'       → panel tạo tin nhắn mới (tìm kiếm user)
//   'chat'      → cửa sổ chat mini với conversation đã chọn

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import EmojiPicker from 'emoji-picker-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { getConversations, createConversation, getMessages, sendMessage, sendMediaMessage, deleteGroup } from '../../features/chat/chatAPI'
import api from '../../services/api'
import Avatar from '../common/Avatar'
import Box from '@mui/material/Box'
import * as s from './miniChatStyles'
import { ListSkeleton } from '../common/Skeletons'

// Hiện thời gian dạng "3 tuần", "2 ngày", "5 phút"
function timeAgo(dateStr) {
  if (!dateStr) return ''
  var diff = Date.now() - new Date(dateStr).getTime()
  var mins = Math.floor(diff / 60000)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return mins + ' phút'
  var hours = Math.floor(mins / 60)
  if (hours < 24) return hours + ' giờ'
  var days = Math.floor(hours / 24)
  if (days < 7) return days + ' ngày'
  var weeks = Math.floor(days / 7)
  if (weeks < 5) return weeks + ' tuần'
  return Math.floor(weeks / 4) + ' tháng'
}

// Icon gửi tin nhắn (paper plane)
function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

// Icon phóng to (fullscreen)
function FullscreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

// Icon X đóng
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Icon bút soạn tin nhắn mới
function ComposeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

// Icon mũi tên trái (back)
function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

// Icon ảnh/media
function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

// Icon emoji mặt cười
function EmojiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}

export default function MiniChat() {
  const { user } = useAuth()
  var { socket, onlineUsers } = useSocket() || {}
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  var myId = String(user?._id || user?.id || '')

  // Trạng thái hiển thị widget
  var [view, setView] = useState('collapsed')

  // State cho màn hình tạo tin nhắn mới
  var [searchQuery, setSearchQuery] = useState('')
  var [searchResults, setSearchResults] = useState([])
  var [selectedUsers, setSelectedUsers] = useState([])
  var [miniGroupName, setMiniGroupName] = useState('')
  var [isCreatingMiniConversation, setIsCreatingMiniConversation] = useState(false)

  // State cho màn hình chat mini
  var [activeMiniConv, setActiveMiniConv] = useState(null)
  var [miniMessages, setMiniMessages] = useState([])
  var [miniInput, setMiniInput] = useState('')
  var [showMiniEmoji, setShowMiniEmoji] = useState(false)
  var [miniSending, setMiniSending] = useState(false)

  var [isMiniTyping, setIsMiniTyping] = useState(false)
  var [miniReadBy, setMiniReadBy] = useState({})
  var [miniReplyTarget, setMiniReplyTarget] = useState(null)
  var [miniBlockState, setMiniBlockState] = useState({ isBlocked: false, iBlocked: false })

  // Refs
  var miniEndRef = useRef(null)
  var miniEmojiRef = useRef(null)
  var miniFileInputRef = useRef(null)
  var miniTypingTimeout = useRef(null)
  var miniLastTypingEmit = useRef(0)
  var activeMiniConvIdRef = useRef(null)
  var restoredRef = useRef(false)
  var [isUploadingMedia, setIsUploadingMedia] = useState(false)

  // Lắng nghe tin nhắn mới và trạng thái typing qua socket
  // Không guard bằng activeMiniConv — luôn đăng ký để cập nhật conversation list
  useEffect(function () {
    if (!socket) return

    function onReceiveMessage(msg) {
      // Luôn cập nhật sidebar list dù đang ở view nào
      queryClient.invalidateQueries({ queryKey: ['conversations'] })

      // Chỉ thêm vào messages khi đang mở đúng conversation đó
      if (activeMiniConv && String(msg.conversationId) === String(activeMiniConv._id)) {
        setMiniMessages(function (prev) {
          // Bỏ qua nếu đã có (tránh duplicate khi REST + socket echo)
          if (prev.some(function (m) { return String(m._id) === String(msg._id) })) return prev
          return [...prev, msg]
        })
        setIsMiniTyping(false)
        // Đánh dấu đã đọc khi nhận tin từ người khác
        var rcvSenderId = String(msg.senderId?._id || msg.senderId || '')
        if (rcvSenderId !== myId) {
          socket.emit('mark_read', { conversationId: activeMiniConv._id })
        }
      }
    }

    function onUserTyping(data) {
      if (!activeMiniConv) return
      if (String(data.conversationId) !== String(activeMiniConv._id)) return
      if (String(data.senderId) === myId) return
      setIsMiniTyping(data.isTyping)
    }

    // Khi người khác đọc tin → cập nhật readBy để hiện "Đã xem"
    function onMiniMessageRead(data) {
      if (!activeMiniConv) return
      if (String(data.conversationId) !== String(activeMiniConv._id)) return
      if (String(data.userId) === myId) return
      setMiniReadBy(function (prev) {
        var next = Object.assign({}, prev)
        next[data.userId] = data.readAt
        return next
      })
    }

    // Nhóm bị người tạo xóa → cập nhật list, đóng mini chat nếu đang mở nhóm đó
    function onMiniGroupDeleted(data) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (activeMiniConv && String(data.conversationId) === String(activeMiniConv._id)) {
        setActiveMiniConv(null)
        setMiniMessages([])
        setView('list')
        toast('Nhóm đã bị người tạo xóa')
      }
    }

    function onMessageError(data) {
      toast.error(data?.message || 'Không thể gửi tin nhắn')
    }

    socket.on('receive_message', onReceiveMessage)
    socket.on('user_typing', onUserTyping)
    socket.on('message_read', onMiniMessageRead)
    socket.on('group_deleted', onMiniGroupDeleted)
    socket.on('message_error', onMessageError)
    return function () {
      socket.off('receive_message', onReceiveMessage)
      socket.off('user_typing', onUserTyping)
      socket.off('message_read', onMiniMessageRead)
      socket.off('group_deleted', onMiniGroupDeleted)
      socket.off('message_error', onMessageError)
    }
  }, [socket, activeMiniConv, myId, queryClient])

  // Không hiện widget khi đang ở trang chat đầy đủ
  var isOnChatPage = location.pathname.startsWith('/chat')

  // Lấy danh sách conversation
  var { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: function () { return getConversations().then(function (r) { return r.data }) },
    enabled: !!user,
  })

  // Normalize conversations — cùng pattern với Chat.jsx
  var conversations = useMemo(function () {
    return (convsData?.conversations || []).map(function (item) {
      return {
        _id: item.conversation._id,
        type: item.conversation.type,
        name: item.conversation.name || '',
        avatarUrl: item.conversation.avatarUrl || null,
        createdBy: item.conversation.createdBy || null,
        lastActivityAt: item.conversation.lastActivityAt,
        members: item.members || [],
        lastMessage: item.lastMessage || null,
        isUnread: item.isUnread || false,
      }
    })
  }, [convsData])

  // Lấy participant còn lại (không phải mình)
  var getOtherParticipant = useCallback(function (conv) {
    var members = conv.members || []
    var other = members.find(function (m) {
      return String(m.userId?._id || '') !== myId
    })
    return other?.userId || null
  }, [myId])

  // Restore conversation từ chat lớn: khi conversations load lần đầu,
  // nếu user vừa navigate ra từ /chat/:id thì tự mở lại đúng cuộc chat đó
  useEffect(function () {
    if (restoredRef.current) return
    if (conversations.length === 0) return
    if (view !== 'collapsed') return
    var lastId = sessionStorage.getItem('chat:lastConvId')
    if (!lastId) return
    var conv = conversations.find(function (c) { return String(c._id) === lastId })
    if (!conv) return
    restoredRef.current = true
    handleConvClick(conv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations])

  // Avatar 2 người gần nhất hiển thị trên pill collapsed
  var recentAvatars = useMemo(function () {
    return conversations.slice(0, 2).map(function (conv) {
      if (conv.type === 'group') return { src: conv.avatarUrl, name: conv.name }
      var other = getOtherParticipant(conv)
      return { src: other?.avatarUrl, name: other?.username || '' }
    })
  }, [conversations, getOtherParticipant])

  // Tìm kiếm user khi đang ở màn 'new'
  var searchUsers = useCallback(function (q) {
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    api.get('/users/search', { params: { q } })
      .then(function (res) {
        var users = res.data?.users || res.data || []
        setSearchResults(users.filter(function (u) { return String(u._id) !== myId }))
      })
      .catch(function () { setSearchResults([]) })
  }, [myId])

  useEffect(function () {
    if (view !== 'new') return
    var t = setTimeout(function () { searchUsers(searchQuery) }, 400)
    return function () { clearTimeout(t) }
  }, [searchQuery, view, searchUsers])

  // Gợi ý: lấy từ danh sách conversation partners khi chưa có query
  var suggestions = useMemo(function () {
    if (searchQuery.trim()) return searchResults
    return conversations.slice(0, 6).map(function (conv) {
      if (conv.type === 'group') return null
      return getOtherParticipant(conv)
    }).filter(Boolean)
  }, [searchQuery, searchResults, conversations, getOtherParticipant])

  // Scroll xuống cuối khi có tin nhắn mới
  useEffect(function () {
    if (view === 'chat' && miniEndRef.current) {
      miniEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [miniMessages, view])

  // Click-outside để đóng emoji picker
  useEffect(function () {
    if (!showMiniEmoji) return
    function handleClickOutside(e) {
      if (miniEmojiRef.current && !miniEmojiRef.current.contains(e.target)) {
        setShowMiniEmoji(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return function () { document.removeEventListener('mousedown', handleClickOutside) }
  }, [showMiniEmoji])

  // Helper: lấy preview text của tin nhắn (dùng cho reply)
  function getMiniMsgPreview(msg) {
    if (!msg) return ''
    if (msg.messageType === 'image') return '[Hình ảnh]'
    if (msg.messageType === 'video') return '[Video]'
    return msg.content || ''
  }

  // Helper: lấy tên người gửi (dùng cho reply label)
  function getMiniSenderName(msg) {
    var senderId = String(msg?.senderId?._id || msg?.senderId || '')
    if (senderId === myId) return 'Bạn'
    return msg?.senderId?.fullName || msg?.senderId?.username || 'Người dùng'
  }

  // Mở chat mini của một conversation
  async function handleConvClick(conv) {
    var requestedConvId = String(conv._id)
    activeMiniConvIdRef.current = requestedConvId
    setActiveMiniConv(conv)
    setMiniMessages([])
    setMiniInput('')
    setShowMiniEmoji(false)
    setIsMiniTyping(false)
    setMiniReadBy({})
    setMiniBlockState({ isBlocked: false, iBlocked: false })
    setMiniReplyTarget(null)
    clearTimeout(miniTypingTimeout.current)
    miniLastTypingEmit.current = 0
    setView('chat')
    try {
      var res = await getMessages(conv._id)
      if (activeMiniConvIdRef.current !== requestedConvId) {
        return
      }
      var msgs = res.data?.messages || []
      // API trả về mới nhất trước → đảo lại để hiện đúng thứ tự
      setMiniMessages([...msgs].reverse())
      // Lấy trạng thái đã xem từ backend (getMessages đã cập nhật lastSeenAt cho mình)
      setMiniReadBy(res.data?.readBy || {})
      // Trạng thái chặn → hiện "bức màn" khóa nhắn tin
      setMiniBlockState({ isBlocked: !!res.data?.isBlocked, iBlocked: !!res.data?.iBlocked })
      // Đánh dấu đã đọc khi mở conversation
      if (socket) {
        socket.emit('mark_read', { conversationId: conv._id })
      }
    } catch {
      if (activeMiniConvIdRef.current === requestedConvId) {
        setMiniMessages([])
      }
    }
  }

  // Bỏ chặn ngay từ "bức màn" trong MiniChat → mở lại khung nhập tin
  async function handleMiniUnblock() {
    var other = activeMiniConv ? getOtherParticipant(activeMiniConv) : null
    if (!other?._id) return
    try {
      await api.delete('/block/' + other._id)
      setMiniBlockState({ isBlocked: false, iBlocked: false })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('Đã bỏ chặn')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bỏ chặn thất bại')
    }
  }

  function handleMiniInputChange(e) {
    setMiniInput(e.target.value)
    if (socket && activeMiniConv) {
      var now = Date.now()
      if (now - miniLastTypingEmit.current > 2000) {
        socket.emit('typing', { conversationId: activeMiniConv._id })
        miniLastTypingEmit.current = now
      }
      clearTimeout(miniTypingTimeout.current)
      miniTypingTimeout.current = setTimeout(function () {
        socket.emit('stop_typing', { conversationId: activeMiniConv._id })
      }, 2000)
    }
  }

  // Gửi tin nhắn trong mini chat
  async function handleMiniSend(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!miniInput.trim() || !activeMiniConv || miniSending) return
    var content = miniInput.trim()
    setMiniInput('')
    setShowMiniEmoji(false)
    setMiniSending(true)
    if (socket) {
      socket.emit('stop_typing', { conversationId: activeMiniConv._id })
      clearTimeout(miniTypingTimeout.current)
    }

    // Ưu tiên socket để server echo receive_message về và UI tự append realtime.
    // REST sendMessage chỉ lưu DB, không emit socket nên mini chat sẽ phải reload mới thấy.
    if (socket && socket.connected) {
      socket.emit('send_message', {
        conversationId: activeMiniConv._id,
        content: content,
        replyToId: miniReplyTarget?._id || null,
      })
      setMiniReplyTarget(null)
      setMiniSending(false)
      return
    }

    try {
      var res = await sendMessage(activeMiniConv._id, content, 'text')
      var newMsg = res.data?.data || res.data
      if (newMsg?._id) {
        setMiniMessages(function (prev) {
          if (prev.some(function (m) { return m._id === newMsg._id })) return prev
          return [...prev, newMsg]
        })
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    } catch {
      // thất bại → không làm gì
    }
    setMiniSending(false)
  }

  function handleMiniEmojiClick(emojiData) {
    setMiniInput(function (prev) { return prev + emojiData.emoji })
    setShowMiniEmoji(false)
  }

  async function handleMiniFileSelect(e) {
    var file = e.target.files[0]
    if (!file || !activeMiniConv) return
    var sendingConvId = String(activeMiniConv._id)
    e.target.value = ''
    if (file.size > 100 * 1024 * 1024) return
    var formData = new FormData()
    formData.append('file', file)
    setIsUploadingMedia(true)
    try {
      var res = await sendMediaMessage(activeMiniConv._id, formData)
      var newMsg = res.data?.data || res.data
      if (newMsg?._id) {
        setMiniMessages(function (prev) {
          if (activeMiniConvIdRef.current !== sendingConvId) return prev
          if (prev.some(function (m) { return String(m._id) === String(newMsg._id) })) return prev
          return [...prev, newMsg]
        })
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    } catch {
      // thất bại → không làm gì
    }
    setIsUploadingMedia(false)
  }

  // Tạo conversation hoặc mở nếu đã có → mở mini chat
  async function handleStartChat() {
    if (selectedUsers.length === 0 || isCreatingMiniConversation) return
    setIsCreatingMiniConversation(true)
    try {
      var payload = selectedUsers.length === 1
        ? { type: 'direct', targetUserId: selectedUsers[0]._id }
        : {
            type: 'group',
            name: buildMiniGroupName(selectedUsers),
            memberIds: selectedUsers.map(function (item) { return item._id }),
          }

      var res = await createConversation(payload)
      var conv = res.data?.conversation || res.data
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      // Normalize conv để dùng với handleConvClick
      var normalizedConv = {
        _id: conv._id,
        type: conv.type,
        name: conv.name || payload.name || '',
        avatarUrl: conv.avatarUrl || null,
        lastActivityAt: conv.lastActivityAt,
        // createConversation chỉ trả conversation, không trả members.
        // Dựng tạm members để mini chat không hiện "Unknown" trước khi refetch xong.
        members: conv.members || [{ userId: user }].concat(selectedUsers.map(function (item) {
          return { userId: item }
        })),
        lastMessage: null,
      }
      resetNewMiniChat()
      await handleConvClick(normalizedConv)
    } catch {
      navigate('/chat')
    } finally {
      setIsCreatingMiniConversation(false)
    }
  }

  function toggleUser(u) {
    setSelectedUsers(function (prev) {
      var exists = prev.some(function (item) {
        return String(item._id) === String(u._id)
      })
      if (exists) {
        return prev.filter(function (item) {
          return String(item._id) !== String(u._id)
        })
      }
      return prev.concat(u)
    })
  }

  function buildMiniGroupName(users) {
    var explicitName = miniGroupName.trim()
    if (explicitName) return explicitName

    return users
      .map(function (item) { return item.fullName || item.username })
      .filter(Boolean)
      .slice(0, 4)
      .join(', ') || 'Nhóm'
  }

  function resetNewMiniChat() {
    setSelectedUsers([])
    setMiniGroupName('')
    setSearchQuery('')
    setSearchResults([])
  }

  function openList() {
    setView('list')
  }

  function openNew() {
    resetNewMiniChat()
    setView('new')
  }

  function close() {
    setView('collapsed')
    setActiveMiniConv(null)
    setMiniMessages([])
    setMiniInput('')
    setShowMiniEmoji(false)
    resetNewMiniChat()
  }

  // Người tạo nhóm xóa cả nhóm — xác nhận đơn giản bằng window.confirm
  async function handleMiniDeleteGroup() {
    if (!activeMiniConv) return
    var ok = window.confirm('Xóa nhóm này? Toàn bộ tin nhắn sẽ bị xóa cho tất cả thành viên.')
    if (!ok) return
    var deletedId = activeMiniConv._id
    try {
      await deleteGroup(deletedId)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.removeQueries({ queryKey: ['messages', deletedId] })
      setActiveMiniConv(null)
      setMiniMessages([])
      setView('list')
      toast.success('Đã xóa nhóm')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xóa nhóm thất bại')
    }
  }

  // ── RENDER ──

  // Không hiện trên trang /chat (đặt sau hết hooks để không vi phạm Rules of Hooks)
  if (isOnChatPage) return null

  // Trạng thái collapsed: pill button
  if (view === 'collapsed') {
    return (
      <Box sx={s.wrapper}>
        <Box component="button" type="button" sx={s.pill} onClick={openList}>
          <SendIcon />
          <Box component="span" sx={s.pillText}>Tin nhắn</Box>
          {recentAvatars.length > 0 && (
            <Box sx={s.pillAvatars}>
              {recentAvatars.map(function (a, i) {
                return (
                  <Box key={i} sx={s.pillAvatar} style={{ zIndex: recentAvatars.length - i }}>
                    <Avatar src={a.src} username={a.name} size="sm" />
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>
      </Box>
    )
  }

  // Trạng thái 'chat': cửa sổ chat mini
  if (view === 'chat' && activeMiniConv) {
    var conv = activeMiniConv
    var isGroup = conv.type === 'group'
    // Chỉ người tạo nhóm mới thấy nút xóa nhóm
    var isGroupCreator = isGroup && String(conv.createdBy || '') === myId
    var other = getOtherParticipant(conv)
    var displayName = isGroup ? (conv.name || 'Nhóm') : (other?.fullName || other?.username || 'Unknown')
    var avatarSrc = isGroup ? conv.avatarUrl : other?.avatarUrl

    // Tìm tin nhắn cuối cùng do mình gửi để hiện "Đã xem"
    var miniLastMyMsgIdx = -1
    for (var j = miniMessages.length - 1; j >= 0; j--) {
      if (String(miniMessages[j].senderId?._id || miniMessages[j].senderId) === myId) {
        miniLastMyMsgIdx = j
        break
      }
    }
    var miniLastMyMsg = miniLastMyMsgIdx >= 0 ? miniMessages[miniLastMyMsgIdx] : null
    var miniHasReaders = !!(miniLastMyMsg && Object.entries(miniReadBy).some(function (entry) {
      var uid = entry[0]
      var readAt = entry[1]
      return uid !== myId && new Date(readAt) >= new Date(miniLastMyMsg.createdAt)
    }))

    return (
      <Box sx={s.wrapper}>
        <Box sx={s.panel}>
          {/* Header */}
          <Box sx={s.panelHeader}>
            <Box component="button" type="button" sx={s.iconBtn(false)} onClick={openList}>
              <BackIcon />
            </Box>
            {!isGroup ? (
              <Box component={Link} to={`/${other?.username}`} sx={s.chatHeaderInfo}>
                <Avatar
                  src={avatarSrc}
                  username={displayName}
                  size="sm"
                  isOnline={!isGroup && !!onlineUsers?.has(String(other?._id || ''))}
                />
                <Box component="span" sx={s.panelTitle}>{displayName}</Box>
              </Box>
            ) : (
              <Box sx={s.chatHeaderInfo}>
                <Avatar
                  src={avatarSrc}
                  username={displayName}
                  size="sm"
                  isOnline={!isGroup && !!onlineUsers?.has(String(other?._id || ''))}
                />
                <Box component="span" sx={s.panelTitle}>{displayName}</Box>
              </Box>
            )}
            <Box sx={s.headerActions}>
              {isGroupCreator && (
                <Box
                  component="button"
                  type="button"
                  sx={s.iconBtn(false)}
                  title="Xóa nhóm"
                  onClick={handleMiniDeleteGroup}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </Box>
              )}
              <Box
                component="button"
                type="button"
                sx={s.iconBtn(false)}
                title="Mở trang chat đầy đủ"
                onClick={function () { navigate('/chat/' + conv._id) }}
              >
                <FullscreenIcon />
              </Box>
              <Box component="button" type="button" sx={s.iconBtn(false)} onClick={close}>
                <CloseIcon />
              </Box>
            </Box>
          </Box>

          {/* Khu vực tin nhắn */}
          <Box sx={s.miniMessages}>
            {miniMessages.map(function (msg, idx) {
              var isMine = String(msg.senderId?._id || msg.senderId) === myId
              var senderId = String(msg.senderId?._id || msg.senderId || '')
              var isMedia = msg.messageType === 'image' || msg.messageType === 'video'

              // Avatar logic: chỉ hiện avatar ở tin nhắn cuối cùng của một "cụm" cùng người gửi
              var nextMsg = miniMessages[idx + 1]
              var nextSenderId = String(nextMsg?.senderId?._id || nextMsg?.senderId || '')
              var isLastInGroup = !nextMsg || nextSenderId !== senderId

              var senderInfo = msg.senderId?.username
                ? msg.senderId
                : activeMiniConv?.members?.find(function (m) {
                    return String(m.userId?._id || '') === senderId
                  })?.userId

              return (
                <Box key={msg._id} sx={s.miniRow(isMine)}>
                  {!isMine && (
                    isLastInGroup
                      ? <Box sx={s.miniAvatarSlot}><Avatar src={senderInfo?.avatarUrl} username={senderInfo?.username} size="sm" /></Box>
                      : <Box sx={s.miniAvatarGap} />
                  )}
                  {/* Nút Reply — hiện khi hover, bên trái với tin mình, bên phải với tin người khác */}
                  {isMine && (
                    <Box
                      component="button"
                      type="button"
                      className="miniReplyBtn"
                      sx={s.miniReplyBtn}
                      onClick={function () { setMiniReplyTarget(msg); setShowMiniEmoji(false) }}
                      title="Trả lời"
                    >↩</Box>
                  )}
                  <Box sx={s.miniBubbleWrap(isMine)}>
                    <Box sx={s.miniBubble(isMine, isMedia)}>
                      {/* Preview tin nhắn đang được reply */}
                      {msg.replyToId && (
                        <Box sx={s.miniReplyPreview(isMine)}>
                          <span>{getMiniMsgPreview(msg.replyToId)}</span>
                        </Box>
                      )}
                      {msg.storyMediaUrl && (
                        <Box sx={s.miniStoryReplyPreview}>
                          {msg.storyMediaType === 'video' ? (
                            <Box component="video" src={msg.storyMediaUrl} sx={s.miniStoryReplyMedia} muted />
                          ) : (
                            <Box component="img" src={msg.storyMediaUrl} alt="" sx={s.miniStoryReplyMedia} />
                          )}
                        </Box>
                      )}
                      {msg.messageType === 'image' ? (
                        <Box component="img" src={msg.content} alt="" sx={s.miniMsgImage} />
                      ) : msg.messageType === 'video' ? (
                        <Box component="video" src={msg.content} controls sx={s.miniMsgVideo} />
                      ) : (
                        msg.content
                      )}
                    </Box>
                    {isMine && idx === miniLastMyMsgIdx && miniHasReaders && (
                      <Box sx={s.miniReadReceipt}>Đã xem</Box>
                    )}
                  </Box>
                  {!isMine && (
                    <Box
                      component="button"
                      type="button"
                      className="miniReplyBtn"
                      sx={s.miniReplyBtn}
                      onClick={function () { setMiniReplyTarget(msg); setShowMiniEmoji(false) }}
                      title="Trả lời"
                    >↩</Box>
                  )}
                </Box>
              )
            })}
            {isMiniTyping && (
              <Box sx={s.miniRow(false)}>
                <Box sx={s.miniTypingBubble}>
                  <Box component="span" sx={s.miniTypingDot(0)} />
                  <Box component="span" sx={s.miniTypingDot(1)} />
                  <Box component="span" sx={s.miniTypingDot(2)} />
                </Box>
              </Box>
            )}
            <div ref={miniEndRef} />
          </Box>

          {/* Input bar + emoji + file */}
          <Box sx={s.miniInputWrap}>
            {/* Reply composer — hiện khi đang reply một tin nhắn */}
            {miniReplyTarget && (
              <Box sx={s.miniReplyComposer}>
                <Box sx={s.miniReplyComposerText}>
                  <strong>Trả lời {getMiniSenderName(miniReplyTarget)}</strong>
                  <span>{getMiniMsgPreview(miniReplyTarget)}</span>
                </Box>
                <Box
                  component="button"
                  type="button"
                  sx={s.miniReplyCancelBtn}
                  onClick={function () { setMiniReplyTarget(null) }}
                >×</Box>
              </Box>
            )}
            <input
              type="file"
              ref={miniFileInputRef}
              style={{ display: 'none' }}
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
              onChange={handleMiniFileSelect}
            />
            {showMiniEmoji && (
              <Box sx={s.miniEmojiWrap} ref={miniEmojiRef}>
                <EmojiPicker
                  theme="dark"
                  width={300}
                  height={340}
                  previewConfig={{ showPreview: false }}
                  onEmojiClick={handleMiniEmojiClick}
                />
              </Box>
            )}
            {miniBlockState.isBlocked ? (
              <Box sx={{ py: 1.75, px: 2, textAlign: 'center' }}>
                <Box component="p" sx={{ fontWeight: 600, color: 'text.primary', m: 0, mb: .5, fontSize: 13 }}>
                  {miniBlockState.iBlocked ? 'Bạn đã chặn người dùng này' : 'Bạn không thể nhắn tin cho người dùng này'}
                </Box>
                <Box component="p" sx={{ color: 'text.secondary', fontSize: 12, m: 0, mb: 1.25, lineHeight: 1.4 }}>
                  Các bạn sẽ không thể nhắn tin cho nhau trong đoạn chat này.
                </Box>
                {miniBlockState.iBlocked && (
                  <Box
                    component="button"
                    type="button"
                    onClick={handleMiniUnblock}
                    sx={{
                      width: '100%',
                      p: 1.125,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Bỏ chặn
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={s.miniInputBar}>
                <Box
                  component="button"
                  type="button"
                  sx={s.iconBtn(showMiniEmoji)}
                  onClick={function () { setShowMiniEmoji(function (v) { return !v }) }}
                >
                  <EmojiIcon />
                </Box>
                <Box component="form" sx={s.miniInputForm} onSubmit={handleMiniSend}>
                  <Box
                    component="input"
                    sx={s.miniInput}
                    placeholder="Nhắn tin..."
                    value={miniInput}
                    onChange={handleMiniInputChange}
                  />
                </Box>
                <Box
                  component="button"
                  type="button"
                  sx={s.iconBtn(false)}
                  onClick={function () { miniFileInputRef.current?.click() }}
                  disabled={isUploadingMedia}
                  title="Gửi ảnh/video"
                >
                  <ImageIcon />
                </Box>
                <Box
                  component="button"
                  type="button"
                  sx={s.miniSendBtn}
                  onClick={handleMiniSend}
                  disabled={!miniInput.trim() || miniSending}
                >
                  <SendIcon />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    )
  }

  // Trạng thái 'new': màn hình tạo tin nhắn mới
  if (view === 'new') {
    return (
      <Box sx={s.wrapper}>
        <Box sx={s.panel}>
          {/* Header */}
          <Box sx={s.panelHeader}>
            <Box component="button" type="button" sx={s.iconBtn(false)} onClick={function () { setView('list') }}>
              <BackIcon />
            </Box>
            <Box component="span" sx={s.panelTitle}>New message</Box>
            <Box component="button" type="button" sx={s.iconBtn(false)} onClick={close}>
              <CloseIcon />
            </Box>
          </Box>

          {/* Ô "Tới:" + user đã chọn */}
          <Box sx={s.toRow}>
            <Box component="span" sx={s.toLabel}>Tới:</Box>
            {selectedUsers.map(function (selectedUser) {
              return (
                <Box key={selectedUser._id} sx={s.selectedChip}>
                  <span>{selectedUser.fullName || selectedUser.username}</span>
                  <Box
                    component="button"
                    type="button"
                    sx={s.chipRemove}
                    onClick={function () { toggleUser(selectedUser) }}
                  >×</Box>
                </Box>
              )
            })}
            <Box
              component="input"
              sx={s.toInput}
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={function (e) { setSearchQuery(e.target.value) }}
              autoFocus
            />
          </Box>

          {selectedUsers.length > 1 && (
            <Box sx={s.groupNameRow}>
              <Box
                component="input"
                sx={s.groupNameInput}
                placeholder="Tên nhóm (không bắt buộc)"
                value={miniGroupName}
                onChange={function (e) { setMiniGroupName(e.target.value) }}
              />
            </Box>
          )}

          {/* Danh sách gợi ý */}
          <Box sx={s.suggestionList}>
            {!searchQuery.trim() && (
              <Box sx={s.suggestionLabel}>Gợi ý</Box>
            )}
            {suggestions.map(function (u) {
              var isSelected = selectedUsers.some(function (item) {
                return String(item._id) === String(u._id)
              })
              return (
                <Box
                  key={u._id}
                  sx={s.suggestionItem}
                  onClick={function () { toggleUser(u) }}
                >
                  <Avatar src={u.avatarUrl} username={u.username} size="md" />
                  <Box sx={s.suggestionInfo}>
                    <Box sx={s.suggestionName}>{u.fullName || u.username}</Box>
                    <Box sx={s.suggestionUsername}>{u.username}</Box>
                  </Box>
                  <Box sx={s.checkbox(isSelected)}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>

          {/* Nút Chat */}
          <Box sx={s.chatBtnWrap}>
            <Box
              component="button"
              type="button"
              sx={s.chatBtn}
              disabled={selectedUsers.length === 0 || isCreatingMiniConversation}
              onClick={handleStartChat}
            >
              {isCreatingMiniConversation ? 'Đang tạo...' : selectedUsers.length > 1 ? 'Tạo nhóm' : 'Chat'}
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  // Trạng thái 'list': danh sách conversation
  return (
    <Box sx={s.wrapper}>
      <Box sx={s.panel}>
        {/* Header */}
        <Box sx={s.panelHeader}>
          <Box component="span" sx={s.panelTitle}>Tin nhắn</Box>
          <Box sx={s.headerActions}>
            <Box
              component="button"
              type="button"
              sx={s.iconBtn(false)}
              title="Mở trang chat"
              onClick={function () { navigate('/chat') }}
            >
              <FullscreenIcon />
            </Box>
            <Box component="button" type="button" sx={s.iconBtn(false)} onClick={close}>
              <CloseIcon />
            </Box>
          </Box>
        </Box>

        {/* Danh sách conversation */}
        <Box sx={s.convList}>
          {/* Đang tải thì hiện khung xương — trước đây hiện thẳng "Chưa có tin nhắn nào",
              gây hiểu nhầm là không có hội thoại nào trong khi thực ra chưa tải xong */}
          {convsLoading && <ListSkeleton count={4} avatarSize={40} />}

          {!convsLoading && conversations.length === 0 && (
            <Box sx={s.emptyMsg}>Chưa có tin nhắn nào</Box>
          )}
          {conversations.map(function (conv) {
            var isGroup = conv.type === 'group'
            var other = getOtherParticipant(conv)
            var displayName = isGroup ? (conv.name || 'Nhóm') : (other?.fullName || other?.username || 'Unknown')
            var avatarSrc = isGroup ? conv.avatarUrl : other?.avatarUrl
            var lastMsg = conv.lastMessage
            var unread = conv.isUnread && activeMiniConv?._id !== conv._id
            // "Bạn:" chỉ hiện khi tin cuối do mình gửi
            var lastSenderId = String(lastMsg?.senderId?._id || lastMsg?.senderId || '')
            var isMineMsg = lastSenderId === myId
            var preview = !lastMsg ? 'Bắt đầu trò chuyện'
              : lastMsg.messageType === 'image' ? (isMineMsg ? 'Bạn: [Hình ảnh]' : '[Hình ảnh]')
              : lastMsg.messageType === 'video' ? (isMineMsg ? 'Bạn: [Video]' : '[Video]')
              : (isMineMsg ? 'Bạn: ' + lastMsg.content : lastMsg.content)
            var timeStr = timeAgo(conv.lastActivityAt || lastMsg?.createdAt)

            return (
              <Box
                key={conv._id}
                sx={s.convItem(unread)}
                onClick={function () { handleConvClick(conv) }}
              >
                <Avatar src={avatarSrc} username={displayName} size="md" isOnline={!isGroup && !!onlineUsers?.has(String(other?._id || ''))} />
                <Box sx={s.convInfo}>
                  <Box sx={s.convName(unread)}>{displayName}</Box>
                  <Box sx={s.convPreview(unread)}>
                    <Box component="span" className="previewText">{preview}</Box>
                    {timeStr && <Box component="span" className="previewDot"> · {timeStr}</Box>}
                  </Box>
                </Box>
                {unread && <Box component="span" sx={s.unreadDot} />}
              </Box>
            )
          })}
        </Box>

        {/* Nút soạn tin nhắn mới */}
        <Box component="button" type="button" sx={s.composeBtn} onClick={openNew}>
          <ComposeIcon />
        </Box>
      </Box>
    </Box>
  )
}
