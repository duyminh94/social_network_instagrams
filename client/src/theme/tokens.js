// theme/tokens.js
// Bộ màu gốc của app, viết bằng JavaScript để MUI dùng được
//
// Vì sao không đọc thẳng var(--ig-*) từ CSS vào palette của MUI:
//   MUI tự tính toán màu phái sinh (alpha, lighten, darken) cho hover, disabled,
//   ripple... Các hàm đó cần GIÁ TRỊ MÀU THẬT ('#3897f0'), truyền chuỗi
//   'var(--ig-primary)' vào sẽ làm MUI parse lỗi và văng runtime
//
// Giai đoạn chuyển tiếp sang MUI sẽ tồn tại 2 nguồn token song song:
//   - styles/index.css : phục vụ 32 file CSS Module còn lại
//   - file này         : phục vụ component MUI
//   Hai bộ PHẢI giữ cùng giá trị. Khi CSS Module được thay hết bằng MUI
//   thì xoá bộ biến trong index.css, file này thành nguồn duy nhất

// Màu thương hiệu — giống nhau ở cả 2 chế độ sáng/tối
export var brand = {
  primary: '#3897f0',
  primaryDark: '#2d7fd4',
  // Đỏ cảnh báo cho hành động khó hoàn tác: xoá bài, chặn user, đăng xuất
  danger: '#ef4444',
  dangerDark: '#dc2626',
}

// Bảng màu chế độ tối (mặc định của app)
export var darkTokens = {
  bg: '#0e0e10',          // --ig-bg      : nền trang
  surface: '#16161a',     // --ig-white   : nền thẻ, modal, sidebar
  border: 'rgba(255,255,255,.1)',   // --ig-border
  text: '#ffffff',                   // --ig-text
  textMuted: 'rgba(255,255,255,.55)',// --ig-text-light
  hover: 'rgba(255,255,255,.06)',    // --ig-hover
}

// Bảng màu chế độ sáng
export var lightTokens = {
  bg: '#fafafa',
  surface: '#ffffff',
  border: 'rgba(0,0,0,.12)',
  text: '#1a1a1a',
  textMuted: 'rgba(0,0,0,.5)',
  hover: 'rgba(0,0,0,.05)',
}

// Bo góc — khớp --ig-radius (8px) và --ig-radius-lg (12px)
export var radius = {
  base: 8,
  large: 12,
}
