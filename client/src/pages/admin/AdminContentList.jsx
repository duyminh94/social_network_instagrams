import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Form, Pagination } from 'react-bootstrap'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../utils/formatTime'
import { goAdmin } from '../../utils/adminNavigation'
import styles from './AdminContent.module.css'

export default function AdminContentList() {
  var { contentType } = useParams()
  var navigate = useNavigate()
  var { t } = useLanguage()
  var [page, setPage] = useState(1)
  var [search, setSearch] = useState('')
  var labels = {
    post: t.admin.content.posts,
    reel: t.admin.content.reels,
    story: t.admin.content.stories,
  }

  var contentQuery = useQuery({
    queryKey: ['adminContent', contentType, page, search],
    queryFn: function () {
      return api.get('/admin/content/' + contentType, {
        params: { page: page, limit: 20, q: search || undefined },
      }).then(function (response) { return response.data })
    },
    enabled: !!labels[contentType],
  })

  var items = contentQuery.data?.items || []
  var totalPages = contentQuery.data?.totalPages || 1

  function getPreview(content) {
    var media = content.media?.[0]
    return media?.thumbnailUrl || media?.url || ''
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div><h2>{labels[contentType] || t.admin.content.title}</h2><p>{t.admin.content.listDescription}</p></div>
      </div>

      <Form.Control
        type="search"
        className={styles.searchInput}
        placeholder={t.admin.content.searchPlaceholder}
        value={search}
        onChange={function (event) { setSearch(event.target.value); setPage(1) }}
      />

      {contentQuery.isLoading ? <Spinner fullPage /> : contentQuery.isError ? (
        <div className={styles.empty}>{t.admin.content.loadFailed}</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>{t.admin.content.noContent}</div>
      ) : (
        <div className={styles.contentTableWrap}>
          <table className={styles.contentTable}>
            <thead><tr><th>{t.admin.content.preview}</th><th>{t.admin.content.author}</th><th>{t.admin.content.content}</th><th>{t.admin.content.publishedAt}</th><th>{t.admin.content.status}</th><th>{t.admin.content.actions}</th></tr></thead>
            <tbody>
              {items.map(function (content) {
                var preview = getPreview(content)
                return (
                  <tr key={content._id}>
                    <td><div className={styles.preview}>{preview ? (content.media?.[0]?.mediaType === 'video' && !content.media?.[0]?.thumbnailUrl ? <video src={preview} muted preload="metadata" /> : <img src={preview} alt="" />) : <Icon name="image" size={22} />}</div></td>
                    <td><button type="button" className={styles.authorButton} disabled={!content.author?._id} onClick={function () { goAdmin(navigate, '/admin/users/' + content.author._id) }}><Avatar src={content.author?.avatarUrl} username={content.author?.username} size="sm" /><span><strong>{content.author?.fullName || content.author?.username || t.admin.content.unknown}</strong><span>@{content.author?.username || t.admin.content.unknown}</span><small>{content.author?.email}</small></span></button></td>
                    <td><p className={styles.caption}>{content.caption || t.admin.content.noCaption}</p></td>
                    <td className={styles.dateCell}>{formatDateTime(content.createdAt)}</td>
                    <td><Badge bg={content.isDeleted ? 'secondary' : 'success'}>{content.isDeleted ? t.admin.content.hidden : t.admin.content.visible}</Badge></td>
                    <td><button type="button" className={styles.iconButton} title={t.admin.content.viewDetail} aria-label={t.admin.content.viewDetail} onClick={function () { goAdmin(navigate, '/admin/content/' + contentType + '/' + content._id) }}><Icon name="eye" size={18} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && <Pagination className={styles.pagination}><Pagination.Prev disabled={page <= 1} onClick={function () { setPage(function (value) { return value - 1 }) }} /><Pagination.Item active>{page} / {totalPages}</Pagination.Item><Pagination.Next disabled={page >= totalPages} onClick={function () { setPage(function (value) { return value + 1 }) }} /></Pagination>}
    </div>
  )
}
