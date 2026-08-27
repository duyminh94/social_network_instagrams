// routes/AdminRoute.jsx
// Lớp 1 (Admin guard): kiểm tra quyền admin trước khi vào trang
//
// Dùng pattern Nested Routes của React Router v6 — render <Outlet />
//
// Luồng:
//   1. Đang load → Spinner
//   2. Chưa đăng nhập → redirect /login
//   3. Không có quyền admin → redirect /
//   4. Có quyền → <Outlet /> (render lớp tiếp theo)
//
// Role hợp lệ: 'super_admin' hoặc 'moderator'

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Spinner from '../components/common/Spinner'

// Phải khớp với role enum trong User.js
const ADMIN_ROLES = ['super_admin', 'moderator']

export default function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()

  // Chờ AuthContext load xong
  if (isLoading) return <Spinner />

  // Chưa đăng nhập
  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Đã đăng nhập nhưng không có quyền admin
  const hasAdminAccess = ADMIN_ROLES.includes(user?.role)
  if (!hasAdminAccess) return <Navigate to="/" replace />

  // Có quyền → render route con (lớp 2 trở đi)
  return <Outlet />
}
