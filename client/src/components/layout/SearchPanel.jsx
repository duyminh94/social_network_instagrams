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
import Box from '@mui/material/Box'
import * as s from './layoutStyles'

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
      <Box
        component="button"
        key={item.tag}
        type="button"
        sx={s.searchUserButton}
        onClick={function () { handleOpenTag(item.tag) }}
      >
        <Box
          component="span"
          sx={{
            width: 44, height: 44, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid', borderColor: 'divider', fontSize: 20, flexShrink: 0,
          }}
        >
          #
        </Box>
        <Box component="span" sx={s.searchUserText}>
          <Box component="span" className="searchUsername" sx={s.searchUsername}>#{item.tag}</Box>
          <Box component="span" sx={s.searchFullName}>
            {formatNumber(item.count)} {t.searchPanel.posts}
          </Box>
        </Box>
      </Box>
    )
  }

  function renderUserRow(user, isRecent) {
    return (
      <Box key={user._id} sx={s.searchUserRow}>
        <Box
          component="button"
          type="button"
          sx={s.searchUserButton}
          onClick={function () { handleOpenUser(user) }}
        >
          <Avatar src={user.avatarUrl || user.avatar} username={user.username} size="md" />
          <Box component="span" sx={s.searchUserText}>
            <Box component="span" className="searchUsername" sx={s.searchUsername}>
              {user.username}
              {user.isTrusted && <Icon name="verified" size={15} />}
            </Box>
            <Box component="span" sx={s.searchFullName}>{user.fullName || 'Instagram user'}</Box>
          </Box>
        </Box>

        {isRecent && (
          <Box
            component="button"
            type="button"
            sx={s.searchRemoveButton}
            onClick={function () { handleRemoveRecent(user._id) }}
            title={t.searchPanel.removeRecent}
          >
            <Icon name="x" size={20} />
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Box sx={s.searchPanelInner}>
      <Box sx={s.searchPanelHeader}>
        <h2>{t.searchPanel.title}</h2>
        <Box component="button" type="button" sx={s.searchCloseButton} onClick={onClose} title={t.searchPanel.close}>
          <Icon name="x" size={28} />
        </Box>
      </Box>

      <Box sx={s.searchInputWrap}>
        <Box
          component="input"
          sx={s.searchInput}
          value={searchText}
          onChange={function (e) { setSearchText(e.target.value) }}
          placeholder={t.searchPanel.placeholder}
          autoFocus
        />
        {searchText && (
          <Box
            component="button"
            type="button"
            sx={s.searchClearButton}
            onClick={function () { setSearchText('') }}
            title={t.searchPanel.clearInput}
          >
            <Icon name="x" size={14} />
          </Box>
        )}
      </Box>

      {!isSearching && (
        <>
          <Box sx={s.searchSectionTitle}>
            <strong>{t.searchPanel.recent}</strong>
            {recentUsers.length > 0 && (
              <button type="button" onClick={handleClearAll}>{t.searchPanel.clearAll}</button>
            )}
          </Box>

          {recentUsers.length === 0 ? (
            <Box component="p" sx={s.searchEmptyText}>{t.searchPanel.noRecent}</Box>
          ) : (
            <Box sx={s.searchList}>
              {recentUsers.map(function (item) {
                return renderUserRow(item, true)
              })}
            </Box>
          )}
        </>
      )}

      {/* Chế độ hashtag: gõ bắt đầu bằng '#' → chỉ gợi ý hashtag kèm số bài viết (giống Instagram) */}
      {isSearching && isHashtagSearch && (
        <Box sx={s.searchList}>
          {tagLoading && <Box sx={s.searchLoading}><Spinner /></Box>}
          {!tagLoading && tags.length === 0 && (
            <Box component="p" sx={s.searchEmptyText}>{t.searchPanel.notFoundTags}</Box>
          )}
          {!tagLoading && tags.map(function (item) {
            return renderTagRow(item)
          })}
        </Box>
      )}

      {/* Chế độ thường: tab Tài khoản / Hashtag */}
      {isSearching && !isHashtagSearch && (
        <>
          <Box sx={{ display: 'flex', gap: .5, px: 2, pb: 1 }}>
            <Box
              component="button"
              type="button"
              onClick={function () { setSearchTab('accounts') }}
              sx={tabSx(searchTab === 'accounts')}
            >
              {t.searchPanel.tabAccounts}
            </Box>
            <Box
              component="button"
              type="button"
              onClick={function () { setSearchTab('tags') }}
              sx={tabSx(searchTab === 'tags')}
            >
              {t.searchPanel.tabTags}
            </Box>
          </Box>

          {searchTab === 'accounts' && (
            <Box sx={s.searchList}>
              {isLoading && <Box sx={s.searchLoading}><Spinner /></Box>}
              {!isLoading && users.length === 0 && (
                <Box component="p" sx={s.searchEmptyText}>{t.searchPanel.notFound}</Box>
              )}
              {!isLoading && users.map(function (item) {
                return renderUserRow(item, false)
              })}
            </Box>
          )}

          {searchTab === 'tags' && (
            <Box sx={s.searchList}>
              {tagLoading && <Box sx={s.searchLoading}><Spinner /></Box>}
              {!tagLoading && tags.length === 0 && (
                <Box component="p" sx={s.searchEmptyText}>{t.searchPanel.notFoundTags}</Box>
              )}
              {!tagLoading && tags.map(function (item) {
                return renderTagRow(item)
              })}
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

// Nút tab — mục đang chọn thì chữ sáng và có gạch chân
function tabSx(active) {
  return {
    flex: 1,
    py: 1,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid',
    borderBottomColor: active ? '#fff' : 'transparent',
    color: active ? '#fff' : '#888',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  }
}
