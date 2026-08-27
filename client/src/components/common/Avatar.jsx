// components/common/Avatar.jsx
// Component ảnh đại diện với fallback tự động khi ảnh lỗi
//
// Props:
//   src       - URL ảnh (Cloudinary). Nếu null/undefined → dùng placeholder
//   username  - Dùng tạo placeholder (text avatar) và alt text
//   size      - 'sm' | 'md' | 'lg' | 'xxl' — ánh xạ thành CSS class .avatar-{size}
//   hasStory  - true → bọc trong vòng ring story
//   seenStory - true → ring màu xám (đã xem), false → ring gradient màu
//   onClick   - Optional click handler

// Dịch vụ tạo avatar chữ cái từ username (fallback khi không có ảnh)
const PLACEHOLDER = 'https://ui-avatars.com/api/?background=random&color=fff&name='

export default function Avatar({ src, username = '?', size = 'md', hasStory = false, seenStory = false, isOnline = false, onClick }) {
  const cls = 'avatar avatar-' + size

  const img = (
    <img
      src={src || PLACEHOLDER + username}
      alt={username}
      className={cls}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
      onError={function (e) {
        e.target.src = PLACEHOLDER + username
      }}
    />
  )

  if (hasStory) {
    return (
      <span className={'avatar-story' + (seenStory ? ' seen' : '')}>
        {img}
      </span>
    )
  }

  // Chấm xanh online — bọc trong span với position relative
  if (isOnline) {
    return (
      <span className={'avatar-online-wrap avatar-online-' + size}>
        {img}
        <span className="avatar-online-dot" />
      </span>
    )
  }

  return img
}
