// components/common/Button.jsx
// Nút dùng chung toàn app — dựng trên Button của MUI
//
// Giữ nguyên API cũ (variant kiểu Bootstrap + prop loading) để 8 file đang gọi
//   không phải đổi cách dùng, chỉ cần bỏ class Bootstrap trong className
//
// Khi loading=true:
//   - Disable nút tránh double-click
//   - Hiện spinner nhỏ phía trước text
//
// Bảng quy đổi variant Bootstrap → MUI:
//   MUI tách làm 2 prop riêng biệt là variant (kiểu nút) và color (màu),
//   trong khi Bootstrap gộp cả hai vào một chuỗi ('outline-primary')

import MuiButton from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

// Quy đổi một chuỗi variant của Bootstrap thành cặp { variant, color } của MUI
var variantMap = {
  primary:             { variant: 'contained', color: 'primary' },
  secondary:           { variant: 'contained', color: 'inherit' },
  success:             { variant: 'contained', color: 'success' },
  danger:              { variant: 'contained', color: 'error' },
  'outline-primary':   { variant: 'outlined',  color: 'primary' },
  'outline-secondary': { variant: 'outlined',  color: 'inherit' },
  'outline-danger':    { variant: 'outlined',  color: 'error' },
}

// Quy đổi size của Bootstrap sang MUI.
// Bootstrap dùng 'sm' | 'lg', MUI dùng 'small' | 'medium' | 'large'
//   → để nguyên 'sm' thì MUI không hiểu, nút mất size và React báo warning
var sizeMap = {
  sm: 'small',
  lg: 'large',
}

export default function Button({
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  children,
  disabled,
  ...props
}) {
  // Không khớp bảng thì rơi về nút chính, tránh nút mất màu khi gõ sai tên
  var mui = variantMap[variant] || variantMap.primary

  // Nhận cả tên Bootstrap ('sm') lẫn tên MUI ('small') để không phải sửa hết call-site
  var muiSize = sizeMap[size] || size

  return (
    <MuiButton
      variant={mui.variant}
      color={mui.color}
      size={muiSize}
      fullWidth={fullWidth}
      disabled={loading || disabled}
      // Spinner đặt ở startIcon để text không bị nhảy vị trí khi loading bật/tắt
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
      {...props}
    >
      {children}
    </MuiButton>
  )
}
