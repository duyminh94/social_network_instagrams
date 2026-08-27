import { useContext } from 'react'
import { SocketContext } from '../context/SocketContext'

// Hook tiện ích — lấy socket context, dùng ở bất kỳ component nào cần socket hoặc onlineUsers
export function useSocket() {
  return useContext(SocketContext)
}
