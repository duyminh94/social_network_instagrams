// pages/profile/BlockedUsers.jsx
// Trang "Tài khoản đã chặn" — hiện danh sách user mình đã chặn + nút Bỏ chặn.
// Dùng API có sẵn: GET /block (danh sách), DELETE /block/:id (bỏ chặn).
// Layout tái dùng EditProfile.module.css (giống trang Đổi mật khẩu).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getBlockedUsers, unblockUser } from '../../features/block/blockAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import SettingsSidebar from './SettingsSidebar'
import styles from './EditProfile.module.css'

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
    <div className={styles.page}>
      <SettingsSidebar active="blocked" />

      <main className={styles.main}>
        <div className={styles.sectionTitle}>{t.editProfile.blockedAccounts}</div>

        {isLoading ? (
          <Spinner />
        ) : blockedUsers.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 8 }}>{t.editProfile.blockedEmpty}</p>
        ) : (
          <div>
            {blockedUsers.map(function (u) {
              return (
                <div
                  key={u._id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0', borderBottom: '1px solid var(--border)',
                  }}
                >
                  <Avatar src={u.avatarUrl} username={u.username} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{u.username}</div>
                    {u.fullName && (
                      <div style={{ color: 'var(--ink-muted)', fontSize: 13 }}>{u.fullName}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={unblockMutation.isPending}
                    onClick={function () { unblockMutation.mutate(u._id) }}
                    style={{
                      padding: '8px 16px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                      color: 'var(--ink)', fontWeight: 600, fontSize: 13,
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    {t.editProfile.unblock}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
