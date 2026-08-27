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
import { Form, Table, Badge, Pagination } from 'react-bootstrap'
import api from '../../services/api'
import Spinner from '../../components/common/Spinner'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { goAdmin } from '../../utils/adminNavigation'
import styles from './AdminShared.module.css'

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
    <div className={styles.page}>
      {/* Filters */}
      <div className={styles.pageHeader}><div><h2>{t.admin.dashboard.manageUsers}</h2><p>{t.admin.content.listDescription}</p></div></div>
      <div className={styles.filters}>
        <Form.Control
          type="text"
          placeholder={t.admin.users.searchPlaceholder}
          value={search}
          onChange={function (e) { setSearch(e.target.value); setPage(1) }}
          className={styles.filterInput}
        />
        <Form.Select
          value={bannedFilter}
          onChange={function (e) { setBannedFilter(e.target.value); setPage(1) }}
          className={styles.filterSelect}
        >
          <option value="">{t.admin.users.all}</option>
          <option value="true">{t.admin.users.banned}</option>
          <option value="false">{t.admin.users.active}</option>
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
                  <th>{t.admin.users.colUser}</th>
                  <th>{t.admin.users.colRole}</th>
                  <th>{t.admin.users.colStatus}</th>
                  <th>{t.admin.users.colTrusted}</th>
                  <th>{t.admin.users.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={5} className={styles.emptyCell}>{t.admin.users.noUsers}</td></tr>
                )}
                {users.map(function (u) {
                  return (
                    <tr key={u._id}>
                      <td>
                        <button type="button" className={styles.userButton} onClick={function () { goAdmin(navigate, '/admin/users/' + u._id) }}>
                          <Avatar src={u.avatarUrl} username={u.username} size="sm" />
                          <span>
                            <strong>{u.fullName || u.username}</strong>
                            <small>@{u.username}</small>
                            <small>{u.email}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <Badge bg={u.role === 'super_admin' ? 'danger' : u.role === 'moderator' ? 'warning' : 'secondary'}>
                          {u.role || 'user'}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={u.isBanned ? 'danger' : 'success'}>
                          {u.isBanned ? t.admin.users.statusBanned : t.admin.users.statusActive}
                        </Badge>
                      </td>
                      <td>
                        {/* isTrusted = tick xanh xác thực do admin cấp */}
                        <Badge bg={u.isTrusted ? 'primary' : 'secondary'}>
                          {u.isTrusted ? t.admin.users.trusted : t.admin.users.unverified}
                        </Badge>
                      </td>
                      <td>
                        <button
                          type="button"
                          title={t.admin.users.viewDetail}
                          aria-label={t.admin.users.viewDetail}
                          onClick={function () { goAdmin(navigate, '/admin/users/' + u._id) }}
                          className={styles.iconButton}
                        >
                          <Icon name="eye" size={18} />
                        </button>
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
                  <Pagination.Item key={p} active={p === page} onClick={function () { setPage(p) }}>{p}</Pagination.Item>
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
