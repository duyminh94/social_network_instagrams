// components/user/FollowListModal.jsx
// Hộp thoại danh sách người theo dõi / đang theo dõi
//
// Dialog của MUI lo sẵn phần đóng bằng Esc, khoá cuộn trang nền và khoá focus,
//   nên bản này bỏ được useEffect tự gắn listener bàn phím như trước

import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../common/Avatar'
import Spinner from '../common/Spinner'
import Button from '../common/Button'

// Cắt chữ thành một dòng, quá dài thì thêm dấu ba chấm
var ellipsis = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

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

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      // Giới hạn chiều cao để danh sách dài thì cuộn bên trong, không đẩy dài cả trang
      slotProps={{ paper: { sx: { maxHeight: '70vh' } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.75, pr: 1 }}>
        <Typography component="span" sx={{ fontSize: 16, fontWeight: 600 }}>
          {type === 'followers' ? 'Followers' : 'Following'}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><Spinner /></Box>
        ) : isError ? (
          <Typography sx={{ textAlign: 'center', px: 2, py: 5, color: 'text.secondary', fontSize: 14 }}>
            {error?.response?.status === 403
              ? 'Tài khoản riêng tư — bạn chưa được phép xem danh sách này.'
              : 'Không thể tải dữ liệu.'}
          </Typography>
        ) : users.length === 0 ? (
          <Typography sx={{ textAlign: 'center', px: 2, py: 5, color: 'text.secondary', fontSize: 14 }}>
            {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </Typography>
        ) : (
          users.map((u) => {
            const isMe = String(me?._id || me?.id) === String(u._id)
            const key = String(u._id)
            // Ưu tiên override local (vừa bấm), nếu chưa có thì lấy theo server
            const isFollowing = key in followOverrides ? followOverrides[key] : !!u.isFollowing

            return (
              <Box
                key={u._id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.25,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Link
                  component={RouterLink}
                  to={`/${u.username}`}
                  onClick={onClose}
                  underline="none"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}
                >
                  <Avatar src={u.avatarUrl || u.avatar} username={u.username} size="md" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ ...ellipsis, fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
                      {u.username}
                    </Typography>
                    {u.fullName && (
                      <Typography sx={{ ...ellipsis, fontSize: 13, color: 'text.secondary' }}>
                        {u.fullName}
                      </Typography>
                    )}
                  </Box>
                </Link>

                {!isMe && (
                  <Button
                    size="sm"
                    variant={isFollowing ? 'outline-secondary' : 'primary'}
                    onClick={() => handleFollow(String(u._id), isFollowing)}
                    sx={{ ml: 1.5, flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
              </Box>
            )
          })
        )}
      </DialogContent>
    </Dialog>
  )
}
