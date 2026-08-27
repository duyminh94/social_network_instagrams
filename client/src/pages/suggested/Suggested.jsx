// pages/suggested/Suggested.jsx
// Trang "Suggested for you" — danh sách user gợi ý để follow
// Hiện khi bấm "See all" từ sidebar Home

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import styles from './Suggested.module.css'

// Fetch danh sách gợi ý từ backend
function fetchSuggestions() {
  return api.get('/users/suggestions?limit=30').then(function (res) {
    return res.data.users || res.data || []
  })
}

export default function Suggested() {
  // Map userId → trạng thái follow của từng user riêng biệt
  var [followedIds, setFollowedIds] = useState({})
  var [loadingIds, setLoadingIds] = useState({})
  var { t } = useLanguage()

  var { data: users, isLoading } = useQuery({
    queryKey: ['suggestions-full'],
    queryFn: fetchSuggestions,
  })

  async function handleFollow(userId) {
    if (loadingIds[userId]) return

    setLoadingIds(function (prev) { return { ...prev, [userId]: true } })

    try {
      if (followedIds[userId]) {
        await api.delete('/follow/' + userId)
        setFollowedIds(function (prev) { return { ...prev, [userId]: false } })
      } else {
        await api.post('/follow/' + userId)
        setFollowedIds(function (prev) { return { ...prev, [userId]: true } })
        toast.success(t.suggested.followedToast)
      }
    } catch {
      toast.error(t.suggested.followError)
    } finally {
      setLoadingIds(function (prev) { return { ...prev, [userId]: false } })
    }
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>{t.suggested.title}</h2>

      {isLoading && <Spinner fullPage />}

      {!isLoading && (!users || users.length === 0) && (
        <div className={styles.empty}>{t.suggested.empty}</div>
      )}

      {!isLoading && users && users.length > 0 && (
        <div className={styles.list}>
          {users.map(function (user) {
            var isFollowed = followedIds[user._id] || false
            var isPending = loadingIds[user._id] || false

            return (
              <div key={user._id} className={styles.item}>
                {/* Avatar */}
                <Link to={'/' + user.username} className={styles.avatarLink}>
                  <Avatar
                    src={user.avatarUrl}
                    username={user.username}
                    size="lg"
                  />
                </Link>

                {/* Thông tin user */}
                <div className={styles.info}>
                  <Link to={'/' + user.username} className={styles.username}>
                    {user.username}
                  </Link>
                  {user.fullName && (
                    <div className={styles.fullName}>{user.fullName}</div>
                  )}
                  <div className={styles.reason}>{t.suggested.reason}</div>
                </div>

                {/* Nút Follow / Following */}
                <button
                  className={styles.followBtn + (isFollowed ? ' ' + styles.followingBtn : '')}
                  onClick={function () { handleFollow(user._id) }}
                  disabled={isPending}
                >
                  {isPending ? '...' : isFollowed ? t.common.following : t.common.follow}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
