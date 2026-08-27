import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import api from '../../services/api'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import styles from './AdminShared.module.css'

export default function AdminDashboard() {
  var { user } = useAuth()
  var { t } = useLanguage()
  var { data, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: function () { return api.get('/admin/stats').then(function (r) { return r.data }) },
  })

  if (isLoading) return <Spinner fullPage />

  var stats = data?.stats || data || {}
  var cards = [
    { label: t.admin.dashboard.totalUsers, value: stats.users?.total ?? stats.totalUsers ?? 0, icon: 'user', color: '#1d4ed8' },
    { label: t.admin.dashboard.totalPosts, value: stats.content?.posts ?? stats.totalPosts ?? 0, icon: 'image', color: '#be185d' },
    { label: t.admin.dashboard.totalReports, value: stats.reports?.total ?? stats.totalReports ?? 0, icon: 'flag', color: '#dc2626' },
    { label: t.admin.dashboard.pendingReports, value: stats.reports?.pending ?? stats.pendingReports ?? 0, icon: 'shield', color: '#b45309' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2>{t.admin.dashboard.title}</h2>
          <p>{t.admin.dashboard.subtitle}</p>
        </div>
      </div>

      <section className={styles.cardsGrid}>
        {cards.map(function (card) {
          return (
            <article key={card.label} className={styles.statCard}>
              <span>{card.label}</span>
              <div className={styles.statIcon} style={{ color: card.color }}><Icon name={card.icon} size={22} /></div>
              <strong style={{ color: card.color }}>{card.value.toLocaleString()}</strong>
            </article>
          )
        })}
      </section>

      <section className={styles.quickPanel}>
        <h3>{t.admin.dashboard.quickLinks}</h3>
        <div className={styles.quickLinks}>
          {user?.role === 'super_admin' && <Link to="/admin/users">{t.admin.dashboard.manageUsers}</Link>}
          <Link to="/admin/reports">{t.admin.dashboard.manageReports}</Link>
        </div>
      </section>
    </div>
  )
}
