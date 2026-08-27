// pages/admin/AdminReports.jsx
// Danh sách báo cáo vi phạm — lọc theo trạng thái, phân trang
//
// Bảng dùng Table của MUI thay cho thẻ <table> viết tay: đã có sẵn
//   kẻ dòng, canh ô và cuộn ngang, chỉ cần chỉnh màu cho khớp giao diện admin

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'
import IconButton from '@mui/material/IconButton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../utils/formatTime'
import { goAdmin } from '../../utils/adminNavigation'
import * as s from './adminStyles'

// Ô hiển thị một người: avatar + họ tên + username, bấm vào mở trang chi tiết
function PersonButton({ person, fallback, onClick }) {
  return (
    <Box component="button" type="button" sx={s.personButton} disabled={!person?._id} onClick={onClick}>
      <Avatar src={person?.avatarUrl} username={person?.username} size="sm" />
      <Box component="span">
        <strong>{person?.fullName || person?.username || fallback}</strong>
        <small>@{person?.username || fallback}</small>
      </Box>
    </Box>
  )
}

export default function AdminReports() {
  var navigate = useNavigate()
  var { t } = useLanguage()
  var [page, setPage] = useState(1)
  var [statusFilter, setStatusFilter] = useState('pending')
  var filters = [
    { key: 'pending', label: t.admin.reports.pending },
    { key: 'processed', label: t.admin.reports.processed },
    { key: 'all', label: t.admin.reports.all },
  ]

  var reportsQuery = useQuery({
    queryKey: ['adminReports', page, statusFilter],
    queryFn: function () {
      return api.get('/admin/reports', { params: { page: page, limit: 20, status: statusFilter } }).then(function (response) { return response.data })
    },
  })
  var reports = reportsQuery.data?.reports || []
  var totalPages = reportsQuery.data?.totalPages || 1

  function openUser(userId) {
    if (userId) goAdmin(navigate, '/admin/users/' + userId)
  }

  // Đổi bộ lọc thì phải quay về trang 1, nếu không sẽ hiện trang trống
  function handleFilterChange(_, value) {
    if (!value) return
    setStatusFilter(value)
    setPage(1)
  }

  return (
    <Box sx={s.page}>
      <Box sx={s.pageHeader}>
        <Box>
          <Typography component="h2" sx={s.pageTitle}>{t.admin.reports.title}</Typography>
          <Typography sx={s.pageSubtitle}>{t.admin.reports.listDescription}</Typography>
        </Box>
      </Box>

      <ToggleButtonGroup
        exclusive
        value={statusFilter}
        onChange={handleFilterChange}
        sx={s.filterBar}
        aria-label={t.admin.reports.statusFilter}
      >
        {filters.map(function (filter) {
          return (
            <ToggleButton key={filter.key} value={filter.key} sx={{ px: 2.125, fontWeight: 800 }}>
              {filter.label}
            </ToggleButton>
          )
        })}
      </ToggleButtonGroup>

      {reportsQuery.isLoading ? (
        <Spinner fullPage />
      ) : reportsQuery.isError ? (
        <Box sx={s.empty}>{t.admin.reports.loadFailed}</Box>
      ) : reports.length === 0 ? (
        <Box sx={s.empty}>{t.admin.reports.noReports}</Box>
      ) : (
        <Box sx={s.tableWrap}>
          <Table sx={s.table}>
            <TableHead>
              <TableRow>
                <TableCell>{t.admin.reports.colReporter}</TableCell>
                <TableCell>{t.admin.reports.colReported}</TableCell>
                <TableCell>{t.admin.reports.colStatus}</TableCell>
                <TableCell>{t.admin.reports.colDate}</TableCell>
                <TableCell>{t.admin.reports.colActions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map(function (report) {
                return (
                  <TableRow key={report._id}>
                    <TableCell>
                      <PersonButton
                        person={report.reporterId}
                        fallback={t.admin.reports.unknown}
                        onClick={function () { openUser(report.reporterId?._id) }}
                      />
                    </TableCell>
                    <TableCell>
                      <PersonButton
                        person={report.reportedUser}
                        fallback={t.admin.reports.unknown}
                        onClick={function () { openUser(report.reportedUser?._id) }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={report.status === 'pending' ? 'warning' : 'success'}
                        label={report.status === 'pending' ? t.admin.reports.pending : t.admin.reports.processed}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(report.createdAt)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        title={t.admin.reports.viewDetail}
                        aria-label={t.admin.reports.viewDetail}
                        onClick={function () { goAdmin(navigate, '/admin/reports/' + report._id) }}
                      >
                        <Icon name="eye" size={18} />
                      </IconButton>
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
