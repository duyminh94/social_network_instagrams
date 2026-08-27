// pages/profile/BlockedUsers.jsx
// Trang "Tài khoản đã chặn" — hiện danh sách user mình đã chặn + nút Bỏ chặn.
// Dùng API có sẵn: GET /block (danh sách), DELETE /block/:id (bỏ chặn).
// Layout tái dùng settingsStyles.js (giống trang Đổi mật khẩu).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { getBlockedUsers, unblockUser } from '../../features/block/blockAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import SettingsSidebar from './SettingsSidebar'
import * as s from './settingsStyles'

export default function BlockedUsers() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: function () { return getBlockedUsers().then(function (r) { return r.data }) },
  })

  const unblockMutation = useMutation({
    mutationFn: function (userId) { return unblockUser(userId) },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      toast.success(t.editProfile.unblocked)
    },
    onError: function (err) {
      toast.error(err.response?.data?.message || t.editProfile.unblockFailed)
    },
  })

  const blockedUsers = data?.blockedUsers || []

  return (
    <Box sx={s.page}>
      <SettingsSidebar active="blocked" />

      <Box component="main" sx={s.main}>
        <Typography sx={s.sectionTitle}>{t.editProfile.blockedAccounts}</Typography>

        {isLoading ? (
          <Spinner />
        ) : blockedUsers.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontSize: 14, mt: 1 }}>{t.editProfile.blockedEmpty}</Typography>
        ) : (
          <Box>
            {blockedUsers.map(function (u) {
              return (
                <Box
                  key={u._id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderBottomColor: 'divider',
                  }}
                >
                  <Avatar src={u.avatarUrl} username={u.username} size="md" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{u.username}</Typography>
                    {u.fullName && (
                      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{u.fullName}</Typography>
                    )}
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    disabled={unblockMutation.isPending}
                    onClick={function () { unblockMutation.mutate(u._id) }}
                    sx={{ ...s.btnCancel, px: 2, py: 1, fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                  >
                    {t.editProfile.unblock}
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )
}
