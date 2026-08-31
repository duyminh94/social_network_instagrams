// pages/hashtag/HashtagPage.jsx
// Trang hashtag: 2 tab — Bài viết và Reels công khai gắn 1 hashtag (#tag).
// Cùng kiểu lưới với Explore.

import { useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AuthContext } from '../../context/AuthContext'
import { getPostsByHashtag } from '../../features/post/postAPI'
import { getReelsByHashtag } from '../../features/reel/reelAPI'
import { getHashtag, followHashtag, unfollowHashtag } from '../../features/hashtag/hashtagAPI'
import PostModal from '../../components/post/PostModal'
import MediaTypeBadge from '../../components/post/MediaTypeBadge'
import Spinner from '../../components/common/Spinner'
import Button from '../../components/common/Button'

export default function HashtagPage() {
  var { tag } = useParams()
  var navigate = useNavigate()
  var queryClient = useQueryClient()
  const { isAuthenticated } = useContext(AuthContext)
  const [selectedPost, setSelectedPost] = useState(null)
  const [activeTab, setActiveTab] = useState('posts')

  // Thông tin hashtag: số người theo dõi + mình đã theo dõi chưa
  const { data: hashtagData } = useQuery({
    queryKey: ['hashtag-info', tag],
    queryFn: function () {
      return getHashtag(tag).then(function (r) { return r.data })
    },
    enabled: !!tag,
  })

  const hashtag = hashtagData?.hashtag
  const isFollowing = !!hashtag?.isFollowing
  const followersCount = hashtag?.followersCount || 0

  const { data: postData, isLoading: postLoading } = useQuery({
    queryKey: ['hashtag', tag],
    queryFn: function () {
      return getPostsByHashtag(tag, 1, 30).then(function (r) { return r.data })
    },
    enabled: !!tag,
  })

  const { data: reelData, isLoading: reelLoading } = useQuery({
    queryKey: ['hashtag-reels', tag],
    queryFn: function () {
      return getReelsByHashtag(tag, 1, 30).then(function (r) { return r.data })
    },
    enabled: !!tag,
  })

  const posts = postData?.posts || []
  const reels = reelData?.reels || []
  const postTotal = postData?.total || 0
  const reelTotal = reelData?.total || 0

  const isPostsTab = activeTab === 'posts'
  const isLoading = isPostsTab ? postLoading : reelLoading
  const isEmpty = !isLoading && (isPostsTab ? posts.length === 0 : reels.length === 0)

  // Theo dõi / bỏ theo dõi hashtag — dùng chung 1 mutation, rẽ nhánh theo trạng thái hiện tại
  var followMutation = useMutation({
    mutationFn: function () {
      return isFollowing ? unfollowHashtag(tag) : followHashtag(tag)
    },
    onSuccess: function () {
      toast.success(isFollowing ? 'Đã bỏ theo dõi #' + tag : 'Đã theo dõi #' + tag)
      // Làm mới thông tin tag hiện tại và danh sách tag đang theo dõi
      queryClient.invalidateQueries({ queryKey: ['hashtag-info', tag] })
      queryClient.invalidateQueries({ queryKey: ['hashtags-following'] })
    },
    onError: function (error) {
      toast.error(error.response?.data?.message || 'Không thực hiện được, thử lại sau')
    },
  })

  function handleToggleFollow() {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    followMutation.mutate()
  }

  // Style nút tab — tab đang chọn có gạch chân đậm
  function tabStyle(active) {
    return {
      padding: '16px 8px',
      margin: '0 14px',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 1,
      lineHeight: 1,
      textTransform: 'uppercase',
      color: active ? 'var(--ig-text, #fff)' : 'var(--ig-text-light, #8e8e8e)',
      // reset toàn bộ viền/nền mặc định của <button> (bootstrap), chỉ giữ gạch trên khi active
      background: 'transparent',
      border: 'none',
      borderTop: active ? '1px solid var(--ig-text, #fff)' : '1px solid transparent',
      borderRadius: 0,
      marginTop: -1,
      cursor: 'pointer',
      outline: 'none',
      appearance: 'none',
      WebkitAppearance: 'none', // Safari/macOS: bỏ viền nút mặc định (cái "hộp xám")
      boxShadow: 'none',
    }
  }

  return (
    <div style={{ maxWidth: 935, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ig-text)', margin: 0 }}>
          #{tag}
        </h1>
        <span style={{ fontSize: 14, color: 'var(--ig-text-light)' }}>
          {postTotal + reelTotal} nội dung
        </span>
        <span style={{ fontSize: 14, color: 'var(--ig-text-light)' }}>
          {followersCount} người theo dõi
        </span>
        <Button
          size="sm"
          variant={isFollowing ? 'outline-secondary' : 'primary'}
          loading={followMutation.isPending}
          onClick={handleToggleFollow}
        >
          {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
        </Button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--ig-border, #2a2a2a)', marginBottom: 16 }}>
        <button type="button" style={tabStyle(isPostsTab)} onClick={function () { setActiveTab('posts') }}>
          Bài viết {postTotal > 0 ? '· ' + postTotal : ''}
        </button>
        <button type="button" style={tabStyle(!isPostsTab)} onClick={function () { setActiveTab('reels') }}>
          Reels {reelTotal > 0 ? '· ' + reelTotal : ''}
        </button>
      </div>

      {isLoading ? (
        <Spinner fullPage />
      ) : isEmpty ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center', padding: '64px 24px', gap: 8,
        }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>{isPostsTab ? '#️⃣' : '🎬'}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ig-text)' }}>
            {isPostsTab ? 'Chưa có bài viết nào' : 'Chưa có reel nào'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ig-text-light)', maxWidth: 360, lineHeight: 1.5 }}>
            Hãy là người đầu tiên đăng {isPostsTab ? 'bài' : 'reel'} với #{tag}
          </div>
        </div>
      ) : isPostsTab ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {posts.map(function (post) {
            const media = post.media?.[0]
            const mediaUrl = post.mediaUrl || media?.url
            const isVideo = post.mediaType === 'video' || media?.mediaType === 'video'
            const thumb = isVideo ? (post.thumbnailUrl || media?.thumbnailUrl) : mediaUrl
            return (
              <div
                key={post._id}
                style={{ aspectRatio: 1, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                onClick={() => setSelectedPost(post)}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt="hashtag"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.15s' }}
                    loading="lazy"
                    onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                  />
                ) : isVideo && mediaUrl ? (
                  <video
                    src={mediaUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : null}
                <MediaTypeBadge post={post} />
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {reels.map(function (reel) {
            return (
              <div
                key={reel._id}
                style={{ aspectRatio: '9 / 16', overflow: 'hidden', cursor: 'pointer', position: 'relative', background: '#000' }}
                onClick={function () { navigate('/reels/' + reel._id) }}
              >
                <video
                  src={reel.videoUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  muted
                  playsInline
                  preload="metadata"
                />
                {/* Icon reel ở góc để phân biệt */}
                <span style={{ position: 'absolute', top: 6, right: 6, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.6))' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm6 4v8l6-4-6-4z" />
                  </svg>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  )
}
