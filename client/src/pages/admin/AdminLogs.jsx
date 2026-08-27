// pages/admin/AdminLogs.jsx
// Trang lịch sử hành động admin.
//
// Backend đã ghi log khi admin ban user, gỡ ban, cấp tick, xử lý report,
// xóa post/comment/story... Trang này chỉ đọc GET /api/admin/logs và hiển thị.

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Form, Table, Badge, Pagination } from 'react-bootstrap'
import api from '../../services/api'
import Spinner from '../../components/common/Spinner'
import { timeAgo } from '../../utils/formatTime'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './AdminShared.module.css'

function getActionBadge(action) {
  if (action === 'ban_user' || action === 'delete_post' || action === 'delete_comment' || action === 'delete_story') {
    return 'danger'
  }

  if (action === 'handle_report') {
    return 'warning'
  }

  if (action === 'trust_user' || action === 'unban_user') {
    return 'success'
  }

  return 'secondary'
}

export default function AdminLogs() {
  var { user } = useAuth()
  var { t } = useLanguage()
  var isSuperAdmin = user?.role === 'super_admin'
  var [page, setPage] = useState(1)
  var [actionFilter, setActionFilter] = useState('')
  var [searchText, setSearchText] = useState('')
  var optionStyle = {
    backgroundColor: '#ffffff',
    color: '#111827',
  }

  var actionLabels = {
    ban_user: t.admin.logs.banUser,
    unban_user: t.admin.logs.unbanUser,
    trust_user: t.admin.logs.trustUser,
    untrust_user: t.admin.logs.untrustUser,
    update_role: t.admin.logs.updateRole,
    handle_report: t.admin.logs.handleReport,
    delete_post: t.admin.logs.deletePost,
    delete_comment: t.admin.logs.deleteComment,
    delete_story: t.admin.logs.deleteStory,
  }

  var actionOptions = [
    { value: '', label: t.admin.logs.allActions },
    { value: 'ban_user', label: t.admin.logs.banUser },
    { value: 'unban_user', label: t.admin.logs.unbanUser },
    { value: 'trust_user', label: t.admin.logs.trustUser },
    { value: 'untrust_user', label: t.admin.logs.untrustUser },
    { value: 'update_role', label: t.admin.logs.updateRole },
    { value: 'handle_report', label: t.admin.logs.handleReport },
    { value: 'delete_post', label: t.admin.logs.deletePost },
    { value: 'delete_comment', label: t.admin.logs.deleteComment },
    { value: 'delete_story', label: t.admin.logs.deleteStory },
  ]

  var { data, isLoading } = useQuery({
    queryKey: ['adminLogs', page, actionFilter],
    queryFn: function () {
      return api.get('/admin/logs', {
        params: {
          page: page,
          limit: 20,
          action: actionFilter || undefined,
        },
      }).then(function (r) { return r.data })
    },
    enabled: isSuperAdmin,
  })

  var logs = data?.logs || []
  var searchValue = searchText.trim().toLowerCase()
  var filteredLogs = logs.filter(function (log) {
    if (!searchValue) return true

    var adminName = log.adminId?.username || ''
    var adminEmail = log.adminId?.email || ''
    var action = actionLabels[log.action] || log.action || ''
    var targetType = log.targetType || ''
    var targetId = log.targetId || ''
    var note = log.note || ''

    var text = [
      adminName,
      adminEmail,
      action,
      targetType,
      targetId,
      note,
    ].join(' ').toLowerCase()

    return text.includes(searchValue)
  })
  var totalPages = data?.totalPages || 1

  if (!isSuperAdmin) {
    return <Navigate to="/admin/reports" replace />
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}><div><h2>{t.admin.dashboard.quickLinks}</h2><p>{t.admin.logs.searchPlaceholder}</p></div></div>
      <div className={styles.filters}>
        <Form.Control
          type="text"
          placeholder={t.admin.logs.searchPlaceholder}
          value={searchText}
          onChange={function (e) { setSearchText(e.target.value) }}
          className={styles.filterInput}
        />
        <Form.Select
          value={actionFilter}
          onChange={function (e) { setActionFilter(e.target.value); setPage(1) }}
          className={styles.filterSelect}
        >
          {actionOptions.map(function (item) {
            return <option key={item.value} value={item.value} style={optionStyle}>{item.label}</option>
          })}
        </Form.Select>
      </div>

      {isLoading ? (
        <Spinner fullPage />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <Table hover className={styles.table}>
              <thead>
                <tr>
                  <th>{t.admin.logs.colAdmin}</th>
                  <th>{t.admin.logs.colAction}</th>
                  <th>{t.admin.logs.colTarget}</th>
                  <th>{t.admin.logs.colTargetId}</th>
                  <th>{t.admin.logs.colNote}</th>
                  <th>{t.admin.logs.colTime}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>
                      {t.admin.logs.noLogs}
                    </td>
                  </tr>
                )}

                {filteredLogs.map(function (log) {
                  return (
                    <tr key={log._id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {log.adminId?.username || t.admin.logs.unknown}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          {log.adminId?.email || ''}
                        </div>
                      </td>
                      <td>
                        <Badge bg={getActionBadge(log.action)}>
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </td>
                      <td>{log.targetType || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {log.targetId || '-'}
                      </td>
                      <td style={{ maxWidth: 260, wordBreak: 'break-word' }}>
                        {log.note || '-'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {timeAgo(log.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination className={styles.pagination}>
              <Pagination.Prev disabled={page <= 1} onClick={function () { setPage(function (p) { return p - 1 }) }} />
              {Array.from({ length: Math.min(totalPages, 10) }, function (_, i) { return i + 1 }).map(function (p) {
                return (
                  <Pagination.Item key={p} active={p === page} onClick={function () { setPage(p) }}>
                    {p}
                  </Pagination.Item>
                )
              })}
              <Pagination.Next disabled={page >= totalPages} onClick={function () { setPage(function (p) { return p + 1 }) }} />
            </Pagination>
          )}
        </>
      )}
    </div>
  )
}
