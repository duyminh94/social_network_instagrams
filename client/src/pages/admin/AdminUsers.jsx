// pages/admin/AdminUsers.jsx
// Trang quản lý người dùng cho admin
//
// Các action:
//   - Ban / Unban  — PATCH /api/admin/users/:id/ban | unban
//   - Trust / Untrust — PATCH /api/admin/users/:id/trust | untrust (cấp/thu hồi tick xanh)
//
// isTrusted = tick xanh xác thực (admin cấp, không phải user tự đăng ký)
// Không dùng isVerified — User model không có field này

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
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
import IconButton from '@mui/material/IconButton'
import api from '../../services/api'
import Spinner from '../../components/common/Spinner'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { goAdmin } from '../../utils/adminNavigation'
import * as s from './adminStyles'

// Màu Chip theo vai trò — quyền càng cao càng nổi bật
function roleColor(role) {
  if (role === 'super_admin') return 'error'
  if (role === 'moderator') return 'warning'
  return 'default'
}

export default function AdminUsers() {
  var { user } = useAuth()
  var { t } = useLanguage()
  var isSuperAdmin = user?.role === 'super_admin'
  var [page, setPage] = useState(1)
  var [search, setSearch] = useState('')
  var [bannedFilter, setBannedFilter] = useState('')
  var navigate = useNavigate()

  var { data, isLoading } = useQuery({
    queryKey: ['adminUsers', page, search, bannedFilter],
    queryFn: function () {
      // FIX: backend dùng query param 'q' không phải 'search'
      return api.get('/admin/users', {
        params: { page, limit: 20, q: search || undefined, isBanned: bannedFilter || undefined },
      }).then(function (r) { return r.data })
    },
    enabled: isSuperAdmin,
  })

  var users = data?.users || data?.data || []
  var totalPages = data?.totalPages || data?.pages || 1

  if (!isSuperAdmin) {
    return <Navigate to="/admin/reports" replace />
  }

  return (
    <Box sx={s.page}>
      <Box sx={s.pageHeader}>
        <Box>
          <Typography component="h2" sx={s.pageTitle}>{t.admin.dashboard.manageUsers}</Typography>
          <Typography sx={s.pageSubtitle}>{t.admin.content.listDescription}</Typography>
        </Box>
      </Box>

      <Box sx={s.filterRow}>
        <TextField
          size="small"
          placeholder={t.admin.users.searchPlaceholder}
          value={search}
          onChange={function (e) { setSearch(e.target.value); setPage(1) }}
          sx={{ flex: 1, minWidth: 220 }}
        />
        <TextField
          select
          size="small"
          value={bannedFilter}
          onChange={function (e) { setBannedFilter(e.target.value); setPage(1) }}
          // displayEmpty: MUI mặc định coi giá trị '' là chưa chọn gì và bỏ trống ô,
          //   khiến người dùng không biết đang lọc theo tiêu chí nào
          slotProps={{ select: { displayEmpty: true } }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">{t.admin.users.all}</MenuItem>
          <MenuItem value="true">{t.admin.users.banned}</MenuItem>
          <MenuItem value="false">{t.admin.users.active}</MenuItem>
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
                  <TableCell>{t.admin.users.colUser}</TableCell>
                  <TableCell>{t.admin.users.colRole}</TableCell>
                  <TableCell>{t.admin.users.colStatus}</TableCell>
                  <TableCell>{t.admin.users.colTrusted}</TableCell>
                  <TableCell>{t.admin.users.colActions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', color: s.adminColors.muted }}>
                      {t.admin.users.noUsers}
                    </TableCell>
                  </TableRow>
                )}

                {users.map(function (u) {
                  return (
                    <TableRow key={u._id}>
                      <TableCell>
                        <Box
                          component="button"
                          type="button"
                          sx={s.userButton}
                          onClick={function () { goAdmin(navigate, '/admin/users/' + u._id) }}
                        >
                          <Avatar src={u.avatarUrl} username={u.username} size="sm" />
                          <Box component="span">
                            <strong>{u.fullName || u.username}</strong>
                            <small>@{u.username}</small>
                            <small>{u.email}</small>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip size="small" color={roleColor(u.role)} label={u.role || 'user'} />
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          color={u.isBanned ? 'error' : 'success'}
                          label={u.isBanned ? t.admin.users.statusBanned : t.admin.users.statusActive}
                        />
                      </TableCell>

                      <TableCell>
                        {/* isTrusted = tick xanh xác thực do admin cấp */}
                        <Chip
                          size="small"
                          color={u.isTrusted ? 'primary' : 'default'}
                          label={u.isTrusted ? t.admin.users.trusted : t.admin.users.unverified}
                        />
                      </TableCell>

                      <TableCell>
                        <IconButton
                          size="small"
                          title={t.admin.users.viewDetail}
                          aria-label={t.admin.users.viewDetail}
                          onClick={function () { goAdmin(navigate, '/admin/users/' + u._id) }}
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
