// pages/auth/authStyles.js
// Các object sx dùng chung cho 5 trang Auth (Login, Register, ForgotPassword,
//   ResetPassword, ResendVerification) — thay cho Auth.module.css trước đây
//
// Gom về một file thay vì chép sx vào từng trang: sửa một chỗ là cả 5 trang đổi theo,
//   đúng vai trò mà file CSS dùng chung đang đảm nhiệm
//
// Ngưỡng mobile để nguyên 768px như bản CSS cũ, KHÔNG dùng breakpoint 'md' của MUI:
//   md của MUI là 900px, dùng nhầm thì cột ảnh bị ẩn sớm ở khoảng 768-900px

export var MOBILE = '@media (max-width:768px)'

// Ghim label luôn ở trên cho mọi ô nhập của trang Auth.
// Mặc định MUI chỉ đẩy label lên khi ô được focus hoặc đã có chữ, nên
//   placeholder bị label che mất — trong khi bản cũ hiện đồng thời cả hai
export var shrinkLabel = { inputLabel: { shrink: true } }

// Bố cục 2 cột: ảnh bên trái, form bên phải
export var splitPanel = {
  display: 'flex',
  width: '100%',
  minHeight: '100vh',
}

// Cột ảnh — ẩn hẳn trên màn hình nhỏ, nhường chỗ cho form
export var imageSide = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  '& img': {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
  },
  [MOBILE]: { display: 'none' },
}

// Lớp phủ tối lên ảnh để chữ trắng bên trên đọc được
export var imageOverlay = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(135deg, rgba(0,0,0,.68) 0%, rgba(20,20,40,.55) 60%, rgba(0,149,246,.25) 100%)',
}

// Nền gradient thay ảnh — dùng ở trang quên mật khẩu
export var gradientSide = {
  background: [
    'radial-gradient(circle at 20% 20%, rgba(56,151,240,.45) 0%, transparent 45%)',
    'radial-gradient(circle at 80% 80%, rgba(15,118,110,.4) 0%, transparent 45%)',
    'linear-gradient(135deg, #0b1220 0%, #111827 55%, #0f2438 100%)',
  ].join(','),
}

// Khối chữ giới thiệu nằm trên ảnh
export var imageBranding = {
  position: 'relative',
  zIndex: 1,
  textAlign: 'center',
  padding: '40px',
  color: '#fff',
}

export var brandingTitle = {
  fontSize: 36,
  fontWeight: 800,
  letterSpacing: '-0.5px',
  mb: 1.5,
  lineHeight: 1.2,
}

export var brandingDesc = {
  fontSize: 16,
  opacity: 0.85,
  maxWidth: 320,
  lineHeight: 1.6,
  mx: 'auto',
}

// Cột form — chiếm hết bề ngang khi màn hình nhỏ
export var formSide = {
  width: 420,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 24px',
  bgcolor: 'background.default',
  borderLeft: 1,
  borderColor: 'divider',
  [MOBILE]: {
    width: '100%',
    borderLeft: 0,
    padding: '32px 16px',
  },
}

export var formSideInner = {
  width: '100%',
  maxWidth: 360,
}

export var pageTitle = {
  fontWeight: 700,
  fontSize: 24,
  mb: 0.75,
}

export var pageDesc = {
  color: 'text.secondary',
  fontSize: 14,
  mb: 3.5,
}

// Vạch ngăn có chữ "OR" ở giữa
export var dividerRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  my: 2.5,
}

export var dividerLine = {
  flex: 1,
  height: '1px',
  bgcolor: 'divider',
}

// Huy hiệu tròn cho trạng thái "đã gửi email"
export var sentIcon = {
  width: 64,
  height: 64,
  margin: '0 auto 18px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'primary.main',
  bgcolor: 'rgba(56,151,240,.12)',
  border: '1px solid rgba(56,151,240,.3)',
}

// ── Bố cục 1 cột ── dùng cho trang gửi lại email kích hoạt
export var wrapper = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: 'background.default',
}

// Thẻ chứa nội dung ở bố cục 1 cột
export var box = {
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
  borderRadius: 2,
  padding: '40px 40px 30px',
  width: '100%',
  maxWidth: 400,
}

export var logoRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  mb: 3.5,
}

// Dòng chuyển trang ở đáy thẻ, có vạch ngăn phía trên
export var switchText = {
  textAlign: 'center',
  fontSize: 14,
  color: 'text.secondary',
}
