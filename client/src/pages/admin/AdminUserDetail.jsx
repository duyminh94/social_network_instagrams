// pages/admin/AdminUserDetail.jsx
// Chi tiết một tài khoản cho admin
//
// Gồm 3 phần:
//   1. Hồ sơ  — avatar, vai trò, trạng thái, nút khóa / gỡ khóa / thu hồi tích
//   2. Hoạt động — số bài đăng, lượt thích, bình luận theo từng loại nội dung
//   3. Hộp thoại — danh sách chi tiết khi bấm "xem thêm" ở mỗi ô đếm

import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import Pagination from '@mui/material/Pagination'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDate, formatDateTime } from '../../utils/formatTime'
import { canGoAdminBack, goAdmin } from '../../utils/adminNavigation'
import * as s from './adminStyles'

function ActivityIcon({ action }) {
  if (action === 'posted') return <Icon name="grid" size={21} />
  if (action === 'liked') return <Icon name="heart" size={21} />
  return <Icon name="comment" size={21} />
}

// Màu Chip theo vai trò — quyền càng cao càng nổi bật
function roleColor(role) {
  if (role === 'super_admin') return 'error'
  if (role === 'moderator') return 'warning'
  return 'default'
}

// Màu Chip theo loại nội dung, để phân biệt nhanh trong danh sách
function contentColor(contentType) {
  if (contentType === 'reel') return 'secondary'
  if (contentType === 'story') return 'info'
  return 'primary'
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
  if (detailQuery.isError || !detailQuery.data?.user) {
    return <Box sx={s.empty}>{t.admin.users.userNotFound}</Box>
  }

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
  var dialogTitle = isChangeDialog
    ? t.admin.users.changeHistory
    : isReportDialog
      ? reportActions.find(function (item) { return item.key === dialog?.action })?.label
      : [
          actions.find(function (item) { return item.key === dialog?.action })?.label,
          sections.find(function (item) { return item.key === dialog?.contentType })?.title,
        ].filter(Boolean).join(' - ')
  var isOwnAccount = String(profile._id) === String(admin?._id || admin?.id)
  // Moderator chỉ khóa được tài khoản thường, super admin khóa được mọi tài khoản trừ chính mình
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
    <Box sx={s.page}>
      {canGoAdminBack(location) && (
        <Box component="button" type="button" sx={s.backButton} onClick={function () { navigate(-1) }}>
          <Icon name="arrowL" size={18} /><span>Quay về</span>
        </Box>
      )}

      {/* ── Hồ sơ ── */}
      <Box component="section" sx={s.card}>
        <Box sx={s.identityRow}>
          <Avatar src={profile.avatarUrl} username={profile.username} size="xl" />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography component="h2" sx={{ m: 0, fontSize: 24, fontWeight: 900, color: s.adminColors.ink }}>
                {profile.fullName || profile.username}
              </Typography>
              {profile.isTrusted && <Icon name="verified" size={20} />}
            </Box>
            <Typography sx={{ color: s.adminColors.muted }}>@{profile.username}</Typography>
            <Typography sx={{ fontSize: 13, color: s.adminColors.muted }}>{profile.email}</Typography>
          </Box>
        </Box>

        <Box sx={s.metaRow}>
          <Chip size="small" color={roleColor(profile.role)} label={profile.role || 'user'} />
          <Chip
            size="small"
            color={profile.isBanned ? 'error' : 'success'}
            label={profile.isBanned ? t.admin.users.statusBanned : t.admin.users.statusActive}
          />
          <Typography sx={{ fontSize: 13, color: s.adminColors.muted }}>
            {t.admin.users.joined}: {formatDate(profile.createdAt)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', mt: 2.5 }}>
          {isSuperAdmin && profile.isTrusted && (
            <Button
              variant="outline-secondary"
              loading={accountMutation.isPending}
              onClick={function () { runAccountAction('untrust') }}
            >
              {t.admin.users.untrust}
            </Button>
          )}

          {profile.isBanned ? (
            isSuperAdmin && (
              <Button
                variant="success"
                loading={accountMutation.isPending}
                onClick={function () { runAccountAction('unban') }}
              >
                {t.admin.users.unban}
              </Button>
            )
          ) : (
            canBanProfile && (
              <Button
                variant="outline-danger"
                loading={accountMutation.isPending}
                onClick={function () { runAccountAction('ban') }}
              >
                {t.admin.users.ban}
              </Button>
            )
          )}
        </Box>

        {isSuperAdmin && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 3, pt: 2.5, borderTop: '1px solid #eef2f7' }}>
            <Box>
              <Typography sx={{ fontSize: 12, color: s.adminColors.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                {t.admin.roles.colCurrentRole}
              </Typography>
              <Typography sx={{ fontWeight: 800, color: s.adminColors.ink }}>
                {roleOptions.find(function (role) { return role.value === (profile.role || 'user') })?.label || profile.role || 'user'}
              </Typography>
            </Box>

            <TextField
              select
              size="small"
              label={t.admin.roles.colChangeRole}
              value={profile.role || 'user'}
              // Không cho tự đổi vai trò của chính mình, tránh tự khóa quyền admin
              disabled={roleMutation.isPending || isOwnAccount}
              onChange={function (event) { roleMutation.mutate(event.target.value) }}
              sx={{ minWidth: 200 }}
            >
              {roleOptions.map(function (role) {
                return <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
              })}
            </TextField>
          </Box>
        )}
      </Box>

      {/* ── Hoạt động ── */}
      <Box component="section" sx={{ mt: 3 }}>
        <Typography component="h3" sx={{ m: 0, fontSize: 18, fontWeight: 900, color: s.adminColors.ink }}>
          {t.admin.users.activityHistory}
        </Typography>

        {sections.map(function (section) {
          var sectionCounts = counts[section.countKey] || {}
          return (
            <Box key={section.key}>
              <Box sx={s.sectionTitle}>
                <Icon name={section.icon} size={20} />
                <Typography component="h4" sx={{ m: 0, fontSize: 15, fontWeight: 800 }}>{section.title}</Typography>
              </Box>

              <Box sx={s.activityGrid}>
                {actions.map(function (action) {
                  return (
                    <Box component="article" key={action.key} sx={s.activityCard}>
                      <Box sx={s.metricIcon}><ActivityIcon action={action.key} /></Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 12, color: s.adminColors.muted, fontWeight: 700 }}>
                          {action.label}
                        </Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 900, color: s.adminColors.ink }}>
                          {sectionCounts[action.key] || 0}
                        </Typography>
                      </Box>
                      <Button size="sm" variant="outline-secondary" onClick={function () { openActivity(section.key, action.key) }}>
                        {t.admin.users.viewMore}
                      </Button>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          )
        })}

        <Box sx={s.sectionTitle}>
          <Icon name="flag" size={20} />
          <Typography component="h4" sx={{ m: 0, fontSize: 15, fontWeight: 800 }}>Báo cáo</Typography>
        </Box>
        <Box sx={{ ...s.activityGrid, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))' } }}>
          {reportActions.map(function (action) {
            return (
              <Box component="article" key={action.key} sx={s.activityCard}>
                <Box sx={s.metricIcon}><Icon name="flag" size={21} /></Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12, color: s.adminColors.muted, fontWeight: 700 }}>
                    {action.label}
                  </Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 900, color: s.adminColors.ink }}>
                    {counts.reports?.[action.key] || 0}
                  </Typography>
                </Box>
                <Button size="sm" variant="outline-secondary" onClick={function () { openActivity('reports', action.key) }}>
                  {t.admin.users.viewMore}
                </Button>
              </Box>
            )
          })}
        </Box>

        <Box sx={{ ...s.activityCard, mt: 3 }}>
          <Box sx={s.metricIcon}><Icon name="shield" size={21} /></Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, color: s.adminColors.ink }}>
              {t.admin.users.changeHistory}
            </Typography>
            <Typography sx={{ fontSize: 13, color: s.adminColors.muted }}>
              {t.admin.users.changeHistoryDescription}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 22, fontWeight: 900, color: s.adminColors.ink }}>
            {counts.changes || 0}
          </Typography>
          <Button size="sm" variant="outline-secondary" onClick={function () { openActivity('changes') }}>
            {t.admin.users.viewMore}
          </Button>
        </Box>
      </Box>

      {/* ── Hộp thoại chi tiết hoạt động ── */}
      <Dialog open={!!dialog} onClose={closeActivity} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Typography component="span" sx={{ fontSize: 16, fontWeight: 700 }}>{dialogTitle}</Typography>
          <IconButton onClick={closeActivity} size="small" aria-label={t.common.cancel}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {activityQuery.isLoading ? (
            <Spinner />
          ) : activityQuery.isError ? (
            <Box sx={s.empty}>{t.admin.users.activityLoadFailed}</Box>
          ) : items.length === 0 ? (
            <Box sx={s.empty}>{t.admin.users.noActivity}</Box>
          ) : isChangeDialog ? (
            // Danh sách lịch sử thay đổi hồ sơ
            <Box>
              {items.map(function (item) {
                return (
                  <Box key={item._id} sx={{ ...s.activityItem, cursor: 'default', '&:hover': {} }}>
                    <Box sx={s.metricIcon}><Icon name="shield" size={20} /></Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                        <strong>{changeLabels[item.changeType] || item.changeType}</strong>
                        <Typography sx={{ fontSize: 12, color: s.adminColors.muted, whiteSpace: 'nowrap' }}>
                          {formatDateTime(item.createdAt)}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 13, mt: 0.5 }}>
                        {t.admin.users.oldValue}: {displayValue(item.oldValue)}
                      </Typography>
                      <Typography sx={{ fontSize: 13 }}>
                        {t.admin.users.newValue}: {displayValue(item.newValue)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: s.adminColors.muted, mt: 0.5 }}>
                        {t.admin.users.changedBy}: {item.changedBy?.username ? '@' + item.changedBy.username : t.admin.users.system}
                      </Typography>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          ) : isReportDialog ? (
            // Danh sách báo cáo liên quan tới tài khoản này
            <Box>
              {items.map(function (item) {
                return (
                  <Box
                    component="button"
                    type="button"
                    key={item._id}
                    sx={s.activityItem}
                    onClick={function () { goAdmin(navigate, '/admin/reports/' + item._id) }}
                  >
                    <Box sx={s.metricIcon}><Icon name="flag" size={21} /></Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'center' }}>
                        <Chip size="small" color={item.status === 'pending' ? 'warning' : 'success'} label={item.status} />
                        <Typography sx={{ fontSize: 12, color: s.adminColors.muted }}>
                          {formatDate(item.createdAt)}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 14, mt: 0.5 }}>{item.reason}</Typography>
                      {item.description && (
                        <Typography sx={{ fontSize: 13, color: s.adminColors.muted }}>{item.description}</Typography>
                      )}
                      <Typography sx={{ fontSize: 12, color: s.adminColors.muted, mt: 0.5 }}>
                        {item.targetType}
                      </Typography>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          ) : (
            // Danh sách nội dung đã đăng / đã thích / đã bình luận
            <Box>
              {items.map(function (item) {
                var content = item.content || {}
                var previewUrl = content.thumbnailUrl || content.mediaUrl
                var contentLabel = item.contentType === 'reel'
                  ? t.admin.users.reel
                  : item.contentType === 'story' ? t.admin.users.story : t.admin.users.post
                var isRawVideo = content.mediaType === 'video' && !content.thumbnailUrl

                return (
                  <Box
                    component="button"
                    type="button"
                    key={item._id}
                    sx={s.activityItem}
                    onClick={function () { goAdmin(navigate, '/admin/content/' + item.contentType + '/' + content._id) }}
                  >
                    <Box sx={s.mediaPreview}>
                      {previewUrl
                        ? (isRawVideo
                            ? <video src={previewUrl} muted playsInline preload="metadata" />
                            : <img src={previewUrl} alt="" />)
                        : <Icon name={item.contentType === 'reel' ? 'play' : 'image'} size={24} />}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'center' }}>
                        <Chip size="small" color={contentColor(item.contentType)} label={contentLabel} />
                        <Typography sx={{ fontSize: 12, color: s.adminColors.muted }}>
                          {formatDate(item.createdAt)}
                        </Typography>
                      </Box>

                      {dialog?.action === 'commented' && (
                        <Typography sx={{ fontSize: 14, mt: 0.5, fontStyle: 'italic' }}>
                          {item.commentText}
                        </Typography>
                      )}

                      <Typography sx={{ fontSize: 14, mt: 0.5 }}>
                        {content.caption || t.admin.users.noCaption}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, mt: 0.75, fontSize: 13, color: s.adminColors.muted }}>
                        <span><Icon name="heart" size={15} /> {content.likesCount || 0}</span>
                        <span><Icon name="comment" size={15} /> {content.commentsCount || 0}</span>
                      </Box>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </DialogContent>

        {totalPages > 1 && (
          <DialogActions sx={{ justifyContent: 'center', py: 2 }}>
            <Pagination
              size="small"
              count={totalPages}
              page={activityPage}
              onChange={function (_, value) { setActivityPage(value) }}
              color="primary"
            />
          </DialogActions>
        )}
      </Dialog>
    </Box>
  )
}
