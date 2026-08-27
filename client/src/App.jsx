// App.jsx
// Root component — bọc toàn ứng dụng trong các Provider theo đúng thứ tự
//
// Thứ tự Provider quan trọng (trong → ngoài = từ trên xuống dưới):
//   1. QueryClientProvider : cần ở ngoài cùng vì AuthProvider dùng useQuery
//   2. BrowserRouter       : cần trước AuthProvider vì AuthProvider gọi navigate
//   3. AuthProvider        : quản lý user/token — phải có trước SocketProvider
//   4. SocketProvider      : đọc user._id từ AuthProvider để kết nối socket
//
// staleTime: 5 phút — data trong cache không fetch lại nếu chưa quá 5 phút
//   → Tránh gọi API liên tục khi navigate qua lại giữa các trang
//   → Feed / conversations / profile sẽ load nhanh từ cache
//
// retry: 1 — thử lại tối đa 1 lần khi request lỗi (không retry mãi khi 401/403)

import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
import AppRoutes from './routes/AppRoutes'

const queryClient = new QueryClient({
  // Tự refresh: sau MỌI mutation thành công (đăng/sửa/xoá bài, like, comment, follow,
  // sửa profile, ban user...) → tự refetch lại toàn bộ query đang hiển thị.
  // Làm tập trung 1 chỗ thay vì thêm invalidateQueries vào từng mutation.
  // Refetch chạy nền (không chớp trắng, không mất vị trí cuộn) vì data đã có trong cache.
  mutationCache: new MutationCache({
    onSuccess: function () {
      queryClient.invalidateQueries()
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
        <LanguageProvider>
        <AuthProvider>
          <SocketProvider>
            <AppRoutes />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1f1f22',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,.12)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxShadow: '0 12px 32px rgba(0,0,0,.45)',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ff4d5e',
                    secondary: '#fff',
                  },
                  style: {
                    background: '#2a171b',
                    border: '1px solid rgba(255,77,94,.35)',
                    color: '#fff',
                  },
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
        </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
