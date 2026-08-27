import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge, Form } from 'react-bootstrap'
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
import styles from './AdminReports.module.css'

function PersonCard({ title, person, onOpen, actionLabel, unknown }) {
  return (
    <article className={styles.personCard}>
      <span className={styles.cardLabel}>{title}</span>
      <button type="button" className={styles.personIdentityButton} disabled={!person?._id} onClick={onOpen}>
        <Avatar src={person?.avatarUrl} username={person?.username} size="lg" />
        <span><strong>{person?.fullName || person?.username || unknown}</strong><span>@{person?.username || unknown}</span><small>{person?.email}</small></span>
      </button>
      {person?._id && <button type="button" onClick={onOpen}>{actionLabel}<Icon name="arrow" size={15} /></button>}
    </article>
  )
}

export default function AdminReportDetail() {
  var { id } = useParams()
  var navigate = useNavigate()
  var location = useLocation()
  var queryClient = useQueryClient()
  var { t } = useLanguage()
  var [resolutionAction, setResolutionAction] = useState('')
  var [resolutionNote, setResolutionNote] = useState('')
  var [showConfirm, setShowConfirm] = useState(false)

  var detailQuery = useQuery({
    queryKey: ['adminReportDetail', id],
    queryFn: function () { return api.get('/admin/reports/' + id).then(function (response) { return response.data }) },
  })
  var resolveMutation = useMutation({
    mutationFn: function () { return api.patch('/admin/reports/' + id, { resolutionAction: resolutionAction, resolutionNote: resolutionNote.trim() }) },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['adminReportDetail', id] })
      queryClient.invalidateQueries({ queryKey: ['adminReports'] })
      queryClient.invalidateQueries({ queryKey: ['adminContent'] })
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      setShowConfirm(false)
      toast.success(t.admin.reports.updated)
    },
    onError: function (error) { setShowConfirm(false); toast.error(error.response?.data?.message || t.admin.reports.actionFailed) },
  })

  if (detailQuery.isLoading) return <Spinner fullPage />
  if (detailQuery.isError || !detailQuery.data?.report) return <div className={styles.empty}>{t.admin.reports.notFound}</div>

  var report = detailQuery.data.report
  var isProcessed = report.status !== 'pending'
  var typeLabels = { post: 'Post', story: 'Story', reel: 'Reel', user: 'User', comment: 'Comment' }
  var actionLabels = {
    no_action: t.admin.reports.noAction,
    hide_content: t.admin.reports.hideContent,
    ban_user: t.admin.reports.banAccount,
    hide_and_ban: t.admin.reports.hideAndBan,
  }
  var isContentReport = ['post', 'story', 'reel'].includes(report.targetType)
  var canSubmit = resolutionAction && resolutionNote.trim()

  function openUser(userId) {
    if (userId) goAdmin(navigate, '/admin/users/' + userId)
  }

  function openReportedContent() {
    if (isContentReport) goAdmin(navigate, '/admin/content/' + report.targetType + '/' + report.targetId)
  }

  return (
    <div className={styles.page}>
      {canGoAdminBack(location) && <button type="button" className={styles.backButton} onClick={function () { navigate(-1) }}><Icon name="arrowL" size={18} />Quay về</button>}
      <div className={styles.detailHeader}><div><Badge bg={isProcessed ? 'success' : 'warning'}>{isProcessed ? t.admin.reports.processed : t.admin.reports.pending}</Badge><h2>{t.admin.reports.detailTitle}</h2></div></div>

      <section className={styles.peopleGrid}>
        <PersonCard title={t.admin.reports.colReporter} person={report.reporterId} unknown={t.admin.reports.unknown} actionLabel={t.admin.reports.openUserDetail} onOpen={function () { openUser(report.reporterId?._id) }} />
        <PersonCard title={t.admin.reports.colReported} person={report.reportedUser} unknown={t.admin.reports.unknown} actionLabel={t.admin.reports.openUserDetail} onOpen={function () { openUser(report.reportedUser?._id) }} />
      </section>

      <section className={styles.reportDetails}>
        <div><span>{t.admin.reports.reportType}</span><strong>{typeLabels[report.targetType] || report.targetType}</strong></div>
        <div><span>{t.admin.reports.colReason}</span><strong>{report.reason}</strong>{report.description && <p>{report.description}</p>}</div>
        <div><span>{t.admin.reports.reportedAt}</span><strong>{formatDateTime(report.createdAt)}</strong></div>
        <div className={styles.detailActions}>{report.reportedUser?._id && <Button variant="outline-primary" onClick={function () { openUser(report.reportedUser._id) }}>{t.admin.reports.openReportedUser}</Button>}{isContentReport && <Button variant="outline-secondary" onClick={openReportedContent}>{t.admin.reports.openReportedContent}</Button>}</div>
      </section>

      {isProcessed ? (
        <section className={styles.resolutionResult}>
          <h3>{t.admin.reports.resolutionResult}</h3>
          <button type="button" className={styles.reviewerButton} disabled={!report.reviewedBy?._id} onClick={function () { openUser(report.reviewedBy?._id) }}><Avatar src={report.reviewedBy?.avatarUrl} username={report.reviewedBy?.username} size="sm" /><span><span>{t.admin.reports.reviewedBy}</span><strong>{report.reviewedBy?.fullName || report.reviewedBy?.username || t.admin.reports.unknown}</strong></span></button>
          <dl><div><dt>{t.admin.reports.resolutionType}</dt><dd>{actionLabels[report.resolutionAction] || t.admin.reports.legacyResolution}</dd></div><div><dt>{t.admin.reports.resolutionNote}</dt><dd>{report.resolutionNote || t.admin.reports.noResolutionNote}</dd></div><div><dt>{t.admin.reports.reviewedAt}</dt><dd>{formatDateTime(report.reviewedAt || report.updatedAt)}</dd></div></dl>
        </section>
      ) : (
        <section className={styles.resolutionForm}>
          <h3>{t.admin.reports.resolveReport}</h3>
          <Form.Group><Form.Label>{t.admin.reports.resolutionType}</Form.Label><Form.Select value={resolutionAction} onChange={function (event) { setResolutionAction(event.target.value) }}><option value="">{t.admin.reports.chooseResolution}</option><option value="no_action">{t.admin.reports.noAction}</option><option value="hide_content" disabled={!isContentReport}>{t.admin.reports.hideContent}</option><option value="ban_user">{t.admin.reports.banAccount}</option><option value="hide_and_ban" disabled={!isContentReport}>{t.admin.reports.hideAndBan}</option></Form.Select></Form.Group>
          <Form.Group><Form.Label>{t.admin.reports.resolutionNote}</Form.Label><Form.Control as="textarea" rows={5} maxLength={1000} value={resolutionNote} placeholder={t.admin.reports.resolutionPlaceholder} onChange={function (event) { setResolutionNote(event.target.value) }} /></Form.Group>
          <div className={styles.formFooter}><span>{resolutionNote.length}/1000</span><Button variant="primary" disabled={!canSubmit} onClick={function () { setShowConfirm(true) }}>{t.admin.reports.performResolution}</Button></div>
        </section>
      )}

      {showConfirm && <ConfirmModal message={t.admin.reports.resolveConfirm} onCancel={function () { setShowConfirm(false) }} onConfirm={function () { resolveMutation.mutate() }} />}
    </div>
  )
}
