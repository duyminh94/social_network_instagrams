import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../common/Avatar'
import Icon, { Mark } from '../common/Icon'
import AdminAiChat from '../admin/AdminAiChat'
import styles from './AdminLayout.module.css'

export default function AdminLayout() {
  var navigate = useNavigate()
  var { user, logout } = useAuth()
  var { lang, toggleLang } = useLanguage()
  var [menuOpen, setMenuOpen] = useState(false)

  var adminLinks = [
    { path: '/admin', label: 'Tổng quan', icon: 'grid', end: true },
    { path: '/admin/content/post', label: 'Bài viết', icon: 'image' },
    { path: '/admin/content/reel', label: 'Reels', icon: 'reels' },
    { path: '/admin/content/story', label: 'Stories', icon: 'play' },
    { path: '/admin/reports', label: 'Báo cáo', icon: 'flag' },
  ]
  if (user?.role === 'super_admin') {
    adminLinks.splice(1, 0, { path: '/admin/users', label: 'Người dùng', icon: 'user' })
    adminLinks.push({ path: '/admin/verifications', label: 'Tích xanh', icon: 'verified' })
    adminLinks.push({ path: '/admin/logs', label: 'Lịch sử', icon: 'folder' })
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  var displayName = user?.fullName || user?.username || 'Admin'
  var username = user?.username || 'admin'

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Mark size={34} accent="#4f5df7" dark={true} />
          <div>
            <strong>Admin</strong>
            <span>Aptech Social Network</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {adminLinks.map(function (item) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={function ({ isActive }) {
                  if (isActive) return styles.navItem + ' ' + styles.active
                  return styles.navItem
                }}
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1>Trang quản trị</h1>
            <p>Quản lý người dùng, báo cáo và hoạt động nền tảng</p>
          </div>

          <div className={styles.adminMenuWrap}>
            <button
              type="button"
              className={styles.adminUserButton}
              onClick={function () { setMenuOpen(function (value) { return !value }) }}
              aria-expanded={menuOpen}
            >
              <Avatar src={user?.avatarUrl} username={username} size="md" />
              <span className={styles.adminUserText}>
                <strong>{displayName}</strong>
                <small>@{username}</small>
              </span>
              <Icon name="dots" size={18} />
            </button>

            {menuOpen && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownIdentity}>
                  <Avatar src={user?.avatarUrl} username={username} size="lg" />
                  <div>
                    <strong>{displayName}</strong>
                    <span>@{username}</span>
                    <small>{user?.email}</small>
                  </div>
                </div>
                <button type="button" className={styles.dropdownItem} onClick={toggleLang}>
                  <span>Ngôn ngữ</span>
                  <strong>{lang === 'vi' ? 'VI' : 'EN'}</strong>
                </button>
                <button type="button" className={styles.dropdownItem + ' ' + styles.logoutItem} onClick={handleLogout}>
                  <span>Đăng xuất</span>
                  <Icon name="x" size={17} />
                </button>
              </div>
            )}
          </div>
        </header>

        <section className={styles.content}>
          <Outlet />
        </section>
      </main>

      {/* Trợ lý AI nổi — có ở mọi trang admin */}
      <AdminAiChat />
    </div>
  )
}
