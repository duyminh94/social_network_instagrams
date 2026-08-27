// components/common/ReactionBar.jsx
// Thanh chọn cảm xúc nổi lên khi hover/long-press nút like.
// Props:
//   onPick(type)         — chọn 1 cảm xúc
//   onMouseEnter/Leave   — để cha giữ thanh mở khi rê chuột vào
//
// Dùng Paper của MUI thay cho div inline style: nền, viền và đổ bóng
//   lấy theo theme nên tự đúng ở cả giao diện sáng và tối

import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import { REACTIONS } from './reactions'

export default function ReactionBar({ onPick, onMouseEnter, onMouseLeave }) {
  return (
    <Paper
      elevation={6}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        mb: 1,
        display: 'flex',
        gap: 0.5,
        px: 1,
        py: 0.75,
        borderRadius: 24,
        border: 1,
        borderColor: 'divider',
        // Nằm trên nội dung bài viết nhưng vẫn dưới lớp modal
        zIndex: 30,
      }}
    >
      {REACTIONS.map(function (r) {
        return (
          <Box
            key={r.type}
            component="button"
            type="button"
            title={r.label}
            onClick={function () { onPick(r.type) }}
            sx={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 26,
              lineHeight: 1,
              p: '2px',
              transition: 'transform 0.12s',
              // Phóng to emoji khi rê chuột, thay cho 2 handler onMouseOver/Out cũ
              '&:hover': { transform: 'scale(1.35)' },
            }}
          >
            {r.emoji}
          </Box>
        )
      })}
    </Paper>
  )
}
