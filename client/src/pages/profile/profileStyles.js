// pages/profile/profileStyles.js
// Các object sx của trang cá nhân — thay cho Profile.module.css
//
// Tách ra file riêng thay vì viết thẳng vào JSX: trang Profile dài hơn 680 dòng,
// nhét sx vào giữa sẽ khó đọc phần logic

// Dưới ngưỡng này header xếp dọc thay vì nằm ngang
var MOBILE = '@media (max-width:576px)'

export var header = {
  display: 'flex',
  alignItems: 'center',
  gap: '60px',
  py: 3.75,
  [MOBILE]: { flexDirection: 'column', gap: 2, alignItems: 'flex-start' },
}

export var profileInfo = {
  flex: 1,
  minWidth: 0,
  [MOBILE]: { width: '100%' },
}

export var topRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  mb: 1.75,
}

export var usernameTitle = {
  m: 0,
  fontSize: 32,
  lineHeight: 1.1,
  fontWeight: 800,
  letterSpacing: '-0.02em',
}

// Nút 3 chấm mở menu chặn/báo cáo
export var dotsBtn = {
  border: 0,
  background: 'transparent',
  color: 'text.primary',
  fontSize: 18,
  lineHeight: 1,
  fontWeight: 800,
  cursor: 'pointer',
  px: .75,
  pt: .25,
  pb: .625,
  borderRadius: 2,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': { bgcolor: 'action.hover' },
}

// Ba ô số: bài viết / người theo dõi / đang theo dõi
export var stats = {
  display: 'flex',
  gap: 4,
  mt: 2,
}

export var statItem = {
  textAlign: 'center',
  background: 'none',
  border: 'none',
  p: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  // Ô bấm được (followers/following) thì đổi con trỏ, ô chỉ đọc thì không
  cursor: 'default',
  '&:is(button)': { cursor: 'pointer', outline: 'none' },
}

export var statNum = {
  fontWeight: 600,
  fontSize: 18,
  display: 'block',
}

export var statLabel = {
  fontSize: 14,
  color: 'text.secondary',
}

// Lưới ảnh 3 cột như Instagram
export var postsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '3px',
}

export var postThumb = {
  aspectRatio: '1',
  overflow: 'hidden',
  width: '100%',
  cursor: 'pointer',
  position: 'relative',
  transition: 'opacity .15s',
  '&:hover': { opacity: .85 },
  // Ảnh bên trong phóng nhẹ khi rê chuột. Phóng ảnh chứ không phóng cả ô để
  //   lưới không bị xô lệch; ô đã có overflow:hidden nên phần tràn bị cắt gọn
  '& img, & video': { transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' },
  '&:hover img, &:hover video': { transform: 'scale(1.06)' },
}

export var tabs = {
  display: 'flex',
  justifyContent: 'center',
  borderTop: 1,
  borderColor: 'divider',
}

// Tab đang chọn được đánh dấu bằng vạch trên đầu, đè lên đường kẻ của .tabs
export var tab = {
  display: 'flex',
  alignItems: 'center',
  gap: .75,
  px: 3,
  py: 1.5,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'text.secondary',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  borderTop: '1px solid transparent',
  mt: '-1px',
}

export var tabActive = {
  color: 'text.primary',
  borderTopColor: 'text.primary',
}

export var profileActions = {
  mt: 3,
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  width: '100%',
  maxWidth: 650,
  [MOBILE]: { mt: 2.5 },
}

// Ba nút hành động dùng chung một khuôn, chỉ khác màu nền
var actionBase = {
  height: 44,
  border: 0,
  borderRadius: 3,
  color: '#fff',
  font: 'inherit',
  fontSize: 16,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:disabled': { opacity: .65, cursor: 'not-allowed' },
  [MOBILE]: { height: 42, fontSize: 15, borderRadius: '11px' },
}

export var followPrimaryBtn = {
  ...actionBase,
  width: '100%',
  bgcolor: '#4f63ff',
  '&:hover:not(:disabled)': { bgcolor: '#4255ee' },
}

export var followingBtn = {
  ...actionBase,
  flex: 1,
  gap: 1,
  bgcolor: '#24282e',
  '&:hover:not(:disabled)': { bgcolor: '#2d3138' },
}

export var messageBtn = {
  ...actionBase,
  flex: 1,
  bgcolor: '#24282e',
  '&:hover': { bgcolor: '#2d3138' },
}

export var downIcon = {
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 18,
  lineHeight: 1,
  transform: 'translateY(-2px)',
}

export var requestActions = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
}

// pre-line: giữ nguyên các dòng xuống hàng người dùng gõ trong phần giới thiệu
export var bio = {
  whiteSpace: 'pre-line',
  mt: .5,
}
