// pages/admin/AdminVerifications.jsx
// Duyệt yêu cầu cấp tích xanh — duyệt, từ chối, và thu hồi tích đã cấp

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import Button from '../../components/common/Button'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../utils/formatTime'
import { goAdmin } from '../../utils/adminNavigation'
import { getVerificationRequests, handleVerificationRequest, revokeVerification } from '../../features/verification/verificationAPI'
import * as s from './adminStyles'

// Màu Chip theo trạng thái yêu cầu
function statusColor(status) {
  if (status === 'pending') return 'warning'
  if (status === 'approved') return 'success'
  return 'default'
}

export default function AdminVerifications() {
  var navigate = useNavigate()
  var { t } = useLanguage()
  var queryClient = useQueryClient()
  var [page, setPage] = useState(1)
  var [statusFilter, setStatusFilter] = useState('pending')
  var filters = [
    { key: 'pending', label: t.admin.verifications.pending },
    { key: 'processed', label: t.admin.verifications.processed },
  ]

  var requestsQuery = useQuery({
    queryKey: ['adminVerifications', page, statusFilter],
    queryFn: function () {
      return getVerificationRequests(statusFilter, page, 20).then(function (r) { return r.data })
    },
  })
  var requests = requestsQuery.data?.requests || []
  var totalPages = requestsQuery.data?.totalPages || 1

  var actionMutation = useMutation({
    mutationFn: function (vars) { return handleVerificationRequest(vars.id, vars.action, '') },
    onSuccess: function (res) {
      toast.success(res?.data?.message || t.admin.verifications.done)
      queryClient.invalidateQueries({ queryKey: ['adminVerifications'] })
    },
    onError: function (err) {
      toast.error(err?.response?.data?.message || t.admin.verifications.failed)
    },
  })

  var revokeMutation = useMutation({
    mutationFn: function (vars) { return revokeVerification(vars.userId, vars.reason) },
    onSuccess: function (res) {
      toast.success(res?.data?.message || t.admin.verifications.revoked)
      queryClient.invalidateQueries({ queryKey: ['adminVerifications'] })
    },
    onError: function (err) {
      toast.error(err?.response?.data?.message || t.admin.verifications.failed)
    },
  })

  function handleFilterChange(_, value) {
    if (!value) return
    setStatusFilter(value)
    setPage(1)
  }

  // Thu hồi tích xanh: bắt buộc nhập lý do để còn ghi vào nhật ký admin
  function handleRevoke(userId) {
    var reason = window.prompt(t.admin.verifications.revokeReasonPrompt)
    if (reason === null) return // bấm Hủy
    if (!reason.trim()) {
      toast.error(t.admin.verifications.revokeReasonRequired)
      return
    }
    revokeMutation.mutate({ userId: userId, reason: reason.trim() })
  }

  return (
    <Box sx={s.page}>
      <Box sx={s.pageHeader}>
        <Box>
          <Typography component="h2" sx={s.pageTitle}>{t.admin.verifications.title}</Typography>
          <Typography sx={s.pageSubtitle}>{t.admin.verifications.listDescription}</Typography>
        </Box>
      </Box>

      <ToggleButtonGroup exclusive value={statusFilter} onChange={handleFilterChange} sx={s.filterBar}>
        {filters.map(function (filter) {
          return (
            <ToggleButton key={filter.key} value={filter.key} sx={{ px: 2.125, fontWeight: 800 }}>
              {filter.label}
            </ToggleButton>
          )
        })}
      </ToggleButtonGroup>

      {requestsQuery.isLoading ? (
        <Spinner fullPage />
      ) : requestsQuery.isError ? (
        <Box sx={s.empty}>{t.admin.verifications.loadFailed}</Box>
      ) : requests.length === 0 ? (
        <Box sx={s.empty}>{t.admin.verifications.noRequests}</Box>
      ) : (
        <Box sx={s.tableWrap}>
          <Table sx={s.table}>
            <TableHead>
              <TableRow>
                <TableCell>{t.admin.verifications.colUser}</TableCell>
                <TableCell>{t.admin.verifications.colReason}</TableCell>
                <TableCell>{t.admin.verifications.colStatus}</TableCell>
                <TableCell>{t.admin.verifications.colDate}</TableCell>
                <TableCell>{t.admin.verifications.colActions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map(function (req) {
                var user = req.userId
                var statusLabel = req.status === 'pending'
                  ? t.admin.verifications.pending
                  : req.status === 'approved'
                    ? t.admin.verifications.approved
                    : t.admin.verifications.rejected

                return (
                  <TableRow key={req._id}>
                    <TableCell>
                      <Box
                        component="button"
                        type="button"
                        sx={s.personButton}
                        disabled={!user?._id}
                        onClick={function () { if (user?._id) goAdmin(navigate, '/admin/users/' + user._id) }}
                      >
                        <Avatar src={user?.avatarUrl} username={user?.username} size="sm" />
                        <Box component="span">
                          <strong>{user?.fullName || user?.username || '—'}</strong>
                          <small>@{user?.username || '—'}</small>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ maxWidth: 280 }}>{req.reason || '—'}</TableCell>

                    <TableCell>
                      <Chip size="small" color={statusColor(req.status)} label={statusLabel} />
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(req.createdAt)}</TableCell>

                    <TableCell>
                      {req.status === 'pending' ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="sm"
                            variant="success"
                            loading={actionMutation.isPending}
                            onClick={function () { actionMutation.mutate({ id: req._id, action: 'approve' }) }}
                          >
                            {t.admin.verifications.approve}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            loading={actionMutation.isPending}
                            onClick={function () { actionMutation.mutate({ id: req._id, action: 'reject' }) }}
                          >
                            {t.admin.verifications.reject}
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Typography component="small" sx={{ color: s.adminColors.muted, fontSize: 12 }}>
                            {req.reviewedBy?.username ? '@' + req.reviewedBy.username : '—'}
                          </Typography>
                          {/* Thu hồi tích xanh — chỉ hiện khi đã duyệt và user vẫn còn tích */}
                          {req.status === 'approved' && user?.isTrusted && (
                            <Button
                              size="sm"
                              variant="outline-danger"
                              loading={revokeMutation.isPending}
                              onClick={function () { handleRevoke(user._id) }}
                            >
                              {t.admin.verifications.revoke}
                            </Button>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={s.paginationRow}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={function (_, value) { setPage(value) }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  )
}
