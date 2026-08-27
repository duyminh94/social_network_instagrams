// pages/admin/AdminLogs.jsx
// Trang lịch sử hành động admin.
//
// Backend đã ghi log khi admin ban user, gỡ ban, cấp tick, xử lý report,
// xóa post/comment/story... Trang này chỉ đọc GET /api/admin/logs và hiển thị.

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'
import api from '../../services/api'
import Spinner from '../../components/common/Spinner'
import { timeAgo } from '../../utils/formatTime'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import * as s from './adminStyles'

// Màu Chip theo mức độ ảnh hưởng của hành động
function getActionColor(action) {
  if (action === 'ban_user' || action === 'delete_post' || action === 'delete_comment' || action === 'delete_story') {
    return 'error'
  }

  if (action === 'handle_report') {
    return 'warning'
  }

  if (action === 'trust_user' || action === 'unban_user') {
    return 'success'
  }

  return 'default'
}

export default function AdminLogs() {
  var { user } = useAuth()
  var { t } = useLanguage()
  var isSuperAdmin = user?.role === 'super_admin'
  var [page, setPage] = useState(1)
  var [actionFilter, setActionFilter] = useState('')
  var [searchText, setSearchText] = useState('')
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
    <Box sx={s.page}>
      <Box sx={s.pageHeader}>
        <Box>
          <Typography component="h2" sx={s.pageTitle}>{t.admin.dashboard.quickLinks}</Typography>
          <Typography sx={s.pageSubtitle}>{t.admin.logs.searchPlaceholder}</Typography>
        </Box>
      </Box>

      <Box sx={s.filterRow}>
        {/* Ô này lọc ngay trên dữ liệu đã tải về, không gọi lại API */}
        <TextField
          size="small"
          placeholder={t.admin.logs.searchPlaceholder}
          value={searchText}
          onChange={function (e) { setSearchText(e.target.value) }}
          sx={{ flex: 1, minWidth: 220 }}
        />
        <TextField
          select
          size="small"
          value={actionFilter}
          onChange={function (e) { setActionFilter(e.target.value); setPage(1) }}
          // displayEmpty: không có prop này thì mục "Tất cả hành động" (value '')
          //   hiện ra ô trống thay vì tên của nó
          slotProps={{ select: { displayEmpty: true } }}
          sx={{ minWidth: 200 }}
        >
          {actionOptions.map(function (item) {
            return <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
          })}
        </TextField>
      </Box>

      {isLoading ? (
        <Spinner fullPage />
      ) : (
        <>
          <Box sx={s.tableWrap}>
            <Table sx={s.table}>
              <TableHead>
                <TableRow>
                  <TableCell>{t.admin.logs.colAdmin}</TableCell>
                  <TableCell>{t.admin.logs.colAction}</TableCell>
                  <TableCell>{t.admin.logs.colTarget}</TableCell>
                  <TableCell>{t.admin.logs.colTargetId}</TableCell>
                  <TableCell>{t.admin.logs.colNote}</TableCell>
                  <TableCell>{t.admin.logs.colTime}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', color: s.adminColors.muted }}>
                      {t.admin.logs.noLogs}
                    </TableCell>
                  </TableRow>
                )}

                {filteredLogs.map(function (log) {
                  return (
                    <TableRow key={log._id}>
                      <TableCell>
                        <Box sx={{ fontWeight: 700 }}>
                          {log.adminId?.username || t.admin.logs.unknown}
                        </Box>
                        <Box sx={{ fontSize: 13, color: s.adminColors.muted }}>
                          {log.adminId?.email || ''}
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          color={getActionColor(log.action)}
                          label={actionLabels[log.action] || log.action}
                        />
                      </TableCell>

                      <TableCell>{log.targetType || '-'}</TableCell>

                      {/* Id dùng font đẳng chiều cho dễ đối chiếu khi tra cứu */}
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {log.targetId || '-'}
                      </TableCell>

                      <TableCell sx={{ maxWidth: 260, wordBreak: 'break-word' }}>
                        {log.note || '-'}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {timeAgo(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>

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
        </>
      )}
    </Box>
  )
}
