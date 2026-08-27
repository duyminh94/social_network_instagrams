import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Pagination } from 'react-bootstrap'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../utils/formatTime'
import { goAdmin } from '../../utils/adminNavigation'
import styles from './AdminReports.module.css'

function PersonButton({ person, fallback, onClick }) {
  return (
    <button type="button" className={styles.personButton} disabled={!person?._id} onClick={onClick}>
      <Avatar src={person?.avatarUrl} username={person?.username} size="sm" />
      <span><strong>{person?.fullName || person?.username || fallback}</strong><small>@{person?.username || fallback}</small></span>
    </button>
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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}><div><h2>{t.admin.reports.title}</h2><p>{t.admin.reports.listDescription}</p></div></div>
      <div className={styles.filters} role="group" aria-label={t.admin.reports.statusFilter}>
        {filters.map(function (filter) { return <button key={filter.key} type="button" className={statusFilter === filter.key ? styles.filterActive : ''} onClick={function () { setStatusFilter(filter.key); setPage(1) }}>{filter.label}</button> })}
      </div>

      {reportsQuery.isLoading ? <Spinner fullPage /> : reportsQuery.isError ? <div className={styles.empty}>{t.admin.reports.loadFailed}</div> : reports.length === 0 ? <div className={styles.empty}>{t.admin.reports.noReports}</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>{t.admin.reports.colReporter}</th><th>{t.admin.reports.colReported}</th><th>{t.admin.reports.colStatus}</th><th>{t.admin.reports.colDate}</th><th>{t.admin.reports.colActions}</th></tr></thead>
            <tbody>{reports.map(function (report) { return <tr key={report._id}><td><PersonButton person={report.reporterId} fallback={t.admin.reports.unknown} onClick={function () { openUser(report.reporterId?._id) }} /></td><td><PersonButton person={report.reportedUser} fallback={t.admin.reports.unknown} onClick={function () { openUser(report.reportedUser?._id) }} /></td><td><Badge bg={report.status === 'pending' ? 'warning' : 'success'}>{report.status === 'pending' ? t.admin.reports.pending : t.admin.reports.processed}</Badge></td><td className={styles.date}>{formatDateTime(report.createdAt)}</td><td><button type="button" className={styles.detailButton} title={t.admin.reports.viewDetail} aria-label={t.admin.reports.viewDetail} onClick={function () { goAdmin(navigate, '/admin/reports/' + report._id) }}><Icon name="eye" size={18} /></button></td></tr> })}</tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && <Pagination className={styles.pagination}><Pagination.Prev disabled={page <= 1} onClick={function () { setPage(function (value) { return value - 1 }) }} /><Pagination.Item active>{page} / {totalPages}</Pagination.Item><Pagination.Next disabled={page >= totalPages} onClick={function () { setPage(function (value) { return value + 1 }) }} /></Pagination>}
    </div>
  )
}
