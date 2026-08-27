// pages/profile/settingsStyles.js
// Các object sx dùng chung cho nhóm trang Cài đặt — thay cho EditProfile.module.css
//
// Bốn file cùng dùng một khung giao diện (sidebar trái + nội dung phải, cùng bộ
//   ô nhập và nút Lưu/Huỷ): EditProfile, SettingsSidebar, ChangePassword,
//   BlockedUsers. Trước đây cả bốn import chung một CSS Module, nay import
//   chung file này để không phải chép lại sx ở từng nơi

// Dưới ngưỡng này sidebar chuyển từ cột trái thành hàng tab ngang.
// Viết tay vì CSS gốc dùng 768px, còn md của MUI là 900px — dùng md sẽ gập sớm
var MOBILE = '@media (max-width:768px)'

export var page = {
  maxWidth: 900,
  mx: 'auto',
  pt: 5,
  px: 2.5,
  pb: 7.5,
  display: 'flex',
  minHeight: 'calc(100vh - 60px)',
  [MOBILE]: { flexDirection: 'column', pt: 2.5, px: 2, pb: 5 },
}

export var sidebar = {
  width: 240,
  flexShrink: 0,
  borderRight: '1px solid',
  borderRightColor: 'divider',
  [MOBILE]: {
    width: '100%',
    borderRight: 'none',
    borderBottom: '1px solid',
    borderBottomColor: 'divider',
    pb: 1.5,
    mb: 3,
    display: 'flex',
    gap: .5,
    overflowX: 'auto',
  },
}

export var sidebarTitle = {
  fontSize: 16,
  fontWeight: 700,
  pt: .5,
  px: 2,
  pb: 2.5,
  color: 'text.primary',
  [MOBILE]: { display: 'none' },
}

// Mục trong sidebar. Nhận isActive thay vì tách thành 2 object rồi gộp:
//   gộp bằng spread sẽ ghi đè nguyên khối media query của bản gốc
export function navItem(isActive) {
  return {
    display: 'block',
    width: '100%',
    px: 2,
    py: 1.5,
    fontSize: 14,
    fontWeight: isActive ? 700 : 500,
    color: isActive ? 'text.primary' : 'text.secondary',
    background: 'none',
    bgcolor: isActive ? 'action.hover' : 'transparent',
    border: 'none',
    borderLeft: '2px solid',
    borderLeftColor: isActive ? 'text.primary' : 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '0 8px 8px 0',
    transition: 'all 0.15s',
    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
    [MOBILE]: {
      whiteSpace: 'nowrap',
      borderLeft: 'none',
      borderBottom: '2px solid',
      borderBottomColor: isActive ? 'text.primary' : 'transparent',
      borderRadius: 2,
    },
  }
}

export var main = {
  flex: 1,
  px: 5,
  [MOBILE]: { px: 0 },
}

export var sectionTitle = {
  fontSize: 20,
  fontWeight: 700,
  mb: 4,
  color: 'text.primary',
}

export var fieldGroup = {
  mb: 3,
}

export var fieldLabel = {
  display: 'block',
  fontSize: 14,
  fontWeight: 700,
  color: 'text.primary',
  mb: 1,
}

// Ô nhập viết tay thay vì dùng TextField của MUI: bộ trang này đặt nhãn nằm
//   trên ô, còn TextField mặc định cho nhãn nổi trong viền — đổi sang sẽ lệch
//   hẳn so với các trang Cài đặt khác chưa chuyển
export function fieldInput(hasError) {
  return {
    width: '100%',
    px: 1.75,
    py: 1.25,
    fontSize: 14,
    fontFamily: 'inherit',
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: hasError ? '#ef4444' : 'divider',
    borderRadius: 2.5,
    color: 'text.primary',
    outline: 'none',
    transition: 'border-color 0.15s',
    '&:focus': { borderColor: hasError ? '#ef4444' : 'text.secondary' },
  }
}

export var fieldHint = {
  fontSize: 12,
  color: 'text.secondary',
  mt: .75,
}

export var fieldError = {
  fontSize: 12,
  color: '#ef4444',
  mt: .75,
}

export var actions = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  mt: 1,
}

export var btnSave = {
  px: 3,
  py: 1.125,
  fontSize: 14,
  fontWeight: 700,
  borderRadius: 2.5,
  border: 'none',
  bgcolor: '#0095f6',
  color: '#fff',
  cursor: 'pointer',
  transition: 'background 0.15s',
  '&:hover': { bgcolor: '#0081d6' },
  '&:disabled': { opacity: .6, cursor: 'default' },
}

export var btnCancel = {
  px: 3,
  py: 1.125,
  fontSize: 14,
  fontWeight: 700,
  borderRadius: 2.5,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.primary',
  cursor: 'pointer',
  transition: 'background 0.15s',
  '&:hover': { bgcolor: 'action.hover' },
}
