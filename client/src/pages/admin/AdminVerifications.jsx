import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Pagination } from 'react-bootstrap'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../utils/formatTime'
import { goAdmin } from '../../utils/adminNavigation'
import { getVerificationRequests, handleVerificationRequest, revokeVerification } from '../../features/verification/verificationAPI'
import styles from './AdminReports.module.css'

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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div><h2>{t.admin.verifications.title}</h2><p>{t.admin.verifications.listDescription}</p></div>
      </div>

      <div className={styles.filters} role="group">
        {filters.map(function (filter) {
          return (
            <button
              key={filter.key}
              type="button"
              className={statusFilter === filter.key ? styles.filterActive : ''}
              onClick={function () { setStatusFilter(filter.key); setPage(1) }}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      {requestsQuery.isLoading ? <Spinner fullPage /> : requestsQuery.isError ? (
        <div className={styles.empty}>{t.admin.verifications.loadFailed}</div>
      ) : requests.length === 0 ? (
        <div className={styles.empty}>{t.admin.verifications.noRequests}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.admin.verifications.colUser}</th>
                <th>{t.admin.verifications.colReason}</th>
                <th>{t.admin.verifications.colStatus}</th>
                <th>{t.admin.verifications.colDate}</th>
                <th>{t.admin.verifications.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(function (req) {
                var user = req.userId
                return (
                  <tr key={req._id}>
                    <td>
                      <button type="button" className={styles.personButton} disabled={!user?._id} onClick={function () { if (user?._id) goAdmin(navigate, '/admin/users/' + user._id) }}>
                        <Avatar src={user?.avatarUrl} username={user?.username} size="sm" />
                        <span><strong>{user?.fullName || user?.username || '—'}</strong><small>@{user?.username || '—'}</small></span>
                      </button>
                    </td>
                    <td className={styles.reasonCell}>{req.reason || '—'}</td>
                    <td>
                      <Badge bg={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'secondary'}>
                        {req.status === 'pending' ? t.admin.verifications.pending : req.status === 'approved' ? t.admin.verifications.approved : t.admin.verifications.rejected}
                      </Badge>
                    </td>
                    <td className={styles.date}>{formatDateTime(req.createdAt)}</td>
                    <td>
                      {req.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className={styles.approveBtn} disabled={actionMutation.isPending} onClick={function () { actionMutation.mutate({ id: req._id, action: 'approve' }) }}>
                            {t.admin.verifications.approve}
                          </button>
                          <button type="button" className={styles.rejectBtn} disabled={actionMutation.isPending} onClick={function () { actionMutation.mutate({ id: req._id, action: 'reject' }) }}>
                            {t.admin.verifications.reject}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <small className={styles.date}>{req.reviewedBy?.username ? '@' + req.reviewedBy.username : '—'}</small>
                          {/* Thu hồi tích xanh — chỉ hiện khi đã duyệt và user vẫn còn tích */}
                          {req.status === 'approved' && user?.isTrusted && (
                            <button type="button" className={styles.rejectBtn} disabled={revokeMutation.isPending} onClick={function () {
                              var reason = window.prompt(t.admin.verifications.revokeReasonPrompt)
                              if (reason === null) return // bấm Hủy
                              if (!reason.trim()) { toast.error(t.admin.verifications.revokeReasonRequired); return }
                              revokeMutation.mutate({ userId: user._id, reason: reason.trim() })
                            }}>
                              {t.admin.verifications.revoke}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className={styles.pagination}>
          <Pagination.Prev disabled={page <= 1} onClick={function () { setPage(function (v) { return v - 1 }) }} />
          <Pagination.Item active>{page} / {totalPages}</Pagination.Item>
          <Pagination.Next disabled={page >= totalPages} onClick={function () { setPage(function (v) { return v + 1 }) }} />
        </Pagination>
      )}
    </div>
  )
}
