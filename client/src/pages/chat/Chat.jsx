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
  reactToMessage,
  getPinnedMessages,
  pinMessage,
  unpinMessage,
  forwardMessage,
  setMemberNickname,
} from '../../features/chat/chatAPI'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Checkbox from '@mui/material/Checkbox'
import Button from '../../components/common/Button'
import ReactionBar from '../../components/common/ReactionBar'
import { reactionEmoji } from '../../components/common/reactions'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import { ListSkeleton } from '../../components/common/Skeletons'
import { staggerIn } from '../../theme/animations'
import Box from '@mui/material/Box'
import * as s from './chatStyles'

// Cập nhật danh sách cảm xúc của 1 tin nhắn trong mảng messages.
// Dùng chung cho 2 đường: socket 'message_reaction' và fallback REST khi socket rớt.
//   change: { messageId, userId, reactionType } — reactionType = null nghĩa là gỡ cảm xúc
function applyReactionToMessages(messages, change, myId) {
  return messages.map(function (m) {
    if (String(m._id) !== String(change.messageId)) return m

    // Bỏ cảm xúc cũ của đúng người này rồi thêm lại cảm xúc mới (nếu có)
    var others = (m.reactions || []).filter(function (r) {
      return String(r.user?._id || r.user || '') !== String(change.userId)
    })
    var nextReactions = change.reactionType
      ? others.concat([{ user: { _id: change.userId }, reactionType: change.reactionType }])
      : others

    var next = Object.assign({}, m, { reactions: nextReactions })
    // Cảm xúc của chính mình được giữ riêng để tô đậm đúng icon đang chọn
    if (String(change.userId) === String(myId)) {
      next.myReaction = change.reactionType || null
    }
    return next
  })
}

// Gom cảm xúc của 1 tin nhắn theo loại để hiện "❤️2 😂1" thay vì liệt kê từng người.
// Trả về mảng { type, count }, giữ thứ tự loại nào được thả trước đứng trước.
function groupReactions(reactions) {
  var result = []
  ;(reactions || []).forEach(function (r) {
    var found = result.find(function (item) { return item.type === r.reactionType })
    if (found) {
      found.count = found.count + 1
    } else {
      result.push({ type: r.reactionType, count: 1 })
    }
  })
  return result
}

// ── Icon components ──

function TypingIndicator() {
  return (
    <Box sx={s.typing}>
      <Box sx={s.typingDot(0)} />
      <Box sx={s.typingDot(1)} />
      <Box sx={s.typingDot(2)} />
    </Box>
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
  // Đặt biệt danh: thành viên đang chọn + ô nhập trong hộp thoại
  var [nicknameTarget, setNicknameTarget] = useState(null)
  var [nicknameInput, setNicknameInput] = useState('')
  var [isSavingNickname, setIsSavingNickname] = useState(false)
  var [isBlocking, setIsBlocking] = useState(false)
  var [isReporting, setIsReporting] = useState(false)
  var [isDeletingChat, setIsDeletingChat] = useState(false)
  var [isKickingMember, setIsKickingMember] = useState(false)
  var [confirmType, setConfirmType] = useState('')
  var [kickMember, setKickMember] = useState(null)
  var [replyTarget, setReplyTarget] = useState(null)
  // Id tin nhắn đang mở bảng chọn cảm xúc (null = không mở bảng nào)
  var [reactionPickerFor, setReactionPickerFor] = useState(null)
  // Danh sách tin nhắn đang ghim của cuộc trò chuyện đang mở (tối đa 5 tin, do server giới hạn)
  var [pinnedMessages, setPinnedMessages] = useState([])
  // Chuyển tiếp tin nhắn: tin đang chọn + các cuộc trò chuyện đích được tick
  var [forwardMessageTarget, setForwardMessageTarget] = useState(null)
  var [forwardSelectedIds, setForwardSelectedIds] = useState([])
  var [isForwarding, setIsForwarding] = useState(false)
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

  // Tải danh sách tin đã ghim mỗi khi mở một cuộc trò chuyện khác.
  // Không gọi cho pending conversation vì server chặn 403 giống các API tin nhắn khác.
  useEffect(function () {
    var isPending = pendingConversations.some(function (c) { return String(c._id) === String(activeConvId) })
    if (!activeConvId || pendingLoading || isPending) {
      setPinnedMessages([])
      return
    }

    var stillCurrent = true
    getPinnedMessages(activeConvId)
      .then(function (res) {
        // Bỏ kết quả về muộn khi user đã chuyển sang cuộc trò chuyện khác
        if (!stillCurrent) return
        setPinnedMessages(res.data?.messages || [])
      })
      .catch(function () {
        if (stillCurrent) setPinnedMessages([])
      })

    return function () { stillCurrent = false }
  }, [activeConvId, pendingLoading, pendingConversations])

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

    // ── Cảm xúc tin nhắn ──
    // Server emit cho tất cả thành viên sau khi lưu MessageReaction.
    // payload: { messageId, conversationId, userId, reactionType }
    //   reactionType = null nghĩa là người đó vừa GỠ cảm xúc
    function onMessageReaction(data) {
      if (String(data.conversationId) !== String(activeConvId || '')) return

      setMessages(function (prev) {
        return applyReactionToMessages(prev, data, myId)
      })
    }

    // ── Ghim / bỏ ghim tin nhắn ──
    // payload: { messageId, conversationId, isPinned, pinnedBy }
    // Chỉ có cờ isPinned nên khi ghim thêm phải lấy nội dung tin từ state messages;
    //   tin nằm ở trang cũ chưa tải thì gọi lại API cho chắc.
    function onMessagePinned(data) {
      if (String(data.conversationId) !== String(activeConvId || '')) return

      setMessages(function (prev) {
        return prev.map(function (m) {
          if (String(m._id) !== String(data.messageId)) return m
          return Object.assign({}, m, { isPinned: !!data.isPinned })
        })
      })

      if (!data.isPinned) {
        setPinnedMessages(function (prev) {
          return prev.filter(function (m) { return String(m._id) !== String(data.messageId) })
        })
        return
      }

      getPinnedMessages(activeConvId)
        .then(function (res) { setPinnedMessages(res.data?.messages || []) })
        .catch(function () { /* giữ nguyên thanh ghim hiện có nếu gọi lỗi */ })
    }

    // ── Ai đó đổi biệt danh của một thành viên ──
    // payload: { conversationId, memberId, nickname }
    // Biệt danh nằm trong members của conversation nên tải lại danh sách cho khớp.
    function onNicknameChanged(data) {
      if (String(data.conversationId) !== String(activeConvId || '')) return
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
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
    socket.on('message_reaction', onMessageReaction)
    socket.on('message_pinned', onMessagePinned)
    socket.on('nickname_changed', onNicknameChanged)
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
      socket.off('message_reaction', onMessageReaction)
      socket.off('message_pinned', onMessagePinned)
      socket.off('nickname_changed', onNicknameChanged)
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

  // Ghim tin nhắn. Server giới hạn 5 tin mỗi cuộc trò chuyện và tự emit 'message_pinned'
  //   cho mọi thành viên, nên ở đây không cần tự sửa state.
  function handlePinMessage(msg) {
    if (!msg?._id) return
    pinMessage(msg._id).catch(function (error) {
      toast.error(error.response?.data?.message || t.common.error)
    })
  }

  function handleUnpinMessage(messageId) {
    unpinMessage(messageId).catch(function (error) {
      toast.error(error.response?.data?.message || t.common.error)
    })
  }

  // Mở hộp thoại chọn nơi chuyển tiếp — mỗi lần mở đều bắt đầu với danh sách chọn trống
  function handleOpenForward(msg) {
    if (!msg || msg.messageType === 'system') return
    setForwardMessageTarget(msg)
    setForwardSelectedIds([])
  }

  // Tick / bỏ tick một cuộc trò chuyện trong hộp thoại chuyển tiếp
  function toggleForwardTarget(conversationId) {
    setForwardSelectedIds(function (prev) {
      if (prev.includes(conversationId)) {
        return prev.filter(function (id) { return id !== conversationId })
      }
      return prev.concat([conversationId])
    })
  }

  // Gửi tin nhắn đã chọn sang các cuộc trò chuyện đích.
  // Server trả về danh sách skipped (bị chặn / không còn là thành viên) nên báo lại cho user biết.
  function handleForwardMessage() {
    if (!forwardMessageTarget?._id || forwardSelectedIds.length === 0) return

    setIsForwarding(true)
    forwardMessage(forwardMessageTarget._id, forwardSelectedIds)
      .then(function (res) {
        var skipped = res.data?.skipped || []
        if (skipped.length > 0) {
          toast(t.chat.forwardPartial.replace('{count}', String(skipped.length)))
        } else {
          toast.success(t.chat.forwarded)
        }
        setForwardMessageTarget(null)
        setForwardSelectedIds([])
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      })
      .catch(function (error) {
        toast.error(error.response?.data?.message || t.common.error)
      })
      .finally(function () {
        setIsForwarding(false)
      })
  }

  // Cuộn tới tin nhắn được ghim khi bấm vào thanh ghim.
  // Tin nằm ở trang cũ chưa tải thì không tìm thấy phần tử — báo cho user biết thay vì im lặng.
  function scrollToMessage(messageId) {
    var element = document.getElementById('msg-' + messageId)
    if (!element) {
      toast(t.chat.pinnedNotLoaded)
      return
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Thả cảm xúc lên tin nhắn.
  // Ưu tiên socket để mọi thành viên thấy ngay; socket rớt thì gọi REST cho khỏi mất thao tác.
  // Thả lại đúng cảm xúc đang có = bỏ cảm xúc, phần này server tự xử lý.
  function handleReactMessage(msg, reactionType) {
    setReactionPickerFor(null)
    if (!msg?._id) return

    if (socket && socket.connected) {
      socket.emit('react_message', { messageId: msg._id, reactionType: reactionType })
      return
    }

    reactToMessage(msg._id, reactionType)
      .then(function (res) {
        // Socket đang rớt nên sẽ không nhận được event 'message_reaction' của chính mình
        //   → tự cập nhật state theo kết quả server trả về
        setMessages(function (prev) {
          return applyReactionToMessages(prev, {
            messageId: msg._id,
            userId: myId,
            reactionType: res.data?.reactionType || null,
          }, myId)
        })
      })
      .catch(function () {
        toast.error(t.common.error)
      })
  }

  // Active conversation có thể nằm trong accepted hoặc pending list
  var activeConv = conversations.find(function (c) { return String(c._id) === String(activeConvId) })
    || pendingConversations.find(function (c) { return String(c._id) === String(activeConvId) })
    || null

  var isPendingConv = !!pendingConversations.find(function (c) { return String(c._id) === String(activeConvId) })

  var activeOther = activeConv ? getOtherParticipant(activeConv) : null
  var activeIsGroup = activeConv?.type === 'group'
  var detailMembers = activeConv?.members || []

  // Biệt danh lấy từ ConversationMember.nickname do server trả về — mọi thành viên thấy như nhau
  function getMemberNickname(userId) {
    var found = detailMembers.find(function (member) {
      return String(member.userId?._id || member.userId || '') === String(userId)
    })
    return found?.nickname || ''
  }

  // Tên hiện ở header: nhóm dùng tên nhóm, chat 1-1 ưu tiên biệt danh của người kia
  var activeDisplayName = activeIsGroup
    ? (activeConv?.name || t.chat.groupFallback)
    : (getMemberNickname(activeOther?._id) || activeOther?.fullName || activeOther?.username || 'Chat')
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

  // Mở hộp thoại đặt biệt danh cho 1 thành viên, điền sẵn biệt danh đang có
  function handleOpenNickname(member) {
    var memberUserId = String(member.userId?._id || member.userId || '')
    setNicknameTarget(member)
    setNicknameInput(getMemberNickname(memberUserId))
  }

  // Lưu biệt danh — để trống là xoá biệt danh, quay về tên thật.
  // Server emit 'nickname_changed' + thêm tin nhắn hệ thống nên mọi thành viên thấy ngay.
  function handleSaveNickname() {
    if (!nicknameTarget || !activeConvId) return
    var memberUserId = String(nicknameTarget.userId?._id || nicknameTarget.userId || '')

    setIsSavingNickname(true)
    setMemberNickname(activeConvId, memberUserId, nicknameInput.trim())
      .then(function () {
        setNicknameTarget(null)
        setNicknameInput('')
        // Biệt danh nằm trong members của conversation → tải lại danh sách cho khớp
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      })
      .catch(function (error) {
        toast.error(error.response?.data?.message || t.common.error)
      })
      .finally(function () {
        setIsSavingNickname(false)
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
      // Biệt danh nay nằm trong ConversationMember ở server, xoá chat là mất theo,
      //   client không còn phải tự dọn như hồi lưu ở localStorage
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
    <Box sx={s.layout}>

      {/* ── SIDEBAR ── */}
      <Box sx={s.sidebar}>

        {/* Header */}
        <Box sx={s.sidebarHeader}>
          {showPending ? (
            <Box component="button" type="button" sx={s.iconBtn(false)} onClick={function () { setShowPending(false); setActiveConvId(null) }}>
              <BackIcon />
            </Box>
          ) : (
            <Box sx={s.sidebarUsername}>
              <span>{user?.username || 'Tin nhắn'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </Box>
          )}
          {!showPending && (
            <Box
              component="button"
              type="button"
              sx={s.iconBtn(false)}
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
            </Box>
          )}
        </Box>

        {/* Nội dung sidebar thay đổi theo trạng thái */}
        {showPending ? (

          /* ── PENDING LIST ── */
          <Box sx={s.pendingView}>
            <Box sx={s.pendingViewTitle}>{t.chat.pending}</Box>
            <Box component="p" sx={s.pendingViewDesc}>{t.chat.pendingDesc}</Box>

            {pendingLoading && <ListSkeleton count={3} />}

            {!pendingLoading && pendingConversations.length === 0 && (
              <Box component="p" sx={s.emptyConvMsg}>{t.chat.noPending}</Box>
            )}

            {pendingConversations.map(function (conv) {
              var other = getOtherParticipant(conv)
              var displayName = other?.fullName || other?.username || 'Unknown'
              var lastMsg = conv.lastMessage
              var isActiveItem = String(activeConvId) === String(conv._id)

              return (
                <Box
                  key={conv._id}
                  sx={s.convItem(isActiveItem, false)}
                  onClick={function () { handleSelectPending(conv) }}
                >
                  <Avatar src={other?.avatarUrl} username={displayName} size="md" isOnline={!!onlineUsers?.has(String(other?._id || ''))} />
                  <Box sx={s.convMeta}>
                    <Box sx={s.convName(isActiveItem, false)}>{displayName}</Box>
                    <Box sx={s.convPreview(false)}>
                      {lastMsg?.content || 'Tin nhắn mới'}
                    </Box>
                  </Box>
                  <Box sx={s.pendingDot} />
                </Box>
              )
            })}
          </Box>

        ) : (

          /* ── NORMAL LIST ── */
          <>
            {/* Search */}
            <Box sx={s.searchWrap}>
              <Box component="svg" sx={s.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </Box>
              <Box
                component="input"
                sx={s.searchInput}
                type="text"
                placeholder={t.chat.search}
                value={sidebarSearch}
                onChange={function (e) { setSidebarSearch(e.target.value) }}
              />
            </Box>

            {/* Ghi chú */}
            <Box sx={s.notesSection}>
              <Box sx={s.notesLabel}>Đến lượt bạn...</Box>
              <Box sx={s.notesItem}>
                <Box sx={s.notesAvatar}>
                  <Avatar src={user?.avatarUrl || user?.avatar} username={user?.username} size="md" />
                </Box>
                <Box component="span" sx={s.notesText}>Ghi chú của bạn</Box>
              </Box>
            </Box>

            {/* Header list */}
            <Box sx={s.convListHeader}>
              <Box component="span" sx={s.convListTitle}>{t.chat.title}</Box>
              <Box
                component="button"
                type="button"
                sx={s.pendingBtn}
                onClick={function () { setShowPending(true); resetNewConversationPanel() }}
              >
                {t.chat.pending}
                {pendingCount > 0 && (
                  <Box component="span" sx={s.pendingBadge}>{pendingCount}</Box>
                )}
              </Box>
            </Box>

            {/* Panel tạo conversation mới */}
            {showNewConv && (
              <Box sx={s.newConvPanel}>
                {newConvSelectedUsers.length > 0 && (
                  <Box sx={s.newConvSelectedList}>
                    {newConvSelectedUsers.map(function (selectedUser) {
                      return (
                        <Box
                          component="button"
                          key={selectedUser._id}
                          type="button"
                          sx={s.newConvSelectedChip}
                          onClick={function () { toggleNewConversationUser(selectedUser) }}
                        >
                          <span>{selectedUser.fullName || selectedUser.username}</span>
                          <span aria-hidden="true">x</span>
                        </Box>
                      )
                    })}
                  </Box>
                )}

                {newConvSelectedUsers.length > 1 && (
                  <Box
                    component="input"
                    sx={s.newConvInput}
                    type="text"
                    placeholder={t.chat.groupNamePlaceholder}
                    value={newGroupName}
                    onChange={function (e) { setNewGroupName(e.target.value) }}
                  />
                )}

                <Box
                  component="input"
                  sx={s.newConvInput}
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
                    <Box
                      key={u._id}
                      sx={s.newConvUser(isSelected)}
                      onClick={function () { toggleNewConversationUser(u) }}
                    >
                      <Avatar src={u.avatarUrl} username={u.username} size="sm" />
                      <div>
                        <Box sx={s.newConvUserName}>{u.username}</Box>
                        <Box sx={s.newConvUserSub}>{u.fullName}</Box>
                      </div>
                      {isSelected && <Box component="span" sx={s.newConvCheck}>✓</Box>}
                    </Box>
                  )
                })}

                <Box
                  component="button"
                  sx={s.newConvCreateBtn}
                  type="button"
                  disabled={newConvSelectedUsers.length === 0 || isCreatingConversation}
                  onClick={startSelectedConversation}
                >
                  {isCreatingConversation
                    ? t.chat.processing
                    : newConvSelectedUsers.length > 1
                      ? t.chat.createGroup
                      : t.chat.startConversation}
                </Box>
              </Box>
            )}

            {/* Conversation list */}
            {convsLoading && <ListSkeleton />}

            {!convsLoading && filteredConversations.length === 0 && searchNewPeople.length === 0 && (
              <Box component="p" sx={s.emptyConvMsg}>{sidebarSearch.trim() ? t.chat.noResults : t.chat.emptyConvList}</Box>
            )}

            {filteredConversations.map(function (conv, convIndex) {
              var other = getOtherParticipant(conv)
              var isGroup = conv.type === 'group'
              var displayName = isGroup ? (conv.name || t.chat.groupFallback) : (other?.fullName || other?.username || 'Unknown')
              var lastMsg = conv.lastMessage
              var unread = conv.isUnread && String(activeConvId) !== String(conv._id)
              var isActiveItem = String(activeConvId) === String(conv._id)
              var lastSenderId = String(lastMsg?.senderId?._id || lastMsg?.senderId || '')
              var isMineMsg = lastSenderId === myId
              var previewText = !lastMsg ? t.chat.startConversation
                : lastMsg.messageType === 'system' ? lastMsg.content
                : lastMsg.messageType === 'image' ? (isMineMsg ? t.chat.you + ': ' + t.chat.imagePreview : t.chat.imagePreview)
                : lastMsg.messageType === 'video' ? (isMineMsg ? t.chat.you + ': ' + t.chat.videoPreview : t.chat.videoPreview)
                : (isMineMsg ? t.chat.you + ': ' + lastMsg.content : lastMsg.content)
              var timeStr = timeAgo(conv.lastActivityAt || lastMsg?.createdAt)

              return (
                <Box
                  key={conv._id}
                  sx={{ ...s.convItem(isActiveItem, unread), ...staggerIn(convIndex, { step: 25, maxDelay: 200 }) }}
                  onClick={function () { handleSelectConv(conv) }}
                >
                  <Avatar src={isGroup ? conv.avatarUrl : other?.avatarUrl} username={displayName} size="md" isOnline={!isGroup && !!onlineUsers?.has(String(other?._id || ''))} />
                  <Box sx={s.convMeta}>
                    <Box sx={s.convName(isActiveItem, unread)}>{displayName}</Box>
                    <Box sx={s.convPreview(unread)}>
                      <Box component="span" className="convPreviewText">{previewText}</Box>
                      {timeStr && <Box component="span" className="convPreviewDot"> · {timeStr}</Box>}
                    </Box>
                  </Box>
                  {unread && <Box component="span" sx={s.unreadDot} />}
                </Box>
              )
            })}

            {/* Người mới để nhắn tin — tìm thẳng từ ô tìm kiếm trên cùng,
                không cần mở "soạn tin mới". Click → tạo/mở chat 1-1 ngay. */}
            {sidebarSearch.trim() && searchNewPeople.length > 0 && (
              <>
                <Box sx={s.convListHeader}>
                  <Box component="span" sx={s.convListTitle}>{t.chat.messageTo}</Box>
                </Box>
                {searchNewPeople.map(function (u) {
                  return (
                    <Box
                      key={u._id}
                      sx={s.convItem(false, false)}
                      onClick={function () { startConversation(u._id, u); setSidebarSearch('') }}
                    >
                      <Avatar src={u.avatarUrl} username={u.username} size="md" />
                      <Box sx={s.convMeta}>
                        <Box sx={s.convName(false, false)}>{u.username}</Box>
                        <Box sx={s.convPreview(false)}>
                          <Box component="span" className="convPreviewText">{u.fullName || ''}</Box>
                        </Box>
                      </Box>
                    </Box>
                  )
                })}
              </>
            )}
          </>
        )}
      </Box>

      {/* ── CỬA SỔ CHAT ── */}
      {activeConvId ? (
        <Box sx={s.chatWindow(true)}>

          {/* Header */}
          <Box sx={s.chatHeader}>
            <Box sx={s.chatHeaderInfo}>
              <Avatar src={activeIsGroup ? activeConv?.avatarUrl : activeOther?.avatarUrl} username={activeDisplayName} size="md" isOnline={!activeIsGroup && !!onlineUsers?.has(String(activeOther?._id || ''))} />
              <Box sx={s.chatHeaderText}>
                <Box sx={s.chatHeaderName}>{activeDisplayName}</Box>
                {!activeIsGroup && activeOther?.username && (
                  <Box sx={s.chatHeaderSub}>{activeOther.username}</Box>
                )}
              </Box>
            </Box>
            {!isPendingConv && (
              <Box sx={s.chatHeaderActions}>
                <Box component="button" type="button" sx={s.iconBtn(false)} title={t.chat.phoneCall}><PhoneIcon /></Box>
                <Box component="button" type="button" sx={s.iconBtn(false)} title={t.chat.videoCall}><VideoIcon /></Box>
                <Box
                  component="button"
                  type="button"
                  sx={s.iconBtn(showDetails)}
                  title={t.chat.info}
                  onClick={function () { setShowDetails(function (v) { return !v }) }}
                >
                  <InfoIcon />
                </Box>
              </Box>
            )}
          </Box>

          {showDetails && (
            <Box component="aside" sx={s.detailsPanel}>
              <Box sx={s.detailsTitle}>{t.chat.details}</Box>

              <Box component="button" sx={s.detailsNotifyRow} type="button" onClick={handleToggleMute}>
                <Box component="span" sx={s.detailsNotifyIcon}><BellIcon /></Box>
                <Box component="span" sx={{ ...s.detailsNotifyText, whiteSpace: 'pre-line' }}>{t.chat.mute}</Box>
                <Box component="span" sx={s.detailsSwitch(isMuted)}><span /></Box>
              </Box>

              <Box sx={s.detailsSection}>
                <Box sx={s.detailsSectionTitle}>{t.chat.members}</Box>
                {detailMembers.map(function (member) {
                  var memberUser = member.userId || {}
                  var memberId = String(memberUser._id || member.userId || '')
                  // Có biệt danh thì hiện biệt danh, tên thật lùi xuống dòng phụ
                  var memberName = member.nickname || memberUser.fullName || memberUser.username || 'Unknown'
                  // Chỉ kick thành viên thường — admin không được kick admin khác
                  var canKick = isGroupAdmin && memberId !== myId && member.role !== 'admin'
                  return (
                    <Box key={memberId} sx={s.detailsMemberRow}>
                      <Box
                        component="button"
                        sx={s.detailsMember}
                        type="button"
                        onClick={function () {
                          if (memberUser.username) navigate('/' + memberUser.username)
                        }}
                      >
                        <Avatar src={memberUser.avatarUrl} username={memberName} size="md" />
                        <Box component="span" sx={s.detailsMemberText}>
                          <Box component="span" sx={s.detailsMemberName}>{memberName}</Box>
                          <Box component="span" sx={s.detailsMemberUsername}>
                            {memberUser.username}
                            {member.role === 'admin' ? ' ' + t.chat.adminSuffix : ''}
                          </Box>
                        </Box>
                      </Box>
                      <Box
                        component="button"
                        type="button"
                        sx={s.detailsKickBtn}
                        onClick={function () { handleOpenNickname(member) }}
                      >
                        {t.chat.nickname}
                      </Box>
                      {canKick && (
                        <Box
                          component="button"
                          type="button"
                          sx={s.detailsKickBtn}
                          onClick={function () { handleKickMember(member) }}
                        >
                          {t.chat.kick}
                        </Box>
                      )}
                    </Box>
                  )
                })}
              </Box>

              <Box sx={s.detailsBottom}>
                {!activeIsGroup && (
                  <Box component="button" type="button" sx={s.detailsAction(false)} onClick={handleBlockUser} disabled={isBlocking}>
                    {isBlocking ? t.chat.blocking : t.chat.block}
                  </Box>
                )}
                {!activeIsGroup && (
                  <Box component="button" type="button" sx={s.detailsAction(true)} onClick={handleReportUser} disabled={isReporting}>
                    {isReporting ? t.chat.reporting : t.chat.report}
                  </Box>
                )}
                {activeIsGroup && isGroupCreator && (
                  <Box component="button" type="button" sx={s.detailsAction(true)} onClick={handleDeleteGroup} disabled={isDeletingChat}>
                    {isDeletingChat ? t.chat.deleting : t.chat.deleteGroup}
                  </Box>
                )}
                {activeIsGroup ? (
                  <Box component="button" type="button" sx={s.detailsAction(true)} onClick={handleLeaveGroup} disabled={isDeletingChat}>
                    {isDeletingChat ? t.chat.leaving : t.chat.leaveGroup}
                  </Box>
                ) : (
                  <Box component="button" type="button" sx={s.detailsAction(true)} onClick={handleDeleteChat} disabled={isDeletingChat}>
                    {isDeletingChat ? t.chat.deleting : t.chat.deleteChat}
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Thanh tin nhắn đã ghim — bấm vào nội dung để cuộn tới tin đó */}
          {!isPendingConv && pinnedMessages.length > 0 && (
            <Box sx={s.pinnedBar}>
              {pinnedMessages.map(function (pinned) {
                return (
                  <Box key={pinned._id} sx={s.pinnedItem}>
                    <Box
                      component="button"
                      type="button"
                      sx={s.pinnedText}
                      onClick={function () { scrollToMessage(pinned._id) }}
                    >
                      📌 {getMessagePreview(pinned)}
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      sx={s.pinnedUnpinBtn}
                      onClick={function () { handleUnpinMessage(pinned._id) }}
                    >
                      {t.chat.unpin}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}

          {/* Messages */}
          <Box sx={s.messages}>
            {msgLoading && <Spinner />}

            {/* Profile card: chỉ hiện cho direct chat trống hoặc pending — không hiện cho group */}
            {!msgLoading && (messages.length === 0 || isPendingConv) && activeOther && !activeIsGroup && (
              <Box sx={s.profileCard}>
                <Avatar src={activeOther.avatarUrl} username={activeOther.username} size="xl" isOnline={!!onlineUsers?.has(String(activeOther._id || ''))} />
                <Box sx={s.profileCardName}>{activeOther.fullName || activeOther.username}</Box>
                <Box sx={s.profileCardSub}>{activeOther.username} · Instagram</Box>
                <Box component="button" type="button" sx={s.profileCardBtn} onClick={function () { navigate('/' + activeOther.username) }}>
                  {t.chat.viewProfile}
                </Box>
              </Box>
            )}

            {/* Hiện tin nhắn đầu tiên khi pending (người nhận xem trước để quyết định) */}
            {isPendingConv && activeConv?.lastMessage?.content && (
              <Box sx={s.pendingPreviewMsg}>
                <Box sx={s.bubble(false, false)}>
                  {activeConv.lastMessage.content}
                </Box>
              </Box>
            )}

            {/* Tin nhắn bình thường (chỉ hiện khi không phải pending) */}
            {!isPendingConv && messages.map(function (msg, i) {
              if (msg.messageType === 'system') {
                return (
                  <Box key={msg._id || i} sx={s.systemMessage}>
                    {msg.content}
                  </Box>
                )
              }

              var senderId = String(msg.senderId?._id || msg.senderId || '')
              var isMine = senderId === myId
              var isMedia = msg.messageType === 'image' || msg.messageType === 'video'

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
                <Box key={msg._id || i} id={'msg-' + msg._id} sx={s.messageRow(isMine)}>
                  {!isMine && (
                    isLastInGroup
                      ? <Box sx={s.avatarSlot}><Avatar src={senderInfo?.avatarUrl} username={senderInfo?.username} size="sm" /></Box>
                      : <Box sx={s.avatarGap} />
                  )}
                  <Box sx={s.bubbleWrap(isMine)}>
                    {showName && <Box sx={s.senderName}>{senderInfo?.username}</Box>}
                    <Box sx={s.bubble(isMine, isMedia)}>
                      {msg.replyToId && (
                        <Box sx={s.replyPreviewInBubble(isMine)}>
                          <span>{getMessagePreview(msg.replyToId)}</span>
                        </Box>
                      )}
                      {msg.storyMediaUrl && (
                        <Box sx={s.storyReplyPreview}>
                          {msg.storyMediaType === 'video' ? (
                            <Box component="video" src={msg.storyMediaUrl} sx={s.storyReplyMedia} muted />
                          ) : (
                            <Box component="img" src={msg.storyMediaUrl} alt="" sx={s.storyReplyMedia} />
                          )}
                        </Box>
                      )}
                      {msg.messageType === 'image' ? (
                        <Box component="img" src={msg.content} alt="" sx={s.msgImage} />
                      ) : msg.messageType === 'video' ? (
                        <Box component="video" src={msg.content} controls sx={s.msgVideo} />
                      ) : (
                        msg.content
                      )}
                    </Box>
                    {/* Cảm xúc đã thả — gom theo loại, hiện emoji kèm số lượng khi có nhiều người */}
                    {groupReactions(msg.reactions).length > 0 && (
                      <Box sx={s.messageReactions(isMine)}>
                        {groupReactions(msg.reactions).map(function (item) {
                          return (
                            <Box component="span" key={item.type}>
                              {reactionEmoji(item.type)}
                              {item.count > 1 ? item.count : ''}
                            </Box>
                          )
                        })}
                      </Box>
                    )}

                    {isMine && i === lastMyMsgIdx && hasReaders && (
                      <Box sx={s.readReceipt}>{t.chat.seen}</Box>
                    )}
                  </Box>

                  {/* Nút thả cảm xúc — bảng chọn mở ngay phía trên nút */}
                  <Box sx={s.reactionPickerAnchor}>
                    <Box
                      component="button"
                      type="button"
                      className="messageReactBtn"
                      sx={s.messageReactBtn}
                      aria-label={t.chat.react}
                      onClick={function () {
                        setReactionPickerFor(reactionPickerFor === msg._id ? null : msg._id)
                      }}
                    >
                      {msg.myReaction ? reactionEmoji(msg.myReaction) : '☺'}
                    </Box>
                    {reactionPickerFor === msg._id && (
                      <ReactionBar
                        onPick={function (type) { handleReactMessage(msg, type) }}
                        onMouseLeave={function () { setReactionPickerFor(null) }}
                      />
                    )}
                  </Box>

                  <Box
                    component="button"
                    type="button"
                    className="messageReplyBtn"
                    sx={s.messageReplyBtn}
                    onClick={function () { handleReplyMessage(msg) }}
                  >
                    {t.chat.reply}
                  </Box>

                  {/* Ghim / bỏ ghim — mọi thành viên đều làm được, giống Messenger */}
                  <Box
                    component="button"
                    type="button"
                    className="messageReplyBtn"
                    sx={s.messageReplyBtn}
                    onClick={function () {
                      if (msg.isPinned) {
                        handleUnpinMessage(msg._id)
                      } else {
                        handlePinMessage(msg)
                      }
                    }}
                  >
                    {msg.isPinned ? t.chat.unpin : t.chat.pin}
                  </Box>

                  <Box
                    component="button"
                    type="button"
                    className="messageReplyBtn"
                    sx={s.messageReplyBtn}
                    onClick={function () { handleOpenForward(msg) }}
                  >
                    {t.chat.forward}
                  </Box>
                </Box>
              )
            })}

            {!isPendingConv && isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </Box>

          {/* Bottom: input bình thường hoặc nút Accept/Decline cho pending */}
          {isPendingConv ? (
            <Box sx={s.pendingActions}>
              <Box component="p" sx={s.pendingActionsHint}>
                {t.chat.pendingFrom.replace('{username}', activeOther?.username || '')}
              </Box>
              <Box sx={s.pendingActionsRow}>
                <Box
                  component="button"
                  type="button"
                  sx={s.acceptBtn}
                  onClick={handleAccept}
                  disabled={isAccepting}
                >
                  {isAccepting ? t.chat.processing : t.chat.acceptBtn}
                </Box>
                <Box
                  component="button"
                  type="button"
                  sx={s.declineBtn}
                  onClick={handleDecline}
                  disabled={isDeclining}
                >
                  {isDeclining ? t.chat.processing : t.chat.decline}
                </Box>
              </Box>
            </Box>
          ) : blockState.isBlocked ? (
            /* ── "Bức màn" khóa nhắn tin khi đã chặn nhau ── */
            <Box sx={{ py: 2.5, px: 3, textAlign: 'center', borderTop: '1px solid', borderTopColor: 'divider' }}>
              <Box component="p" sx={{ fontWeight: 600, color: 'text.primary', m: 0, mb: .5, fontSize: 14 }}>
                {blockState.iBlocked ? t.chat.blockedCurtainYou : t.chat.blockedCurtainOther}
              </Box>
              <Box component="p" sx={{ color: 'text.secondary', fontSize: 13, m: 0, mb: 2, lineHeight: 1.5 }}>
                {t.chat.blockedCurtainHint}
              </Box>
              {blockState.iBlocked && (
                <Box
                  component="button"
                  type="button"
                  onClick={handleUnblockFromChat}
                  sx={{
                    width: '100%',
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {t.chat.unblock}
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={s.inputWrap}>
              {replyTarget && (
                <Box sx={s.replyComposer}>
                  <Box sx={s.replyComposerText}>
                    <strong>{t.chat.replyTo.replace('{name}', getMessageSenderName(replyTarget))}</strong>
                    <span>{getMessagePreview(replyTarget)}</span>
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    sx={s.replyCancelBtn}
                    onClick={function () { setReplyTarget(null) }}
                  >
                    ×
                  </Box>
                </Box>
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
                <Box sx={s.emojiPickerWrap} ref={emojiPickerRef}>
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme="dark"
                    width={320}
                    height={380}
                    searchPlaceholder="Tìm emoji..."
                    previewConfig={{ showPreview: false }}
                  />
                </Box>
              )}
              <Box component="form" onSubmit={handleSend} sx={s.inputArea}>
                <Box sx={s.inputBox}>
                  <Box
                    component="button"
                    type="button"
                    sx={s.inputIconBtn(showEmojiPicker)}
                    onClick={function () { setShowEmojiPicker(function (v) { return !v }) }}
                  >
                    <EmojiIcon />
                  </Box>
                  <Box
                    component="input"
                    type="text"
                    sx={s.inputField}
                    placeholder={t.chat.messagePlaceholder}
                    value={input}
                    onChange={handleInputChange}
                  />
                </Box>
                {input.trim() ? (
                  <Box component="button" type="submit" sx={s.sendTextBtn}>{t.chat.send}</Box>
                ) : (
                  <Box sx={s.inputRightIcons}>
                    <Box component="button" type="button" sx={s.inputIconBtn(false)}><MicIcon /></Box>
                    <Box
                      component="button"
                      type="button"
                      sx={s.inputIconBtn(false)}
                      onClick={function () { fileInputRef.current?.click() }}
                      disabled={isUploadingMedia}
                      title={t.chat.sendMedia}
                    >
                      {isUploadingMedia ? <Spinner size={18} /> : <ImageIcon />}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={s.chatWindow(false)}>
          <Box sx={s.windowEmpty}>
            <Box sx={s.windowEmptyInner}>
              <Box sx={s.windowEmptyIcon}>
                <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </Box>
              <Box sx={s.windowEmptyTitle}>{t.chat.emptyTitle}</Box>
              <Box sx={s.windowEmptySub}>{t.chat.emptySubtitle}</Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Hộp thoại đặt biệt danh cho một thành viên — để trống là xoá biệt danh */}
      <Dialog
        open={!!nicknameTarget}
        onClose={function () { setNicknameTarget(null) }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t.chat.nickname}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={t.chat.enterNickname}
            value={nicknameInput}
            inputProps={{ maxLength: 40 }}
            onChange={function (e) { setNicknameInput(e.target.value) }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outline-secondary" onClick={function () { setNicknameTarget(null) }}>
            {t.common.cancel}
          </Button>
          <Button loading={isSavingNickname} onClick={handleSaveNickname}>
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hộp thoại chuyển tiếp: tick một hoặc nhiều cuộc trò chuyện rồi gửi */}
      <Dialog
        open={!!forwardMessageTarget}
        onClose={function () { setForwardMessageTarget(null) }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t.chat.forward}</DialogTitle>
        <DialogContent dividers>
          <List dense>
            {conversations.map(function (conv) {
              var other = getOtherParticipant(conv)
              var title = conv.type === 'group'
                ? (conv.name || t.chat.groupChat)
                : (other?.fullName || other?.username || t.chat.unknownUser)
              return (
                <ListItemButton
                  key={conv._id}
                  onClick={function () { toggleForwardTarget(String(conv._id)) }}
                >
                  <Checkbox
                    edge="start"
                    tabIndex={-1}
                    disableRipple
                    checked={forwardSelectedIds.includes(String(conv._id))}
                  />
                  <ListItemText primary={title} />
                </ListItemButton>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button variant="outline-secondary" onClick={function () { setForwardMessageTarget(null) }}>
            {t.common.cancel}
          </Button>
          <Button
            loading={isForwarding}
            disabled={forwardSelectedIds.length === 0}
            onClick={handleForwardMessage}
          >
            {t.chat.forward}
          </Button>
        </DialogActions>
      </Dialog>

      {confirmType && (
        <Box sx={s.confirmOverlay}>
          <Box sx={s.confirmBox}>
            <Box sx={s.confirmTitle}>{confirmTitle}</Box>
            <Box sx={s.confirmMessage}>{confirmMessage}</Box>
            <Box sx={s.confirmActions}>
              <Box
                component="button"
                type="button"
                sx={s.confirmCancel}
                onClick={function () { setConfirmType(''); setKickMember(null) }}
              >
                {t.chat.cancel}
              </Box>
              <Box
                component="button"
                type="button"
                sx={s.confirmOk}
                onClick={handleConfirmOk}
              >
                {confirmOkText}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}
