// components/layout/MobileNav.jsx
// Thanh điều hướng ngang cố định ở đáy màn hình — chỉ hiển thị trên mobile
// (CSS: display:none trên desktop, display:flex trên ≤768px)
//
// Gồm 5 mục: Home, Explore, Chat, Activity (badge), Profile
// Badge thông báo lấy từ useSocket giống Sidebar

import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { useLanguage } from '../../i18n/LanguageContext'
import Icon from '../common/Icon'
import styles from './Layout.module.css'

export default function MobileNav() {
  var navigate = useNavigate()
  var location = useLocation()
  var { user } = useAuth()
  var { notifCount } = useSocket() || {}
  var { t } = useLanguage()

  // Kiểm tra route đang active để highlight icon
  function isActive(path) {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  var items = [
    { path: '/',              icon: 'home',       label: t.nav.home },
    { path: '/explore',       icon: 'compass',    label: t.nav.explore },
    { path: '/chat',          icon: 'paperplane', label: t.nav.messages },
    { path: '/notifications', icon: 'heart',      label: t.nav.notifications, badge: notifCount },
    { path: '/' + user?.username, icon: 'user',   label: t.nav.profile },
  ]

  return (
    <nav className={styles.mobileNav}>
      {items.map(function (item) {
        return (
          <button
            key={item.path}
            className={styles.mobileNavItem}
            onClick={function () { navigate(item.path) }}
            style={{
              color: isActive(item.path) ? 'var(--ink)' : 'var(--ink-muted)',
              fontWeight: isActive(item.path) ? 600 : 400,
            }}
          >
            {/* Icon với badge thông báo nếu có */}
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon
                name={item.icon}
                size={22}
                fill={isActive(item.path) && item.icon === 'home'}
              />
              {item.badge > 0 && (
                <span className={styles.notifBadge}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
