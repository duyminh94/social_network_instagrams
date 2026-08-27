// pages/admin/AdminDashboard.jsx
// Trang tổng quan admin — 4 thẻ thống kê + khối liên kết nhanh

import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import api from '../../services/api'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import * as s from './adminStyles'

export default function AdminDashboard() {
  var { user } = useAuth()
  var { t } = useLanguage()
  var { data, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: function () { return api.get('/admin/stats').then(function (r) { return r.data }) },
  })

  if (isLoading) return <Spinner fullPage />

  var stats = data?.stats || data || {}
  // Backend từng đổi hình dạng response nên đọc cả 2 kiểu key cho chắc
  var cards = [
    { label: t.admin.dashboard.totalUsers, value: stats.users?.total ?? stats.totalUsers ?? 0, icon: 'user', color: '#1d4ed8' },
    { label: t.admin.dashboard.totalPosts, value: stats.content?.posts ?? stats.totalPosts ?? 0, icon: 'image', color: '#be185d' },
    { label: t.admin.dashboard.totalReports, value: stats.reports?.total ?? stats.totalReports ?? 0, icon: 'flag', color: '#dc2626' },
    { label: t.admin.dashboard.pendingReports, value: stats.reports?.pending ?? stats.pendingReports ?? 0, icon: 'shield', color: '#b45309' },
  ]

  return (
    <Box sx={s.page}>
      <Box sx={s.pageHeader}>
        <Box>
          <Typography component="h2" sx={s.pageTitle}>{t.admin.dashboard.title}</Typography>
          <Typography sx={s.pageSubtitle}>{t.admin.dashboard.subtitle}</Typography>
        </Box>
      </Box>

      <Box component="section" sx={s.cardsGrid}>
        {cards.map(function (card) {
          return (
            <Box component="article" key={card.label} sx={s.statCard}>
              <Typography component="span" sx={s.statLabel}>{card.label}</Typography>
              <Box sx={{ ...s.statIcon, color: card.color }}>
                <Icon name={card.icon} size={22} />
              </Box>
              <Typography component="strong" sx={{ ...s.statValue, color: card.color }}>
                {card.value.toLocaleString()}
              </Typography>
            </Box>
          )
        })}
      </Box>

      <Box component="section" sx={s.quickPanel}>
        <Typography component="h3" sx={{ m: 0, mb: 1.5, fontSize: 16, fontWeight: 800, color: s.adminColors.ink }}>
          {t.admin.dashboard.quickLinks}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {user?.role === 'super_admin' && (
            <Link component={RouterLink} to="/admin/users" sx={{ fontWeight: 700 }}>
              {t.admin.dashboard.manageUsers}
            </Link>
          )}
          <Link component={RouterLink} to="/admin/reports" sx={{ fontWeight: 700 }}>
            {t.admin.dashboard.manageReports}
          </Link>
        </Box>
      </Box>
    </Box>
  )
}
