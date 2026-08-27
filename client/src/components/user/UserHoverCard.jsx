// UserHoverCard.jsx
// Popup hiện khi hover vào username/avatar: hiển thị avatar, tên, stats, mini post grid, nút Follow
// Props:
//   username     - username để gọi API lấy thông tin
//   onMouseEnter - giữ card mở khi di chuột vào card
//   onMouseLeave - ẩn card khi di chuột ra khỏi card

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../common/Avatar'
import { formatNumber } from '../../utils/formatNumber'
import api from '../../services/api'
import { getMyStories } from '../../features/story/storyAPI'
import styles from './UserHoverCard.module.css'

// Thumbnail nhỏ trong grid — tự ẩn nếu ảnh lỗi (broken URL)
function PostThumb({ url, href, onClick }) {
  var [broken, setBroken] = useState(false)
  if (broken) return null
  return (
    <Link to={href} onClick={onClick}>
      <img
        src={url}
        alt=""
        className={styles.postThumb}
        loading="lazy"
        onError={function () { setBroken(true) }}
      />
    </Link>
  )
}

export default function UserHoverCard({ username, onMouseEnter, onMouseLeave }) {
  var [user, setUser] = useState(null)
  var [posts, setPosts] = useState([])
  var [loading, setLoading] = useState(true)
  var [following, setFollowing] = useState(false)
  var [followLoading, setFollowLoading] = useState(false)
  var navigate = useNavigate()
  var { user: currentUser } = useAuth()
  var queryClient = useQueryClient()
  var { t } = useLanguage()

  // isSelf: thẻ đang hiện chính là tài khoản đang đăng nhập → không cho tự follow
  var isSelf = !!user && !!currentUser && user._id === currentUser._id

  useEffect(function () {
    if (!username) return
    var cancelled = false
    setLoading(true)
    setUser(null)
    setPosts([])

    var userId = null

    // Bước 1: lấy thông tin user
    api.get('/users/' + username)
      .then(function (res) {
        if (cancelled) return
        var userData = res.data.user || res.data
        setUser(userData)
        setFollowing(userData.isFollowing || false)
        userId = userData._id
        // Bước 2: lấy 3 bài viết gần nhất
        return api.get('/posts/user/' + userId + '?limit=3')
      })
      .then(function (res) {
        if (cancelled || !res) return
        var postList = res.data.posts || res.data || []
        setPosts(postList.slice(0, 3))
        setLoading(false)
      })
      .catch(function () {
        if (!cancelled) setLoading(false)
      })

    return function () { cancelled = true }
  }, [username])

  async function handleFollow() {
    if (!user) return
    setFollowLoading(true)
    try {
      if (following) {
        await api.delete('/follow/' + user._id)
        setFollowing(false)
        setUser(function (prev) {
          return prev ? { ...prev, followersCount: Math.max(0, (prev.followersCount || 0) - 1) } : prev
        })
      } else {
        await api.post('/follow/' + user._id)
        setFollowing(true)
        setUser(function (prev) {
          return prev ? { ...prev, followersCount: (prev.followersCount || 0) + 1 } : prev
        })
      }
      // Soft refresh: refetch ngầm dữ liệu profile + danh sách follow liên quan
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['followList'] })
    } catch {
      // bỏ qua lỗi follow, không crash UI
    } finally {
      setFollowLoading(false)
    }
  }

  // Bấm avatar khi user có story active → mở modal xem story (qua StoryPortal trong MainLayout)
  // Nếu không lấy được story (riêng tư/đã hết hạn/lỗi mạng) → fallback vào trang profile
  // để không bị "click chết".
  async function handleOpenStory() {
    if (!user) return
    try {
      var res = await getMyStories(user._id)
      var storyList = res.data?.stories || res.data || []
      if (storyList.length > 0) {
        var storyUser = {
          _id: user._id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          isTrusted: user.isTrusted,
        }
        // StoryPortal lắng nghe event này để render StoryViewer
        window.dispatchEvent(new CustomEvent('story:open', {
          detail: { stories: storyList, user: storyUser },
        }))
        if (onMouseLeave) onMouseLeave()
        return
      }
    } catch {
      // bỏ qua lỗi tải story → rơi xuống fallback vào profile
    }

    // Không có story để xem → vào trang profile như bình thường
    if (onMouseLeave) onMouseLeave()
    navigate('/' + user.username)
  }

  return (
    <div className={styles.card} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      )}

      {!loading && !user && (
        <div className={styles.error}>{t.userCard.notFound}</div>
      )}

      {!loading && user && (
        <>
          {/* Header: avatar lớn + username + fullName */}
          {/* Có story → bấm avatar mở story modal; không có → vào trang profile */}
          <div className={styles.header}>
            <Link
              to={'/' + user.username}
              onClick={function (e) {
                if (user.hasActiveStory) {
                  e.preventDefault()
                  handleOpenStory()
                  return
                }
                if (onMouseLeave) onMouseLeave()
              }}
              style={user.hasActiveStory ? { cursor: 'pointer' } : undefined}
            >
              <Avatar
                src={user.avatarUrl}
                username={user.username}
                size="lg"
                hasStory={user.hasActiveStory || false}
                seenStory={user.storySeen || false}
              />
            </Link>
            <div className={styles.info}>
              <div className={styles.usernameRow}>
                <Link to={'/' + user.username} className={styles.username} onClick={onMouseLeave}>
                  {user.username}
                </Link>
                {user.isTrusted && (
                  <span className={styles.verified} title={t.userCard.verified}>
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#3897f0" />
                      <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>
              {user.fullName && (
                <div className={styles.fullName}>{user.fullName}</div>
              )}
            </div>
          </div>

          {/* Thống kê: posts / followers / following */}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{formatNumber(user.postsCount || 0)}</span>
              <span className={styles.statLabel}>{t.userCard.posts}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>{formatNumber(user.followersCount || 0)}</span>
              <span className={styles.statLabel}>{t.userCard.followers}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>{formatNumber(user.followingCount || 0)}</span>
              <span className={styles.statLabel}>{t.userCard.following}</span>
            </div>
          </div>

          {/* Mini grid 3 ảnh gần nhất */}
          {posts.length > 0 && (
            <div className={styles.postGrid}>
              {posts.map(function (post) {
                var url = post.mediaUrl || post.media?.[0]?.url
                if (!url) return null
                return (
                  <PostThumb
                    key={post._id}
                    url={url}
                    href={'/' + user.username}
                    onClick={onMouseLeave}
                  />
                )
              })}
            </div>
          )}

          {/* Nút Follow / Following — ẩn khi là chính mình (không tự follow được) */}
          {isSelf ? (
            <Link
              to={'/' + user.username}
              className={styles.followBtn + ' ' + styles.followingBtn}
              onClick={onMouseLeave}
            >
              {t.userCard.viewProfile}
            </Link>
          ) : (
            <button
              className={styles.followBtn + (following ? ' ' + styles.followingBtn : '')}
              onClick={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? '...' : following ? t.common.following : t.common.follow}
            </button>
          )}
        </>
      )}
    </div>
  )
}
