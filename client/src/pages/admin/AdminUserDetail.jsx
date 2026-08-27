import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Form, Modal, Pagination } from 'react-bootstrap'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDate, formatDateTime } from '../../utils/formatTime'
import { canGoAdminBack, goAdmin } from '../../utils/adminNavigation'
import styles from './AdminUserDetail.module.css'

function ActivityIcon({ action }) {
  if (action === 'posted') return <Icon name="grid" size={21} />
  if (action === 'liked') return <Icon name="heart" size={21} />
  return <Icon name="comment" size={21} />
}

function getRoleChipClass(role) {
  if (role === 'super_admin') return styles.chipDanger
  if (role === 'moderator') return styles.chipWarning
  return styles.chipNeutral
}

function getContentChipClass(contentType) {
  if (contentType === 'reel') return styles.chipDark
  if (contentType === 'story') return styles.chipInfo
  return styles.chipPrimary
}

export default function AdminUserDetail() {
  var { id } = useParams()
  var navigate = useNavigate()
  var location = useLocation()
  var queryClient = useQueryClient()
  var { user: admin } = useAuth()
  var { t } = useLanguage()
  var [dialog, setDialog] = useState(null)
  var [activityPage, setActivityPage] = useState(1)
  var isSuperAdmin = admin?.role === 'super_admin'
  var isAdmin = ['super_admin', 'moderator'].includes(admin?.role)

  var detailQuery = useQuery({
    queryKey: ['adminUserDetail', id],
    queryFn: function () { return api.get('/admin/users/' + id).then(function (r) { return r.data }) },
    enabled: isAdmin && !!id,
  })
  var activityQuery = useQuery({
    queryKey: ['adminUserActivity', id, dialog?.contentType, dialog?.action, activityPage],
    queryFn: function () {
      return api.get('/admin/users/' + id + '/activity', { params: { contentType: dialog.contentType, action: dialog.action, page: activityPage, limit: 12 } }).then(function (r) { return r.data })
    },
    enabled: isAdmin && !!id && !!dialog,
  })
  var roleMutation = useMutation({
    mutationFn: function (role) { return api.patch('/admin/users/' + id + '/role', { role: role }) },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['adminUserDetail', id] })
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      queryClient.invalidateQueries({ queryKey: ['adminLogs'] })
      toast.success(t.admin.roles.updated)
    },
    onError: function (err) { toast.error(err.response?.data?.message || t.admin.roles.updateFailed) },
  })
  var accountMutation = useMutation({
    mutationFn: function (variables) {
      // variables là string (vd 'unban') hoặc object { action, note } khi ban có lý do
      var action = typeof variables === 'string' ? variables : variables.action
      var payload = {}
      if (action === 'untrust') payload = { reason: '' }
      else if (action === 'ban' && typeof variables === 'object') payload = { note: variables.note || '' }
      return api.patch('/admin/users/' + id + '/' + action, payload)
    },
    onSuccess: function (res) {
      queryClient.invalidateQueries({ queryKey: ['adminUserDetail', id] })
      queryClient.invalidateQueries({ queryKey: ['adminUserActivity', id] })
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      queryClient.invalidateQueries({ queryKey: ['adminLogs'] })
      toast.success(res?.data?.message || t.admin.verifications.done)
    },
    onError: function (err) { toast.error(err.response?.data?.message || t.admin.verifications.failed) },
  })

  if (!isAdmin) return <Navigate to="/" replace />
  if (detailQuery.isLoading) return <Spinner fullPage />
  if (detailQuery.isError || !detailQuery.data?.user) return <div className={styles.emptyState}>{t.admin.users.userNotFound}</div>

  var profile = detailQuery.data.user
  var counts = detailQuery.data.activityCounts || {}
  var sections = [
    { key: 'post', countKey: 'posts', title: t.admin.users.postsSection, icon: 'grid' },
    { key: 'story', countKey: 'stories', title: t.admin.users.storiesSection, icon: 'image' },
    { key: 'reel', countKey: 'reels', title: t.admin.users.reelsSection, icon: 'reels' },
  ]
  var actions = [
    { key: 'posted', label: t.admin.users.postedMetric },
    { key: 'liked', label: t.admin.users.likedMetric },
    { key: 'commented', label: t.admin.users.commentedMetric },
  ]
  var changeLabels = {
    verified: t.admin.users.changeVerified,
    verification_revoked: t.admin.users.changeVerificationRevoked,
    full_name_changed: t.admin.users.changeFullName,
    username_changed: t.admin.users.changeUsername,
    bio_changed: t.admin.users.changeBio,
    banned: t.admin.users.changeBanned,
    unbanned: t.admin.users.changeUnbanned,
  }
  var activityData = activityQuery.data || {}
  var items = activityData.items || []
  var totalPages = activityData.totalPages || 1
  var isChangeDialog = dialog?.contentType === 'changes'
  var isReportDialog = dialog?.contentType === 'reports'
  var reportActions = [
    { key: 'reported', label: 'Đã report' },
    { key: 'reportedBy', label: 'Bị report' },
  ]
  var roleOptions = [
    { value: 'user', label: t.admin.roles.user },
    { value: 'moderator', label: t.admin.roles.moderator },
    { value: 'super_admin', label: t.admin.roles.superAdmin },
  ]
  var dialogTitle = isChangeDialog ? t.admin.users.changeHistory : isReportDialog ? reportActions.find(function (item) { return item.key === dialog?.action })?.label : [actions.find(function (item) { return item.key === dialog?.action })?.label, sections.find(function (item) { return item.key === dialog?.contentType })?.title].filter(Boolean).join(' - ')
  var isOwnAccount = String(profile._id) === String(admin?._id || admin?.id)
  var canBanProfile = !isOwnAccount && (isSuperAdmin || (admin?.role === 'moderator' && profile.role === 'user'))

  function openActivity(contentType, action) { setActivityPage(1); setDialog({ contentType: contentType, action: action || '' }) }
  function closeActivity() { setDialog(null); setActivityPage(1) }
  function displayValue(value) { return value === '' || value === null || value === undefined ? t.admin.users.emptyValue : value }
  function runAccountAction(action) {
    if (accountMutation.isPending) return
    // Khóa tài khoản: hỏi lý do để gửi cho người dùng qua email (cho phép kháng cáo)
    if (action === 'ban') {
      var reason = window.prompt(t.admin.users.banReasonPrompt, '')
      if (reason === null) return  // bấm Hủy → không làm gì
      accountMutation.mutate({ action: 'ban', note: reason.trim() })
      return
    }
    accountMutation.mutate(action)
  }

  return (
    <div className={styles.page}>
      {canGoAdminBack(location) && <button type="button" className={styles.backButton} onClick={function () { navigate(-1) }}><Icon name="arrowL" size={18} /><span>Quay về</span></button>}
      <section className={styles.profileSection}>
        <div className={styles.identity}><Avatar src={profile.avatarUrl} username={profile.username} size="xl" /><div className={styles.identityText}><div className={styles.nameRow}><h2>{profile.fullName || profile.username}</h2>{profile.isTrusted && <Icon name="verified" size={20} />}</div><p>@{profile.username}</p><span>{profile.email}</span></div></div>
        <div className={styles.accountMeta}>
          <span className={styles.metaChip + ' ' + getRoleChipClass(profile.role)}><Icon name="shield" size={15} />{profile.role || 'user'}</span>
          <span className={styles.metaChip + ' ' + (profile.isBanned ? styles.chipDanger : styles.chipSuccess)}><Icon name={profile.isBanned ? 'ban' : 'check'} size={15} />{profile.isBanned ? t.admin.users.statusBanned : t.admin.users.statusActive}</span>
          <span className={styles.joinedText}>{t.admin.users.joined}: {formatDate(profile.createdAt)}</span>
        </div>
        <div className={styles.actions}>
          {isSuperAdmin && profile.isTrusted && (
            <Button
              type="button"
              variant="outline-warning"
              disabled={accountMutation.isPending}
              onClick={function () { runAccountAction('untrust') }}
            >
              <Icon name="x" size={17} />
              <span className={styles.buttonText}>{t.admin.users.untrust}</span>
            </Button>
          )}
          {profile.isBanned ? (
            isSuperAdmin && (
              <Button
                type="button"
                variant="outline-success"
                disabled={accountMutation.isPending}
                onClick={function () { runAccountAction('unban') }}
              >
                <Icon name="check" size={17} />
                <span className={styles.buttonText}>{t.admin.users.unban}</span>
              </Button>
            )
          ) : (
            canBanProfile && (
              <Button
                type="button"
                variant="outline-danger"
                disabled={accountMutation.isPending}
                onClick={function () { runAccountAction('ban') }}
              >
                <Icon name="ban" size={17} />
                <span className={styles.buttonText}>{t.admin.users.ban}</span>
              </Button>
            )
          )}
        </div>
        {isSuperAdmin && (
          <div className={styles.rolePanel}>
            <div className={styles.rolePanelText}>
              <span>{t.admin.roles.colCurrentRole}</span>
              <strong>{roleOptions.find(function (role) { return role.value === (profile.role || 'user') })?.label || profile.role || 'user'}</strong>
            </div>
            <Form.Select
              value={profile.role || 'user'}
              disabled={roleMutation.isPending || String(profile._id) === String(admin?._id || admin?.id)}
              onChange={function (event) { roleMutation.mutate(event.target.value) }}
              className={styles.roleSelect}
              aria-label={t.admin.roles.colChangeRole}
            >
              {roleOptions.map(function (role) {
                return <option key={role.value} value={role.value}>{role.label}</option>
              })}
            </Form.Select>
            <small>{t.admin.roles.colChangeRole}</small>
          </div>
        )}
      </section>

      <section className={styles.activitySection}>
        <h3>{t.admin.users.activityHistory}</h3>
        {sections.map(function (section) {
          var sectionCounts = counts[section.countKey] || {}
          return <div key={section.key} className={styles.contentSection}><div className={styles.sectionTitle}><Icon name={section.icon} size={20} /><h4>{section.title}</h4></div><div className={styles.activityGrid}>{actions.map(function (action) { return <article key={action.key} className={styles.activityCard}><div className={styles.activityIcon}><ActivityIcon action={action.key} /></div><div className={styles.activityInfo}><span>{action.label}</span><strong>{sectionCounts[action.key] || 0}</strong></div><button type="button" onClick={function () { openActivity(section.key, action.key) }}>{t.admin.users.viewMore}</button></article> })}</div></div>
        })}
        <div className={styles.contentSection}>
          <div className={styles.sectionTitle}><Icon name="flag" size={20} /><h4>Báo cáo</h4></div>
          <div className={styles.activityGrid}>
            {reportActions.map(function (action) {
              return <article key={action.key} className={styles.activityCard}><div className={styles.activityIcon}><Icon name="flag" size={21} /></div><div className={styles.activityInfo}><span>{action.label}</span><strong>{counts.reports?.[action.key] || 0}</strong></div><button type="button" onClick={function () { openActivity('reports', action.key) }}>{t.admin.users.viewMore}</button></article>
            })}
          </div>
        </div>
        <div className={styles.changeSection}><div><div className={styles.sectionTitle}><Icon name="shield" size={20} /><h4>{t.admin.users.changeHistory}</h4></div><p>{t.admin.users.changeHistoryDescription}</p></div><strong>{counts.changes || 0}</strong><button type="button" onClick={function () { openActivity('changes') }}>{t.admin.users.viewMore}</button></div>
      </section>

      <Modal show={!!dialog} onHide={closeActivity} centered size="lg" scrollable>
        <Modal.Header closeButton><Modal.Title>{dialogTitle}</Modal.Title></Modal.Header>
        <Modal.Body className={styles.dialogBody}>
          {activityQuery.isLoading ? <Spinner /> : activityQuery.isError ? <div className={styles.emptyState}>{t.admin.users.activityLoadFailed}</div> : items.length === 0 ? <div className={styles.emptyState}>{t.admin.users.noActivity}</div> : isChangeDialog ? <div className={styles.changeList}>{items.map(function (item) { return <div key={item._id} className={styles.changeItem}><div className={styles.changeIcon}><Icon name="shield" size={20} /></div><div className={styles.changeContent}><div className={styles.itemTopline}><strong>{changeLabels[item.changeType] || item.changeType}</strong><span>{formatDateTime(item.createdAt)}</span></div><dl><div><dt>{t.admin.users.oldValue}</dt><dd>{displayValue(item.oldValue)}</dd></div><div><dt>{t.admin.users.newValue}</dt><dd>{displayValue(item.newValue)}</dd></div></dl><small>{t.admin.users.changedBy}: {item.changedBy?.username ? '@' + item.changedBy.username : t.admin.users.system}</small></div></div> })}</div> : isReportDialog ? <div className={styles.activityList}>{items.map(function (item) {
            return <button type="button" key={item._id} className={styles.reportActivityItem} onClick={function () { goAdmin(navigate, '/admin/reports/' + item._id) }}><div className={styles.activityIcon}><Icon name="flag" size={21} /></div><div className={styles.itemContent}><div className={styles.itemTopline}><span className={styles.metaChip + ' ' + (item.status === 'pending' ? styles.chipWarning : styles.chipSuccess)}>{item.status}</span><span className={styles.itemDate}>{formatDate(item.createdAt)}</span></div><p>{item.reason}</p>{item.description && <p>{item.description}</p>}<div className={styles.itemStats}><span>{item.targetType}</span></div></div></button>
          })}</div> : <div className={styles.activityList}>{items.map(function (item) {
            var content = item.content || {}; var previewUrl = content.thumbnailUrl || content.mediaUrl; var contentLabel = item.contentType === 'reel' ? t.admin.users.reel : item.contentType === 'story' ? t.admin.users.story : t.admin.users.post
            return <button type="button" key={item._id} className={styles.activityItemButton} onClick={function () { goAdmin(navigate, '/admin/content/' + item.contentType + '/' + content._id) }}><div className={styles.mediaPreview}>{previewUrl ? (content.mediaType === 'video' && !content.thumbnailUrl ? <video src={previewUrl} muted playsInline preload="metadata" /> : <img src={previewUrl} alt="" />) : <Icon name={item.contentType === 'reel' ? 'play' : 'image'} size={24} />}</div><div className={styles.itemContent}><div className={styles.itemTopline}><span className={styles.metaChip + ' ' + getContentChipClass(item.contentType)}>{contentLabel}</span><span className={styles.itemDate}>{formatDate(item.createdAt)}</span></div>{dialog?.action === 'commented' && <p className={styles.commentText}>{item.commentText}</p>}<p>{content.caption || t.admin.users.noCaption}</p><div className={styles.itemStats}><span><Icon name="heart" size={15} /> {content.likesCount || 0}</span><span><Icon name="comment" size={15} /> {content.commentsCount || 0}</span></div></div></button>
          })}</div>}
        </Modal.Body>
        {totalPages > 1 && <Modal.Footer className={styles.dialogFooter}><Pagination size="sm" className="mb-0"><Pagination.Prev disabled={activityPage <= 1} onClick={function () { setActivityPage(function (page) { return page - 1 }) }} /><Pagination.Item active>{activityPage} / {totalPages}</Pagination.Item><Pagination.Next disabled={activityPage >= totalPages} onClick={function () { setActivityPage(function (page) { return page + 1 }) }} /></Pagination></Modal.Footer>}
      </Modal>
    </div>
  )
}
