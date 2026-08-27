// components/common/ReportModal.jsx
// Modal báo cáo vi phạm dùng cho user.
//
// targetType: 'user' | 'post' | 'reel' | 'story' | 'comment'
// targetId: id của đối tượng bị báo cáo

import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './ReportModal.module.css'

export default function ReportModal({ targetId, targetType, onClose, onReported }) {
  var { t } = useLanguage()
  var [reason, setReason] = useState('spam')
  var [description, setDescription] = useState('')
  var [loading, setLoading] = useState(false)

  var reasons = [
    { value: 'spam', label: t.report.spam },
    { value: 'harassment', label: t.report.harassment },
    { value: 'inappropriate', label: t.report.inappropriate },
    { value: 'fake', label: t.report.fake },
    { value: 'violence', label: t.report.violence },
    { value: 'other', label: t.report.other },
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!targetId || !targetType || loading) return

    setLoading(true)
    try {
      await api.post('/reports', {
        targetId: targetId,
        targetType: targetType,
        reason: reason,
        description: description.trim(),
      })
      toast.success(t.report.success)
      if (onReported) onReported()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || t.report.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={function (e) { e.stopPropagation(); if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{t.report.title}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <p className={styles.helpText}>{t.report.helpText}</p>

            <div className={styles.reasonList}>
              {reasons.map(function (item) {
                return (
                  <label key={item.value} className={styles.reasonItem}>
                    <input
                      type="radio"
                      name="reason"
                      value={item.value}
                      checked={reason === item.value}
                      onChange={function () { setReason(item.value) }}
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>

            <textarea
              className={styles.textarea}
              value={description}
              onChange={function (e) { setDescription(e.target.value) }}
              placeholder={t.report.descriptionPlaceholder}
              rows={3}
              maxLength={300}
            />
            <div className={styles.count}>{description.length} / 300</div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              {t.report.cancel}
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? t.report.submitting : t.report.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
