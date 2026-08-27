// pages/chat/Chat.jsx
// Trang nhắn tin: danh sách conversation + cửa sổ chat
//
// Luồng dữ liệu:
//   Backend getConversations → [{ conversation, members, lastMessage }]
//   → normalize về flat { _id, type, members, lastMessage, ... }
//
// Pending conversations:
//   Khi A nhắn B mà B chưa follow A → B thấy conversation trong "Tin nhắn đang chờ"
//   B có thể Chấp nhận (→ chuyển sang Tin nhắn) hoặc Xóa (→ xóa conversation)
//
// Duplicate message: server emit receive_message cho TẤT CẢ thành viên kể cả người gửi
//   → KHÔNG optimistic update, chỉ rely vào socket echo
// Message order: backend sort createdAt: -1 → client reverse để hiển thị cũ → mới

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import EmojiPicker from 'emoji-picker-react'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  getConversations,
  getPendingConversations,
  getMessages,
  createConversation,
  sendMediaMessage,
  acceptConversation,
  declineConversation,
  deleteConversation,
  removeMemberFromConversation,
  deleteGroup,
} from '../../features/chat/chatAPI'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import styles from './Chat.module.css'

// ── Icon components ──

function TypingIndicator() {
  return (
    <div className={styles.typing}>
      <div className={styles.typingDot} />
      <div className={styles.typingDot} />
      <div className={styles.typingDot} />
    </div>
  )
}

function ComposeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82A16 16 0 0 0 14 16l.82-.82a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function EmojiIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

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

// ── Helper: normalize item từ backend thành flat object ──
function normalizeConvItem(item) {
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
}

export default function Chat() {
  var { id: paramId } = useParams()
  var { user } = useAuth()
  var { socket, onlineUsers } = useSocket() || {}
  var { t } = useLanguage()
  var navigate = useNavigate()
  var queryClient = useQueryClient()

  var [activeConvId, setActiveConvId] = useState(paramId || null)
  var [messages, setMessages] = useState([])
  var [input, setInput] = useState('')
  var [isTyping, setIsTyping] = useState(false)
  var [showNewConv, setShowNewConv] = useState(false)
  var [showPending, setShowPending] = useState(false)
  var [newConvSearch, setNewConvSearch] = useState('')
  var [newConvUsers, setNewConvUsers] = useState([])
  var [newConvSelectedUsers, setNewConvSelectedUsers] = useState([])
  var [newGroupName, setNewGroupName] = useState('')
  var [isCreatingConversation, setIsCreatingConversation] = useState(false)
  var [sidebarSearch, setSidebarSearch] = useState('')
  var [searchPeople, setSearchPeople] = useState([])
  var [isAccepting, setIsAccepting] = useState(false)
  var [isDeclining, setIsDeclining] = useState(false)
  var [showEmojiPicker, setShowEmojiPicker] = useState(false)
  var [isUploadingMedia, setIsUploadingMedia] = useState(false)
  var [readBy, setReadBy] = useState({})
  var [blockState, setBlockState] = useState({ isBlocked: false, iBlocked: false })
  var [showDetails, setShowDetails] = useState(false)
  var [mutedMap, setMutedMap] = useState({})
  var [nicknameMap, setNicknameMap] = useState({})
  var [nicknameStorageReady, setNicknameStorageReady] = useState(false)
  var [isBlocking, setIsBlocking] = useState(false)
  var [isReporting, setIsReporting] = useState(false)
  var [isDeletingChat, setIsDeletingChat] = useState(false)
  var [isKickingMember, setIsKickingMember] = useState(false)
  var [confirmType, setConfirmType] = useState('')
  var [kickMember, setKickMember] = useState(null)
  var [replyTarget, setReplyTarget] = useState(null)
  var messagesEndRef = useRef(null)
  var typingTimeout = useRef(null)
  var lastTypingEmit = useRef(0)
  var emojiPickerRef = useRef(null)
  var fileInputRef = useRef(null)
  var activeConvIdRef = useRef(activeConvId)

  useEffect(function () {
    activeConvIdRef.current = activeConvId
    // Ghi lại để mini chat tự restore khi navigate về trang khác
    if (activeConvId) {
      sessionStorage.setItem('chat:lastConvId', activeConvId)
    }
  }, [activeConvId])

  // Sync activeConvId khi URL thay đổi (back/forward browser, link trực tiếp)
  useEffect(function () {
    var nextConvId = paramId || null
    if (String(activeConvIdRef.current || '') === String(nextConvId || '')) {
      return
    }

    setActiveConvId(nextConvId)
    setMessages([])
    setInput('')
    setIsTyping(false)
    setReadBy({})
    setReplyTarget(null)
  }, [paramId])

  var myId = String(user?._id || user?.id || '')

  useEffect(function () {
    if (!myId) return
    setNicknameStorageReady(false)
    try {
      var saved = window.localStorage.getItem('chatNicknames:' + myId)
      setNicknameMap(saved ? JSON.parse(saved) : {})
    } catch {
      setNicknameMap({})
    }
    setNicknameStorageReady(true)
  }, [myId])

  useEffect(function () {
    if (!myId || !nicknameStorageReady) return
    window.localStorage.setItem('chatNicknames:' + myId, JSON.stringify(nicknameMap))
  }, [nicknameMap, myId, nicknameStorageReady])

  // ── Query conversations (accepted) ──
  var { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: function () { return getConversations().then(function (r) { return r.data }) },
  })

  // ── Query pending conversations ──
  var { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['conversations-pending'],
    queryFn: function () { return getPendingConversations().then(function (r) { return r.data }) },
  })

  var conversations = useMemo(function () {
    return (convsData?.conversations || []).map(normalizeConvItem)
  }, [convsData])

  var pendingConversations = useMemo(function () {
    return (pendingData?.conversations || []).map(normalizeConvItem)
  }, [pendingData])

  var pendingCount = pendingConversations.length

  // Lọc conversation theo search
  var filteredConversations = useMemo(function () {
    if (!sidebarSearch.trim()) return conversations
    var q = sidebarSearch.toLowerCase()
    return conversations.filter(function (conv) {
      if (conv.type === 'group') return (conv.name || '').toLowerCase().includes(q)
      var other = getOtherParticipant(conv)
      return (other?.username || '').toLowerCase().includes(q) || (other?.fullName || '').toLowerCase().includes(q)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, sidebarSearch, myId])

  // Ô tìm kiếm trên cùng cũng tìm NGƯỜI MỚI để nhắn tin (không cần mở "soạn tin mới").
  // Debounce 400ms gọi /users/search; ô rỗng thì xoá kết quả.
  useEffect(function () {
    var q = sidebarSearch.trim()
    if (!q) { setSearchPeople([]); return }
    var timer = setTimeout(function () {
      api.get('/users/search', { params: { q: q } })
        .then(function (res) { setSearchPeople(res.data?.users || res.data || []) })
        .catch(function () { setSearchPeople([]) })
    }, 400)
    return function () { clearTimeout(timer) }
  }, [sidebarSearch])

  // Người mới hiện ở mục "Nhắn tin tới": bỏ chính mình + người đã có chat 1-1
  // (những người đó đã nằm trong danh sách cuộc trò chuyện phía trên).
  var searchNewPeople = useMemo(function () {
    if (!sidebarSearch.trim()) return []
    var existingPartnerIds = {}
    conversations.forEach(function (conv) {
      if (conv.type !== 'group') {
        var other = getOtherParticipant(conv)
        if (other?._id) existingPartnerIds[String(other._id)] = true
      }
    })
    return searchPeople.filter(function (u) {
      return String(u._id) !== myId && !existingPartnerIds[String(u._id)]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPeople, conversations, sidebarSearch, myId])

  // ── Query tin nhắn của conversation đang mở ──
  var { data: msgData, isLoading: msgLoading } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: function () {
      var requestedConvId = activeConvId
      return getMessages(requestedConvId).then(function (r) {
        return {
          ...r.data,
          conversationId: requestedConvId,
        }
      })
    },
    // Không fetch cho pending conversation — backend chặn 403, tránh request thừa
    // Guard pendingLoading: tránh fetch khi list chưa tải xong mà URL trỏ thẳng vào pending chat
    enabled: !!activeConvId && !pendingLoading && !pendingConversations.some(function (c) { return String(c._id) === String(activeConvId) }),
  })

  // Reset typing + readBy khi chuyển conversation; các ref không cần trigger re-render
  useEffect(function () {
    setIsTyping(false)
    setReadBy({})
    setBlockState({ isBlocked: false, iBlocked: false })
    setShowDetails(false)
    clearTimeout(typingTimeout.current)
    lastTypingEmit.current = 0
  }, [activeConvId])

  useEffect(function () {
    if (msgData) {
      if (String(msgData.conversationId || '') !== String(activeConvId || '')) {
        return
      }
      var msgs = msgData?.messages || msgData || []
      setMessages(Array.isArray(msgs) ? [...msgs].reverse() : [])
      setReadBy(msgData?.readBy || {})
      setBlockState({ isBlocked: !!msgData.isBlocked, iBlocked: !!msgData.iBlocked })
      setReplyTarget(null)
    }
  }, [msgData, activeConvId])

  useEffect(function () {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Socket realtime events ──
  //
  // Tại sao dùng useEffect ở đây?
  //   useEffect chạy mỗi khi socket hoặc activeConvId thay đổi.
  //   Mỗi lần chạy: huỷ listener cũ (return cleanup), đăng ký listener mới.
  //   Đảm bảo handler luôn capture đúng activeConvId hiện tại — tránh stale closure.
  //
  // Dependency array [socket, activeConvId, myId, queryClient, navigate]:
  //   Nếu thiếu activeConvId → handler cũ sẽ dùng giá trị cũ → tin nhắn gán nhầm conversation.
  useEffect(function () {
    if (!socket) return

    // ── Nhận tin nhắn mới ──
    // Server emit 'receive_message' cho TẤT CẢ thành viên, kể cả người vừa gửi (echo).
    // → Đây là nguồn truth duy nhất, không dùng optimistic update để tránh duplicate.
    function onReceiveMessage(msg) {
      var msgConvId = String(msg.conversationId || '')
      var msgSenderId = String(msg.senderId?._id || msg.senderId || '')

      // Chỉ append vào state khi tin thuộc conversation đang mở
      if (msgConvId === String(activeConvId || '')) {
        setMessages(function (prev) {
          // Guard duplicate: socket reconnect hoặc server emit đôi → bỏ qua nếu _id đã có
          if (prev.some(function (m) { return String(m._id) === String(msg._id) })) {
            return prev
          }
          return [...prev, msg]
        })

        // Đánh dấu đã đọc chỉ khi tin từ NGƯỜI KHÁC gửi
        // Nếu tự mark_read echo của mình → server lại emit message_read về → Bob thấy "Đã xem" giả
        if (msgSenderId !== myId) {
          socket.emit('mark_read', { conversationId: activeConvId })
        }

        // Xoá trạng thái unread ngay trong cache (không đợi invalidate xong)
        // Giúp sidebar đổi từ bold → normal ngay khi mở đúng conversation
        queryClient.setQueryData(['conversations'], function (old) {
          if (!old) return old
          return {
            ...old,
            conversations: (old.conversations || []).map(function (item) {
              if (String(item.conversation._id) === msgConvId) {
                return { ...item, isUnread: false }
              }
              return item
            }),
          }
        })
      }

      // Luôn refresh sidebar dù đang mở conversation nào
      // → cập nhật preview text + thứ tự conversation list
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-pending'] })
    }

    // ── Trạng thái đang gõ ──
    // Server forward event từ người gõ sang tất cả thành viên khác.
    // Chỉ set isTyping khi: đúng conversation đang mở VÀ không phải chính mình đang gõ.
    function onUserTyping(data) {
      var sameConv = String(data.conversationId) === String(activeConvId || '')
      var notMe = String(data.senderId) !== myId
      if (sameConv && notMe) {
        setIsTyping(data.isTyping) // true → hiện "...", false → ẩn
      }
    }

    // ── Tin nhắn bị xóa ──
    // Server emit sau khi đánh dấu isDeleted = true trong DB.
    // Client lọc khỏi state ngay lập tức mà không cần re-fetch.
    function onDeleteMessage(data) {
      if (String(data.conversationId) === String(activeConvId || '')) {
        setMessages(function (prev) {
          return prev.filter(function (m) { return String(m._id) !== String(data.messageId) })
        })
        setReplyTarget(function (currentValue) {
          if (String(currentValue?._id || '') === String(data.messageId)) {
            return null
          }
          return currentValue
        })
      }
    }

    // ── Nhóm cập nhật (tên, avatar, thêm/xóa thành viên, đổi role) ──
    // Không cần parse payload — chỉ cần invalidate để React Query fetch lại.
    function onConversationUpdated() {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }

    // ── Bị xóa khỏi nhóm ──
    // Server emit riêng cho người bị kick/rời để client biết đóng cửa sổ.
    // Khác onConversationUpdated: người bị kick không còn trong danh sách members.
    function onMemberRemoved(data) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (String(data.conversationId) === String(activeConvId || '')) {
        setActiveConvId(null)
        setMessages([])
        navigate('/chat')
        toast(t.chat.kickedFromGroup)
      }
    }

    // ── Nhóm bị người tạo xóa ──
    // Server emit cho mọi thành viên: xóa khỏi danh sách, đóng cửa sổ nếu đang mở.
    function onGroupDeleted(data) {
      var deletedId = String(data.conversationId || '')
      queryClient.setQueryData(['conversations'], function (old) {
        if (!old) return old
        return {
          ...old,
          conversations: (old.conversations || []).filter(function (item) {
            return String(item.conversation?._id || item._id || '') !== deletedId
          }),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.removeQueries({ queryKey: ['messages', deletedId] })
      if (deletedId === String(activeConvId || '')) {
        setActiveConvId(null)
        setMessages([])
        setShowDetails(false)
        navigate('/chat')
        toast(t.chat.groupDeletedNotice)
      }
    }

    // ── Người khác đã đọc tin nhắn ──
    // Server emit sau khi nhận mark_read từ người đọc.
    // payload: { userId, conversationId, readAt }
    // → Cập nhật readBy để tính lại hasReaders → hiện/ẩn "Đã xem" dưới tin cuối
    function onMessageRead(data) {
      var sameConv = String(data.conversationId) === String(activeConvId || '')
      var notMe = String(data.userId) !== myId
      if (sameConv && notMe) {
        setReadBy(function (prev) {
          var next = Object.assign({}, prev)
          next[data.userId] = data.readAt
          return next
        })
      }
    }

    // Đăng ký tất cả listener
    function onMessageError(data) {
      toast.error(data?.message || 'Không thể gửi tin nhắn')
    }

    socket.on('receive_message', onReceiveMessage)
    socket.on('user_typing', onUserTyping)
    socket.on('delete_message', onDeleteMessage)
    socket.on('conversation_updated', onConversationUpdated)
    socket.on('member_removed', onMemberRemoved)
    socket.on('group_deleted', onGroupDeleted)
    socket.on('message_read', onMessageRead)
    socket.on('message_error', onMessageError)

    // Cleanup: bắt buộc phải huỷ listener cũ khi component unmount hoặc dependency đổi
    // Nếu không có cleanup → mỗi lần activeConvId đổi sẽ tích lũy thêm listener → memory leak
    return function () {
      socket.off('receive_message', onReceiveMessage)
      socket.off('user_typing', onUserTyping)
      socket.off('delete_message', onDeleteMessage)
      socket.off('conversation_updated', onConversationUpdated)
      socket.off('member_removed', onMemberRemoved)
      socket.off('group_deleted', onGroupDeleted)
      socket.off('message_read', onMessageRead)
      socket.off('message_error', onMessageError)
    }
  }, [socket, activeConvId, myId, queryClient, navigate, t.chat.kickedFromGroup, t.chat.groupDeletedNotice])

  // Emit mark_read mỗi khi mở conversation mới (chưa xử lý trong onReceiveMessage)
  // Ví dụ: B đang offline, A gửi tin, B mở lại trang → query getMessages đã cập nhật lastSeenAt,
  // nhưng cần emit socket để A nhận được message_read event và hiện "Đã xem" realtime.
  // Guard pendingLoading: không emit khi list pending chưa load xong → tránh mark_read nhầm pending
  useEffect(function () {
    var isPending = pendingConversations.some(function (c) { return String(c._id) === String(activeConvId) })
    if (socket && activeConvId && !pendingLoading && !isPending) {
      socket.emit('mark_read', { conversationId: activeConvId })
    }
  }, [socket, activeConvId, pendingConversations, pendingLoading])

  // ── Handlers ──

  // Gửi tin nhắn qua socket (không qua REST để nhận echo realtime ngay)
  // Server lưu DB → emit receive_message cho TẤT CẢ thành viên kể cả người gửi
  // → onReceiveMessage sẽ append vào state → tin hiện trên màn hình
  function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !activeConvId || !socket) return

    socket.emit('send_message', {
      conversationId: activeConvId,
      content: input.trim(),
      replyToId: replyTarget?._id || null,
    })
    setInput('')
    setReplyTarget(null)

    // Dừng typing ngay khi gửi — tránh "..." còn hiện ở phía người nhận
    socket.emit('stop_typing', { conversationId: activeConvId })
    clearTimeout(typingTimeout.current)
  }

  function handleInputChange(e) {
    setInput(e.target.value)

    if (!socket || !activeConvId) return

    var now = Date.now()

    // Throttle emit 'typing': tối đa 1 lần mỗi 2 giây
    // Nếu không throttle → mỗi ký tự gõ = 1 socket event → server bị flood
    if (now - lastTypingEmit.current > 2000) {
      socket.emit('typing', { conversationId: activeConvId })
      lastTypingEmit.current = now
    }

    // Tự động emit stop_typing sau 2 giây không gõ thêm
    // clearTimeout trước để reset đồng hồ nếu user vẫn tiếp tục gõ
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(function () {
      socket.emit('stop_typing', { conversationId: activeConvId })
    }, 2000)
  }

  function handleEmojiClick(emojiData) {
    setInput(function (prev) { return prev + emojiData.emoji })
    setShowEmojiPicker(false)
  }

  async function handleFileSelect(e) {
    var file = e.target.files[0]
    if (!file || !activeConvId) return
    e.target.value = ''
    if (file.size > 100 * 1024 * 1024) {
      toast.error(t.chat.fileTooLarge)
      return
    }
    var formData = new FormData()
    formData.append('file', file)
    setIsUploadingMedia(true)
    try {
      await sendMediaMessage(activeConvId, formData)
      // Server emit socket receive_message → onReceiveMessage tự thêm vào state
    } catch {
      toast.error(t.chat.sendFileFailed)
    }
    setIsUploadingMedia(false)
  }

  // Đóng picker khi click ra ngoài
  useEffect(function () {
    if (!showEmojiPicker) return
    function handleClickOutside(e) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return function () { document.removeEventListener('mousedown', handleClickOutside) }
  }, [showEmojiPicker])

  function handleSelectConv(conv) {
    var isSameConversation = String(activeConvId || '') === String(conv._id || '')

    setShowNewConv(false)

    if (isSameConversation) {
      // Đang mở đúng chat này rồi thì không reset messages.
      // Nếu reset ở đây, queryKey không đổi nên React Query không nạp lại → direct hiện profile, group bị trống.
      return
    }

    setActiveConvId(conv._id)
    navigate('/chat/' + conv._id)
    setMessages([])
    setInput('')
    setReplyTarget(null)
    // Cập nhật cache ngay lập tức để conversation không hiện lại màu trắng chưa đọc
    // sau khi chuyển sang conversation khác
    queryClient.setQueryData(['conversations'], function (old) {
      if (!old) return old
      return {
        ...old,
        conversations: (old.conversations || []).map(function (item) {
          if (String(item.conversation._id) === String(conv._id)) {
            return { ...item, isUnread: false }
          }
          return item
        }),
      }
    })
  }

  function handleSelectPending(conv) {
    if (String(activeConvId || '') === String(conv._id || '')) {
      return
    }
    setActiveConvId(conv._id)
    setMessages([])
    setInput('')
    setReplyTarget(null)
  }

  async function handleAccept() {
    if (!activeConvId || isAccepting) return
    setIsAccepting(true)
    try {
      await acceptConversation(activeConvId)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-pending'] })
      setShowPending(false)
      navigate('/chat/' + activeConvId)
      toast.success(t.chat.acceptedMessage)
    } catch {
      toast.error(t.chat.acceptError)
    } finally {
      setIsAccepting(false)
    }
  }

  async function handleDecline() {
    if (!activeConvId || isDeclining) return
    setIsDeclining(true)
    try {
      await declineConversation(activeConvId)
      queryClient.invalidateQueries({ queryKey: ['conversations-pending'] })
      setActiveConvId(null)
      toast.success(t.chat.declinedMessage)
    } catch {
      toast.error(t.chat.declineError)
    } finally {
      setIsDeclining(false)
    }
  }

  var searchNewUsers = useCallback(function (q) {
    if (!q) { setNewConvUsers([]); return }
    api.get('/users/search', { params: { q } })
      .then(function (res) { setNewConvUsers(res.data?.users || res.data || []) })
      .catch(function () { setNewConvUsers([]) })
  }, [])

  useEffect(function () {
    var t = setTimeout(function () { searchNewUsers(newConvSearch) }, 400)
    return function () { clearTimeout(t) }
  }, [newConvSearch, searchNewUsers])

  function resetNewConversationPanel() {
    setShowNewConv(false)
    setNewConvSearch('')
    setNewConvUsers([])
    setNewConvSelectedUsers([])
    setNewGroupName('')
  }

  function toggleNewConversationUser(nextUser) {
    setNewConvSelectedUsers(function (prev) {
      var exists = prev.some(function (item) {
        return String(item._id) === String(nextUser._id)
      })
      if (exists) {
        return prev.filter(function (item) {
          return String(item._id) !== String(nextUser._id)
        })
      }
      return prev.concat(nextUser)
    })
  }

  function buildGroupName(selectedUsers) {
    var explicitName = newGroupName.trim()
    if (explicitName) return explicitName

    return selectedUsers
      .map(function (item) { return item.fullName || item.username })
      .filter(Boolean)
      .slice(0, 4)
      .join(', ') || t.chat.groupFallback
  }

  async function startConversation(userId, targetUserOverride) {
    try {
      var res = await createConversation({ type: 'direct', targetUserId: userId })
      var conv = res.data?.conversation || res.data
      var targetUser = targetUserOverride || newConvUsers.find(function (u) { return String(u._id) === String(userId) })
      var normalizedConv = {
        conversation: conv,
        members: conv.members || [
          { userId: user },
          { userId: targetUser || { _id: userId } },
        ],
        lastMessage: conv.lastMessage || null,
        isUnread: false,
      }
      queryClient.setQueryData(['conversations'], function (old) {
        if (!old) return old
        var exists = (old.conversations || []).some(function (item) {
          return String(item.conversation?._id || item._id || '') === String(conv._id)
        })
        if (exists) return old
        return {
          ...old,
          conversations: [normalizedConv].concat(old.conversations || []),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setActiveConvId(conv._id)
      navigate('/chat/' + conv._id)
      resetNewConversationPanel()
    } catch {
      toast.error(t.chat.createError)
    }
  }

  async function startSelectedConversation() {
    if (newConvSelectedUsers.length === 0 || isCreatingConversation) return

    setIsCreatingConversation(true)
    try {
      if (newConvSelectedUsers.length === 1) {
        await startConversation(newConvSelectedUsers[0]._id, newConvSelectedUsers[0])
        return
      }

      var res = await createConversation({
        type: 'group',
        name: buildGroupName(newConvSelectedUsers),
        memberIds: newConvSelectedUsers.map(function (item) { return item._id }),
      })
      var conv = res.data?.conversation || res.data
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setActiveConvId(conv._id)
      navigate('/chat/' + conv._id)
      resetNewConversationPanel()
    } catch (err) {
      toast.error(err.response?.data?.message || t.chat.createError)
    } finally {
      setIsCreatingConversation(false)
    }
  }

  function getOtherParticipant(conv) {
    var members = conv.members || []
    var other = members.find(function (m) {
      return String(m.userId?._id || '') !== myId
    })
    return other?.userId || null
  }

  function getMessageSenderName(msg) {
    var senderId = String(msg?.senderId?._id || msg?.senderId || '')
    if (senderId === myId) return t.chat.you

    var senderUser = msg?.senderId?.username
      ? msg.senderId
      : activeConv?.members?.find(function (member) {
          return String(member.userId?._id || member.userId || '') === senderId
        })?.userId

    return senderUser?.fullName || senderUser?.username || t.chat.unknownUser
  }

  function getMessagePreview(msg) {
    if (!msg) return ''
    if (msg.messageType === 'image') return t.chat.imagePreview
    if (msg.messageType === 'video') return t.chat.videoPreview
    if (msg.messageType === 'post') return '[Bài viết]'
    if (msg.messageType === 'system') return msg.content || ''
    return msg.content || ''
  }

  function handleReplyMessage(msg) {
    if (!msg || msg.messageType === 'system') return
    setReplyTarget(msg)
    setShowEmojiPicker(false)
  }

  // Active conversation có thể nằm trong accepted hoặc pending list
  var activeConv = conversations.find(function (c) { return String(c._id) === String(activeConvId) })
    || pendingConversations.find(function (c) { return String(c._id) === String(activeConvId) })
    || null

  var isPendingConv = !!pendingConversations.find(function (c) { return String(c._id) === String(activeConvId) })

  var activeOther = activeConv ? getOtherParticipant(activeConv) : null
  var activeIsGroup = activeConv?.type === 'group'
  var baseActiveDisplayName = activeIsGroup
    ? (activeConv?.name || t.chat.groupFallback)
    : (activeOther?.fullName || activeOther?.username || 'Chat')
  var activeDisplayName = nicknameMap[String(activeConvId || '')] || baseActiveDisplayName
  var detailMembers = activeConv?.members || []
  var isMuted = !!mutedMap[String(activeConvId || '')]
  var myGroupMember = detailMembers.find(function (member) {
    return String(member.userId?._id || member.userId || '') === myId
  })
  var isGroupAdmin = activeIsGroup && myGroupMember?.role === 'admin'
  // Người tạo nhóm (createdBy) — chỉ người này mới có quyền xóa cả nhóm
  var isGroupCreator = activeIsGroup && String(activeConv?.createdBy || '') === myId

  function handleToggleMute() {
    if (!activeConvId) return
    setMutedMap(function (prev) {
      var next = Object.assign({}, prev)
      next[String(activeConvId)] = !next[String(activeConvId)]
      return next
    })
  }

  function handleNickname() {
    if (!activeConvId) return
    var nextName = window.prompt(t.chat.enterNickname, nicknameMap[String(activeConvId)] || baseActiveDisplayName)
    if (nextName === null) return
    setNicknameMap(function (prev) {
      var next = Object.assign({}, prev)
      if (nextName.trim()) {
        next[String(activeConvId)] = nextName.trim()
      } else {
        delete next[String(activeConvId)]
      }
      return next
    })
  }

  function handleBlockUser() {
    if (!activeOther?._id || isBlocking) return
    setConfirmType('block')
  }

  async function doBlockUser() {
    setIsBlocking(true)
    try {
      await api.post('/block/' + activeOther._id)
      // Ở lại trong đoạn chat và hiện "bức màn" khóa nhắn tin (không rời đi như trước)
      setBlockState({ isBlocked: true, iBlocked: true })
      setShowDetails(false)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] })
      toast.success(t.chat.blockedUser)
    } catch {
      toast.error(t.chat.blockError)
    } finally {
      setIsBlocking(false)
    }
  }

  // Bỏ chặn ngay từ "bức màn" trong đoạn chat → mở lại khung nhập tin
  async function handleUnblockFromChat() {
    if (!activeOther?._id) return
    try {
      await api.delete('/block/' + activeOther._id)
      setBlockState({ isBlocked: false, iBlocked: false })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] })
      toast.success(t.chat.unblockedUser)
    } catch (err) {
      toast.error(err?.response?.data?.message || t.chat.unblockFailed)
    }
  }

  function handleReportUser() {
    if (!activeOther?._id || isReporting) return
    setConfirmType('report')
  }

  async function doReportUser() {
    setIsReporting(true)
    try {
      await api.post('/reports', {
        targetId: activeOther._id,
        targetType: 'user',
        reason: 'harassment',
        description: 'Báo cáo từ chức năng chat',
      })
      toast.success(t.chat.reportedUser)
    } catch (err) {
      toast.error(err?.response?.data?.message || t.chat.reportError)
    } finally {
      setIsReporting(false)
    }
  }

  function handleDeleteChat() {
    if (!activeConvId || isDeletingChat) return
    setConfirmType('deleteChat')
  }

  async function doDeleteChat() {
    var deletedConvId = activeConvId
    setIsDeletingChat(true)
    try {
      var res = await deleteConversation(deletedConvId)
      queryClient.setQueryData(['conversations'], function (old) {
        if (!old) return old
        return {
          ...old,
          conversations: (old.conversations || []).filter(function (item) {
            return String(item.conversation?._id || item._id || '') !== String(deletedConvId)
          }),
        }
      })
      queryClient.setQueryData(['conversations-pending'], function (old) {
        if (!old) return old
        return {
          ...old,
          conversations: (old.conversations || []).filter(function (item) {
            return String(item.conversation?._id || item._id || '') !== String(deletedConvId)
          }),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-pending'] })
      queryClient.removeQueries({ queryKey: ['messages', deletedConvId] })
      setNicknameMap(function (prev) {
        var next = Object.assign({}, prev)
        delete next[String(deletedConvId)]
        return next
      })
      setMutedMap(function (prev) {
        var next = Object.assign({}, prev)
        delete next[String(deletedConvId)]
        return next
      })
      setActiveConvId(null)
      setMessages([])
      setShowDetails(false)
      navigate('/chat')
      toast.success(res.data?.message || t.chat.deletedChat)
    } catch (err) {
      toast.error(err?.response?.data?.message || t.chat.deleteChatError)
    } finally {
      setIsDeletingChat(false)
    }
  }

  function handleLeaveGroup() {
    if (!activeConvId || isDeletingChat) return
    setConfirmType('leaveGroup')
  }

  async function doLeaveGroup() {
    var deletedConvId = activeConvId
    setIsDeletingChat(true)
    try {
      var res = await removeMemberFromConversation(deletedConvId, myId)
      queryClient.setQueryData(['conversations'], function (old) {
        if (!old) return old
        return {
          ...old,
          conversations: (old.conversations || []).filter(function (item) {
            return String(item.conversation?._id || item._id || '') !== String(deletedConvId)
          }),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.removeQueries({ queryKey: ['messages', deletedConvId] })
      setActiveConvId(null)
      setMessages([])
      setShowDetails(false)
      navigate('/chat')
      toast.success(res.data?.message || t.chat.leftGroup)
    } catch (err) {
      toast.error(err?.response?.data?.message || t.chat.leaveError)
    } finally {
      setIsDeletingChat(false)
    }
  }

  function handleDeleteGroup() {
    if (!activeConvId || isDeletingChat) return
    setConfirmType('deleteGroup')
  }

  async function doDeleteGroup() {
    var deletedConvId = activeConvId
    setIsDeletingChat(true)
    try {
      var res = await deleteGroup(deletedConvId)
      queryClient.setQueryData(['conversations'], function (old) {
        if (!old) return old
        return {
          ...old,
          conversations: (old.conversations || []).filter(function (item) {
            return String(item.conversation?._id || item._id || '') !== String(deletedConvId)
          }),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.removeQueries({ queryKey: ['messages', deletedConvId] })
      setActiveConvId(null)
      setMessages([])
      setShowDetails(false)
      navigate('/chat')
      toast.success(res.data?.message || t.chat.groupDeleted)
    } catch (err) {
      toast.error(err?.response?.data?.message || t.chat.deleteGroupError)
    } finally {
      setIsDeletingChat(false)
    }
  }

  function handleKickMember(member) {
    if (!activeConvId || !isGroupAdmin) return
    setKickMember(member)
    setConfirmType('kickMember')
  }

  async function doKickMember() {
    if (!activeConvId || !kickMember || isKickingMember) return

    var memberUser = kickMember.userId || {}
    var memberId = String(memberUser._id || kickMember.userId || '')
    if (!memberId) return

    setIsKickingMember(true)
    try {
      var res = await removeMemberFromConversation(activeConvId, memberId)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] })
      setKickMember(null)
      toast.success(res.data?.message || t.chat.kickedMember)
    } catch (err) {
      toast.error(err?.response?.data?.message || t.chat.kickError)
    } finally {
      setIsKickingMember(false)
    }
  }

  function handleConfirmOk() {
    var type = confirmType
    setConfirmType('')

    if (type === 'block') {
      doBlockUser()
    } else if (type === 'report') {
      doReportUser()
    } else if (type === 'deleteChat') {
      doDeleteChat()
    } else if (type === 'leaveGroup') {
      doLeaveGroup()
    } else if (type === 'deleteGroup') {
      doDeleteGroup()
    } else if (type === 'kickMember') {
      doKickMember()
    }
  }

  // ── RENDER ──

  // Tìm vị trí tin nhắn cuối cùng do MÌNH gửi (duyệt từ cuối lên)
  // Chỉ cần chỉ số → dùng vòng lặp thay vì filter để break sớm hơn
  var lastMyMsgIdx = -1
  for (var j = messages.length - 1; j >= 0; j--) {
    if (messages[j].messageType !== 'system' && String(messages[j].senderId?._id || messages[j].senderId) === myId) {
      lastMyMsgIdx = j
      break
    }
  }
  var lastMyMsg = lastMyMsgIdx >= 0 ? messages[lastMyMsgIdx] : null

  // hasReaders = true khi có người khác đọc TIN NHẮN CUỐI của mình
  // Điều kiện: readAt (thời điểm B đọc) >= createdAt (thời điểm mình gửi tin cuối)
  // Tại sao so sánh >= createdAt chứ không chỉ readAt > 0?
  //   Ví dụ: B đọc tin cũ lúc 10:00, mình gửi tin mới lúc 10:05
  //   → readBy[B] = 10:00 < 10:05 → hasReaders = false → "Đã xem" ẩn
  //   → Khi B mở lại chat sau 10:05 → B emit mark_read → readBy[B] = 10:06 >= 10:05 → hiện
  var hasReaders = !!(lastMyMsg && Object.entries(readBy).some(function (entry) {
    var uid = entry[0]
    var readAt = entry[1]
    return uid !== myId && new Date(readAt) >= new Date(lastMyMsg.createdAt)
  }))

  var confirmTitle = ''
  var confirmMessage = ''
  var confirmOkText = t.chat.cancel

  if (confirmType === 'block') {
    confirmTitle = t.chat.blockTitle
    confirmMessage = t.chat.blockConfirm
    confirmOkText = t.chat.block
  } else if (confirmType === 'report') {
    confirmTitle = t.chat.reportTitle
    confirmMessage = t.chat.reportConfirm
    confirmOkText = t.chat.report
  } else if (confirmType === 'deleteChat') {
    confirmTitle = t.chat.deleteChatTitle
    confirmMessage = t.chat.deleteChatConfirm
    confirmOkText = t.chat.deleteChat
  } else if (confirmType === 'leaveGroup') {
    confirmTitle = t.chat.leaveGroup
    confirmMessage = t.chat.leaveConfirm
    confirmOkText = t.chat.leaveGroup
  } else if (confirmType === 'deleteGroup') {
    confirmTitle = t.chat.deleteGroupTitle
    confirmMessage = t.chat.deleteGroupConfirm
    confirmOkText = t.chat.deleteGroup
  } else if (confirmType === 'kickMember') {
    var kickUser = kickMember?.userId || {}
    var kickName = kickUser.fullName || kickUser.username || '...'
    confirmTitle = t.chat.kickTitle
    confirmMessage = t.chat.kickConfirm.replace('{name}', kickName)
    confirmOkText = t.chat.kick
  }

  return (
    <div className={styles.layout}>

      {/* ── SIDEBAR ── */}
      <div className={styles.sidebar}>

        {/* Header */}
        <div className={styles.sidebarHeader}>
          {showPending ? (
            <button className={styles.iconBtn} onClick={function () { setShowPending(false); setActiveConvId(null) }}>
              <BackIcon />
            </button>
          ) : (
            <div className={styles.sidebarUsername}>
              <span>{user?.username || 'Tin nhắn'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>
          )}
          {!showPending && (
            <button
              className={styles.iconBtn}
              onClick={function () {
                if (showNewConv) {
                  resetNewConversationPanel()
                } else {
                  setShowNewConv(true)
                }
              }}
              title={t.chat.newMessage}
            >
              <ComposeIcon />
            </button>
          )}
        </div>

        {/* Nội dung sidebar thay đổi theo trạng thái */}
        {showPending ? (

          /* ── PENDING LIST ── */
          <div className={styles.pendingView}>
            <div className={styles.pendingViewTitle}>{t.chat.pending}</div>
            <p className={styles.pendingViewDesc}>{t.chat.pendingDesc}</p>

            {pendingLoading && <Spinner />}

            {!pendingLoading && pendingConversations.length === 0 && (
              <p className={styles.emptyConvMsg}>{t.chat.noPending}</p>
            )}

            {pendingConversations.map(function (conv) {
              var other = getOtherParticipant(conv)
              var displayName = other?.fullName || other?.username || 'Unknown'
              var lastMsg = conv.lastMessage

              return (
                <div
                  key={conv._id}
                  className={styles.convItem + (String(activeConvId) === String(conv._id) ? ' ' + styles.active : '')}
                  onClick={function () { handleSelectPending(conv) }}
                >
                  <Avatar src={other?.avatarUrl} username={displayName} size="md" isOnline={!!onlineUsers?.has(String(other?._id || ''))} />
                  <div className={styles.convMeta}>
                    <div className={styles.convName}>{displayName}</div>
                    <div className={styles.convPreview}>
                      {lastMsg?.content || 'Tin nhắn mới'}
                    </div>
                  </div>
                  <div className={styles.pendingDot} />
                </div>
              )
            })}
          </div>

        ) : (

          /* ── NORMAL LIST ── */
          <>
            {/* Search */}
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className={styles.searchInput}
                type="text"
                placeholder={t.chat.search}
                value={sidebarSearch}
                onChange={function (e) { setSidebarSearch(e.target.value) }}
              />
            </div>

            {/* Ghi chú */}
            <div className={styles.notesSection}>
              <div className={styles.notesLabel}>Đến lượt bạn...</div>
              <div className={styles.notesItem}>
                <div className={styles.notesAvatar}>
                  <Avatar src={user?.avatarUrl || user?.avatar} username={user?.username} size="md" />
                </div>
                <span className={styles.notesText}>Ghi chú của bạn</span>
              </div>
            </div>

            {/* Header list */}
            <div className={styles.convListHeader}>
              <span className={styles.convListTitle}>{t.chat.title}</span>
              <button
                className={styles.pendingBtn}
                onClick={function () { setShowPending(true); resetNewConversationPanel() }}
              >
                {t.chat.pending}
                {pendingCount > 0 && (
                  <span className={styles.pendingBadge}>{pendingCount}</span>
                )}
              </button>
            </div>

            {/* Panel tạo conversation mới */}
            {showNewConv && (
              <div className={styles.newConvPanel}>
                {newConvSelectedUsers.length > 0 && (
                  <div className={styles.newConvSelectedList}>
                    {newConvSelectedUsers.map(function (selectedUser) {
                      return (
                        <button
                          key={selectedUser._id}
                          type="button"
                          className={styles.newConvSelectedChip}
                          onClick={function () { toggleNewConversationUser(selectedUser) }}
                        >
                          <span>{selectedUser.fullName || selectedUser.username}</span>
                          <span aria-hidden="true">x</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {newConvSelectedUsers.length > 1 && (
                  <input
                    className={styles.newConvInput}
                    type="text"
                    placeholder={t.chat.groupNamePlaceholder}
                    value={newGroupName}
                    onChange={function (e) { setNewGroupName(e.target.value) }}
                  />
                )}

                <input
                  className={styles.newConvInput}
                  type="text"
                  placeholder={t.chat.searchUser}
                  value={newConvSearch}
                  onChange={function (e) { setNewConvSearch(e.target.value) }}
                  autoFocus
                />
                {newConvUsers.map(function (u) {
                  var isSelected = newConvSelectedUsers.some(function (item) {
                    return String(item._id) === String(u._id)
                  })
                  return (
                    <div
                      key={u._id}
                      className={isSelected ? styles.newConvUser + ' ' + styles.newConvUserSelected : styles.newConvUser}
                      onClick={function () { toggleNewConversationUser(u) }}
                    >
                      <Avatar src={u.avatarUrl} username={u.username} size="sm" />
                      <div>
                        <div className={styles.newConvUserName}>{u.username}</div>
                        <div className={styles.newConvUserSub}>{u.fullName}</div>
                      </div>
                      {isSelected && <span className={styles.newConvCheck}>✓</span>}
                    </div>
                  )
                })}

                <button
                  className={styles.newConvCreateBtn}
                  type="button"
                  disabled={newConvSelectedUsers.length === 0 || isCreatingConversation}
                  onClick={startSelectedConversation}
                >
                  {isCreatingConversation
                    ? t.chat.processing
                    : newConvSelectedUsers.length > 1
                      ? t.chat.createGroup
                      : t.chat.startConversation}
                </button>
              </div>
            )}

            {/* Conversation list */}
            {convsLoading && <Spinner />}

            {!convsLoading && filteredConversations.length === 0 && searchNewPeople.length === 0 && (
              <p className={styles.emptyConvMsg}>{sidebarSearch.trim() ? t.chat.noResults : t.chat.emptyConvList}</p>
            )}

            {filteredConversations.map(function (conv) {
              var other = getOtherParticipant(conv)
              var isGroup = conv.type === 'group'
              var displayName = isGroup ? (conv.name || t.chat.groupFallback) : (other?.fullName || other?.username || 'Unknown')
              var lastMsg = conv.lastMessage
              var unread = conv.isUnread && String(activeConvId) !== String(conv._id)
              var statusClass = unread ? styles.unread : styles.read
              var lastSenderId = String(lastMsg?.senderId?._id || lastMsg?.senderId || '')
              var isMineMsg = lastSenderId === myId
              var previewText = !lastMsg ? t.chat.startConversation
                : lastMsg.messageType === 'system' ? lastMsg.content
                : lastMsg.messageType === 'image' ? (isMineMsg ? t.chat.you + ': ' + t.chat.imagePreview : t.chat.imagePreview)
                : lastMsg.messageType === 'video' ? (isMineMsg ? t.chat.you + ': ' + t.chat.videoPreview : t.chat.videoPreview)
                : (isMineMsg ? t.chat.you + ': ' + lastMsg.content : lastMsg.content)
              var timeStr = timeAgo(conv.lastActivityAt || lastMsg?.createdAt)

              return (
                <div
                  key={conv._id}
                  className={
                    styles.convItem
                    + (String(activeConvId) === String(conv._id) ? ' ' + styles.active : '')
                    + ' ' + statusClass
                  }
                  onClick={function () { handleSelectConv(conv) }}
                >
                  <Avatar src={isGroup ? conv.avatarUrl : other?.avatarUrl} username={displayName} size="md" isOnline={!isGroup && !!onlineUsers?.has(String(other?._id || ''))} />
                  <div className={styles.convMeta}>
                    <div className={styles.convName}>{displayName}</div>
                    <div className={styles.convPreview}>
                      <span className={styles.convPreviewText}>{previewText}</span>
                      {timeStr && <span className={styles.convPreviewDot}> · {timeStr}</span>}
                    </div>
                  </div>
                  {unread && <span className={styles.unreadDot} />}
                </div>
              )
            })}

            {/* Người mới để nhắn tin — tìm thẳng từ ô tìm kiếm trên cùng,
                không cần mở "soạn tin mới". Click → tạo/mở chat 1-1 ngay. */}
            {sidebarSearch.trim() && searchNewPeople.length > 0 && (
              <>
                <div className={styles.convListHeader}>
                  <span className={styles.convListTitle}>{t.chat.messageTo}</span>
                </div>
                {searchNewPeople.map(function (u) {
                  return (
                    <div
                      key={u._id}
                      className={styles.convItem}
                      onClick={function () { startConversation(u._id, u); setSidebarSearch('') }}
                    >
                      <Avatar src={u.avatarUrl} username={u.username} size="md" />
                      <div className={styles.convMeta}>
                        <div className={styles.convName}>{u.username}</div>
                        <div className={styles.convPreview}>
                          <span className={styles.convPreviewText}>{u.fullName || ''}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* ── CỬA SỔ CHAT ── */}
      {activeConvId ? (
        <div className={styles.window + ' ' + styles.open}>

          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderInfo}>
              <Avatar src={activeIsGroup ? activeConv?.avatarUrl : activeOther?.avatarUrl} username={activeDisplayName} size="md" isOnline={!activeIsGroup && !!onlineUsers?.has(String(activeOther?._id || ''))} />
              <div className={styles.chatHeaderText}>
                <div className={styles.chatHeaderName}>{activeDisplayName}</div>
                {!activeIsGroup && activeOther?.username && (
                  <div className={styles.chatHeaderSub}>{activeOther.username}</div>
                )}
              </div>
            </div>
            {!isPendingConv && (
              <div className={styles.chatHeaderActions}>
                <button className={styles.iconBtn} title={t.chat.phoneCall}><PhoneIcon /></button>
                <button className={styles.iconBtn} title={t.chat.videoCall}><VideoIcon /></button>
                <button
                  className={styles.iconBtn + (showDetails ? ' ' + styles.iconBtnActive : '')}
                  title={t.chat.info}
                  onClick={function () { setShowDetails(function (v) { return !v }) }}
                >
                  <InfoIcon />
                </button>
              </div>
            )}
          </div>

          {showDetails && (
            <aside className={styles.detailsPanel}>
              <div className={styles.detailsTitle}>{t.chat.details}</div>

              <button className={styles.detailsNotifyRow} type="button" onClick={handleToggleMute}>
                <span className={styles.detailsNotifyIcon}><BellIcon /></span>
                <span className={styles.detailsNotifyText} style={{ whiteSpace: 'pre-line' }}>{t.chat.mute}</span>
                <span className={styles.detailsSwitch + (isMuted ? ' ' + styles.detailsSwitchOn : '')}><span /></span>
              </button>

              <div className={styles.detailsSection}>
                <div className={styles.detailsSectionTitle}>{t.chat.members}</div>
                {detailMembers.map(function (member) {
                  var memberUser = member.userId || {}
                  var memberName = memberUser.fullName || memberUser.username || 'Unknown'
                  var memberId = String(memberUser._id || member.userId || '')
                  // Chỉ kick thành viên thường — admin không được kick admin khác
                  var canKick = isGroupAdmin && memberId !== myId && member.role !== 'admin'
                  return (
                    <div key={memberId} className={styles.detailsMemberRow}>
                      <button
                        className={styles.detailsMember}
                        type="button"
                        onClick={function () {
                          if (memberUser.username) navigate('/' + memberUser.username)
                        }}
                      >
                        <Avatar src={memberUser.avatarUrl} username={memberName} size="md" />
                        <span className={styles.detailsMemberText}>
                          <span className={styles.detailsMemberName}>{memberName}</span>
                          <span className={styles.detailsMemberUsername}>
                            {memberUser.username}
                            {member.role === 'admin' ? ' ' + t.chat.adminSuffix : ''}
                          </span>
                        </span>
                      </button>
                      {canKick && (
                        <button
                          type="button"
                          className={styles.detailsKickBtn}
                          onClick={function () { handleKickMember(member) }}
                        >
                          {t.chat.kick}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className={styles.detailsBottom}>
                <button type="button" className={styles.detailsAction} onClick={handleNickname}>{t.chat.nickname}</button>
                {!activeIsGroup && (
                  <button type="button" className={styles.detailsAction} onClick={handleBlockUser} disabled={isBlocking}>
                    {isBlocking ? t.chat.blocking : t.chat.block}
                  </button>
                )}
                {!activeIsGroup && (
                  <button type="button" className={styles.detailsAction + ' ' + styles.detailsDanger} onClick={handleReportUser} disabled={isReporting}>
                    {isReporting ? t.chat.reporting : t.chat.report}
                  </button>
                )}
                {activeIsGroup && isGroupCreator && (
                  <button type="button" className={styles.detailsAction + ' ' + styles.detailsDanger} onClick={handleDeleteGroup} disabled={isDeletingChat}>
                    {isDeletingChat ? t.chat.deleting : t.chat.deleteGroup}
                  </button>
                )}
                {activeIsGroup ? (
                  <button type="button" className={styles.detailsAction + ' ' + styles.detailsDanger} onClick={handleLeaveGroup} disabled={isDeletingChat}>
                    {isDeletingChat ? t.chat.leaving : t.chat.leaveGroup}
                  </button>
                ) : (
                  <button type="button" className={styles.detailsAction + ' ' + styles.detailsDanger} onClick={handleDeleteChat} disabled={isDeletingChat}>
                    {isDeletingChat ? t.chat.deleting : t.chat.deleteChat}
                  </button>
                )}
              </div>
            </aside>
          )}

          {/* Messages */}
          <div className={styles.messages}>
            {msgLoading && <Spinner />}

            {/* Profile card: chỉ hiện cho direct chat trống hoặc pending — không hiện cho group */}
            {!msgLoading && (messages.length === 0 || isPendingConv) && activeOther && !activeIsGroup && (
              <div className={styles.profileCard}>
                <Avatar src={activeOther.avatarUrl} username={activeOther.username} size="xl" isOnline={!!onlineUsers?.has(String(activeOther._id || ''))} />
                <div className={styles.profileCardName}>{activeOther.fullName || activeOther.username}</div>
                <div className={styles.profileCardSub}>{activeOther.username} · Instagram</div>
                <button className={styles.profileCardBtn} onClick={function () { navigate('/' + activeOther.username) }}>
                  {t.chat.viewProfile}
                </button>
              </div>
            )}

            {/* Hiện tin nhắn đầu tiên khi pending (người nhận xem trước để quyết định) */}
            {isPendingConv && activeConv?.lastMessage?.content && (
              <div className={styles.pendingPreviewMsg}>
                <div className={styles.bubbleOther + ' ' + styles.bubble}>
                  {activeConv.lastMessage.content}
                </div>
              </div>
            )}

            {/* Tin nhắn bình thường (chỉ hiện khi không phải pending) */}
            {!isPendingConv && messages.map(function (msg, i) {
              if (msg.messageType === 'system') {
                return (
                  <div key={msg._id || i} className={styles.systemMessage}>
                    {msg.content}
                  </div>
                )
              }

              var senderId = String(msg.senderId?._id || msg.senderId || '')
              var isMine = senderId === myId

              var nextMsg = messages[i + 1]
              var nextSenderId = String(nextMsg?.senderId?._id || nextMsg?.senderId || '')
              var isLastInGroup = nextMsg?.messageType === 'system' || nextSenderId !== senderId

              var senderInfo = msg.senderId?.username
                ? msg.senderId
                : activeConv?.members?.find(function (m) {
                    return String(m.userId?._id || '') === senderId
                  })?.userId

              var isGroup = activeConv?.type === 'group'
              var prevMsg = messages[i - 1]
              var prevSenderId = String(prevMsg?.senderId?._id || prevMsg?.senderId || '')
              var showName = !isMine && isGroup && (prevMsg?.messageType === 'system' || prevSenderId !== senderId)

              return (
                <div key={msg._id || i} className={styles.messageRow + ' ' + (isMine ? styles.rowMine : styles.rowOther)}>
                  {!isMine && (
                    isLastInGroup
                      ? <div className={styles.avatarSlot}><Avatar src={senderInfo?.avatarUrl} username={senderInfo?.username} size="sm" /></div>
                      : <div className={styles.avatarGap} />
                  )}
                  <div className={styles.bubbleWrap}>
                    {showName && <div className={styles.senderName}>{senderInfo?.username}</div>}
                    <div className={styles.bubble + ' ' + (isMine ? styles.bubbleMine : styles.bubbleOther) + (msg.messageType === 'image' || msg.messageType === 'video' ? ' ' + styles.bubbleMedia : '')}>
                      {msg.replyToId && (
                        <div className={styles.replyPreviewInBubble}>
                          <span>{getMessagePreview(msg.replyToId)}</span>
                        </div>
                      )}
                      {msg.storyMediaUrl && (
                        <div className={styles.storyReplyPreview}>
                          {msg.storyMediaType === 'video' ? (
                            <video src={msg.storyMediaUrl} className={styles.storyReplyMedia} muted />
                          ) : (
                            <img src={msg.storyMediaUrl} alt="" className={styles.storyReplyMedia} />
                          )}
                        </div>
                      )}
                      {msg.messageType === 'image' ? (
                        <img src={msg.content} alt="" className={styles.msgImage} />
                      ) : msg.messageType === 'video' ? (
                        <video src={msg.content} controls className={styles.msgVideo} />
                      ) : (
                        msg.content
                      )}
                    </div>
                    {isMine && i === lastMyMsgIdx && hasReaders && (
                      <div className={styles.readReceipt}>{t.chat.seen}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.messageReplyBtn}
                    onClick={function () { handleReplyMessage(msg) }}
                  >
                    {t.chat.reply}
                  </button>
                </div>
              )
            })}

            {!isPendingConv && isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom: input bình thường hoặc nút Accept/Decline cho pending */}
          {isPendingConv ? (
            <div className={styles.pendingActions}>
              <p className={styles.pendingActionsHint}>
                {t.chat.pendingFrom.replace('{username}', activeOther?.username || '')}
              </p>
              <div className={styles.pendingActionsRow}>
                <button
                  className={styles.acceptBtn}
                  onClick={handleAccept}
                  disabled={isAccepting}
                >
                  {isAccepting ? t.chat.processing : t.chat.acceptBtn}
                </button>
                <button
                  className={styles.declineBtn}
                  onClick={handleDecline}
                  disabled={isDeclining}
                >
                  {isDeclining ? t.chat.processing : t.chat.decline}
                </button>
              </div>
            </div>
          ) : blockState.isBlocked ? (
            /* ── "Bức màn" khóa nhắn tin khi đã chặn nhau ── */
            <div style={{ padding: '20px 24px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', fontSize: 14 }}>
                {blockState.iBlocked ? t.chat.blockedCurtainYou : t.chat.blockedCurtainOther}
              </p>
              <p style={{ color: 'var(--ink-muted)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
                {t.chat.blockedCurtainHint}
              </p>
              {blockState.iBlocked && (
                <button
                  type="button"
                  onClick={handleUnblockFromChat}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                    color: 'var(--ink)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  {t.chat.unblock}
                </button>
              )}
            </div>
          ) : (
            <div className={styles.inputWrap}>
              {replyTarget && (
                <div className={styles.replyComposer}>
                  <div className={styles.replyComposerText}>
                    <strong>{t.chat.replyTo.replace('{name}', getMessageSenderName(replyTarget))}</strong>
                    <span>{getMessagePreview(replyTarget)}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.replyCancelBtn}
                    onClick={function () { setReplyTarget(null) }}
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                onChange={handleFileSelect}
              />
              {/* Emoji picker — hiện phía trên input khi bấm icon */}
              {showEmojiPicker && (
                <div className={styles.emojiPickerWrap} ref={emojiPickerRef}>
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme="dark"
                    width={320}
                    height={380}
                    searchPlaceholder="Tìm emoji..."
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
              <form onSubmit={handleSend} className={styles.inputArea}>
                <div className={styles.inputBox}>
                  <button
                    type="button"
                    className={styles.inputIconBtn + (showEmojiPicker ? ' ' + styles.inputIconActive : '')}
                    onClick={function () { setShowEmojiPicker(function (v) { return !v }) }}
                  >
                    <EmojiIcon />
                  </button>
                  <input
                    type="text"
                    className={styles.inputField}
                    placeholder={t.chat.messagePlaceholder}
                    value={input}
                    onChange={handleInputChange}
                  />
                </div>
                {input.trim() ? (
                  <button type="submit" className={styles.sendTextBtn}>{t.chat.send}</button>
                ) : (
                  <div className={styles.inputRightIcons}>
                    <button type="button" className={styles.inputIconBtn}><MicIcon /></button>
                    <button
                      type="button"
                      className={styles.inputIconBtn}
                      onClick={function () { fileInputRef.current?.click() }}
                      disabled={isUploadingMedia}
                      title={t.chat.sendMedia}
                    >
                      {isUploadingMedia ? <Spinner size={18} /> : <ImageIcon />}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.window}>
          <div className={styles.windowEmpty}>
            <div className={styles.windowEmptyInner}>
              <div className={styles.windowEmptyIcon}>
                <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className={styles.windowEmptyTitle}>{t.chat.emptyTitle}</div>
              <div className={styles.windowEmptySub}>{t.chat.emptySubtitle}</div>
            </div>
          </div>
        </div>
      )}

      {confirmType && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmTitle}>{confirmTitle}</div>
            <div className={styles.confirmMessage}>{confirmMessage}</div>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={function () { setConfirmType(''); setKickMember(null) }}
              >
                {t.chat.cancel}
              </button>
              <button
                type="button"
                className={styles.confirmOk}
                onClick={handleConfirmOk}
              >
                {confirmOkText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
