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
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { getFeed, getUserPosts } from '../../features/post/postAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import api from '../../services/api'
import PostCard from '../../components/post/PostCard'
import Spinner from '../../components/common/Spinner'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import styles from './Home.module.css'

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
    <div className={styles.homeLayout}>
      <div className={styles.feedColumn}>
        <StoryBar />
        {isLoading && <Spinner fullPage />}

        {!isLoading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{t.home.noPosts}</div>
            <div style={{ marginTop: 8 }}>{t.home.noPostsDesc}</div>
          </div>
        )}

        {posts.map(function (post) {
          return (
            // onUpdated: sau khi edit caption, refetch feed để hiện caption mới nhất
            <PostCard key={post._id} post={post} onDelete={handleDelete} onUpdated={refetch} />
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
        <div ref={sentinelRef} style={{ height: 20 }} />
        {isFetchingNextPage && <Spinner />}
      </div>

      {/* Panel bên phải — giống Instagram, ẩn trên màn hình nhỏ */}
      <aside className={styles.rightPanel}>
        <div className={styles.rightPanelSticky}>
          {user && (
            <div className={styles.meRow}>
              <Link to={`/${user.username}`} className={styles.meAvatar}>
                <Avatar src={user.avatar || user.avatarUrl} username={user.username} size="lg" />
              </Link>
              <div className={styles.meInfo}>
                <Link to={`/${user.username}`} className={styles.usernameLink}>
                  {user.username}
                  {user.isTrusted && <Icon name="verified" size={13} />}
                </Link>
                <div className={styles.fullName}>{user.fullName}</div>
              </div>
            </div>
          )}

          <div className={styles.suggestHeader}>
            <strong>{t.home.suggestedTitle}</strong>
            <Link to="/suggested">{t.home.seeAll}</Link>
          </div>

          <div className={styles.suggestList}>
            {suggestions.length === 0 ? (
              <div className={styles.emptySuggest}>{t.home.noSuggestions}</div>
            ) : (
              suggestions.map(function (item) {
                return (
                  <div key={item._id} className={styles.suggestRow}>
                    <Link to={`/${item.username}`} className={styles.suggestProfile}>
                      <Avatar src={item.avatar || item.avatarUrl} username={item.username} size="md" />
                      <span>
                        <strong>
                          {item.username}
                          {item.isTrusted && <Icon name="verified" size={14} />}
                        </strong>
                        <small>{item.fullName || t.home.suggestedTitle}</small>
                      </span>
                    </Link>
                    <button
                      type="button"
                      className={styles.followBtn}
                      disabled={followMutation.isPending}
                      onClick={function () { handleFollow(item._id) }}
                    >
                      {t.common.follow}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className={styles.footerLinks}>
            <p>{t.home.footer}</p>
          </div>
        </div>
      </aside>

    </div>
  )
}
