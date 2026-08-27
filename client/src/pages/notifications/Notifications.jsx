// pages/notifications/Notifications.jsx
// Trang thông báo — có tab lọc + gợi ý follow giống Instagram

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getNotifications,
  markAllRead,
  markRead,
  deleteNotification,
} from '../../features/notification/notificationAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import { timeAgo } from '../../utils/formatTime'
import { useSocket } from '../../hooks/useSocket'
import api from '../../services/api'
import styles from './Notifications.module.css'

function HeartIcon() {
  return (
    <svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

function SecurityIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function notifText(notif, t) {
  switch (notif.type) {
    case 'like':           return t.notifications.liked
    case 'comment':        return t.notifications.commented
    case 'follow':         return t.notifications.followed
    case 'follow_request': return t.notifications.followRequest
    case 'mention':        return t.notifications.mentioned
    case 'reply':          return t.notifications.replied
    case 'account_banned': return t.notifications.banned
    case 'post_removed':   return t.notifications.postRemoved
    case 'verification_approved': return t.notifications.verificationApproved
    case 'verification_rejected': return t.notifications.verificationRejected
    // Thu hồi tích xanh: hiện text gốc + lý do admin nhập (nếu có)
    case 'verification_revoked':
      return t.notifications.verificationRevoked + (notif.message ? ' ' + t.notifications.reasonLabel + ': ' + notif.message : '')
    default:               return notif.message || t.notifications.defaultNotif
  }
}

function notifLink(notif) {
  // Follow / follow request → trang cá nhân người gửi
  if (notif.type === 'follow' || notif.type === 'follow_request') {
    return '/' + (notif.senderId?.username || '')
  }

  // Like / comment / mention / reply → nhảy tới đúng nội dung dựa vào reference
  // referenceType: 'post' | 'reel' | 'comment' | ...   referenceId: id của nội dung đó
  var refId = notif.referenceId
  if (refId) {
    if (notif.referenceType === 'post') return '/p/' + refId
    if (notif.referenceType === 'reel') return '/reels/' + refId
  }

  // Không xác định được nội dung (vd like/reply trên 1 comment — chỉ có id comment,
  // chưa biết thuộc bài nào) → fallback về trang cá nhân người gửi
  return '/' + (notif.senderId?.username || '')
}

function isInTab(notif, activeTab) {
  if (activeTab === 'all') return true
  if (activeTab === 'follow') {
    return notif.type === 'comment'
      || notif.type === 'reply'
      || notif.type === 'mention'
      || notif.type === 'like'
  }
  if (activeTab === 'comments') {
    return notif.type === 'comment' || notif.type === 'reply' || notif.type === 'mention'
  }
  if (activeTab === 'likes') {
    return notif.type === 'like'
  }
  return true
}

function monthLabel(dateStr, t) {
  var date = dateStr ? new Date(dateStr) : new Date()
  var now = new Date()
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return t.notifications.thisMonth
  }
  return t.notifications.older
}

export default function Notifications({ isPanel = false, onClose }) {
  var navigate = useNavigate()
  var queryClient = useQueryClient()
  var { socket, resetNotifCount, decrementNotifCount } = useSocket() || {}
  var { t } = useLanguage()
  var [activeTab, setActiveTab] = useState('all')
  var [followingIds, setFollowingIds] = useState({})
  var [handledRequests, setHandledRequests] = useState({})

  var tabs = [
    { key: 'all', label: t.notifications.tabAll },
    { key: 'follow', label: t.notifications.tabFollowing },
    { key: 'comments', label: t.notifications.tabComments },
    { key: 'likes', label: t.notifications.tabLikes },
  ]

  var { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: function () { return getNotifications().then(function (r) { return r.data }) },
  })

  var { data: suggestData } = useQuery({
    queryKey: ['notification-suggestions'],
    queryFn: function () {
      return api.get('/users/search', { params: { q: '', limit: 10 } }).then(function (r) { return r.data })
    },
  })

  useEffect(function () {
    if (!socket) return
    function onNewNotif() {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    socket.on('new_notification', onNewNotif)
    return function () {
      socket.off('new_notification', onNewNotif)
    }
  }, [socket, queryClient])

  var markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      resetNotifCount?.()
      toast.success(t.notifications.markedAllRead)
    },
    onError: function () { toast.error(t.notifications.markAllFailed) },
  })

  var deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  var followMutation = useMutation({
    mutationFn: function (userId) {
      return api.post('/follow/' + userId)
    },
    onSuccess: function (_res, userId) {
      setFollowingIds(function (prev) {
        var next = Object.assign({}, prev)
        next[userId] = true
        return next
      })
      toast.success(t.notifications.followedToast)
    },
    onError: function (err) {
      toast.error(err?.response?.data?.message || t.notifications.followError)
    },
  })

  var acceptMutation = useMutation({
    mutationFn: function (followerId) {
      return api.patch('/follow/' + followerId + '/accept')
    },
    onSuccess: function (_res, followerId) {
      setHandledRequests(function (prev) { return Object.assign({}, prev, { [followerId]: 'accepted' }) })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success(t.notifications.acceptedToast)
    },
    onError: function () { toast.error(t.notifications.acceptError) },
  })

  var rejectMutation = useMutation({
    mutationFn: function (followerId) {
      return api.delete('/follow/' + followerId + '/reject')
    },
    onSuccess: function (_res, followerId) {
      setHandledRequests(function (prev) { return Object.assign({}, prev, { [followerId]: 'rejected' }) })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success(t.notifications.rejectedToast)
    },
    onError: function () { toast.error(t.notifications.rejectError) },
  })

  async function handleClick(notif) {
    try {
      await markRead(notif._id)
      // Chỉ giảm badge nếu thông báo này trước đó chưa đọc
      if (!notif.isRead) {
        decrementNotifCount?.()
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch { /* ignore */ }
    navigate(notifLink(notif))
    if (isPanel && onClose) onClose()
  }

  function handleFollow(userId) {
    if (!userId || followMutation.isPending) return
    followMutation.mutate(userId)
  }

  var notifications = data?.notifications || data || []
  var filteredNotifications = notifications.filter(function (notif) {
    return isInTab(notif, activeTab)
  })
  var suggestions = (suggestData?.users || []).filter(function (u) {
    if (followingIds[u._id]) return false
    return !u.isFollowing
  }).slice(0, 8)

  var currentMonthLabel = filteredNotifications.length > 0
    ? monthLabel(filteredNotifications[0].createdAt, t)
    : t.notifications.thisMonth

  function handleClose() {
    if (onClose) {
      onClose()
    } else {
      navigate(-1)
    }
  }

  return (
    <div className={styles.page + (isPanel ? ' ' + styles.panelPage : '')}>
      <div className={styles.header}>
        <h1>{t.notifications.title}</h1>
        <button className={styles.closeBtn} type="button" onClick={handleClose}>
          <CloseIcon />
        </button>
      </div>

      <div className={styles.tabs}>
        {tabs.map(function (tab) {
          return (
            <button
              key={tab.key}
              type="button"
              className={styles.tab + (activeTab === tab.key ? ' ' + styles.tabActive : '')}
              onClick={function () { setActiveTab(tab.key) }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {notifications.some(function (n) { return !n.isRead }) && (
        <button
          className={styles.markAllBtn}
          type="button"
          disabled={markAllMutation.isPending}
          onClick={function () { markAllMutation.mutate() }}
        >
          {t.notifications.markAllRead}
        </button>
      )}

      {isLoading && <Spinner />}

      {!isLoading && filteredNotifications.length > 0 && (
        <section className={styles.notificationSection}>
          <h2>{currentMonthLabel}</h2>
          {filteredNotifications.map(function (notif) {
            var senderId = notif.senderId?._id || notif.senderId
            var isRequest = notif.type === 'follow_request'
            var requestStatus = handledRequests[senderId]

            return (
              <div
                key={notif._id}
                className={styles.notificationItem + (!notif.isRead ? ' ' + styles.unread : '')}
                onClick={function () { handleClick(notif) }}
                style={{ cursor: 'pointer' }}
              >
                <Avatar src={notif.senderId?.avatarUrl} username={notif.senderId?.username || 'IG'} size="md" />
                <div className={styles.notificationText}>
                  <span className={styles.username}>{notif.senderId?.username || 'Instagram'}</span>
                  <span> {notifText(notif, t)} </span>
                  <span className={styles.time}>{timeAgo(notif.createdAt)}</span>
                </div>

                {isRequest && !requestStatus && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={function (e) { e.stopPropagation() }}>
                    <button
                      type="button"
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: 'none',
                        background: 'var(--accent)', color: '#fff',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                      disabled={acceptMutation.isPending || rejectMutation.isPending}
                      onClick={function () { acceptMutation.mutate(senderId) }}
                    >
                      {t.common.accept}
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '6px 14px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                        color: 'var(--ink)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                      disabled={acceptMutation.isPending || rejectMutation.isPending}
                      onClick={function () { rejectMutation.mutate(senderId) }}
                    >
                      {t.common.decline}
                    </button>
                  </div>
                )}

                {isRequest && requestStatus === 'accepted' && (
                  <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>{t.notifications.accepted}</span>
                )}
                {isRequest && requestStatus === 'rejected' && (
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)', flexShrink: 0 }}>{t.notifications.rejected}</span>
                )}

                {!isRequest && notif.post?.mediaUrl && (
                  <img src={notif.post.mediaUrl} alt="" className={styles.postThumb} />
                )}
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={function (e) { e.stopPropagation(); deleteMutation.mutate(notif._id) }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </section>
      )}

      {!isLoading && activeTab === 'all' && filteredNotifications.length === 0 && (
        <section className={styles.notificationSection}>
          <h2>{t.notifications.thisMonth}</h2>
          <div className={styles.securityItem}>
            <div className={styles.securityIcon}>
              <SecurityIcon />
            </div>
            <p>
              Ai đó đang cố đăng nhập vào Instagram. Hãy cho chúng tôi biết nếu đó là bạn.
              <span> May 08</span>
            </p>
          </div>
        </section>
      )}

      {!isLoading && activeTab !== 'all' && filteredNotifications.length === 0 && (
        <section className={styles.emptyCard}>
          <div className={styles.emptyIcon}><HeartIcon /></div>
          <h2>{t.notifications.emptyTitle}</h2>
          <p>{t.notifications.emptyDesc}</p>
        </section>
      )}

      {activeTab === 'follow' && (
        <section className={styles.suggestions}>
          <h2>{t.notifications.suggestionsTitle}</h2>
          {suggestions.length === 0 ? (
            <div className={styles.suggestionEmpty}>{t.notifications.noSuggestions}</div>
          ) : (
            suggestions.map(function (u) {
              return (
                <div key={u._id} className={styles.suggestionItem}>
                  <button
                    type="button"
                    className={styles.suggestionProfile}
                    onClick={function () {
                      navigate('/' + u.username)
                      if (isPanel && onClose) onClose()
                    }}
                  >
                    <Avatar src={u.avatarUrl} username={u.username} size="md" />
                    <span>
                      <strong>{u.username}</strong>
                      <small>{u.fullName || t.notifications.suggestionReason}</small>
                      <small>{t.notifications.suggestionReason}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.followBtn}
                    onClick={function () { handleFollow(u._id) }}
                    disabled={followMutation.isPending}
                  >
                    {t.notifications.followBtn}
                  </button>
                </div>
              )
            })
          )}
        </section>
      )}
    </div>
  )
}
