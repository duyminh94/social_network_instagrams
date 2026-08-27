// pages/notfound/NotFound.jsx
// Trang 404 — hiện khi URL không khớp bất kỳ route nào đã khai báo
//
// Vì sao cần: AppRoutes trước đây không có route `path="*"`, nên URL sai
//   từ 2 đoạn trở lên (vd /abc/xyz) render ra trang rỗng, không báo gì cả
//
// Trang này nằm trong MainLayout nên vẫn giữ Sidebar / MobileNav,
// người dùng có thể điều hướng tiếp thay vì bị kẹt

import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './NotFound.module.css'

export default function NotFound() {
  var { t } = useLanguage()

  return (
    <div className={styles.wrapper}>
      <div className={styles.code}>404</div>

      <h1 className={styles.title}>{t.notFound.title}</h1>

      <p className={styles.message}>{t.notFound.message}</p>

      <div className={styles.actions}>
        <Link to="/" className={styles.primaryBtn}>
          {t.notFound.backHome}
        </Link>
        <Link to="/explore" className={styles.secondaryBtn}>
          {t.notFound.explore}
        </Link>
      </div>
    </div>
  )
}
