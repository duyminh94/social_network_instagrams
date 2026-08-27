// components/layout/layoutStyles.js
// Các object sx của khung sườn app — thay cho Layout.module.css
//
// Dùng chung bởi MainLayout, Sidebar, MobileNav và SearchPanel
//
// Điểm cần chú ý: sidebar nở rộng khi rê chuột, và các phần tử BÊN TRONG
//   (nút nav, nhãn chữ) phải đổi theo. CSS cũ viết `.sidebar:hover .navItem`;
//   ở đây gắn className mốc "sbItem" / "sbLabel" cho con rồi khai báo luật
//   trong sx của sidebar cha — sx không có cách nào khác để nhắm tới con

import { pop, pressable } from '../../theme/animations'

var MOBILE = '@media (max-width:768px)'

// Tên class mốc, chỉ để sidebar cha nhắm tới con khi hover — không mang style
export var SB_ITEM = 'sbItem'
export var SB_LABEL = 'sbLabel'

export var appLayout = {
  display: 'flex',
  minHeight: '100vh',
}

export var mainContent = {
  ml: '76px',
  flex: 1,
  [MOBILE]: { ml: 0, pb: '64px' },
}

// Sidebar hẹp 76px, rê chuột thì nở ra 244px và hiện nhãn chữ.
// Khi đang mở panel tìm kiếm / thông báo thì khoá lại ở 76px để panel không bị đẩy
export function sidebar(panelOpen) {
  var expanded = panelOpen
    ? {}
    : {
        '&:hover': {
          width: 244,
          ['& .' + SB_ITEM]: { width: '100%' },
          ['& .' + SB_LABEL]: { opacity: 1, transform: 'translateX(0)' },
        },
      }

  return {
    width: 76,
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    bgcolor: 'background.default',
    borderRight: '1px solid',
    borderRightColor: 'divider',
    pt: 2.5, px: 1.5, pb: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    zIndex: 100,
    boxSizing: 'border-box',
    overflow: 'hidden',
    transition: 'width 160ms ease',
    [MOBILE]: { display: 'none' },
    ...expanded,
  }
}

export var logoBtn = {
  width: 52,
  height: 44,
  border: 'none',
  background: 'transparent',
  color: 'text.primary',
  cursor: 'pointer',
  px: 1.25,
  m: 0,
  mb: 2.75,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  boxSizing: 'border-box',
}

export function navItem(isActive) {
  return {
    width: 52,
    height: 48,
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    cursor: 'pointer',
    color: 'text.primary',
    border: 'none',
    background: 'transparent',
    bgcolor: isActive ? 'rgba(255,255,255,.08)' : 'transparent',
    transition: 'background 140ms, transform 150ms cubic-bezier(0.22, 1, 0.36, 1)',
    '&:active': { transform: 'scale(0.94)' },
    position: 'relative',
    px: 1.75,
    boxSizing: 'border-box',
    font: 'inherit',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    '&:hover': { bgcolor: 'action.hover' },
  }
}

// Nhãn chữ bên phải icon — ẩn sẵn, chỉ trượt vào khi sidebar nở
export var sidebarLabel = {
  display: 'inline-block',
  opacity: 0,
  color: 'text.primary',
  fontSize: 15,
  fontWeight: 600,
  transform: 'translateX(-8px)',
  transition: 'opacity 120ms ease, transform 120ms ease',
}

export var sidebarAvatar = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  bgcolor: 'rgba(255,255,255,.1)',
  border: '1px solid rgba(255,255,255,.18)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  flexShrink: 0,
  '& img': { width: 24, height: 24, borderRadius: '50%' },
}

export var langFlag = {
  width: 24,
  height: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  lineHeight: 1,
  flexShrink: 0,
}

export var moreWrap = {
  position: 'relative',
}

export var moreMenu = {
  position: 'absolute',
  left: 0,
  bottom: 56,
  width: 210,
  p: 1,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#1c1c1f',
  boxShadow: '0 12px 34px rgba(0,0,0,.45)',
  zIndex: 220,
}

export var moreMenuItem = {
  width: '100%',
  height: 44,
  border: 0,
  borderRadius: 2,
  background: 'transparent',
  color: 'text.primary',
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  px: 1.5,
  font: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
  '&:hover': { bgcolor: 'action.hover' },
}

// ── Thanh điều hướng đáy, chỉ có ở mobile ──

export var mobileNav = {
  display: 'none',
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  bgcolor: 'background.default',
  borderTop: '1px solid',
  borderTopColor: 'divider',
  zIndex: 200,
  py: 1,
  [MOBILE]: { display: 'flex', justifyContent: 'space-around' },
}

export function mobileNavItem(isActive) {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    py: .5, px: 1.5,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: isActive ? 'text.primary' : 'text.secondary',
    fontWeight: isActive ? 600 : 400,
    fontSize: 10,
    gap: '3px',
    position: 'relative',
    ...pressable,
  }
}

export var notifBadge = {
  ...pop,
  position: 'absolute',
  top: 0,
  right: 4,
  bgcolor: '#ff3040',
  color: 'white',
  borderRadius: '50%',
  width: 16,
  height: 16,
  fontSize: 10,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

// ── Hai panel trượt ra cạnh sidebar ──

// Panel thông báo dùng nền theo theme, panel tìm kiếm cố tình luôn tối (#080b10)
function panelBase(zIndex) {
  return {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: '76px',
    width: 430,
    maxWidth: 'calc(100vw - 76px)',
    borderRight: '1px solid',
    borderRightColor: 'divider',
    boxShadow: '12px 0 28px rgba(0,0,0,.34)',
    zIndex: zIndex,
    overflow: 'hidden',
    [MOBILE]: { display: 'none' },
  }
}

export var notificationPanel = { ...panelBase(95), bgcolor: 'background.default' }

export var searchPanel = { ...panelBase(96), bgcolor: '#080b10' }

// ── Nội dung panel tìm kiếm — bảng màu tối cố định, không theo theme ──

export var searchPanelInner = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  py: 3.5, px: 2.75,
  boxSizing: 'border-box',
}

export var searchPanelHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  mb: 5.25,
  '& h2': { m: 0, color: '#f8fafc', fontSize: 30, lineHeight: 1, fontWeight: 800 },
}

export var searchCloseButton = {
  width: 40,
  height: 40,
  border: 0,
  background: 'transparent',
  color: '#f8fafc',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  p: 0,
}

export var searchInputWrap = {
  height: 52,
  borderRadius: '999px',
  bgcolor: '#252a31',
  display: 'flex',
  alignItems: 'center',
  pl: 2.25, pr: 1.75,
  mb: 3.5,
  boxSizing: 'border-box',
}

export var searchInput = {
  minWidth: 0,
  flex: 1,
  border: 0,
  outline: 0,
  background: 'transparent',
  color: '#f8fafc',
  fontSize: 18,
  fontFamily: 'inherit',
  fontWeight: 500,
  '&::placeholder': { color: '#a1a1aa' },
}

export var searchClearButton = {
  width: 24,
  height: 24,
  border: 0,
  borderRadius: '50%',
  bgcolor: '#d1d5db',
  color: '#52525b',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  p: 0,
  flex: '0 0 auto',
}

export var searchSectionTitle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1.5,
  mb: 2.25,
  '& strong': { color: '#f8fafc', fontSize: 18, fontWeight: 800 },
  '& button': {
    border: 0,
    background: 'transparent',
    color: '#8da2fb',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    p: .5,
  },
}

export var searchList = {
  display: 'flex',
  flexDirection: 'column',
  gap: .75,
  overflowY: 'auto',
  minHeight: 0,
  pr: '2px',
}

export var searchUserRow = {
  minHeight: 64,
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
}

export var searchUserButton = {
  minWidth: 0,
  flex: 1,
  border: 0,
  background: 'transparent',
  color: '#f8fafc',
  display: 'flex',
  alignItems: 'center',
  gap: 1.75,
  py: 1,
  cursor: 'pointer',
  textAlign: 'left',
  '&:hover .searchUsername': { color: '#ffffff' },
}

export var searchUserText = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
}

export var searchUsername = {
  minWidth: 0,
  color: '#f1f5f9',
  fontSize: 16,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export var searchFullName = {
  color: '#a1a1aa',
  fontSize: 15,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export var searchRemoveButton = {
  width: 36,
  height: 36,
  border: 0,
  background: 'transparent',
  color: '#a1a1aa',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  p: 0,
  flex: '0 0 auto',
  '&:hover': { color: '#f8fafc' },
}

export var searchEmptyText = {
  color: '#a1a1aa',
  fontSize: 14,
  fontWeight: 600,
  m: 0,
  mt: .5,
}

export var searchLoading = {
  display: 'flex',
  justifyContent: 'center',
  py: 3.5,
}
