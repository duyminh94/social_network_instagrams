// components/common/Spinner.jsx
// Component loading spinner dùng chung toàn app — dựng trên CircularProgress của MUI
//
// Props giữ nguyên như bản cũ để 28 file đang dùng không phải sửa gì:
//   size     - 'sm' (16px) | 'md' (24px, default) | 'lg' (40px), hoặc truyền thẳng số px
//   fullPage - true → căn giữa toàn trang (minHeight 200px)
//              false → căn giữa với padding nhỏ (dùng inline trong component)
//
// Bản cũ chỉ nhận 'sm' | 'md' | 'lg', nên chỗ nào gọi <Spinner size={18} />
//   sẽ tra bảng không thấy và âm thầm rơi về 24px. Nay nhận cả số

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

export default function Spinner({ size = 'md', fullPage = false }) {
  // Ánh xạ tên size → pixel; nếu truyền thẳng số thì dùng luôn số đó
  const sizeMap = { sm: 16, md: 24, lg: 40 }
  const px = typeof size === 'number' ? size : (sizeMap[size] || 24)

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        // fullPage: căn giữa chiều cao trang. Inline: chỉ cần padding nhỏ
        minHeight: fullPage ? '200px' : 'auto',
        padding: fullPage ? 0 : '20px',
      }}
    >
      <CircularProgress size={px} color="primary" />
    </Box>
  )
}
