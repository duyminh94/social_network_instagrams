// components/common/Skeletons.jsx
// Bộ khung xương (skeleton) cho các trạng thái đang tải
//
// Vì sao thay cho <Spinner />: vòng xoay chỉ nói "đang chờ", còn khung xương vẽ
//   sẵn đúng hình dạng nội dung sắp hiện ra. Người dùng thấy bố cục ngay nên
//   cảm giác nhanh hơn, và trang cũng không bị giật khi dữ liệu về (không nhảy layout)
//
// Dùng Skeleton của MUI — đã có sẵn trong @mui/material, không thêm dependency.
//   variant="rounded" cho khối, "text" cho dòng chữ, "circular" cho avatar

import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

// Số phần tử giả mặc định cho mỗi loại danh sách
var FEED_COUNT = 3
var GRID_COUNT = 9
var LIST_COUNT = 6

// Ô vuông 1:1.
// BẮT BUỘC có height: 'auto' — Skeleton của MUI đặt sẵn height: 1.2em ở root,
//   không trả về auto thì aspect-ratio bị đè và ô dẹp thành một thanh ngang
var squareSx = { width: '100%', height: 'auto', aspectRatio: '1' }

// Tạo mảng [0, 1, ... n-1] để map ra n khung xương
function times(n) {
  return Array.from({ length: n }, function (_, i) { return i })
}

// Một thẻ bài viết: header (avatar + tên) → ảnh vuông → hàng nút → caption
function PostCardSkeleton() {
  return (
    <Box sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}>
        <Skeleton variant="circular" width={38} height={38} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="35%" sx={{ fontSize: 14 }} />
          <Skeleton variant="text" width="20%" sx={{ fontSize: 12 }} />
        </Box>
      </Box>

      {/* Ảnh bài viết luôn vuông 1:1 nên khung xương cũng vậy */}
      <Skeleton variant="rectangular" sx={squareSx} />

      <Box sx={{ display: 'flex', gap: 2, px: 1.5, pt: 1.5 }}>
        <Skeleton variant="circular" width={26} height={26} />
        <Skeleton variant="circular" width={26} height={26} />
        <Skeleton variant="circular" width={26} height={26} sx={{ ml: 'auto' }} />
      </Box>
      <Box sx={{ px: 2, pb: 2, pt: 1 }}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="55%" />
      </Box>
    </Box>
  )
}

export function FeedSkeleton({ count = FEED_COUNT }) {
  return times(count).map(function (i) {
    return <PostCardSkeleton key={i} />
  })
}

// Lưới ảnh 3 cột dùng ở trang cá nhân và Khám phá
export function GridSkeleton({ count = GRID_COUNT, columns = 3, gap = '3px' }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(' + columns + ', 1fr)', gap: gap }}>
      {times(count).map(function (i) {
        return <Skeleton key={i} variant="rectangular" sx={squareSx} />
      })}
    </Box>
  )
}

// Danh sách có avatar tròn + 2 dòng chữ: hội thoại, người theo dõi, gợi ý...
export function ListSkeleton({ count = LIST_COUNT, avatarSize = 44, px = 2, py = 1.25 }) {
  return times(count).map(function (i) {
    return (
      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: px, py: py }}>
        <Skeleton variant="circular" width={avatarSize} height={avatarSize} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="40%" sx={{ fontSize: 14 }} />
          <Skeleton variant="text" width="65%" sx={{ fontSize: 12 }} />
        </Box>
      </Box>
    )
  })
}

// Bình luận: avatar nhỏ hơn, dòng nội dung dài hơn dòng tên
export function CommentSkeleton({ count = 3 }) {
  return times(count).map(function (i) {
    return (
      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, px: 2, py: 1 }}>
        <Skeleton variant="circular" width={32} height={32} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="30%" sx={{ fontSize: 13 }} />
          <Skeleton variant="text" width="85%" sx={{ fontSize: 13 }} />
        </Box>
      </Box>
    )
  })
}
