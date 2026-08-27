// routes/PrivateRoute.jsx
// Lớp 1 (Auth guard): kiểm tra đăng nhập trước khi vào trang
//
// Dùng pattern Nested Routes của React Router v6 — render <Outlet />
// Route con sẽ được render tại chỗ <Outlet /> nếu pass điều kiện
//
// Luồng:
//   1. Đang load → Spinner
//   2. Chưa đăng nhập → redirect /login
//   3. Đã đăng nhập → <Outlet /> (render lớp tiếp theo)

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Spinner from '../components/common/Spinner'

export default function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  // Chờ AuthContext kiểm tra token trong localStorage xong
  if (isLoading) return <Spinner />

  // Chưa đăng nhập → về trang login
  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Đã đăng nhập → render route con (lớp 2 trở đi)
  return <Outlet />
}
