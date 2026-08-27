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
import Box from '@mui/material/Box'
import * as s from './layoutStyles'

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
    <Box component="nav" sx={s.mobileNav}>
      {items.map(function (item) {
        return (
          <Box
            component="button"
            type="button"
            key={item.path}
            sx={s.mobileNavItem(isActive(item.path))}
            onClick={function () { navigate(item.path) }}
          >
            {/* Icon với badge thông báo nếu có */}
            <Box component="span" sx={{ position: 'relative', display: 'inline-flex' }}>
              <Icon
                name={item.icon}
                size={22}
                fill={isActive(item.path) && item.icon === 'home'}
              />
              {item.badge > 0 && (
                <Box component="span" key={item.badge} sx={s.notifBadge}>
                  {item.badge > 9 ? '9+' : item.badge}
                </Box>
              )}
            </Box>
            <Box component="span">{item.label}</Box>
          </Box>
        )
      })}
    </Box>
  )
}
