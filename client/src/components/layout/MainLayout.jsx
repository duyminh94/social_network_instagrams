// components/layout/MainLayout.jsx
// Lớp 2 (Layout): render khung giao diện chính gồm Sidebar + content + MobileNav
//
// Dùng <Outlet /> theo pattern Nested Routes — trang con render vào chỗ Outlet
// Sidebar hiển thị ở desktop, MobileNav hiển thị ở mobile (CSS xử lý)

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import MiniChat from '../chat/MiniChat'
import StoryPortal from '../story/StoryPortal'
import Box from '@mui/material/Box'
import * as s from './layoutStyles'

export default function MainLayout() {
  var { user } = useAuth()
  var adminRoles = ['super_admin', 'moderator']

  // Admin có layout riêng, không cho đi lạc sang giao diện user.
  if (adminRoles.includes(user?.role)) {
    return <Navigate to="/admin" replace />
  }

  return (
    <Box sx={s.appLayout}>
      <Sidebar />
      {/* Lớp 3 (Page) render vào đây */}
      <Box component="main" sx={s.mainContent}>
        <Outlet />
      </Box>
      {/* StoryPortal: nhận event story:open từ bất kỳ trang nào, render modal */}
      <StoryPortal />
      <MobileNav />
      {/* Widget chat nhỏ góc dưới phải — ẩn tự động trên trang /chat và mobile */}
      <MiniChat />
    </Box>
  )
}
