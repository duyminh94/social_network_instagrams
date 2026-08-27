// pages/admin/AdminReportDetail.jsx
// Chi tiết một báo cáo vi phạm và form xử lý
//
// Báo cáo đã xử lý thì hiện kết quả, chưa xử lý thì hiện form chọn hình thức
//   xử lý kèm ghi chú. Bấm xử lý phải xác nhận lại vì thao tác này khó hoàn tác

import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import ConfirmModal from '../../components/common/ConfirmModal'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../utils/formatTime'
import { canGoAdminBack, goAdmin } from '../../utils/adminNavigation'
import * as s from './adminStyles'

// Thẻ hiển thị một bên liên quan trong báo cáo
function PersonCard({ title, person, onOpen, actionLabel, unknown }) {
  return (
    <Box component="article" sx={s.card}>
      <Typography component="span" sx={s.cardLabel}>{title}</Typography>

      <Box component="button" type="button" sx={s.personIdentity} disabled={!person?._id} onClick={onOpen}>
        <Avatar src={person?.avatarUrl} username={person?.username} size="lg" />
        <Box component="span">
          <strong>{person?.fullName || person?.username || unknown}</strong>
          <span>@{person?.username || unknown}</span>
          <small>{person?.email}</small>
        </Box>
      </Box>

      {person?._id && (
        <Box sx={{ mt: 2 }}>
          <Button size="sm" variant="outline-primary" onClick={onOpen}>
            {actionLabel}
          </Button>
        </Box>
      )}
    </Box>
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
    onError: function (error) {
      setShowConfirm(false)
      toast.error(error.response?.data?.message || t.admin.reports.actionFailed)
    },
  })

  if (detailQuery.isLoading) return <Spinner fullPage />
  if (detailQuery.isError || !detailQuery.data?.report) {
    return <Box sx={s.empty}>{t.admin.reports.notFound}</Box>
  }

  var report = detailQuery.data.report
  var isProcessed = report.status !== 'pending'
  var typeLabels = { post: 'Post', story: 'Story', reel: 'Reel', user: 'User', comment: 'Comment' }
  var actionLabels = {
    no_action: t.admin.reports.noAction,
    hide_content: t.admin.reports.hideContent,
    ban_user: t.admin.reports.banAccount,
    hide_and_ban: t.admin.reports.hideAndBan,
  }
  // Chỉ báo cáo về nội dung mới ẩn được, báo cáo về user thì không
  var isContentReport = ['post', 'story', 'reel'].includes(report.targetType)
  var canSubmit = resolutionAction && resolutionNote.trim()

  function openUser(userId) {
    if (userId) goAdmin(navigate, '/admin/users/' + userId)
  }

  function openReportedContent() {
    if (isContentReport) goAdmin(navigate, '/admin/content/' + report.targetType + '/' + report.targetId)
  }

  return (
    <Box sx={s.page}>
      {canGoAdminBack(location) && (
        <Box component="button" type="button" sx={s.backButton} onClick={function () { navigate(-1) }}>
          <Icon name="arrowL" size={18} />Quay về
        </Box>
      )}

      <Box sx={s.pageHeader}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            size="small"
            color={isProcessed ? 'success' : 'warning'}
            label={isProcessed ? t.admin.reports.processed : t.admin.reports.pending}
          />
          <Typography component="h2" sx={s.pageTitle}>{t.admin.reports.detailTitle}</Typography>
        </Box>
      </Box>

      <Box component="section" sx={s.twoColGrid}>
        <PersonCard
          title={t.admin.reports.colReporter}
          person={report.reporterId}
          unknown={t.admin.reports.unknown}
          actionLabel={t.admin.reports.openUserDetail}
          onOpen={function () { openUser(report.reporterId?._id) }}
        />
        <PersonCard
          title={t.admin.reports.colReported}
          person={report.reportedUser}
          unknown={t.admin.reports.unknown}
          actionLabel={t.admin.reports.openUserDetail}
          onOpen={function () { openUser(report.reportedUser?._id) }}
        />
      </Box>

      <Box component="section" sx={{ ...s.card, mt: 2.5 }}>
        <Box sx={s.infoRow}>
          <span>{t.admin.reports.reportType}</span>
          <strong>{typeLabels[report.targetType] || report.targetType}</strong>
        </Box>
        <Box sx={s.infoRow}>
          <span>{t.admin.reports.colReason}</span>
          <strong>{report.reason}</strong>
          {report.description && (
            <Typography sx={{ mt: 1, fontSize: 14 }}>{report.description}</Typography>
          )}
        </Box>
        <Box sx={s.infoRow}>
          <span>{t.admin.reports.reportedAt}</span>
          <strong>{formatDateTime(report.createdAt)}</strong>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', mt: 2 }}>
          {report.reportedUser?._id && (
            <Button variant="outline-primary" onClick={function () { openUser(report.reportedUser._id) }}>
              {t.admin.reports.openReportedUser}
            </Button>
          )}
          {isContentReport && (
            <Button variant="outline-secondary" onClick={openReportedContent}>
              {t.admin.reports.openReportedContent}
            </Button>
          )}
        </Box>
      </Box>

      {isProcessed ? (
        <Box component="section" sx={{ ...s.card, mt: 2.5 }}>
          <Typography component="h3" sx={{ m: 0, mb: 2, fontSize: 16, fontWeight: 800, color: s.adminColors.ink }}>
            {t.admin.reports.resolutionResult}
          </Typography>

          <Box
            component="button"
            type="button"
            sx={s.personButton}
            disabled={!report.reviewedBy?._id}
            onClick={function () { openUser(report.reviewedBy?._id) }}
          >
            <Avatar src={report.reviewedBy?.avatarUrl} username={report.reviewedBy?.username} size="sm" />
            <Box component="span">
              <small>{t.admin.reports.reviewedBy}</small>
              <strong>{report.reviewedBy?.fullName || report.reviewedBy?.username || t.admin.reports.unknown}</strong>
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Box sx={s.infoRow}>
              <span>{t.admin.reports.resolutionType}</span>
              <strong>{actionLabels[report.resolutionAction] || t.admin.reports.legacyResolution}</strong>
            </Box>
            <Box sx={s.infoRow}>
              <span>{t.admin.reports.resolutionNote}</span>
              <strong>{report.resolutionNote || t.admin.reports.noResolutionNote}</strong>
            </Box>
            <Box sx={s.infoRow}>
              <span>{t.admin.reports.reviewedAt}</span>
              <strong>{formatDateTime(report.reviewedAt || report.updatedAt)}</strong>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box component="section" sx={{ ...s.card, mt: 2.5 }}>
          <Typography component="h3" sx={{ m: 0, mb: 2, fontSize: 16, fontWeight: 800, color: s.adminColors.ink }}>
            {t.admin.reports.resolveReport}
          </Typography>

          <TextField
            select
            fullWidth
            size="small"
            label={t.admin.reports.resolutionType}
            value={resolutionAction}
            onChange={function (event) { setResolutionAction(event.target.value) }}
            sx={{ mb: 2 }}
          >
            <MenuItem value="">{t.admin.reports.chooseResolution}</MenuItem>
            <MenuItem value="no_action">{t.admin.reports.noAction}</MenuItem>
            {/* Ẩn nội dung chỉ áp dụng cho báo cáo về bài viết/story/reel */}
            <MenuItem value="hide_content" disabled={!isContentReport}>{t.admin.reports.hideContent}</MenuItem>
            <MenuItem value="ban_user">{t.admin.reports.banAccount}</MenuItem>
            <MenuItem value="hide_and_ban" disabled={!isContentReport}>{t.admin.reports.hideAndBan}</MenuItem>
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={5}
            label={t.admin.reports.resolutionNote}
            placeholder={t.admin.reports.resolutionPlaceholder}
            value={resolutionNote}
            onChange={function (event) { setResolutionNote(event.target.value) }}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            helperText={resolutionNote.length + '/1000'}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button disabled={!canSubmit} onClick={function () { setShowConfirm(true) }}>
              {t.admin.reports.performResolution}
            </Button>
          </Box>
        </Box>
      )}

      {showConfirm && (
        <ConfirmModal
          message={t.admin.reports.resolveConfirm}
          onCancel={function () { setShowConfirm(false) }}
          onConfirm={function () { resolveMutation.mutate() }}
        />
      )}
    </Box>
  )
}
