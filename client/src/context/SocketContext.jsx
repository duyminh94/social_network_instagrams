// @refresh reset
// context/SocketContext.jsx
// Quản lý kết nối Socket.IO, số thông báo chưa đọc, và danh sách user online

import { createContext, useState, useEffect, useRef, useContext } from 'react'
import { AuthContext } from './AuthContext'
import { connectSocket, disconnectSocket } from '../services/socket'
import { getUnreadCount } from '../features/notification/notificationAPI'

// eslint-disable-next-line react-refresh/only-export-components
export const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useContext(AuthContext)
  const [socket, setSocket] = useState(null)
  const [notifCount, setNotifCount] = useState(0)
  // onlineUsers: Set<userId string> — cập nhật mỗi khi server emit 'online_users'
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const socketRef = useRef(null)

  // Load số thông báo chưa đọc từ API khi mới vào app / sau khi đăng nhập
  // Nếu chỉ dùng socket: badge = 0 khi khởi động, dù user đã có thông báo cũ chưa đọc
  useEffect(function () {
    if (!isAuthenticated) {
      setNotifCount(0)
      return
    }
    getUnreadCount()
      .then(function (res) {
        setNotifCount(res.data?.unreadCount || 0)
      })
      .catch(function () {
        // Lỗi mạng — giữ nguyên 0, không crash app
      })
  }, [isAuthenticated])

  useEffect(function () {
    if (isAuthenticated && user?._id) {
      var token = localStorage.getItem('token') || ''
      var s = connectSocket(token)
      socketRef.current = s
      setSocket(s)

      // Tăng badge mỗi khi có thông báo mới (không cần fetch lại API)
      s.on('new_notification', function () {
        setNotifCount(function (prev) { return prev + 1 })
      })

      // Server emit mảng userId string mỗi khi có user connect/disconnect
      s.on('online_users', function (userIds) {
        setOnlineUsers(new Set(userIds))
      })

      return function () {
        s.off('new_notification')
        s.off('online_users')
        disconnectSocket()
        socketRef.current = null
        setSocket(null)
        setOnlineUsers(new Set())
      }
    } else {
      disconnectSocket()
      socketRef.current = null
      setSocket(null)
      setOnlineUsers(new Set())
    }
  }, [isAuthenticated, user?._id])

  function resetNotifCount() {
    setNotifCount(0)
  }

  // Giảm badge đi 1 khi user đọc một thông báo (không cho xuống dưới 0)
  function decrementNotifCount() {
    setNotifCount(function (prev) {
      if (prev > 0) {
        return prev - 1
      }
      return 0
    })
  }

  return (
    <SocketContext.Provider value={{ socket, notifCount, resetNotifCount, decrementNotifCount, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  )
}
