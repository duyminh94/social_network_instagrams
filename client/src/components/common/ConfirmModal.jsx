// components/common/ConfirmModal.jsx
// Modal xác nhận hành động với 2 nút Yes / No
//
// Click vào overlay bên ngoài box → tự động cancel
// stopPropagation trên box để click bên trong không bubble ra overlay

import { useLanguage } from '../../i18n/LanguageContext'
import styles from './ConfirmModal.module.css'

export default function ConfirmModal({ message, onConfirm, onCancel }) {
  var { t } = useLanguage()
  return (
    // Click overlay → cancel
    <div className={styles.overlay} onClick={onCancel}>
      {/* stopPropagation: tránh click bên trong box bị bubble ra overlay */}
      <div className={styles.box} onClick={function (e) { e.stopPropagation() }}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.btnNo} onClick={onCancel}>{t.common.cancel}</button>
          <button className={styles.btnYes} onClick={onConfirm}>{t.common.confirm}</button>
        </div>
      </div>
    </div>
  )
}
