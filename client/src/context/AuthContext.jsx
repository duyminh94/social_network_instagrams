// context/AuthContext.jsx
// Quản lý trạng thái đăng nhập toàn ứng dụng
//
// Lưu user + token vào localStorage để giữ đăng nhập khi refresh trang
// Khi app khởi động, tự động gọi /auth/me để kiểm tra token còn hợp lệ không
//   → Nếu hợp lệ: set user vào state
//   → Nếu không: xóa localStorage, chuyển về login (do interceptor trong api.js)
//
// normalize(user): chuẩn hoá field avatar vì server trả về avatarUrl
//   nhưng các component dùng user.avatar → cần map lại để nhất quán

import { createContext, useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { logout as logoutAPI } from '../features/auth/authAPI'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

// Đảm bảo user object luôn có field `avatar` (server trả avatarUrl, component dùng avatar)
function normalize(u) {
  if (!u) return u
  return { ...u, avatar: u.avatarUrl || u.avatar || '' }
}

export function AuthProvider({ children }) {
  // queryClient dùng để xóa toàn bộ cache React Query khi đổi tài khoản
  // → tránh hiển thị dữ liệu của phiên/tài khoản trước (feed, gợi ý, profile...)
  const queryClient = useQueryClient()

  // Lấy user từ localStorage khi app khởi động (tránh flash trắng)
  const [user, setUser] = useState(function () {
    try {
      const stored = localStorage.getItem('user')
      return stored ? normalize(JSON.parse(stored)) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(function () {
    return localStorage.getItem('token') || null
  })

  // isLoading = true khi đang verify token với server lúc app mới mở
  const [isLoading, setIsLoading] = useState(true)

  // Khi app khởi động: gọi /auth/me để xác nhận token còn hợp lệ
  useEffect(function () {
    async function verify() {
      const storedToken = localStorage.getItem('token')

      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const res = await api.get('/auth/me')
        setUser(normalize(res.data.user || res.data))
        setToken(storedToken)
      } catch {
        // Token hết hạn hoặc bị blacklist → xóa hết, về trạng thái chưa đăng nhập
        localStorage.clear()
        setUser(null)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    verify()
  }, [])

  // Gọi sau khi đăng nhập thành công: lưu token + user vào localStorage và state
  const login = useCallback(function (newToken, newUser) {
    const u = normalize(newUser)
    // Xóa cache cũ trước khi vào: nếu vừa seed lại DB hoặc đổi tài khoản,
    // feed/gợi ý sẽ fetch mới thay vì dùng lại dữ liệu cũ còn trong cache
    queryClient.clear()
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(u))
    setToken(newToken)
    setUser(u)
  }, [queryClient])

  // Gọi khi người dùng nhấn logout
  // Gọi API trước để server đưa token vào blacklist, sau đó mới xóa localStorage
  const logout = useCallback(async function () {
    try {
      // Gọi backend để blacklist token hiện tại (token 7d không dùng được nữa)
      await logoutAPI()
    } catch {
      // Nếu API lỗi vẫn tiếp tục logout phía client
    } finally {
      localStorage.clear()
      queryClient.clear()
      setToken(null)
      setUser(null)
    }
  }, [queryClient])

  // Cập nhật thông tin user cục bộ (sau khi edit profile, đổi avatar...)
  // Không cần gọi lại /auth/me, chỉ merge data mới vào state hiện tại
  const updateUser = useCallback(function (data) {
    setUser(function (prev) {
      const updated = normalize({ ...prev, ...data })
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
