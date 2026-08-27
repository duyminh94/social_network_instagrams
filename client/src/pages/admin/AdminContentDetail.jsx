// pages/admin/AdminContentDetail.jsx
// Chi tiết một bài viết / reel / story cho admin
//
// Cho phép ẩn hoặc bỏ ẩn nội dung, và xem danh sách người đã thích,
//   bình luận hoặc báo cáo nội dung đó trong một hộp thoại riêng

import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
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
import ConfirmModal from '../../components/common/ConfirmModal'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../utils/formatTime'
import { canGoAdminBack, goAdmin } from '../../utils/adminNavigation'
import * as s from './adminStyles'

// Màu Chip theo trạng thái xử lý của báo cáo
function reportStatusColor(status) {
  if (status === 'pending') return 'warning'
  if (status === 'resolved') return 'success'
  return 'default'
}

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

  // Chỉ gọi API tương tác khi hộp thoại thực sự mở
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
    onError: function (error, action) {
      toast.error(error.response?.data?.message || (action === 'unhide' ? t.admin.content.unhideFailed : t.admin.content.hideFailed))
    },
  })

  if (detailQuery.isLoading) return <Spinner fullPage />
  if (detailQuery.isError || !detailQuery.data?.content) {
    return <Box sx={s.empty}>{t.admin.content.notFound}</Box>
  }

  var content = detailQuery.data.content
  var counts = detailQuery.data.counts || {}
  var media = content.media || []
  var dialogItems = interactionQuery.data?.items || []
  var totalPages = interactionQuery.data?.totalPages || 1
  var dialogTitles = { likes: t.admin.content.likes, comments: t.admin.content.comments, reports: t.admin.content.reports }
  var metrics = [
    { key: 'likes', icon: 'heart', label: t.admin.content.likes },
    { key: 'comments', icon: 'comment', label: t.admin.content.comments },
    { key: 'reports', icon: 'flag', label: t.admin.content.reports },
  ]

  function openDialog(type) { setDialogPage(1); setDialogType(type) }
  function closeDialog() { setDialogType(''); setDialogPage(1) }

  function openUser(person) {
    if (person?._id) goAdmin(navigate, '/admin/users/' + person._id)
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
            color={content.isDeleted ? 'default' : 'success'}
            label={content.isDeleted ? t.admin.content.hidden : t.admin.content.visible}
          />
          <Typography component="h2" sx={s.pageTitle}>{t.admin.content.detailTitle}</Typography>
        </Box>

        <Button
          variant={content.isDeleted ? 'success' : 'danger'}
          onClick={function () { setConfirmVisibility(true) }}
        >
          {content.isDeleted ? t.admin.content.unhide : t.admin.content.hide}
        </Button>
      </Box>

      <Box component="section" sx={s.detailGrid}>
        <Box sx={s.mediaGallery}>
          {media.length === 0 ? (
            <Box sx={s.mediaEmpty}><Icon name="image" size={32} /></Box>
          ) : media.map(function (item) {
            return item.mediaType === 'video'
              ? <video key={item._id || item.url} src={item.url} poster={item.thumbnailUrl || undefined} controls preload="metadata" />
              : <img key={item._id || item.url} src={item.url} alt="" />
          })}
        </Box>

        <Box sx={s.card}>
          <Box
            component="button"
            type="button"
            sx={s.personIdentity}
            disabled={!content.author?._id}
            onClick={function () { openUser(content.author) }}
          >
            <Avatar src={content.author?.avatarUrl} username={content.author?.username} size="lg" />
            <Box component="span">
              <strong>{content.author?.fullName || content.author?.username}</strong>
              <span>@{content.author?.username}</span>
              <small>{content.author?.email}</small>
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Box sx={s.infoRow}>
              <span>{t.admin.content.content}</span>
              <Typography sx={{ fontSize: 14 }}>{content.caption || t.admin.content.noCaption}</Typography>
            </Box>
            <Box sx={s.infoRow}>
              <span>{t.admin.content.publishedAt}</span>
              <Typography sx={{ fontSize: 14 }}>{formatDateTime(content.createdAt)}</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box component="section" sx={s.metricsRow}>
        {metrics.map(function (metric) {
          return (
            <Box component="article" key={metric.key} sx={s.metricCard}>
              <Box sx={s.metricIcon}><Icon name={metric.icon} size={21} /></Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: s.adminColors.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                  {metric.label}
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 900, color: s.adminColors.ink }}>
                  {counts[metric.key] || 0}
                </Typography>
              </Box>
              <Button size="sm" variant="outline-secondary" onClick={function () { openDialog(metric.key) }}>
                {t.admin.content.viewMore}
              </Button>
            </Box>
          )
        })}
      </Box>

      {/* Hộp thoại danh sách người thích / bình luận / báo cáo */}
      <Dialog open={!!dialogType} onClose={closeDialog} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Typography component="span" sx={{ fontSize: 16, fontWeight: 700 }}>
            {dialogTitles[dialogType]}
          </Typography>
          <IconButton onClick={closeDialog} size="small" aria-label={t.common.cancel}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {interactionQuery.isLoading ? (
            <Spinner />
          ) : interactionQuery.isError ? (
            <Box sx={s.empty}>{t.admin.content.loadFailed}</Box>
          ) : dialogItems.length === 0 ? (
            <Box sx={s.empty}>{t.admin.content.noInteractions}</Box>
          ) : (
            <Box>
              {dialogItems.map(function (item) {
                // Báo cáo lấy người gửi báo cáo, còn lại lấy người tương tác
                var person = dialogType === 'reports' ? item.reporterId : item.userId

                return (
                  <Box key={item._id} sx={s.interactionItem}>
                    <Box
                      component="button"
                      type="button"
                      sx={{ p: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
                      disabled={!person?._id}
                      onClick={function () { openUser(person) }}
                    >
                      <Avatar src={person?.avatarUrl} username={person?.username} size="sm" />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                        <Box
                          component="button"
                          type="button"
                          sx={{ p: 0, border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 700, color: s.adminColors.ink }}
                          disabled={!person?._id}
                          onClick={function () { openUser(person) }}
                        >
                          {person?.fullName || person?.username || t.admin.content.unknown}
                        </Box>
                        <Typography component="time" sx={{ fontSize: 12, color: s.adminColors.muted, whiteSpace: 'nowrap' }}>
                          {formatDateTime(item.createdAt)}
                        </Typography>
                      </Box>

                      <Typography sx={{ fontSize: 13, color: s.adminColors.muted }}>
                        @{person?.username || t.admin.content.unknown} - {person?.email}
                      </Typography>

                      {dialogType === 'comments' && (
                        <Typography sx={{ mt: 0.5, fontSize: 14 }}>{item.content}</Typography>
                      )}

                      {dialogType === 'reports' && (
                        <Box sx={{ mt: 1 }}>
                          <Typography sx={{ fontSize: 14 }}>
                            <b>{t.admin.content.reason}:</b> {item.reason}
                          </Typography>
                          {item.description && (
                            <Typography sx={{ fontSize: 14 }}>
                              <b>{t.admin.content.description}:</b> {item.description}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 1 }}>
                            <Chip size="small" color={reportStatusColor(item.status)} label={item.status} />
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={function () { goAdmin(navigate, '/admin/reports/' + item._id) }}
                            >
                              Xem report
                            </Button>
                          </Box>
                        </Box>
                      )}
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
              page={dialogPage}
              onChange={function (_, value) { setDialogPage(value) }}
              color="primary"
            />
          </DialogActions>
        )}
      </Dialog>

      {confirmVisibility && (
        <ConfirmModal
          message={content.isDeleted ? t.admin.content.unhideConfirm : t.admin.content.hideConfirm}
          onCancel={function () { setConfirmVisibility(false) }}
          onConfirm={function () { visibilityMutation.mutate(content.isDeleted ? 'unhide' : 'hide') }}
        />
      )}
    </Box>
  )
}
