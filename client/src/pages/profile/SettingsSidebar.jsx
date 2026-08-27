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
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import VerificationModal from '../../components/common/VerificationModal'
import styles from './EditProfile.module.css'

export default function SettingsSidebar({ active }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  const username = user?.username

  // Gắn class active cho đúng mục đang mở
  function itemClass(key) {
    return active === key ? `${styles.navItem} ${styles.active}` : styles.navItem
  }

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTitle}>{t.editProfile.settings}</div>

        <button type="button" className={itemClass('edit')} onClick={() => navigate('/' + username + '/edit')}>
          {t.editProfile.sidebarEdit}
        </button>

        <button type="button" className={itemClass('password')} onClick={() => navigate('/' + username + '/change-password')}>
          {t.editProfile.changePassword}
        </button>

        <button type="button" className={itemClass('blocked')} onClick={() => navigate('/' + username + '/blocked')}>
          {t.editProfile.blockedAccounts}
        </button>

        {/* Luôn hiện: chưa có tích xanh → "Xin cấp tích xanh"; đã có → "Tài khoản đã xác minh" */}
        <button type="button" className={styles.navItem} onClick={() => setShowVerifyModal(true)}>
          {user?.isTrusted ? (t.userCard?.verified || 'Tài khoản đã xác minh') : t.profile.verifyRequest}
        </button>
      </aside>

      {showVerifyModal && (
        <VerificationModal onClose={() => setShowVerifyModal(false)} />
      )}
    </>
  )
}
