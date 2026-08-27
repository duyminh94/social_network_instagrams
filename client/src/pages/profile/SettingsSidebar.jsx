// pages/profile/SettingsSidebar.jsx
// Sidebar dùng chung cho các trang Cài đặt: Chỉnh sửa trang cá nhân, Đổi mật khẩu,
// Tài khoản đã chặn. Gom về 1 chỗ để khỏi lặp lại + sửa 3 nơi mỗi lần.
//
// Props:
//   active: 'edit' | 'password' | 'blocked' — đánh dấu mục đang mở (in đậm)
//
// Mục "Xin cấp tích xanh" + modal được xử lý ngay trong đây (chỉ hiện khi chưa có tích xanh).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import VerificationModal from '../../components/common/VerificationModal'
import * as s from './settingsStyles'

export default function SettingsSidebar({ active }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  const username = user?.username

  return (
    <>
      <Box component="aside" sx={s.sidebar}>
        <Typography sx={s.sidebarTitle}>{t.editProfile.settings}</Typography>

        <Box component="button" type="button" sx={s.navItem(active === 'edit')} onClick={() => navigate('/' + username + '/edit')}>
          {t.editProfile.sidebarEdit}
        </Box>

        <Box component="button" type="button" sx={s.navItem(active === 'password')} onClick={() => navigate('/' + username + '/change-password')}>
          {t.editProfile.changePassword}
        </Box>

        <Box component="button" type="button" sx={s.navItem(active === 'blocked')} onClick={() => navigate('/' + username + '/blocked')}>
          {t.editProfile.blockedAccounts}
        </Box>

        {/* Luôn hiện: chưa có tích xanh → "Xin cấp tích xanh"; đã có → "Tài khoản đã xác minh" */}
        <Box component="button" type="button" sx={s.navItem(false)} onClick={() => setShowVerifyModal(true)}>
          {user?.isTrusted ? (t.userCard?.verified || 'Tài khoản đã xác minh') : t.profile.verifyRequest}
        </Box>
      </Box>

      {showVerifyModal && (
        <VerificationModal onClose={() => setShowVerifyModal(false)} />
      )}
    </>
  )
}
