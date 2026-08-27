// components/common/Avatar.jsx
// Ảnh đại diện với fallback tự động khi không có ảnh hoặc ảnh lỗi
//
// Props giữ nguyên như bản cũ để 41 chỗ đang gọi không phải sửa:
//   src       - URL ảnh (Cloudinary). Không có → hiện chữ cái đầu username
//   username  - dùng cho alt text và chữ cái fallback
//   size      - 'sm' 32px | 'md' 44px | 'lg' 56px | 'xl' 80px | 'xxl' 150px
//   hasStory  - true → bọc trong vòng ring story
//   seenStory - true → ring xám (đã xem), false → ring gradient nhiều màu
//   isOnline  - true → chấm xanh góc dưới phải
//   onClick   - optional
//
// Khác bản cũ một điểm: bỏ dịch vụ ngoài ui-avatars.com.
//   Trước đây mỗi avatar không có ảnh phải gọi ra internet lấy ảnh chữ cái
//   → tốn một request, và hỏng hẳn khi mất mạng hoặc dịch vụ đó chết.
//   Nay dùng fallback sẵn có của MUI Avatar: hiện chữ cái đầu ngay tại chỗ

import MuiAvatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'

// Đường kính avatar theo từng size
var sizeMap = { sm: 32, md: 44, lg: 56, xl: 80, xxl: 150 }

// Đường kính chấm online tương ứng từng size
var dotMap = { sm: 10, md: 13, lg: 15, xl: 18, xxl: 22 }

// Bảng màu nền cho avatar chữ cái
var fallbackColors = [
  '#3897f0', '#ff6b58', '#c084fc', '#ffd166', '#3fc060', '#60a5fa', '#f472b6',
]

// Chọn màu nền ổn định theo username: cùng một người luôn ra cùng một màu,
// thay vì random mỗi lần render lại đổi màu
function pickColor(username) {
  var sum = 0
  for (var i = 0; i < username.length; i++) {
    sum += username.charCodeAt(i)
  }
  return fallbackColors[sum % fallbackColors.length]
}

export default function Avatar({
  src,
  username = '?',
  size = 'md',
  hasStory = false,
  seenStory = false,
  isOnline = false,
  onClick,
}) {
  var px = sizeMap[size] || sizeMap.md

  var avatar = (
    <MuiAvatar
      // src rỗng phải truyền undefined, nếu truyền '' thì MUI vẫn coi là có ảnh
      src={src || undefined}
      alt={username}
      onClick={onClick}
      sx={{
        width: px,
        height: px,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: pickColor(username),
        // Chữ cái fallback co theo kích thước avatar
        fontSize: Math.round(px * 0.42),
        fontWeight: 600,
      }}
    >
      {username.charAt(0).toUpperCase()}
    </MuiAvatar>
  )

  // Ring story: viền gradient bọc ngoài, chừa một vạch nền để tách khỏi ảnh
  if (hasStory) {
    return (
      <Box
        sx={{
          padding: '2.5px',
          borderRadius: '50%',
          display: 'inline-block',
          lineHeight: 0,
          background: seenStory
            ? '#6e6e76'
            : 'conic-gradient(from 200deg, #3897f0, #ffd166, #ff6b58, #c084fc, #60a5fa, #3897f0)',
          // Vạch ngăn lấy theo màu nền của theme.
          // Bản CSS cũ ghi cứng #0e0e10 nên ở giao diện sáng viền bị đen
          '& .MuiAvatar-root': {
            border: '2px solid',
            borderColor: 'background.default',
          },
        }}
      >
        {avatar}
      </Box>
    )
  }

  // Chấm xanh báo đang online
  if (isOnline) {
    var dot = dotMap[size] || dotMap.md
    return (
      <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
        {avatar}
        <Box
          sx={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
            width: dot,
            height: dot,
            borderRadius: '50%',
            background: '#3fc060',
            border: '2px solid',
            borderColor: 'background.default',
          }}
        />
      </Box>
    )
  }

  return avatar
}
