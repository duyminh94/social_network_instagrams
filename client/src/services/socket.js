// services/socket.js
// Quản lý kết nối Socket.IO — connect, disconnect, get instance
//
// FIX (security): trước đây gửi { query: { userId } } → server tin ngay, không verify
//   Giờ gửi JWT token qua socket.handshake.auth.token để server tự verify và extract userId
//   → Server không còn tin vào userId do client tự khai
//
// Token được đọc từ localStorage tại thời điểm connect
// Nếu token hết hạn → server disconnect ngay → SocketContext cleanup socket

import { io } from 'socket.io-client'

var socket = null

// connectSocket nhận token (JWT string, không có 'Bearer ') thay vì userId
// Server sẽ verify JWT và tự lấy userId từ payload — client không cần biết userId
export function connectSocket(token) {
  if (socket && socket.connected) return socket

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
    // Gửi qua auth (tốt hơn query) — Socket.IO sẽ đặt vào socket.handshake.auth
    auth: { token: 'Bearer ' + token },
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
