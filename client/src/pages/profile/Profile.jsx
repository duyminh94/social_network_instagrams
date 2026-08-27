// pages/profile/Profile.jsx
// Trang cá nhân: hiển thị thông tin user, danh sách bài đăng, tab Saved (chỉ chủ tài khoản)
//
// Dùng useParams để lấy username từ URL (/:username)
// Fetch profile → lấy _id → fetch posts theo _id
//
// Follow/unfollow: dùng useMutation của React Query
//   → onSuccess nhận biến isFollowing (giá trị CŨ trước khi mutate) để hiển thị toast đúng
//   → invalidateQueries để refetch profile mới nhất sau khi follow/unfollow

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { getUserPosts } from '../../features/post/postAPI'
import { getUserReels } from '../../features/reel/reelAPI'
import { getMyStories } from '../../features/story/storyAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import PostModal from '../../components/post/PostModal'
import MediaTypeBadge from '../../components/post/MediaTypeBadge'
import ReelViewerModal from '../../components/reel/ReelViewerModal'
import Spinner from '../../components/common/Spinner'
import { GridSkeleton } from '../../components/common/Skeletons'
import { staggerIn } from '../../theme/animations'
import DOMPurify from 'dompurify'
import ReportModal from '../../components/common/ReportModal'
import ConfirmModal from '../../components/common/ConfirmModal'
import { blockUser } from '../../features/block/blockAPI'
import FollowListModal from '../../components/user/FollowListModal'
import { formatNumber } from '../../utils/formatNumber'
import Icon from '../../components/common/Icon'
import * as s from './profileStyles'

export default function Profile() {
  const { username } = useParams()
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  var { t } = useLanguage()

  // Tab đang chọn: 'posts' | 'reels' | 'saved'
  const [activeTab, setActiveTab] = useState('posts')

  // Bài viết đang được chọn để xem trong PostModal
  const [selectedPost, setSelectedPost] = useState(null)

  // Reel đang được chọn (index trong mảng reels)
  const [reelViewerIndex, setReelViewerIndex] = useState(null)
  const [showReportUser, setShowReportUser] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(null)
  const [followModal, setFollowModal] = useState(null)

  // FIX: reset tab về 'posts' mỗi khi chuyển sang profile khác
  useEffect(function () {
    setActiveTab('posts')
    setSelectedPost(null)
    setReelViewerIndex(null)
  }, [username])

  // Fetch thông tin profile theo username từ URL
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: function () {
      return api.get('/users/' + username).then(function (r) { return r.data })
    },
    enabled: !!username,
  })

  const profile = profileData?.user || profileData

  // Fetch story của profile user để hiện vòng ring + cho phép click xem
  const { data: profileStoriesData } = useQuery({
    queryKey: ['stories', 'user', profile?._id],
    queryFn: function () { return getMyStories(profile._id).then(function (r) { return r.data }) },
    enabled: !!profile?._id,
  })
  var profileStories = profileStoriesData?.stories || profileStoriesData || []
  var profileHasStory = profileStories.length > 0

  // Theo dõi đã xem để vòng ring chuyển xám (giống StoryBar)
  // - openedSeen: đã mở xem trong phiên này → xám ngay, reset khi rời trang
  // - seenOwnStoryIds: id story của mình đã xem, lưu localStorage để nhớ qua reload
  //   (server không ghi nhận lượt xem story của chính mình)
  var [openedSeen, setOpenedSeen] = useState(false)
  var [seenOwnStoryIds, setSeenOwnStoryIds] = useState(function () {
    try {
      return new Set(JSON.parse(localStorage.getItem('seenOwnStoryIds') || '[]'))
    } catch {
      return new Set()
    }
  })

  // Fetch bài viết của user (chạy sau khi có profile._id)
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['userPosts', profile?._id],
    queryFn: function () {
      return getUserPosts(profile._id).then(function (r) { return r.data })
    },
    enabled: !!profile?._id,
  })

  // Fetch bài đã lưu (chỉ chạy khi xem trang của chính mình)
  const { data: savedData } = useQuery({
    queryKey: ['savedPosts', me?._id],
    queryFn: function () {
      return api.get('/saved').then(function (r) { return r.data })
    },
    enabled: !!me?._id && profile?._id === me?._id,
  })

  // Fetch reels của user này (privacy/block do server xử lý)
  const { data: reelsData, isLoading: reelsLoading } = useQuery({
    queryKey: ['userReels', profile?._id],
    queryFn: function () {
      return getUserReels(profile._id).then(function (r) { return r.data })
    },
    enabled: !!profile?._id,
  })

  // Mutation follow/unfollow
  // isFollowing được truyền vào mutate() và nhận lại trong onSuccess
  // → Tránh dùng profile?.isFollowing trực tiếp trong onSuccess (giá trị có thể đã stale)
  const followMutation = useMutation({
    mutationFn: function (isFollowing) {
      if (isFollowing) {
        return api.delete('/follow/' + profile._id)
      } else {
        return api.post('/follow/' + profile._id)
      }
    },
    // Optimistic update: đổi nút + followersCount NGAY khi bấm, không chờ API trả về
    // → tránh cảm giác lag "đợi reload lâu" do phải refetch toàn bộ profile
    onMutate: async function (isFollowing) {
      // Huỷ refetch đang chạy để không ghi đè dữ liệu lạc quan vừa set
      await queryClient.cancelQueries({ queryKey: ['profile', username] })
      var previous = queryClient.getQueryData(['profile', username])

      queryClient.setQueryData(['profile', username], function (old) {
        if (!old) return old
        var u = old.user || old
        var wasAccepted = u.followStatus === 'accepted'
        var delta = 0
        var newFollowStatus

        if (isFollowing) {
          // Đang huỷ follow / huỷ request → chỉ giảm count nếu trước đó đã accepted
          if (wasAccepted) delta = -1
          newFollowStatus = null
        } else {
          // Follow mới: tài khoản riêng tư → pending (chưa tăng count); công khai → accepted (+1)
          if (u.isPrivate) {
            newFollowStatus = 'pending'
          } else {
            newFollowStatus = 'accepted'
            delta = 1
          }
        }

        var updatedUser = Object.assign({}, u, {
          isFollowing: !isFollowing,
          followStatus: newFollowStatus,
          followersCount: Math.max(0, (u.followersCount || 0) + delta),
        })
        return old.user ? Object.assign({}, old, { user: updatedUser }) : updatedUser
      })

      // Trả về snapshot cũ để onError khôi phục nếu API lỗi
      return { previous: previous }
    },
    onError: function (err, isFollowing, context) {
      if (context && context.previous) {
        queryClient.setQueryData(['profile', username], context.previous)
      }
      toast.error(t.profile.actionFailed)
    },
    onSuccess: function (data, isFollowing) {
      // isFollowing là giá trị TRƯỚC khi mutate → hiện đúng thông báo
      toast.success(isFollowing ? t.profile.unfollowed : t.profile.followed)
    },
    onSettled: function () {
      // Soft refresh: đồng bộ lại với server ở chế độ nền — UI đã đúng nên không flicker
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['followList'] })
    },
  })

  // Accept/Decline follow request từ người đang xem profile (incomingFollowStatus = 'pending')
  const acceptMutation = useMutation({
    mutationFn: () => api.patch(`/follow/${profile._id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      toast.success(t.profile.acceptedFollow)
    },
    onError: () => toast.error(t.profile.cannotAccept),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.delete(`/follow/${profile._id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      toast.success(t.profile.rejectedFollow)
    },
    onError: () => toast.error(t.profile.cannotReject),
  })

  useEffect(function () {
    if (!profile || !me) return

    var isMyProfile = me?._id === profile._id || me?.username === profile.username
    if (isMyProfile) return

    try {
      var oldList = JSON.parse(localStorage.getItem('instagram_viewed_profiles') || '[]')
      var nextList = oldList.filter(function (item) {
        return item._id !== profile._id
      })

      // Lưu profile vừa xem để Home có thể gợi ý bài viết của người đó.
      nextList.unshift({
        _id: profile._id,
        username: profile.username,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl || profile.avatar,
        isTrusted: profile.isTrusted,
        isFollowing: profile.isFollowing,
        followStatus: profile.followStatus,
      })

      localStorage.setItem('instagram_viewed_profiles', JSON.stringify(nextList.slice(0, 8)))
    } catch {
      // localStorage có thể lỗi nếu browser chặn, không ảnh hưởng trang profile.
    }
  }, [profile, me])

  // Xử lý khi bài viết bị xóa từ PostModal: đóng modal và refetch danh sách bài
  function handlePostDelete() {
    setSelectedPost(null)
    refetchPosts()
  }

  // Xử lý khi bài viết được sửa từ PostModal: refetch để cập nhật caption mới
  function handlePostUpdated() {
    refetchPosts()
  }

  // Chặn người dùng ngay từ trang cá nhân của họ
  const blockMutation = useMutation({
    mutationFn: function () { return blockUser(profile._id) },
    onSuccess: function () {
      toast.success(t.profile.blockedUser)
      // Sau khi chặn, server trả 403 nếu cố xem lại hồ sơ → điều hướng về trang chủ
      navigate('/')
    },
    onError: function (err) {
      toast.error(err.response?.data?.message || t.profile.blockFailed)
    },
  })

  function handleMessageClick() {
    navigate('/chat?user=' + profile.username)
  }

  if (profileLoading) return <Spinner fullPage />
  if (!profile) return <div style={{ padding: 40, textAlign: 'center' }}>{t.profile.notFound}</div>

  // Kiểm tra đây có phải trang của chính mình không
  const isOwn = me?._id === profile._id || me?.username === profile.username

  // Vòng ring "đã xem hết": mở trong phiên này, hoặc server đã ghi nhận xem hết
  // (người khác), hoặc đã lưu localStorage (story của chính mình)
  var seenFromServer = profileHasStory && profileStories.every(function (s) { return s.seen })
  var seenFromLocal = isOwn && profileHasStory && profileStories.every(function (s) {
    return seenOwnStoryIds.has(s._id)
  })
  var profileStorySeen = profileHasStory && (openedSeen || seenFromServer || seenFromLocal)
  const followStatus = profile.followStatus || null
  const canViewContent = isOwn || !profile.isPrivate || followStatus === 'accepted'

  const posts = postsData?.posts || postsData || []

  // FIX: backend /saved trả { saved: [...] } mỗi item là { postId: <Post>, ... }
  // Normalize: lấy postId (Post thật) ra để displayPosts đồng nhất với posts
  const saved = (savedData?.saved || [])
    .map(function (item) { return item.postId })
    .filter(Boolean)

  const userReels = reelsData?.reels || []

  const displayPosts = activeTab === 'posts' ? posts : saved

  return (
    <div style={{ maxWidth: 935, margin: '0 auto', padding: '0 20px' }}>
      {/* Header: avatar + thông tin + nút follow/edit */}
      <Box sx={s.header}>
        <Avatar
          src={profile.avatarUrl || profile.avatar}
          username={profile.username}
          size="xxl"
          hasStory={profileHasStory}
          seenStory={profileStorySeen}
          onClick={profileHasStory ? function () {
            // Đánh dấu đã xem ngay để vòng chuyển xám (giống StoryBar)
            setOpenedSeen(true)
            if (isOwn) {
              var ids = profileStories.map(function (s) { return s._id })
              setSeenOwnStoryIds(function (prev) {
                var next = new Set(prev)
                ids.forEach(function (id) { next.add(id) })
                try {
                  localStorage.setItem('seenOwnStoryIds', JSON.stringify(Array.from(next)))
                } catch { /* localStorage bị chặn — bỏ qua */ }
                return next
              })
            }
            window.dispatchEvent(new CustomEvent('story:open', {
              detail: { stories: profileStories, user: profile }
            }))
          } : undefined}
        />
        <Box sx={s.profileInfo}>
          <Box sx={s.topRow}>
            <Typography component="h2" sx={s.usernameTitle}>
              {profile.username}
              {profile.isTrusted && (
                <span style={{ marginLeft: 6, verticalAlign: 'middle' }} title={t.userCard?.verified || 'Tài khoản đã xác minh'}>
                  <Icon name="verified" size={20} />
                </span>
              )}
            </Typography>

            {!isOwn && (
              <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <IconButton
                  size="small"
                  title={t.profile.report}
                  onClick={function (e) { setShowProfileMenu(e.currentTarget) }}
                >
                  <MoreHorizIcon />
                </IconButton>

                {/* anchorEl là chính nút vừa bấm, MUI tự canh vị trí menu theo nó */}
                <Menu
                  anchorEl={showProfileMenu}
                  open={!!showProfileMenu}
                  onClose={function () { setShowProfileMenu(null) }}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem
                    sx={{ color: '#ff5a6b', fontWeight: 700 }}
                    onClick={function () {
                      setShowProfileMenu(null)
                      setShowReportUser(true)
                    }}
                  >
                    {t.profile.report}
                  </MenuItem>
                  <MenuItem
                    sx={{ color: '#ff5a6b', fontWeight: 700 }}
                    onClick={function () {
                      setShowProfileMenu(null)
                      setShowBlockConfirm(true)
                    }}
                  >
                    {t.profile.block}
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Box>

          {/* Thống kê: số bài, followers, following */}
          <Box sx={s.stats}>
            <Box sx={s.statItem}>
              <Box component="span" sx={s.statNum}>{formatNumber(profile.postsCount || posts.length || 0)}</Box>
              <Box component="span" sx={s.statLabel}>{t.profile.posts}</Box>
            </Box>
            <Box
              component="button"
              sx={s.statItem}
              onClick={() => canViewContent ? setFollowModal('followers') : toast.error(t.profile.privateToast)}
            >
              <Box component="span" sx={s.statNum}>{formatNumber(profile.followersCount || 0)}</Box>
              <Box component="span" sx={s.statLabel}>{t.profile.followers}</Box>
            </Box>
            <Box
              component="button"
              sx={s.statItem}
              onClick={() => canViewContent ? setFollowModal('following') : toast.error(t.profile.privateToast)}
            >
              <Box component="span" sx={s.statNum}>{formatNumber(profile.followingCount || 0)}</Box>
              <Box component="span" sx={s.statLabel}>{t.profile.following}</Box>
            </Box>
          </Box>

          <div style={{ marginTop: 12 }}>
            {profile.fullName && <div style={{ fontWeight: 600 }}>{profile.fullName}</div>}
            {profile.bio && (
              <Box
                sx={s.bio}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(profile.bio, {
                  ALLOWED_TAGS: ['b', 'i', 'u', 'br', 'span', 'p', 'div', 'strong', 'em'],
                  ALLOWED_ATTR: ['style'],
                }) }}
              />
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: 'var(--ig-blue)', fontSize: 14 }}>
                {profile.website}
              </a>
            )}
          </div>

          {/* Chủ tài khoản → edit; người khác → follow/message giống Instagram */}
          <Box sx={s.profileActions}>
            {isOwn ? (
              <Button
                variant="outline-secondary"
                size="sm"
                style={{ fontWeight: 600 }}
                onClick={() => navigate('/' + profile.username + '/edit')}
              >
                {t.profile.editProfile}
              </Button>
            ) : (
              <>
                <Box
                  component="button"
                  type="button"
                  sx={profile.isFollowing ? s.followingBtn : s.followPrimaryBtn}
                  disabled={followMutation.isPending}
                  onClick={() => followMutation.mutate(profile.isFollowing)}
                >
                  {profile.followStatus === 'pending'
                    ? t.common.requested
                    : profile.isFollowing
                      ? t.common.following
                      : t.common.follow}
                  {profile.isFollowing && <Box component="span" sx={s.downIcon}>⌄</Box>}
                </Box>

                {profile.isFollowing && (
                  <Box
                    component="button"
                    type="button"
                    sx={s.messageBtn}
                    onClick={handleMessageClick}
                  >
                    Message
                  </Box>
                )}

                {/* Nút Accept/Decline khi người này có pending request follow mình */}
                {profile.incomingFollowStatus === 'pending' && (
                  <Box sx={s.requestActions}>
                    <Button
                      size="sm"
                      style={{ fontWeight: 600 }}
                      loading={acceptMutation.isPending}
                      onClick={() => acceptMutation.mutate()}
                    >
                      {t.common.accept}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      style={{ fontWeight: 600 }}
                      loading={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate()}
                    >
                      {t.common.decline}
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Tab Posts / Reels / Saved */}
      <Box sx={s.tabs}>
        <Box
          component="button"
          sx={{ ...s.tab, ...(activeTab === 'posts' ? s.tabActive : null) }}
          onClick={() => setActiveTab('posts')}
        >
          {t.profile.postsTab}
        </Box>
        <Box
          component="button"
          sx={{ ...s.tab, ...(activeTab === 'reels' ? s.tabActive : null) }}
          onClick={() => setActiveTab('reels')}
        >
          🎬 {t.profile.reelsTab}
        </Box>
        {/* Tab Saved chỉ hiện cho chủ tài khoản */}
        {isOwn && (
          <Box
            component="button"
            sx={{ ...s.tab, ...(activeTab === 'saved' ? s.tabActive : null) }}
            onClick={() => setActiveTab('saved')}
          >
            {t.profile.savedTab}
          </Box>
        )}
      </Box>

      {/* ── Tab Reels ── */}
      {activeTab === 'reels' && (
        !canViewContent ? null :
        reelsLoading ? <GridSkeleton /> :
        userReels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--ig-text-light)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎬</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{t.profile.noReels}</div>
          </div>
        ) : (
          <Box sx={s.postsGrid}>
            {userReels.map(function (reel, i) {
              return (
                <Box
                  key={reel._id}
                  sx={s.postThumb}
                  onClick={() => setReelViewerIndex(i)}
                  style={{ cursor: 'pointer', background: '#111', position: 'relative' }}
                >
                  <video
                    src={reel.videoUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    muted playsInline preload="metadata"
                  />
                  {/* Icon reel góc trên phải */}
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    color: '#fff', fontSize: 14, lineHeight: 1,
                    textShadow: '0 1px 4px rgba(0,0,0,.7)',
                  }}>🎬</div>
                  {/* Lượt like góc dưới trái */}
                  <div style={{
                    position: 'absolute', bottom: 6, left: 8,
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 3,
                    textShadow: '0 1px 4px rgba(0,0,0,.7)',
                  }}>
                    ♥ {reel.likesCount || 0}
                  </div>
                </Box>
              )
            })}
          </Box>
        )
      )}

      {/* Grid ảnh bài viết (Posts / Saved) — ẩn hoàn toàn khi đang ở tab Reels */}
      {activeTab !== 'reels' && (
        !canViewContent ? (
          /* Tài khoản riêng tư — chưa được follow */
          <div style={{ textAlign: 'center', padding: '48px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              border: '2px solid var(--ink)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t.profile.privateAccount}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-muted)' }}>
              {followStatus === 'pending'
                ? t.profile.pendingFollow
                : t.profile.notFollowing}
            </div>
          </div>
        ) : postsLoading ? (
          <GridSkeleton />
        ) : displayPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--ig-text-light)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{t.profile.noPosts}</div>
          </div>
        ) : (
          <Box sx={s.postsGrid}>
            {displayPosts.map(function (post, i) {
              const media = post.media?.[0]
              const mediaUrl = post.mediaUrl || media?.url
              const isVideo = post.mediaType === 'video' || media?.mediaType === 'video'
              const thumb = isVideo ? (post.thumbnailUrl || media?.thumbnailUrl) : mediaUrl
              return (
                <Box
                  key={post._id}
                  sx={{ ...s.postThumb, ...staggerIn(i) }}
                  onClick={() => setSelectedPost(post)}
                  style={{ cursor: 'pointer', background: 'var(--bg-elevated)' }}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt="post"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : isVideo && mediaUrl ? (
                    <video
                      src={mediaUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                      </svg>
                    </div>
                  )}
                  <MediaTypeBadge post={post} />
                </Box>
              )
            })}
          </Box>
        )
      )}

      {/* Modal xem chi tiết bài viết khi click vào thumbnail */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={handlePostDelete}
          onUpdated={handlePostUpdated}
          onSavedChange={function (postId, isSaved) {
            // Bỏ lưu ở tab "Đã lưu" → refetch để bài biến mất khỏi danh sách
            if (!isSaved) {
              queryClient.invalidateQueries({ queryKey: ['savedPosts', me?._id] })
              if (activeTab === 'saved') setSelectedPost(null)
            }
          }}
        />
      )}

      {/* Modal xem reel từ grid profile */}
      {reelViewerIndex !== null && userReels.length > 0 && (
        <ReelViewerModal
          reels={userReels}
          initialIndex={reelViewerIndex}
          isOwn={isOwn}
          onClose={() => setReelViewerIndex(null)}
          onDeleted={() => {
            setReelViewerIndex(null)
            queryClient.invalidateQueries({ queryKey: ['userReels', profile._id] })
          }}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['userReels', profile._id] })
          }}
        />
      )}

      {showReportUser && (
        <ReportModal
          targetId={profile._id}
          targetType="user"
          onClose={function () { setShowReportUser(false) }}
        />
      )}

      {showBlockConfirm && (
        <ConfirmModal
          message={t.profile.blockConfirm.replace('{name}', profile.username)}
          onConfirm={function () { setShowBlockConfirm(false); blockMutation.mutate() }}
          onCancel={function () { setShowBlockConfirm(false) }}
        />
      )}

      {followModal && (
        <FollowListModal
          userId={profile._id}
          type={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}
    </div>
  )
}
