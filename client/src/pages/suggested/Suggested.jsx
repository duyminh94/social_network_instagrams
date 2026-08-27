// pages/suggested/Suggested.jsx
// Trang "Suggested for you" — danh sách user gợi ý để follow
// Hiện khi bấm "See all" từ sidebar Home

import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import api from '../../services/api'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import Button from '../../components/common/Button'

// Fetch danh sách gợi ý từ backend
function fetchSuggestions() {
  return api.get('/users/suggestions?limit=30').then(function (res) {
    return res.data.users || res.data || []
  })
}

// Cắt chữ thành một dòng, quá dài thì thêm dấu ba chấm
var ellipsis = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export default function Suggested() {
  // Map userId → trạng thái follow của từng user riêng biệt
  var [followedIds, setFollowedIds] = useState({})
  var [loadingIds, setLoadingIds] = useState({})
  var { t } = useLanguage()

  var { data: users, isLoading } = useQuery({
    queryKey: ['suggestions-full'],
    queryFn: fetchSuggestions,
  })

  async function handleFollow(userId) {
    if (loadingIds[userId]) return

    setLoadingIds(function (prev) { return { ...prev, [userId]: true } })

    try {
      if (followedIds[userId]) {
        await api.delete('/follow/' + userId)
        setFollowedIds(function (prev) { return { ...prev, [userId]: false } })
      } else {
        await api.post('/follow/' + userId)
        setFollowedIds(function (prev) { return { ...prev, [userId]: true } })
        toast.success(t.suggested.followedToast)
      }
    } catch {
      toast.error(t.suggested.followError)
    } finally {
      setLoadingIds(function (prev) { return { ...prev, [userId]: false } })
    }
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 3, pb: 6 }}>
      <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700, mb: 2.5 }}>
        {t.suggested.title}
      </Typography>

      {isLoading && <Spinner fullPage />}

      {!isLoading && (!users || users.length === 0) && (
        <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', mt: 5 }}>
          {t.suggested.empty}
        </Typography>
      )}

      {!isLoading && users && users.length > 0 && (
        <Box>
          {users.map(function (user) {
            var isFollowed = followedIds[user._id] || false
            var isPending = loadingIds[user._id] || false

            return (
              <Box
                key={user._id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.75,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  // Dòng cuối bỏ gạch chân để không thừa một nét lơ lửng
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                <Link component={RouterLink} to={'/' + user.username} sx={{ flexShrink: 0 }}>
                  <Avatar src={user.avatarUrl} username={user.username} size="lg" />
                </Link>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Link
                    component={RouterLink}
                    to={'/' + user.username}
                    underline="hover"
                    sx={{ ...ellipsis, display: 'block', fontWeight: 700, fontSize: 14, color: 'text.primary' }}
                  >
                    {user.username}
                  </Link>

                  {user.fullName && (
                    <Typography sx={{ ...ellipsis, fontSize: 14, color: 'text.secondary' }}>
                      {user.fullName}
                    </Typography>
                  )}

                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {t.suggested.reason}
                  </Typography>
                </Box>

                <Button
                  variant={isFollowed ? 'outline-secondary' : 'primary'}
                  loading={isPending}
                  onClick={function () { handleFollow(user._id) }}
                  sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  {isFollowed ? t.common.following : t.common.follow}
                </Button>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
