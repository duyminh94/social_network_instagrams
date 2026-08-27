// routes/AppRoutes.jsx
// Định nghĩa toàn bộ route theo pattern 3 lớp nested của React Router v6
//
// Cấu trúc 3 lớp:
//   Lớp 1 — Auth/Admin guard : PrivateRoute | AdminRoute  (kiểm tra quyền)
//   Lớp 2 — Layout           : MainLayout                 (render khung UI)
//   Lớp 3 — Page             : Home | Profile | ...       (nội dung trang)
//
// Public route (Login, Register) không cần 3 lớp — render thẳng
//
// Lazy load các trang nặng (Chat, Admin) để giảm bundle size lúc đầu

import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'
import AdminRoute from './AdminRoute'
import MainLayout from '../components/layout/MainLayout'
import AdminLayout from '../components/layout/AdminLayout'
import Spinner from '../components/common/Spinner'

// Trang import thường — nhỏ, load ngay khi vào app
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import VerifyEmail from '../pages/auth/VerifyEmail'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import ResendVerification from '../pages/auth/ResendVerification'
import Home from '../pages/home/Home'
import Explore from '../pages/explore/Explore'
import HashtagPage from '../pages/hashtag/HashtagPage'
import Suggested from '../pages/suggested/Suggested'
import Reels from '../pages/reels/Reels'
import PostDetail from '../pages/post/PostDetail'
import Profile from '../pages/profile/Profile'
import EditProfile from '../pages/profile/EditProfile'
import ChangePassword from '../pages/profile/ChangePassword'
import BlockedUsers from '../pages/profile/BlockedUsers'
import Notifications from '../pages/notifications/Notifications'
import NotFound from '../pages/notfound/NotFound'

// Trang lazy load — chỉ tải chunk khi user thực sự điều hướng đến
const Chat = lazy(function () { return import('../pages/chat/Chat') })
const AdminDashboard = lazy(function () { return import('../pages/admin/AdminDashboard') })
const AdminUsers = lazy(function () { return import('../pages/admin/AdminUsers') })
const AdminUserDetail = lazy(function () { return import('../pages/admin/AdminUserDetail') })
const AdminContentList = lazy(function () { return import('../pages/admin/AdminContentList') })
const AdminContentDetail = lazy(function () { return import('../pages/admin/AdminContentDetail') })
const AdminReports = lazy(function () { return import('../pages/admin/AdminReports') })
const AdminReportDetail = lazy(function () { return import('../pages/admin/AdminReportDetail') })
const AdminVerifications = lazy(function () { return import('../pages/admin/AdminVerifications') })
const AdminLogs = lazy(function () { return import('../pages/admin/AdminLogs') })

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Public routes ── không cần đăng nhập */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/resend-verification" element={<ResendVerification />} />

      {/* ── Private routes ── */}
      {/* Lớp 1: PrivateRoute kiểm tra đăng nhập */}
      <Route element={<PrivateRoute />}>

        {/* Lớp 2: MainLayout render khung Sidebar + MobileNav */}
        <Route element={<MainLayout />}>

          {/* Lớp 3: Các trang */}
          <Route path="/" element={<Home />} />
          <Route path="/stories/:storyUsername" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/hashtag/:tag" element={<HashtagPage />} />
          <Route path="/suggested" element={<Suggested />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/reels/:reelId" element={<Reels />} />
          <Route path="/p/:postId" element={<PostDetail />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Chat dùng Suspense vì là lazy component */}
          <Route
            path="/chat"
            element={<Suspense fallback={<Spinner fullPage />}><Chat /></Suspense>}
          />
          <Route
            path="/chat/:id"
            element={<Suspense fallback={<Spinner fullPage />}><Chat /></Suspense>}
          />

          {/* Đặt /:username/edit và /:username/change-password TRƯỚC /:username để tránh match nhầm */}
          <Route path="/:username/change-password" element={<ChangePassword />} />
          <Route path="/:username/blocked" element={<BlockedUsers />} />
          <Route path="/:username/edit" element={<EditProfile />} />
          <Route path="/:username" element={<Profile />} />

          {/* Catch-all: URL không khớp route nào ở trên → trang 404
              React Router v6 luôn ưu tiên route cụ thể hơn, nên "*" chỉ chạy khi không còn lựa chọn */}
          <Route path="*" element={<NotFound />} />

        </Route>
      </Route>

      {/* ── Admin routes ── */}
      {/* Lớp 1: AdminRoute kiểm tra role */}
      <Route element={<AdminRoute />}>

        {/* Lớp 2: AdminLayout riêng, không dùng layout user */}
        <Route element={<AdminLayout />}>

          {/* Lớp 3: Các trang admin */}
          <Route
            path="/admin"
            element={<Suspense fallback={<Spinner fullPage />}><AdminDashboard /></Suspense>}
          />
          <Route
            path="/admin/users"
            element={<Suspense fallback={<Spinner fullPage />}><AdminUsers /></Suspense>}
          />
          <Route
            path="/admin/users/:id"
            element={<Suspense fallback={<Spinner fullPage />}><AdminUserDetail /></Suspense>}
          />
          <Route
            path="/admin/content/:contentType"
            element={<Suspense fallback={<Spinner fullPage />}><AdminContentList /></Suspense>}
          />
          <Route
            path="/admin/content/:contentType/:id"
            element={<Suspense fallback={<Spinner fullPage />}><AdminContentDetail /></Suspense>}
          />
          <Route
            path="/admin/reports"
            element={<Suspense fallback={<Spinner fullPage />}><AdminReports /></Suspense>}
          />
          <Route
            path="/admin/reports/:id"
            element={<Suspense fallback={<Spinner fullPage />}><AdminReportDetail /></Suspense>}
          />
          <Route
            path="/admin/verifications"
            element={<Suspense fallback={<Spinner fullPage />}><AdminVerifications /></Suspense>}
          />
          <Route
            path="/admin/logs"
            element={<Suspense fallback={<Spinner fullPage />}><AdminLogs /></Suspense>}
          />

        </Route>
      </Route>

    </Routes>
  )
}
