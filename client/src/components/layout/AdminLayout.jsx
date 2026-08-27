// components/layout/AdminLayout.jsx
// Khung trang khu quản trị: sidebar trái + topbar và vùng nội dung bên phải
//
// Bảng màu ghi cứng ở đây (#132238, #f8fbff...) chứ không lấy từ theme, vì khu
//   admin cố tình luôn sáng — xem ghi chú ở adminTheme bên dưới
//
// Menu tài khoản dùng Menu + anchorEl của MUI thay cho dropdown tự viết,
//   nhờ vậy có sẵn bấm ra ngoài để đóng và điều hướng bằng bàn phím

import { useState, useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import createAppTheme from '../../theme/muiTheme'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../common/Avatar'
import Icon, { Mark } from '../common/Icon'
import AdminAiChat from '../admin/AdminAiChat'

// Ngưỡng gập sidebar xuống thành thanh ngang. Viết tay vì CSS gốc dùng 820px,
//   không khớp breakpoint nào của MUI (sm 600, md 900)
var TABLET = '@media (max-width:820px)'

// Bảng màu riêng của khu admin — trước đây khai báo bằng biến CSS trong
//   AdminLayout.module.css, nay để thẳng ở đây vì không file nào khác dùng
var C = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  ink: '#132238',
  inkStrong: '#0f172a',
  muted: '#64748b',
  line: '#d7e1ee',
}

// Chữ tràn dòng thì cắt bằng dấu ba chấm — dùng lại ở tên và email
var ellipsisSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export default function AdminLayout() {
  var navigate = useNavigate()
  var { user, logout } = useAuth()
  var { lang, toggleLang } = useLanguage()
  var [menuAnchor, setMenuAnchor] = useState(null)

  // Khu admin luôn dùng giao diện SÁNG, không đổi theo nút sáng/tối của app.
  // Toàn bộ màu của trang admin ghi cứng theo bảng sáng (#132238, #f8fbff...),
  //   nên nếu để component MUI chạy theo theme tối thì bảng và nút sẽ đen
  //   giữa nền trắng. ThemeProvider lồng bên trong ghi đè theme cha cho nhánh này
  var adminTheme = useMemo(function () {
    return createAppTheme('light')
  }, [])

  var adminLinks = [
    { path: '/admin', label: 'Tổng quan', icon: 'grid', end: true },
    { path: '/admin/content/post', label: 'Bài viết', icon: 'image' },
    { path: '/admin/content/reel', label: 'Reels', icon: 'reels' },
    { path: '/admin/content/story', label: 'Stories', icon: 'play' },
    { path: '/admin/reports', label: 'Báo cáo', icon: 'flag' },
  ]
  if (user?.role === 'super_admin') {
    adminLinks.splice(1, 0, { path: '/admin/users', label: 'Người dùng', icon: 'user' })
    adminLinks.push({ path: '/admin/verifications', label: 'Tích xanh', icon: 'verified' })
    adminLinks.push({ path: '/admin/logs', label: 'Lịch sử', icon: 'folder' })
  }

  async function handleLogout() {
    setMenuAnchor(null)
    await logout()
    navigate('/login')
  }

  function handleToggleLang() {
    setMenuAnchor(null)
    toggleLang()
  }

  var displayName = user?.fullName || user?.username || 'Admin'
  var username = user?.username || 'admin'

  return (
    <ThemeProvider theme={adminTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          color: C.ink,
          background: [
            'radial-gradient(circle at top left, rgba(20, 184, 166, .14), transparent 30%)',
            'radial-gradient(circle at top right, rgba(244, 63, 94, .10), transparent 28%)',
            'linear-gradient(135deg, #f8fbff 0%, #edf3f8 45%, #f6f8fb 100%)',
          ].join(','),
          [TABLET]: { display: 'block' },
        }}
      >
        <Box
          component="aside"
          sx={{
            position: 'sticky',
            top: 0,
            width: 280,
            height: '100vh',
            px: 2,
            py: 3,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(216, 227, 240, .9)',
            bgcolor: 'rgba(255, 255, 255, .84)',
            backdropFilter: 'blur(18px)',
            boxShadow: '16px 0 45px rgba(15, 23, 42, .07)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20,
            [TABLET]: {
              position: 'static',
              width: '100%',
              height: 'auto',
              minHeight: 'auto',
              borderRight: 'none',
              borderBottom: '1px solid #d9e1ef',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.25,
              pb: 3,
              borderBottom: '1px solid #e4eaf3',
            }}
          >
            <Mark size={34} accent="#4f5df7" dark={true} />
            <Box>
              <Typography component="strong" sx={{ display: 'block', fontSize: 22, lineHeight: 1.15, color: C.inkStrong }}>
                Admin
              </Typography>
              <Typography component="span" sx={{ display: 'block', mt: '2px', fontSize: 13, color: C.muted }}>
                Aptech Social Network
              </Typography>
            </Box>
          </Box>

          <Box
            component="nav"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
              pt: '22px',
              flex: 1,
              [TABLET]: { flexDirection: 'row', overflowX: 'auto', pb: .5 },
            }}
          >
            {adminLinks.map(function (item) {
              return (
                <Box
                  key={item.path}
                  component={NavLink}
                  to={item.path}
                  end={item.end}
                  sx={{
                    height: 50,
                    px: 1.75,
                    borderRadius: 2,
                    color: '#52627a',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    fontSize: 15,
                    fontWeight: 800,
                    flexShrink: 0,
                    transition: 'background .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease',
                    '&:hover': {
                      bgcolor: '#eff6ff',
                      color: C.primaryDark,
                      transform: 'translateX(3px)',
                    },
                    // NavLink của react-router tự gắn class "active" cho mục đang mở
                    '&.active': {
                      background: 'linear-gradient(135deg, ' + C.primary + ' 0%, #0f766e 100%)',
                      color: '#fff',
                      boxShadow: '0 14px 28px rgba(37, 99, 235, .22)',
                    },
                  }}
                >
                  <Icon name={item.icon} size={20} />
                  <Box component="span">{item.label}</Box>
                </Box>
              )
            })}
          </Box>
        </Box>

        <Box component="main" sx={{ flex: 1, minWidth: 0, bgcolor: 'transparent' }}>
          <Box
            component="header"
            sx={{
              position: 'sticky',
              top: 0,
              minHeight: 92,
              px: 6,
              py: 2.5,
              boxSizing: 'border-box',
              borderBottom: '1px solid rgba(216, 227, 240, .84)',
              bgcolor: 'rgba(255, 255, 255, .80)',
              backdropFilter: 'blur(18px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              zIndex: 10,
              [TABLET]: { flexDirection: 'column', alignItems: 'flex-start', p: 2.5 },
            }}
          >
            <Box>
              <Typography component="h1" sx={{ m: 0, fontSize: 28, fontWeight: 900, color: C.inkStrong }}>
                Trang quản trị
              </Typography>
              <Typography sx={{ mt: '5px', fontSize: 14, color: C.muted }}>
                Quản lý người dùng, báo cáo và hoạt động nền tảng
              </Typography>
            </Box>

            <Box sx={{ flex: '0 0 auto', [TABLET]: { width: '100%' } }}>
              <Box
                component="button"
                type="button"
                onClick={function (e) { setMenuAnchor(e.currentTarget) }}
                aria-expanded={!!menuAnchor}
                sx={{
                  minWidth: 250,
                  height: 58,
                  px: 1.5,
                  py: .875,
                  border: '1px solid ' + C.line,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, .86)',
                  color: C.ink,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  cursor: 'pointer',
                  boxShadow: '0 10px 24px rgba(15, 23, 42, .06)',
                  transition: 'border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease',
                  '&:hover': {
                    borderColor: '#a9b9ce',
                    bgcolor: '#ffffff',
                    boxShadow: '0 16px 34px rgba(15, 23, 42, .10)',
                    transform: 'translateY(-1px)',
                  },
                  [TABLET]: { width: '100%', minWidth: 0 },
                }}
              >
                <Avatar src={user?.avatarUrl} username={username} size="md" />
                <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <Typography component="strong" sx={{ ...ellipsisSx, fontSize: 14 }}>{displayName}</Typography>
                  <Typography component="small" sx={{ ...ellipsisSx, fontSize: 12, color: C.muted }}>@{username}</Typography>
                </Box>
                <Icon name="dots" size={18} />
              </Box>

              <Menu
                anchorEl={menuAnchor}
                open={!!menuAnchor}
                onClose={function () { setMenuAnchor(null) }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { width: 300, p: 1.25, border: '1px solid ' + C.line } } }}
              >
                {/* Khối nhận diện tài khoản — chỉ để đọc nên không dùng MenuItem */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr',
                    gap: 1.5,
                    px: 1.25,
                    pt: 1.25,
                    pb: 1.75,
                    borderBottom: '1px solid #e5eaf0',
                  }}
                >
                  <Avatar src={user?.avatarUrl} username={username} size="lg" />
                  <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <Typography component="strong" sx={{ ...ellipsisSx, fontSize: 14 }}>{displayName}</Typography>
                    <Typography component="span" sx={{ ...ellipsisSx, fontSize: 13, color: C.muted }}>@{username}</Typography>
                    <Typography component="small" sx={{ ...ellipsisSx, fontSize: 12, color: C.muted }}>{user?.email}</Typography>
                  </Box>
                </Box>

                <MenuItem
                  onClick={handleToggleLang}
                  sx={{
                    minHeight: 44,
                    mt: 1,
                    borderRadius: 1.75,
                    color: '#334155',
                    fontSize: 14,
                    fontWeight: 800,
                    justifyContent: 'space-between',
                    '&:hover': { bgcolor: '#f1f6fb' },
                  }}
                >
                  <Box component="span">Ngôn ngữ</Box>
                  <Box component="strong">{lang === 'vi' ? 'VI' : 'EN'}</Box>
                </MenuItem>

                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    minHeight: 44,
                    mt: 1,
                    borderRadius: 1.75,
                    color: '#dc2626',
                    fontSize: 14,
                    fontWeight: 800,
                    justifyContent: 'space-between',
                    '&:hover': { bgcolor: '#fee2e2' },
                  }}
                >
                  <Box component="span">Đăng xuất</Box>
                  <Icon name="x" size={17} />
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          <Box component="section" sx={{ px: 6, pt: '34px', pb: 7, boxSizing: 'border-box', [TABLET]: { p: 2.5 } }}>
            <Outlet />
          </Box>
        </Box>

        {/* Trợ lý AI nổi — có ở mọi trang admin */}
        <AdminAiChat />
      </Box>
    </ThemeProvider>
  )
}
