// pages/explore/Explore.jsx
// Trang khám phá: xem ảnh/video bài viết nổi bật.
//
// Tìm kiếm user đã được chuyển sang panel Search ở sidebar,
// nên trang này chỉ giữ grid Explore để tránh trùng UI.

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getExplore } from '../../features/post/postAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import PostModal from '../../components/post/PostModal'
import MediaTypeBadge from '../../components/post/MediaTypeBadge'
import Box from '@mui/material/Box'
import { GridSkeleton } from '../../components/common/Skeletons'
import * as profileS from '../profile/profileStyles'
import { staggerIn } from '../../theme/animations'

export default function Explore() {
  const [selectedPost, setSelectedPost] = useState(null)
  var { t } = useLanguage()

  // Query bài viết explore — chạy luôn khi vào trang
  const { data: exploreData, isLoading: exploreLoading } = useQuery({
    queryKey: ['explore'],
    queryFn: function () {
      return getExplore(1, 24).then(function (r) { return r.data })
    },
  })

  const explorePosts = exploreData?.posts || exploreData || []
  // Rỗng khi: backend báo empty=true (user mới / chưa có tín hiệu) hoặc không có bài nào
  const isEmpty = !exploreLoading && explorePosts.length === 0

  return (
    <div style={{ maxWidth: 935, margin: '0 auto', padding: '24px 16px' }}>
      <h6 style={{
        marginBottom: 16, color: 'var(--ig-text-light)',
        fontSize: 12, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: 1,
      }}>
        {t.explore.title}
      </h6>

      {exploreLoading ? (
        <GridSkeleton count={12} gap="3px" />
      ) : isEmpty ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center',
          padding: '64px 24px', gap: 8,
        }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>🧭</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ig-text)' }}>
            {t.explore.emptyTitle}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ig-text-light)', maxWidth: 360, lineHeight: 1.5 }}>
            {t.explore.emptyHint}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {explorePosts.map(function (post, i) {
            const media = post.media?.[0]
            const mediaUrl = post.mediaUrl || media?.url
            const isVideo = post.mediaType === 'video' || media?.mediaType === 'video'
            // Video ưu tiên thumbnail để grid nhẹ và đẹp hơn; thiếu thumbnail mới fallback video.
            const thumb = isVideo ? (post.thumbnailUrl || media?.thumbnailUrl) : mediaUrl
            return (
              <Box
                key={post._id}
                // Dùng lại postThumb của trang cá nhân để 2 lưới ảnh hành xử giống nhau
                sx={{ ...profileS.postThumb, ...staggerIn(i) }}
                onClick={() => setSelectedPost(post)}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt="explore"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
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
              </Box>
            )
          })}
        </div>
      )}

      {/* Modal xem chi tiết bài viết từ grid explore */}
      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  )
}
