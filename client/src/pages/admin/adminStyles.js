// pages/admin/adminStyles.js
// Các object sx dùng chung cho 9 trang admin — thay cho AdminShared.module.css,
//   AdminReports.module.css và AdminContent.module.css
//
// Khu admin luôn hiển thị giao diện SÁNG (xem ghi chú trong AdminLayout.jsx),
//   nên các màu ở đây ghi thẳng mã hex như bản CSS cũ thay vì lấy từ token theme

// Màu dùng lại nhiều lần trong khu admin
export var adminColors = {
  ink: '#0f172a',        // chữ tiêu đề
  body: '#132238',       // chữ nội dung
  muted: '#64748b',      // chữ phụ
  border: '#dbe2ea',     // viền bảng
  borderSoft: 'rgba(213,224,236,.95)',
  surface: 'rgba(255,255,255,.92)',
  headBg: 'linear-gradient(180deg, #f8fbff 0%, #eef4fa 100%)',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  hover: '#eff6ff',
}

export var page = {
  maxWidth: 1280,
  mx: 'auto',
  color: adminColors.body,
}

export var pageHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2.5,
  mb: 3.25,
}

export var pageTitle = {
  m: 0,
  color: adminColors.ink,
  fontSize: 28,
  fontWeight: 900,
}

export var pageSubtitle = {
  mt: 0.625,
  color: adminColors.muted,
}

// Hộp chứa nhóm nút lọc trạng thái
export var filterBar = {
  display: 'inline-flex',
  gap: 0.75,
  mb: 3,
  p: 0.75,
  border: 1,
  borderColor: 'rgba(216,226,238,.9)',
  borderRadius: 2,
  bgcolor: 'rgba(255,255,255,.76)',
  boxShadow: '0 12px 30px rgba(15,23,42,.06)',
}

// Khung bao quanh bảng, cho phép cuộn ngang khi màn hình hẹp
export var tableWrap = {
  overflowX: 'auto',
  border: 1,
  borderColor: adminColors.borderSoft,
  borderRadius: 2,
  bgcolor: adminColors.surface,
  boxShadow: '0 18px 45px rgba(15,23,42,.08)',
}

export var table = {
  minWidth: 850,
  // Hàng tiêu đề: nền chuyển sắc nhạt, chữ in hoa nhỏ
  '& thead th': {
    py: 1.875,
    px: 2,
    borderBottom: `1px solid ${adminColors.border}`,
    background: adminColors.headBg,
    color: '#4b5f76',
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.04em',
  },
  '& tbody td': {
    py: 1.875,
    px: 2,
    borderBottom: '1px solid #e8edf3',
    color: adminColors.body,
  },
  '& tbody tr:last-child td': { borderBottom: 0 },
  '& tbody tr:hover': { bgcolor: 'rgba(239,246,255,.6)' },
}

// Khối thông báo khi không có dữ liệu
export var empty = {
  py: 6.75,
  px: 2.5,
  border: '1px dashed #cbd8e6',
  borderRadius: 2,
  bgcolor: 'rgba(255,255,255,.72)',
  textAlign: 'center',
  color: adminColors.muted,
}

export var paginationRow = {
  display: 'flex',
  justifyContent: 'center',
  mt: 3,
}

// Nút hiển thị một người dùng (avatar + tên) trong ô bảng
export var personButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1.25,
  p: 0,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  color: 'inherit',
  '&:disabled': { cursor: 'default', opacity: 0.75 },
  '& strong': { display: 'block', fontSize: 14, color: adminColors.ink },
  '& small': { display: 'block', fontSize: 12, color: adminColors.muted },
}

// Ô xem trước ảnh/video của bài viết trong bảng nội dung
export var preview = {
  width: 56,
  height: 56,
  borderRadius: 1,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: '#eef4fa',
  color: adminColors.muted,
  flexShrink: 0,
  '& img, & video': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
}

// Caption cắt bớt sau 2 dòng để hàng bảng không cao vống lên
export var caption = {
  m: 0,
  maxWidth: 320,
  fontSize: 14,
  color: adminColors.body,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

// Ô tác giả: giống personButton nhưng có thêm dòng email
export var authorButton = {
  ...personButton,
  '& span > span': { display: 'block', fontSize: 12, color: adminColors.muted },
}

// Ô nhập tìm kiếm phía trên bảng
export var searchInput = {
  mb: 3,
  maxWidth: 420,
  bgcolor: 'rgba(255,255,255,.9)',
}

// Hàng chứa các ô lọc (tìm kiếm + dropdown) phía trên bảng
export var filterRow = {
  display: 'flex',
  gap: 1.75,
  flexWrap: 'wrap',
  mb: 3,
  p: 1.75,
  border: '1px solid rgba(216,226,238,.9)',
  borderRadius: 2,
  bgcolor: 'rgba(255,255,255,.72)',
  boxShadow: '0 12px 30px rgba(15,23,42,.06)',
}

// Ô tài khoản trong bảng người dùng: có thêm dòng email dưới username
export var userButton = {
  ...personButton,
  '& small': { display: 'block', fontSize: 12, color: adminColors.muted },
}

// ── Trang tổng quan ──
export var cardsGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' },
  gap: 2,
}

export var statCard = {
  position: 'relative',
  p: 2.5,
  border: 1,
  borderColor: adminColors.borderSoft,
  borderRadius: 2,
  bgcolor: adminColors.surface,
  boxShadow: '0 14px 34px rgba(15,23,42,.07)',
  transition: 'transform .18s ease, box-shadow .18s ease',
  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 18px 42px rgba(15,23,42,.1)' },
}

export var statLabel = {
  display: 'block',
  color: adminColors.muted,
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
}

export var statValue = {
  display: 'block',
  mt: 1,
  fontSize: 32,
  fontWeight: 900,
  lineHeight: 1.1,
}

// Biểu tượng góc phải của thẻ thống kê
export var statIcon = {
  position: 'absolute',
  top: 20,
  right: 20,
}

export var quickPanel = {
  mt: 3,
  p: 2.5,
  border: 1,
  borderColor: adminColors.borderSoft,
  borderRadius: 2,
  bgcolor: adminColors.surface,
  boxShadow: '0 14px 34px rgba(15,23,42,.07)',
}

// ── Trang chi tiết ──
export var backButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1,
  mb: 2.5,
  p: 0,
  border: 0,
  background: 'transparent',
  color: '#475569',
  fontWeight: 700,
  cursor: 'pointer',
}

// Thẻ trắng bo góc, dùng cho mọi khối nội dung ở trang chi tiết
export var card = {
  p: 2.75,
  border: 1,
  borderColor: adminColors.borderSoft,
  borderRadius: 2,
  bgcolor: adminColors.surface,
  boxShadow: '0 14px 34px rgba(15,23,42,.07)',
}

export var cardLabel = {
  display: 'block',
  mb: 1.875,
  color: adminColors.muted,
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
}

// Lưới 2 cột cho cặp thẻ người báo cáo / người bị báo cáo
export var twoColGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0,1fr))' },
  gap: 1.75,
}

// Khối avatar + tên, bấm được để mở trang người dùng
export var personIdentity = {
  ...personButton,
  gap: 1.625,
  '& strong': { display: 'block', fontSize: 17, color: adminColors.ink },
  '& span > span': { display: 'block', fontSize: 13, color: adminColors.muted },
  '& small': { display: 'block', fontSize: 12, color: adminColors.muted },
}

// Một dòng "nhãn — giá trị" trong khối thông tin
export var infoRow = {
  py: 1.5,
  borderBottom: '1px solid #eef2f7',
  '&:last-of-type': { borderBottom: 0 },
  '& > span': {
    display: 'block',
    mb: 0.5,
    color: adminColors.muted,
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
}

// ── Trang chi tiết nội dung ──
export var detailGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) minmax(0, 1fr)' },
  gap: 2.5,
  mt: 2.5,
}

// Khu ảnh/video của bài viết
export var mediaGallery = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5,
  '& img, & video': {
    width: '100%',
    borderRadius: 8,
    display: 'block',
    bgcolor: '#000',
  },
}

export var mediaEmpty = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 240,
  borderRadius: 2,
  border: '1px dashed #cbd8e6',
  color: adminColors.muted,
}

// Ba ô đếm lượt thích / bình luận / báo cáo
export var metricsRow = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' },
  gap: 2,
  mt: 2.5,
}

export var metricCard = {
  ...card,
  display: 'flex',
  alignItems: 'center',
  gap: 1.75,
}

export var metricIcon = {
  width: 46,
  height: 46,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: '#eff6ff',
  color: adminColors.primaryDark,
  flexShrink: 0,
}

// Một dòng trong hộp thoại danh sách tương tác
export var interactionItem = {
  display: 'flex',
  gap: 1.5,
  py: 1.75,
  borderBottom: '1px solid #eef2f7',
  '&:last-child': { borderBottom: 0 },
}

// ── Trang chi tiết người dùng ──
export var identityRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 2.5,
  flexWrap: 'wrap',
}

// Hàng chip trạng thái tài khoản (vai trò, bị khóa hay không)
export var metaRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  flexWrap: 'wrap',
  mt: 2.5,
}

// Ô đếm một loại hoạt động (đã đăng / đã thích / đã bình luận)
export var activityCard = {
  ...card,
  display: 'flex',
  alignItems: 'center',
  gap: 1.75,
  p: 2,
}

export var activityGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' },
  gap: 2,
  mt: 1.5,
}

export var sectionTitle = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  mt: 3,
  color: adminColors.ink,
  fontWeight: 800,
}

// Một dòng trong danh sách hoạt động của hộp thoại
export var activityItem = {
  display: 'flex',
  gap: 1.75,
  width: '100%',
  p: 1.75,
  border: 1,
  borderColor: '#eef2f7',
  borderRadius: 2,
  bgcolor: '#fff',
  cursor: 'pointer',
  textAlign: 'left',
  mb: 1.5,
  '&:hover': { borderColor: '#cbd8e6' },
}

// Ảnh thu nhỏ của nội dung trong danh sách hoạt động
export var mediaPreview = {
  width: 64,
  height: 64,
  borderRadius: 1,
  overflow: 'hidden',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: '#eef4fa',
  color: adminColors.muted,
  '& img, & video': { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
}
