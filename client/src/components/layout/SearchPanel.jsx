// components/layout/SearchPanel.jsx
// Panel tìm kiếm người dùng mở từ sidebar.
//
// Logic đơn giản:
//   - Gõ từ 2 ký tự mới gọi API /users/search
//   - Bấm user thì lưu vào recent search ở localStorage
//   - Có thể xóa từng recent hoặc xóa tất cả

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'
import Spinner from '../common/Spinner'
import { useDebounce } from '../../hooks/useDebounce'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatNumber } from '../../utils/formatNumber'
import styles from './Layout.module.css'

const RECENT_KEY = 'instagram_recent_searches'

function readRecentSearches() {
  try {
    var rawValue = localStorage.getItem(RECENT_KEY)
    if (!rawValue) return []

    var parsedValue = JSON.parse(rawValue)
    if (!Array.isArray(parsedValue)) return []

    return parsedValue
  } catch {
    return []
  }
}

function saveRecentSearches(items) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 10)))
}

export default function SearchPanel({ onClose }) {
  var navigate = useNavigate()
  var { t } = useLanguage()
  var [searchText, setSearchText] = useState('')
  var [searchTab, setSearchTab] = useState('accounts')   // 'accounts' | 'tags'
  var [recentUsers, setRecentUsers] = useState([])
  var debouncedSearch = useDebounce(searchText.trim(), 400)

  useEffect(function () {
    setRecentUsers(readRecentSearches())
  }, [])

  var { data, isLoading } = useQuery({
    queryKey: ['sidebarUserSearch', debouncedSearch],
    queryFn: function () {
      return api.get('/users/search', {
        params: {
          q: debouncedSearch,
          limit: 12,
        },
      }).then(function (r) { return r.data })
    },
    // Không gọi API user khi đang ở chế độ hashtag (gõ bắt đầu bằng '#')
    enabled: debouncedSearch.length >= 2 && debouncedSearch.charAt(0) !== '#',
  })

  // Tìm hashtag khớp (tab Tags)
  var { data: tagData, isLoading: tagLoading } = useQuery({
    queryKey: ['sidebarTagSearch', debouncedSearch],
    queryFn: function () {
      return api.get('/posts/tags/search', {
        params: { q: debouncedSearch.replace(/^#/, ''), limit: 20 },
      }).then(function (r) { return r.data })
    },
    enabled: debouncedSearch.length >= 2,
  })

  var users = data?.users || []
  var tags = tagData?.tags || []
  var isSearching = debouncedSearch.length >= 2
  // Gõ bắt đầu bằng '#' → chế độ tìm hashtag (giống Instagram): chỉ gợi ý hashtag
  var isHashtagSearch = searchText.trim().charAt(0) === '#'

  function handleOpenTag(tag) {
    onClose()
    navigate('/hashtag/' + encodeURIComponent(tag))
  }

  function handleOpenUser(user) {
    var nextRecent = recentUsers.filter(function (item) {
      return item._id !== user._id
    })

    nextRecent.unshift({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl || user.avatar,
      isTrusted: user.isTrusted,
    })

    setRecentUsers(nextRecent)
    saveRecentSearches(nextRecent)
    onClose()
    navigate('/' + user.username)
  }

  function handleRemoveRecent(userId) {
    var nextRecent = recentUsers.filter(function (item) {
      return item._id !== userId
    })

    setRecentUsers(nextRecent)
    saveRecentSearches(nextRecent)
  }

  function handleClearAll() {
    setRecentUsers([])
    saveRecentSearches([])
  }

  function renderTagRow(item) {
    return (
      <button
        key={item.tag}
        type="button"
        className={styles.searchUserButton}
        onClick={function () { handleOpenTag(item.tag) }}
      >
        <span style={{
          width: 44, height: 44, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border, #333)', fontSize: 20, flexShrink: 0,
        }}>#</span>
        <span className={styles.searchUserText}>
          <span className={styles.searchUsername}>#{item.tag}</span>
          <span className={styles.searchFullName}>
            {formatNumber(item.count)} {t.searchPanel.posts}
          </span>
        </span>
      </button>
    )
  }

  function renderUserRow(user, isRecent) {
    return (
      <div key={user._id} className={styles.searchUserRow}>
        <button
          type="button"
          className={styles.searchUserButton}
          onClick={function () { handleOpenUser(user) }}
        >
          <Avatar src={user.avatarUrl || user.avatar} username={user.username} size="md" />
          <span className={styles.searchUserText}>
            <span className={styles.searchUsername}>
              {user.username}
              {user.isTrusted && <Icon name="verified" size={15} />}
            </span>
            <span className={styles.searchFullName}>{user.fullName || 'Instagram user'}</span>
          </span>
        </button>

        {isRecent && (
          <button
            type="button"
            className={styles.searchRemoveButton}
            onClick={function () { handleRemoveRecent(user._id) }}
            title={t.searchPanel.removeRecent}
          >
            <Icon name="x" size={20} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={styles.searchPanelInner}>
      <div className={styles.searchPanelHeader}>
        <h2>{t.searchPanel.title}</h2>
        <button type="button" className={styles.searchCloseButton} onClick={onClose} title={t.searchPanel.close}>
          <Icon name="x" size={28} />
        </button>
      </div>

      <div className={styles.searchInputWrap}>
        <input
          value={searchText}
          onChange={function (e) { setSearchText(e.target.value) }}
          placeholder={t.searchPanel.placeholder}
          autoFocus
        />
        {searchText && (
          <button
            type="button"
            onClick={function () { setSearchText('') }}
            title={t.searchPanel.clearInput}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      {!isSearching && (
        <>
          <div className={styles.searchSectionTitle}>
            <strong>{t.searchPanel.recent}</strong>
            {recentUsers.length > 0 && (
              <button type="button" onClick={handleClearAll}>{t.searchPanel.clearAll}</button>
            )}
          </div>

          {recentUsers.length === 0 ? (
            <p className={styles.searchEmptyText}>{t.searchPanel.noRecent}</p>
          ) : (
            <div className={styles.searchList}>
              {recentUsers.map(function (item) {
                return renderUserRow(item, true)
              })}
            </div>
          )}
        </>
      )}

      {/* Chế độ hashtag: gõ bắt đầu bằng '#' → chỉ gợi ý hashtag kèm số bài viết (giống Instagram) */}
      {isSearching && isHashtagSearch && (
        <div className={styles.searchList}>
          {tagLoading && <div className={styles.searchLoading}><Spinner /></div>}
          {!tagLoading && tags.length === 0 && (
            <p className={styles.searchEmptyText}>{t.searchPanel.notFoundTags}</p>
          )}
          {!tagLoading && tags.map(function (item) {
            return renderTagRow(item)
          })}
        </div>
      )}

      {/* Chế độ thường: tab Tài khoản / Hashtag */}
      {isSearching && !isHashtagSearch && (
        <>
          <div style={{ display: 'flex', gap: 4, padding: '0 16px 8px' }}>
            <button
              type="button"
              onClick={function () { setSearchTab('accounts') }}
              style={tabStyle(searchTab === 'accounts')}
            >
              {t.searchPanel.tabAccounts}
            </button>
            <button
              type="button"
              onClick={function () { setSearchTab('tags') }}
              style={tabStyle(searchTab === 'tags')}
            >
              {t.searchPanel.tabTags}
            </button>
          </div>

          {searchTab === 'accounts' && (
            <div className={styles.searchList}>
              {isLoading && <div className={styles.searchLoading}><Spinner /></div>}
              {!isLoading && users.length === 0 && (
                <p className={styles.searchEmptyText}>{t.searchPanel.notFound}</p>
              )}
              {!isLoading && users.map(function (item) {
                return renderUserRow(item, false)
              })}
            </div>
          )}

          {searchTab === 'tags' && (
            <div className={styles.searchList}>
              {tagLoading && <div className={styles.searchLoading}><Spinner /></div>}
              {!tagLoading && tags.length === 0 && (
                <p className={styles.searchEmptyText}>{t.searchPanel.notFoundTags}</p>
              )}
              {!tagLoading && tags.map(function (item) {
                return renderTagRow(item)
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Style nút tab — active màu nổi, gạch chân
function tabStyle(active) {
  return {
    flex: 1,
    padding: '8px 0',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--ig-text, #fff)' : '2px solid transparent',
    color: active ? 'var(--ig-text, #fff)' : 'var(--ig-text-light, #888)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  }
}
