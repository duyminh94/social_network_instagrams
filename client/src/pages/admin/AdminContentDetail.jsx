import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge, Modal, Pagination } from 'react-bootstrap'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import ConfirmModal from '../../components/common/ConfirmModal'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../utils/formatTime'
import { canGoAdminBack, goAdmin } from '../../utils/adminNavigation'
import styles from './AdminContent.module.css'

export default function AdminContentDetail() {
  var { contentType, id } = useParams()
  var navigate = useNavigate()
  var location = useLocation()
  var queryClient = useQueryClient()
  var { t } = useLanguage()
  var [dialogType, setDialogType] = useState('')
  var [dialogPage, setDialogPage] = useState(1)
  var [confirmVisibility, setConfirmVisibility] = useState(false)

  var detailQuery = useQuery({
    queryKey: ['adminContentDetail', contentType, id],
    queryFn: function () { return api.get('/admin/content/' + contentType + '/' + id).then(function (response) { return response.data }) },
  })
  var interactionQuery = useQuery({
    queryKey: ['adminContentInteractions', contentType, id, dialogType, dialogPage],
    queryFn: function () { return api.get('/admin/content/' + contentType + '/' + id + '/interactions', { params: { kind: dialogType, page: dialogPage, limit: 15 } }).then(function (response) { return response.data }) },
    enabled: !!dialogType,
  })
  var visibilityMutation = useMutation({
    mutationFn: function (action) { return api.patch('/admin/content/' + contentType + '/' + id + '/' + action) },
    onSuccess: function (_, action) {
      queryClient.invalidateQueries({ queryKey: ['adminContentDetail', contentType, id] })
      queryClient.invalidateQueries({ queryKey: ['adminContent', contentType] })
      setConfirmVisibility(false)
      toast.success(action === 'unhide' ? t.admin.content.unhiddenSuccess : t.admin.content.hiddenSuccess)
    },
    onError: function (error, action) { toast.error(error.response?.data?.message || (action === 'unhide' ? t.admin.content.unhideFailed : t.admin.content.hideFailed)) },
  })

  if (detailQuery.isLoading) return <Spinner fullPage />
  if (detailQuery.isError || !detailQuery.data?.content) return <div className={styles.empty}>{t.admin.content.notFound}</div>

  var content = detailQuery.data.content
  var counts = detailQuery.data.counts || {}
  var media = content.media || []
  var dialogItems = interactionQuery.data?.items || []
  var totalPages = interactionQuery.data?.totalPages || 1
  var dialogTitles = { likes: t.admin.content.likes, comments: t.admin.content.comments, reports: t.admin.content.reports }

  function openDialog(type) { setDialogPage(1); setDialogType(type) }
  function closeDialog() { setDialogType(''); setDialogPage(1) }

  function openUser(person) {
    if (person?._id) goAdmin(navigate, '/admin/users/' + person._id)
  }

  return (
    <div className={styles.page}>
      {canGoAdminBack(location) && (
        <button type="button" className={styles.backButton} onClick={function () { navigate(-1) }}>
          <Icon name="arrowL" size={18} />Quay về
        </button>
      )}

      <div className={styles.detailHeader}>
        <div><Badge bg={content.isDeleted ? 'secondary' : 'success'}>{content.isDeleted ? t.admin.content.hidden : t.admin.content.visible}</Badge><h2>{t.admin.content.detailTitle}</h2></div>
        <Button variant={content.isDeleted ? 'success' : 'danger'} onClick={function () { setConfirmVisibility(true) }}><Icon name={content.isDeleted ? 'check' : 'eye'} size={17} /><span className={styles.buttonLabel}>{content.isDeleted ? t.admin.content.unhide : t.admin.content.hide}</span></Button>
      </div>

      <section className={styles.detailGrid}>
        <div className={styles.mediaGallery}>
          {media.length === 0 ? <div className={styles.mediaEmpty}><Icon name="image" size={32} /></div> : media.map(function (item) {
            return item.mediaType === 'video'
              ? <video key={item._id || item.url} src={item.url} poster={item.thumbnailUrl || undefined} controls preload="metadata" />
              : <img key={item._id || item.url} src={item.url} alt="" />
          })}
        </div>
        <div className={styles.detailInfo}>
          <button type="button" className={styles.authorLargeButton} disabled={!content.author?._id} onClick={function () { openUser(content.author) }}>
            <Avatar src={content.author?.avatarUrl} username={content.author?.username} size="lg" />
            <span><strong>{content.author?.fullName || content.author?.username}</strong><span>@{content.author?.username}</span><small>{content.author?.email}</small></span>
          </button>
          <div className={styles.infoBlock}><span>{t.admin.content.content}</span><p>{content.caption || t.admin.content.noCaption}</p></div>
          <div className={styles.infoBlock}><span>{t.admin.content.publishedAt}</span><p>{formatDateTime(content.createdAt)}</p></div>
        </div>
      </section>

      <section className={styles.metrics}>
        {[{ key: 'likes', icon: 'heart', label: t.admin.content.likes }, { key: 'comments', icon: 'comment', label: t.admin.content.comments }, { key: 'reports', icon: 'flag', label: t.admin.content.reports }].map(function (metric) {
          return <article key={metric.key}><div className={styles.metricIcon}><Icon name={metric.icon} size={21} /></div><div><span>{metric.label}</span><strong>{counts[metric.key] || 0}</strong></div><button type="button" onClick={function () { openDialog(metric.key) }}>{t.admin.content.viewMore}</button></article>
        })}
      </section>

      <Modal show={!!dialogType} onHide={closeDialog} centered size="lg" scrollable>
        <Modal.Header closeButton><Modal.Title>{dialogTitles[dialogType]}</Modal.Title></Modal.Header>
        <Modal.Body className={styles.dialogBody}>
          {interactionQuery.isLoading ? <Spinner /> : interactionQuery.isError ? <div className={styles.empty}>{t.admin.content.loadFailed}</div> : dialogItems.length === 0 ? <div className={styles.empty}>{t.admin.content.noInteractions}</div> : (
            <div className={styles.interactionList}>
              {dialogItems.map(function (item) {
                var person = dialogType === 'reports' ? item.reporterId : item.userId
                return (
                  <div key={item._id} className={styles.interactionItem}>
                    <button type="button" className={styles.avatarLink} disabled={!person?._id} onClick={function () { openUser(person) }}>
                      <Avatar src={person?.avatarUrl} username={person?.username} size="sm" />
                    </button>
                    <div className={styles.interactionContent}>
                      <div className={styles.interactionTop}>
                        <button type="button" disabled={!person?._id} onClick={function () { openUser(person) }}>{person?.fullName || person?.username || t.admin.content.unknown}</button>
                        <time>{formatDateTime(item.createdAt)}</time>
                      </div>
                      <span>@{person?.username || t.admin.content.unknown} - {person?.email}</span>
                      {dialogType === 'comments' && <p>{item.content}</p>}
                      {dialogType === 'reports' && <div className={styles.reportInfo}><p><b>{t.admin.content.reason}:</b> {item.reason}</p>{item.description && <p><b>{t.admin.content.description}:</b> {item.description}</p>}<Badge bg={item.status === 'pending' ? 'warning' : item.status === 'resolved' ? 'success' : 'secondary'}>{item.status}</Badge><button type="button" className={styles.reportDetailButton} onClick={function () { goAdmin(navigate, '/admin/reports/' + item._id) }}>Xem report</button></div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Modal.Body>
        {totalPages > 1 && <Modal.Footer className={styles.modalFooter}><Pagination size="sm" className="mb-0"><Pagination.Prev disabled={dialogPage <= 1} onClick={function () { setDialogPage(function (value) { return value - 1 }) }} /><Pagination.Item active>{dialogPage} / {totalPages}</Pagination.Item><Pagination.Next disabled={dialogPage >= totalPages} onClick={function () { setDialogPage(function (value) { return value + 1 }) }} /></Pagination></Modal.Footer>}
      </Modal>

      {confirmVisibility && <ConfirmModal message={content.isDeleted ? t.admin.content.unhideConfirm : t.admin.content.hideConfirm} onCancel={function () { setConfirmVisibility(false) }} onConfirm={function () { visibilityMutation.mutate(content.isDeleted ? 'unhide' : 'hide') }} />}
    </div>
  )
}
