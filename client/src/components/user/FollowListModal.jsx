import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../common/Avatar'
import Spinner from '../common/Spinner'
import styles from './FollowListModal.module.css'

export default function FollowListModal({ userId, type, onClose }) {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  // Override trạng thái follow theo từng userId (key = userId, value = true/false).
  // Mặc định lấy theo u.isFollowing từ server; khi bấm thì ghi đè ở đây.
  // Dùng object thay vì mảng "followingIds" để biểu diễn được cả 2 chiều (follow/unfollow),
  // tránh bug nút kẹt ở "Following" sau khi unfollow (server trả isFollowing=true).
  const [followOverrides, setFollowOverrides] = useState({})

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['followList', userId, type],
    queryFn: () => api.get(`/users/${userId}/${type}`).then((r) => r.data),
    retry: false,
  })

  const users = type === 'followers'
    ? (data?.followers || [])
    : (data?.following || [])

  const handleFollow = async (targetId, isFollowing) => {
    // Optimistic: đổi trạng thái nút NGAY → chặn double-click gửi request trùng (gây 404)
    setFollowOverrides((prev) => ({ ...prev, [targetId]: !isFollowing }))
    try {
      if (isFollowing) {
        await api.delete(`/follow/${targetId}`)
      } else {
        await api.post(`/follow/${targetId}`)
      }
      // Soft refresh: refetch ngầm số followers/following + danh sách (không chớp trắng)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['followList'] })
    } catch {
      // Lỗi → khôi phục trạng thái cũ
      setFollowOverrides((prev) => ({ ...prev, [targetId]: isFollowing }))
      toast.error('Action failed')
    }
  }

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <span className={styles.title}>
            {type === 'followers' ? 'Followers' : 'Following'}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.list}>
          {isLoading ? (
            <div className={styles.center}><Spinner /></div>
          ) : isError ? (
            <div className={styles.empty}>
              {error?.response?.status === 403
                ? 'Tài khoản riêng tư — bạn chưa được phép xem danh sách này.'
                : 'Không thể tải dữ liệu.'}
            </div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>
              {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          ) : (
            users.map((u) => {
              const isMe = String(me?._id || me?.id) === String(u._id)
              const key = String(u._id)
              // Ưu tiên override local (vừa bấm), nếu chưa có thì lấy theo server
              const isFollowing = key in followOverrides ? followOverrides[key] : !!u.isFollowing
              return (
                <div key={u._id} className={styles.userRow}>
                  <Link to={`/${u.username}`} onClick={onClose} className={styles.userInfo}>
                    <Avatar src={u.avatarUrl || u.avatar} username={u.username} size="md" />
                    <div>
                      <div className={styles.username}>{u.username}</div>
                      {u.fullName && <div className={styles.fullName}>{u.fullName}</div>}
                    </div>
                  </Link>
                  {!isMe && (
                    <button
                      className={isFollowing ? styles.btnFollowing : styles.btnFollow}
                      onClick={() => handleFollow(String(u._id), isFollowing)}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
