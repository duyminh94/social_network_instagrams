// UserHoverCard.jsx
// Popup hiện khi hover vào username/avatar: hiển thị avatar, tên, stats, mini post grid, nút Follow
// Props:
//   username     - username để gọi API lấy thông tin
//   onMouseEnter - giữ card mở khi di chuột vào card
//   onMouseLeave - ẩn card khi di chuột ra khỏi card

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Tooltip from '@mui/material/Tooltip'
import VerifiedIcon from '@mui/icons-material/Verified'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../common/Avatar'
import { formatNumber } from '../../utils/formatNumber'
import api from '../../services/api'
import { getMyStories } from '../../features/story/storyAPI'
import Spinner from '../common/Spinner'
import Button from '../common/Button'
import { slideUp, DUR } from '../../theme/animations'

// Thumbnail nhỏ trong grid — tự ẩn nếu ảnh lỗi (broken URL)
function PostThumb({ url, href, onClick }) {
  var [broken, setBroken] = useState(false)
  if (broken) return null
  return (
    <Link component={RouterLink} to={href} onClick={onClick}>
      <Box
        component="img"
        src={url}
        alt=""
        loading="lazy"
        onError={function () { setBroken(true) }}
        sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
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

  // Ba ô thống kê dùng chung một khuôn, gom lại cho khỏi lặp
  var stats = [
    { value: user?.postsCount || 0, label: t.userCard.posts },
    { value: user?.followersCount || 0, label: t.userCard.followers },
    { value: user?.followingCount || 0, label: t.userCard.following },
  ]

  return (
    <Paper
      elevation={8}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        ...slideUp(DUR.fast, 6),
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        // Nổi trên nội dung bài viết nhưng vẫn dưới lớp modal
        zIndex: 600,
        width: 330,
        p: 2.5,
        borderRadius: 4,
      }}
    >
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}>
          <Spinner />
        </Box>
      )}

      {!loading && !user && (
        <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', py: 2 }}>
          {t.userCard.notFound}
        </Typography>
      )}

      {!loading && user && (
        <>
          {/* Header: avatar lớn + username + fullName */}
          {/* Có story → bấm avatar mở story modal; không có → vào trang profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, mb: 2.25 }}>
            <Link
              component={RouterLink}
              to={'/' + user.username}
              onClick={function (e) {
                if (user.hasActiveStory) {
                  e.preventDefault()
                  handleOpenStory()
                  return
                }
                if (onMouseLeave) onMouseLeave()
              }}
              sx={user.hasActiveStory ? { cursor: 'pointer' } : undefined}
            >
              <Avatar
                src={user.avatarUrl}
                username={user.username}
                size="lg"
                hasStory={user.hasActiveStory || false}
                seenStory={user.storySeen || false}
              />
            </Link>

            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                <Link
                  component={RouterLink}
                  to={'/' + user.username}
                  onClick={onMouseLeave}
                  underline="hover"
                  sx={{ fontWeight: 700, fontSize: 16, color: 'text.primary', whiteSpace: 'nowrap' }}
                >
                  {user.username}
                </Link>
                {user.isTrusted && (
                  <Tooltip title={t.userCard.verified} arrow>
                    <VerifiedIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                  </Tooltip>
                )}
              </Box>

              {user.fullName && (
                <Typography
                  sx={{
                    fontSize: 14,
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.fullName}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Thống kê: posts / followers / following */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', mb: 2 }}>
            {stats.map(function (item) {
              return (
                <Box key={item.label} sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
                    {formatNumber(item.value)}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {item.label}
                  </Typography>
                </Box>
              )
            })}
          </Box>

          {/* Mini grid 3 ảnh gần nhất */}
          {posts.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '3px',
                mb: 1.75,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
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
            </Box>
          )}

          {/* Nút Follow / Following — ẩn khi là chính mình (không tự follow được) */}
          {isSelf ? (
            <Button
              component={RouterLink}
              to={'/' + user.username}
              onClick={onMouseLeave}
              variant="outline-secondary"
              fullWidth
            >
              {t.userCard.viewProfile}
            </Button>
          ) : (
            <Button
              fullWidth
              variant={following ? 'outline-secondary' : 'primary'}
              loading={followLoading}
              onClick={handleFollow}
            >
              {following ? t.common.following : t.common.follow}
            </Button>
          )}
        </>
      )}
    </Paper>
  )
}
