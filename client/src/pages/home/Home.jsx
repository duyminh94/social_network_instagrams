// pages/home/Home.jsx
// Trang chính — hiển thị feed bài viết từ những người user đang follow
//
// Luồng:
//   1. Load feed (infinite scroll)  — GET /api/posts/feed?page=X
//   2. Khi scroll xuống gần cuối   — fetchNextPage()
//   3. Khi tạo bài mới / edit xong — refetch() để hiện bài mới nhất
//   4. Khi xóa bài                 — thêm id vào deletedIds (ẩn ngay, không cần refetch)

import { useState, useCallback } from 'react'
import StoryBar from '../../components/story/StoryBar'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { useAuth } from '../../hooks/useAuth'
import { getFeed, getUserPosts } from '../../features/post/postAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import api from '../../services/api'
import PostCard from '../../components/post/PostCard'
import { FeedSkeleton } from '../../components/common/Skeletons'
import { staggerIn } from '../../theme/animations'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'

// Ngưỡng ẩn cột phải: dưới mức này màn hình không đủ chỗ cho 2 cột
var HIDE_PANEL = '@media (max-width:1160px)'
var MOBILE = '@media (max-width:768px)'

// Cắt chữ thành một dòng, quá dài thì thêm dấu ba chấm
var ellipsis = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export default function Home() {
  const { user } = useAuth()
  var queryClient = useQueryClient()
  var { t } = useLanguage()

  // Lưu id bài đã xóa để ẩn ngay mà không cần chờ refetch
  const [deletedIds, setDeletedIds] = useState([])
  const [followingIds, setFollowingIds] = useState({})

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: function ({ pageParam = 1 }) {
      return getFeed(pageParam, 10).then(function (r) { return r.data })
    },
    getNextPageParam: function (lastPage, pages) {
      var total = lastPage?.totalPages || lastPage?.pages
      if (total && pages.length < total) return pages.length + 1
      var posts = lastPage?.posts || lastPage
      if (Array.isArray(posts) && posts.length === 10) return pages.length + 1
      return undefined
    },
  })

  // loadMore được truyền vào IntersectionObserver — gọi khi sentinel vào viewport
  var loadMore = useCallback(function () {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  var sentinelRef = useInfiniteScroll(loadMore, !!hasNextPage)

  // Gộp tất cả trang lại, lọc ra bài đã xóa
  var allPosts = data?.pages?.flatMap(function (p) { return p?.posts || p || [] }) || []
  var posts = allPosts.filter(function (p) { return !deletedIds.includes(p._id) })

  var { data: suggestionsData } = useQuery({
    queryKey: ['homeSuggestions'],
    queryFn: function () {
      var recent
      try {
        // SearchPanel lưu recent vào localStorage; Home gửi username đó lên server để tăng điểm gợi ý liên quan.
        recent = JSON.parse(localStorage.getItem('instagram_recent_searches') || '[]')
          .map(function (item) { return item.username })
          .filter(Boolean)
      } catch {
        recent = []
      }

      return api.get('/users/suggestions', {
        params: {
          limit: 8,
          recent: recent.join(','),
        },
      }).then(function (r) { return r.data })
    },
    enabled: !!user,
  })

  var { data: suggestedPostsData } = useQuery({
    queryKey: ['suggestedProfilePosts', user?._id],
    queryFn: async function () {
      var viewedProfiles
      try {
        viewedProfiles = JSON.parse(localStorage.getItem('instagram_viewed_profiles') || '[]')
      } catch {
        viewedProfiles = []
      }

      var resultPosts = []
      var checkedProfiles = viewedProfiles.slice(0, 3)

      for (var i = 0; i < checkedProfiles.length; i++) {
        var profile = checkedProfiles[i]
        if (!profile?._id) continue
        if (profile._id === user?._id) continue
        if (profile.isFollowing || profile.followStatus === 'accepted') continue

        try {
          // Lấy 1 bài mới nhất của profile vừa xem để làm Suggested post.
          var res = await getUserPosts(profile._id, 1, 1)
          var firstPost = res.data?.posts?.[0]
          if (firstPost) {
            firstPost.suggestedReason = 'Suggested post'
            resultPosts.push(firstPost)
          }
        } catch {
          // Nếu profile private/block thì bỏ qua, không làm hỏng Home.
        }
      }

      return { posts: resultPosts }
    },
    enabled: !!user,
    // staleTime: 0 → luôn refetch khi mount lại (localStorage có thể thay đổi sau khi xem profile mới)
    staleTime: 0,
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
      queryClient.invalidateQueries({ queryKey: ['homeSuggestions'] })
      queryClient.invalidateQueries({ queryKey: ['suggestedProfilePosts'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success(t.home.followedToast)
    },
    onError: function (err) {
      toast.error(err?.response?.data?.message || t.home.followError)
    },
  })

  var suggestions = (suggestionsData?.users || []).filter(function (item) {
    if (followingIds[item._id]) return false
    return !item.isFollowing
  }).slice(0, 5)

  var suggestedPosts = (suggestedPostsData?.posts || []).filter(function (post) {
    var ownerId = post.user?._id
    if (!ownerId) return false
    if (followingIds[ownerId]) return false
    var existsInFeed = posts.some(function (feedPost) {
      return feedPost._id === post._id
    })
    return !existsInFeed
  })

  function handleDelete(id) {
    setDeletedIds(function (prev) { return [...prev, id] })
  }

  function handleFollow(userId) {
    if (!userId || followMutation.isPending) return
    followMutation.mutate(userId)
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1180,
        mx: 'auto',
        px: 2,
        py: 3,
        display: 'flex',
        justifyContent: 'center',
        gap: '52px',
        [HIDE_PANEL]: { maxWidth: 760, gap: 0 },
        [MOBILE]: { px: 0, pt: 2, pb: 10 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 614, flex: '0 0 auto', [MOBILE]: { maxWidth: '100%' } }}>
        <StoryBar />
        {isLoading && <FeedSkeleton />}

        {!isLoading && posts.length === 0 && (
          <Box sx={{ textAlign: 'center', p: 5, color: 'text.secondary' }}>
            <Box sx={{ fontSize: 48, mb: 1.5 }}>📸</Box>
            <Typography sx={{ fontWeight: 600, fontSize: 16 }}>{t.home.noPosts}</Typography>
            <Typography sx={{ mt: 1 }}>{t.home.noPostsDesc}</Typography>
          </Box>
        )}

        {posts.map(function (post, i) {
          return (
            // Bọc thêm một lớp Box chỉ để chạy hiệu ứng so le — không đụng vào PostCard
            <Box key={post._id} sx={staggerIn(i)}>
              {/* onUpdated: sau khi edit caption, refetch feed để hiện caption mới nhất */}
              <PostCard post={post} onDelete={handleDelete} onUpdated={refetch} />
            </Box>
          )
        })}

        {suggestedPosts.map(function (post) {
          return (
            <PostCard
              key={'suggested-' + post._id}
              post={post}
              suggestedReason={post.suggestedReason || 'Suggested post'}
              showFollow={!post.user?.isFollowing && !followingIds[post.user?._id]}
              onFollow={handleFollow}
              onDelete={handleDelete}
              onUpdated={refetch}
            />
          )
        })}

        {/* Sentinel — IntersectionObserver theo dõi phần tử này để trigger load more */}
        <Box ref={sentinelRef} sx={{ height: 20 }} />
        {isFetchingNextPage && <FeedSkeleton count={1} />}
      </Box>

      {/* Panel bên phải — giống Instagram, ẩn trên màn hình nhỏ */}
      <Box
        component="aside"
        sx={{ width: 320, flex: '0 0 320px', [HIDE_PANEL]: { display: 'none' } }}
      >
        {/* sticky: panel bám theo khi cuộn feed, không trôi mất */}
        <Box sx={{ position: 'sticky', top: 28, pt: 1 }}>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, mb: 4.25 }}>
              <Link component={RouterLink} to={`/${user.username}`} sx={{ flex: '0 0 auto' }}>
                <Avatar src={user.avatar || user.avatarUrl} username={user.username} size="lg" />
              </Link>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Link
                  component={RouterLink}
                  to={`/${user.username}`}
                  underline="none"
                  sx={{
                    ...ellipsis,
                    display: 'flex',
                    alignItems: 'center',
                    gap: .5,
                    color: 'text.primary',
                    fontSize: 15,
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                >
                  {user.username}
                  {user.isTrusted && <Icon name="verified" size={13} />}
                </Link>
                <Typography sx={{ ...ellipsis, mt: .25, color: 'text.secondary', fontSize: 15, fontWeight: 600 }}>
                  {user.fullName}
                </Typography>
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2.25 }}>
            <Typography component="strong" sx={{ fontSize: 16, fontWeight: 800 }}>
              {t.home.suggestedTitle}
            </Typography>
            <Link
              component={RouterLink}
              to="/suggested"
              underline="none"
              sx={{ fontSize: 14, fontWeight: 800, color: '#7c94ff', '&:hover': { color: '#a8b7ff' } }}
            >
              {t.home.seeAll}
            </Link>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {suggestions.length === 0 ? (
              <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 600, py: 1.5 }}>
                {t.home.noSuggestions}
              </Typography>
            ) : (
              suggestions.map(function (item) {
                return (
                  <Box key={item._id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Link
                      component={RouterLink}
                      to={`/${item.username}`}
                      underline="none"
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0, color: 'text.primary' }}
                    >
                      <Avatar src={item.avatar || item.avatarUrl} username={item.username} size="md" />
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ ...ellipsis, display: 'flex', alignItems: 'center', gap: .5, fontSize: 15, fontWeight: 800 }}>
                          {item.username}
                          {item.isTrusted && <Icon name="verified" size={14} />}
                        </Box>
                        <Typography sx={{ ...ellipsis, color: 'text.secondary', fontSize: 13, fontWeight: 600 }}>
                          {item.fullName || t.home.suggestedTitle}
                        </Typography>
                      </Box>
                    </Link>

                    <Box
                      component="button"
                      type="button"
                      disabled={followMutation.isPending}
                      onClick={function () { handleFollow(item._id) }}
                      sx={{
                        border: 0,
                        background: 'transparent',
                        color: '#7c94ff',
                        font: 'inherit',
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: 'pointer',
                        p: 0,
                        '&:hover': { color: '#a8b7ff' },
                        '&:disabled': { opacity: .55, cursor: 'not-allowed' },
                      }}
                    >
                      {t.common.follow}
                    </Box>
                  </Box>
                )
              })
            )}
          </Box>

          <Typography sx={{ mt: 6, color: 'text.secondary', fontSize: 12, lineHeight: 1.55, fontWeight: 600 }}>
            {t.home.footer}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
