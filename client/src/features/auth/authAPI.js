// features/auth/authAPI.js
// Tập hợp các hàm gọi API xác thực người dùng

import api from '../../services/api'

// Đăng nhập bằng email (hoặc username) + password
// Backend hỗ trợ cả 2 dạng nên field vẫn gọi là email
export function login(email, password) {
  return api.post('/auth/login', { email, password })
}

// Đăng ký tài khoản mới
// data: { username, email, password, fullName }
export function register(data) {
  return api.post('/auth/register', data)
}

// Lấy thông tin user đang đăng nhập (dùng để verify token còn hợp lệ)
export function getMe() {
  return api.get('/auth/me')
}

// Đăng xuất — backend sẽ đưa token vào blacklist
export function logout() {
  return api.post('/auth/logout')
}

// Đổi mật khẩu (khi đang đăng nhập)
// data: { oldPassword, newPassword }
export function changePassword(data) {
  return api.patch('/auth/change-password', data)
}

// Gửi lại email kích hoạt tài khoản
// data: { email }
export function resendVerification(data) {
  return api.post('/auth/resend-verification', data)
}

// Yêu cầu gửi link đặt lại mật khẩu về email
// data: { email }
export function forgotPassword(data) {
  return api.post('/auth/forgot-password', data)
}

// Đặt lại mật khẩu bằng token từ email
// data: { token, newPassword }
export function resetPassword(data) {
  return api.post('/auth/reset-password', data)
}

// Đăng nhập / đăng ký bằng Google
// credential: ID token từ @react-oauth/google
export function googleLogin(credential) {
  return api.post('/auth/google', { credential })
}
