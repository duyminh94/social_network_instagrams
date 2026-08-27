// services/api.js
// Axios instance dùng chung cho toàn bộ ứng dụng
//
// baseURL lấy từ biến môi trường VITE_API_URL (đặt trong .env)
//
// Interceptor request: tự động đính kèm token vào header mỗi request
//   → Không cần gọi api.get(..., { headers: { Authorization: ... } }) thủ công
//
// Interceptor response: nếu server trả 401 (token hết hạn / bị blacklist)
//   → Xóa localStorage và chuyển về trang login tự động
//   → Ngoại trừ khi đang gọi /login hoặc /register (tránh redirect vòng lặp)

import axios from 'axios'

// Tạo axios instance với baseURL từ .env
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Request interceptor: gắn Bearer token vào header Authorization
api.interceptors.request.use(function (config) {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})

// Response interceptor: xử lý lỗi 401 (token không hợp lệ hoặc đã logout)
api.interceptors.response.use(
  function (res) {
    // Request thành công → trả về response bình thường
    return res
  },
  function (err) {
    const url = err.config?.url || ''
    const status = err.response?.status

    // Chỉ redirect về /login khi 401 xảy ra ngoài auth endpoints
    // Nếu để redirect khi đang /login → vòng lặp redirect vô hạn
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')

    if (status === 401 && !isAuthEndpoint) {
      localStorage.clear()
      window.location.href = '/login'
    }

    return Promise.reject(err)
  }
)

export default api
