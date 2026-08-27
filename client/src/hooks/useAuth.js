import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

// Hook tiện ích — lấy auth context ở bất kỳ component nào mà không cần import AuthContext trực tiếp
export function useAuth() {
  return useContext(AuthContext)
}
