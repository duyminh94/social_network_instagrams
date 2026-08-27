// components/layout/Sidebar.jsx
// Thanh điều hướng dọc hiển thị ở desktop (ẩn trên mobile)
//
// Gồm 3 phần:
//   - Logo (click về trang chủ)
//   - Nav items chính (Home, Explore, Chat, ...)
//   - Phần dưới: avatar profile + nút logout
//
// notifCount: lấy từ useSocket để hiển thị badge số thông báo chưa đọc
// isAdmin: hiển thị thêm nút Admin nếu user có quyền

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { useLanguage } from '../../i18n/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import Avatar from '../common/Avatar'
import Icon, { Mark } from '../common/Icon'
import ConfirmModal from '../common/ConfirmModal'
import CreatePostForm from '../post/CreatePostForm'
import Notifications from '../../pages/notifications/Notifications'
import SearchPanel from './SearchPanel'
import styles from './Layout.module.css'

// Phải khớp với role enum trong User.js và AdminRoute.jsx
const ADMIN_ROLES = ['super_admin', 'moderator']

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { notifCount } = useSocket() || {}
  var { t, lang, toggleLang } = useLanguage()
  var { theme, toggleTheme } = useTheme()

  const queryClient = useQueryClient()
  const sidebarRef = useRef(null)
  const searchPanelRef = useRef(null)
  const notificationPanelRef = useRef(null)
  const moreMenuRef = useRef(null)

  // Hiển thị modal xác nhận trước khi logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  // Hiển thị modal tạo bài viết mới
  const [showCreatePost, setShowCreatePost] = useState(false)
  // Panel tìm kiếm mở cạnh sidebar
  const [showSearch, setShowSearch] = useState(false)
  // Panel thông báo mở cạnh sidebar
  const [showNotifications, setShowNotifications] = useState(false)
  // Menu "Xem thêm" ở cuối sidebar
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Kiểm tra route đang active để highlight nav item
  function isActive(path) {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Danh sách nav item chính (không gồm profile — profile ở cuối sidebar dưới dạng Avatar)
  const navItems = [
    { path: '/',              icon: 'home',       label: t.nav.home },
    { path: '/search-panel',   icon: 'search',     label: t.nav.search, panel: 'search' },
    { path: '/explore',       icon: 'compass',    label: t.nav.explore },
    { path: '/reels',         icon: 'play',       label: t.nav.reels },
    { path: '/chat',          icon: 'paperplane', label: t.nav.messages },
    { path: '/notifications', icon: 'heart',      label: t.nav.notifications, badge: notifCount },
  ]

  // Chỉ hiện nút Admin nếu user có role hợp lệ
  const hasAdminAccess = ADMIN_ROLES.includes(user?.role)

  function handleLogoutClick() {
    setShowLogoutConfirm(true)
  }

  async function handleLogoutConfirm() {
    await logout()
    navigate('/login')
  }

  function handlePostCreated(newPost) {
    setShowCreatePost(false)
    queryClient.invalidateQueries({ queryKey: ['feed'] })
    queryClient.invalidateQueries({ queryKey: ['profile', user?.username] })
    queryClient.invalidateQueries({ queryKey: ['userPosts', user?._id] })

    if (user?._id && newPost?._id) {
      queryClient.setQueryData(['userPosts', user._id], function (oldData) {
        if (!oldData?.posts) return oldData
        var exists = oldData.posts.some(function (post) {
          return String(post._id) === String(newPost._id)
        })
        if (exists) return oldData
        return Object.assign({}, oldData, {
          posts: [newPost].concat(oldData.posts),
          total: (oldData.total || oldData.posts.length) + 1,
        })
      })
    }
  }

  function handleNavClick(item) {
    if (item.panel === 'search') {
      setShowNotifications(false)
      setShowMoreMenu(false)
      setShowSearch(function (currentValue) {
        return !currentValue
      })
      return
    }

    if (item.path === '/notifications') {
      setShowSearch(false)
      setShowMoreMenu(false)
      setShowNotifications(function (currentValue) {
        return !currentValue
      })
      return
    }

    setShowSearch(false)
    setShowNotifications(false)
    setShowMoreMenu(false)
    navigate(item.path)
  }

  useEffect(function () {
    if (!showSearch) return

    function handleClickOutside(event) {
      var sidebarElement = sidebarRef.current
      var panelElement = searchPanelRef.current
      var clickedInSidebar = sidebarElement && sidebarElement.contains(event.target)
      var clickedInPanel = panelElement && panelElement.contains(event.target)

      if (!clickedInSidebar && !clickedInPanel) {
        setShowSearch(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return function () {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearch])

  useEffect(function () {
    if (!showNotifications) return

    function handleClickOutside(event) {
      var sidebarElement = sidebarRef.current
      var panelElement = notificationPanelRef.current
      var clickedInSidebar = sidebarElement && sidebarElement.contains(event.target)
      var clickedInPanel = panelElement && panelElement.contains(event.target)

      if (!clickedInSidebar && !clickedInPanel) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return function () {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications])

  useEffect(function () {
    if (!showMoreMenu) return

    function handleClickOutside(event) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return function () {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

  return (
    <>
      <nav
        ref={sidebarRef}
        className={styles.sidebar + (showNotifications || showSearch ? ' ' + styles.sidebarPanelOpen : '')}
      >
        {/* Logo — click về trang chủ */}
        <button
          className={styles.logoBtn}
          onClick={function () {
            setShowSearch(false)
            setShowNotifications(false)
            setShowMoreMenu(false)
            navigate('/')
          }}
          title="Home"
        >
          <Mark size={32} accent="#ff6b58" dark={true} />
        </button>

        {/* Nav items chính */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {navItems.map(function (item) {
            var itemActive = isActive(item.path)
            if (item.panel === 'search' && showSearch) {
              itemActive = true
            }
            if (item.path === '/notifications' && showNotifications) {
              itemActive = true
            }

            return (
              <button
                key={item.path}
                className={`${styles.navItem} ${itemActive ? styles.active : ''}`}
                onClick={function () { handleNavClick(item) }}
                title={item.label}
              >
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  <Icon
                    name={item.icon}
                    size={22}
                    fill={itemActive && item.icon === 'home'}
                  />
                  {/* Badge số thông báo chưa đọc */}
                  {item.badge > 0 && (
                    <span className={styles.notifBadge}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className={styles.sidebarLabel}>{item.label}</span>
              </button>
            )
          })}

          {/* Nút tạo bài viết — click mở CreatePostForm modal */}
          <button
            className={styles.navItem}
            onClick={function () {
              setShowSearch(false)
              setShowNotifications(false)
              setShowMoreMenu(false)
              setShowCreatePost(true)
            }}
            title={t.nav.createPost}
          >
            <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>+</span>
            <span className={styles.sidebarLabel}>{t.nav.create}</span>
          </button>

          {/* Nút Admin — chỉ hiện khi có quyền */}
          {hasAdminAccess && (
            <>
              <button
                className={`${styles.navItem} ${isActive('/admin') ? styles.active : ''}`}
                onClick={function () {
                  setShowSearch(false)
                  setShowNotifications(false)
                  setShowMoreMenu(false)
                  navigate('/admin')
                }}
                title={t.nav.admin}
              >
                <Icon name="shield" size={22} />
                <span className={styles.sidebarLabel}>{t.nav.admin}</span>
              </button>
            </>
          )}
        </div>

        {/* Phần dưới: avatar profile + logout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Click vào avatar → vào trang profile */}
          {user && (
            <button
              className={styles.navItem}
              onClick={function () {
                setShowSearch(false)
                setShowNotifications(false)
                setShowMoreMenu(false)
                navigate('/' + user.username)
              }}
              title={user.username}
            >
              <span className={styles.sidebarAvatar}>
                <Avatar src={user.avatar || user.avatarUrl} username={user.username} size="sm" />
              </span>
              <span className={styles.sidebarLabel}>{t.nav.profile}</span>
            </button>
          )}

          {/* Nút đổi ngôn ngữ — bấm để chuyển Việt/Anh */}
          <button
            type="button"
            className={styles.navItem}
            onClick={function () {
              setShowSearch(false)
              setShowNotifications(false)
              setShowMoreMenu(false)
              toggleLang()
            }}
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'}
          >
            <span className={styles.langFlag}>{lang === 'vi' ? '🇺🇸' : '🇻🇳'}</span>
            <span className={styles.sidebarLabel}>{lang === 'vi' ? 'English' : 'Tiếng Việt'}</span>
          </button>

          {/* Nút đổi giao diện sáng / tối */}
          <button
            type="button"
            className={styles.navItem}
            onClick={function () {
              setShowSearch(false)
              setShowNotifications(false)
              setShowMoreMenu(false)
              toggleTheme()
            }}
            title={theme === 'dark'
              ? (lang === 'vi' ? 'Chuyển giao diện sáng' : 'Switch to light mode')
              : (lang === 'vi' ? 'Chuyển giao diện tối' : 'Switch to dark mode')}
          >
            <span className={styles.langFlag}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className={styles.sidebarLabel}>
              {theme === 'dark'
                ? (lang === 'vi' ? 'Giao diện sáng' : 'Light mode')
                : (lang === 'vi' ? 'Giao diện tối' : 'Dark mode')}
            </span>
          </button>

          {/* Nút menu riêng, không dùng chung với icon Khám phá */}
          <div className={styles.moreWrap} ref={moreMenuRef}>
            <button
              className={`${styles.navItem} ${showMoreMenu ? styles.active : ''}`}
              onClick={function () {
                setShowSearch(false)
                setShowNotifications(false)
                setShowMoreMenu(function (currentValue) {
                  return !currentValue
                })
              }}
              title={t.nav.more}
            >
              <Icon name="menu" size={22} />
              <span className={styles.sidebarLabel}>{t.nav.more}</span>
            </button>

            {showMoreMenu && (
              <div className={styles.moreMenu}>
                <button
                  type="button"
                  className={styles.moreMenuItem}
                  onClick={function () {
                    setShowMoreMenu(false)
                    handleLogoutClick()
                  }}
                >
                  <Icon name="x" size={18} />
                  <span>{t.nav.logout}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal xác nhận logout */}
        {showLogoutConfirm && (
          <ConfirmModal
            message={t.nav.logoutConfirm}
            onConfirm={handleLogoutConfirm}
            onCancel={function () { setShowLogoutConfirm(false) }}
          />
        )}

        {/* Modal tạo bài viết mới */}
        <CreatePostForm
          show={showCreatePost}
          onClose={function () { setShowCreatePost(false) }}
          onCreated={handlePostCreated}
        />
      </nav>

      {showSearch && (
        <aside ref={searchPanelRef} className={styles.searchPanel}>
          <SearchPanel
            onClose={function () { setShowSearch(false) }}
          />
        </aside>
      )}

      {showNotifications && (
        <aside ref={notificationPanelRef} className={styles.notificationPanel}>
          <Notifications
            isPanel={true}
            onClose={function () { setShowNotifications(false) }}
          />
        </aside>
      )}
    </>
  )
}
