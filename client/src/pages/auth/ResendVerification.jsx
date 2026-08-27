// pages/auth/ResendVerification.jsx
// Trang gửi lại email kích hoạt tài khoản
//
// Dùng khi: token verify-email hết hạn (30 phút) hoặc email bị lọc spam
//
// Rate limit: backend giới hạn 2 lần/giờ/IP
//   → Nếu vượt limit → hiện thông báo thử lại sau 1 giờ

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Form } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { resendVerification as resendAPI } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import styles from './Auth.module.css'

export default function ResendVerification() {
  // sent=true → ẩn form, hiện thông báo kiểm tra email
  const [sent, setSent] = useState(false)
  var { t } = useLanguage()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit(data) {
    try {
      await resendAPI({ email: data.email })
      setSent(true)
    } catch (err) {
      const message = err.response?.data?.message || t.auth.resendVerification.error
      // Rate limit (429) hoặc lỗi khác → hiện toast
      toast.error(message)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        <div className={styles.box}>
          <div className={styles.logo}><Wordmark size={32} color="#fff" /></div>

          {sent ? (
            // Đã gửi lại — hướng dẫn kiểm tra hộp thư
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.auth.resendVerification.sent}</p>
              <p style={{ color: 'var(--ig-text-light)', fontSize: 14, marginBottom: 20 }}>
                {t.auth.resendVerification.sentDesc}
              </p>
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {t.auth.resendVerification.backToLogin}
              </Link>
            </div>
          ) : (
            // Form nhập email
            <>
              <p style={{ textAlign: 'center', color: 'var(--ig-text-light)', marginBottom: 20, fontSize: 14 }}>
                {t.auth.resendVerification.description}
              </p>
              <Form onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="email"
                    placeholder={t.auth.resendVerification.emailPlaceholder}
                    {...register('email', {
                      required: t.auth.resendVerification.emailRequired,
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t.auth.resendVerification.emailInvalid },
                    })}
                    isInvalid={!!errors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email?.message}
                  </Form.Control.Feedback>
                </Form.Group>
                <Button type="submit" className="btn-primary w-100" loading={isSubmitting}>
                  {t.auth.resendVerification.button}
                </Button>
              </Form>
            </>
          )}
        </div>

        <div className={styles.box} style={{ marginTop: 12 }}>
          <div className={styles.switchText}>
            <Link to="/login">{t.auth.resendVerification.backToLogin}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
