// pages/auth/ForgotPassword.jsx
// Trang yêu cầu gửi link đặt lại mật khẩu
//
// Bảo mật: backend LUÔN trả cùng 1 message dù email tồn tại hay không
// → tránh kẻ xấu dò xem email nào đã đăng ký (user enumeration attack)
//
// Sau khi submit thành công → hiện thông báo kiểm tra email (không redirect)
// Giao diện dùng split-panel giống Login/Register cho đồng bộ.

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Form } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { forgotPassword as forgotPasswordAPI } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import styles from './Auth.module.css'

export default function ForgotPassword() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  var { t } = useLanguage()

  // Đã đăng nhập rồi → không cần reset password
  useEffect(function () {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  // sent=true → ẩn form, hiện thông báo kiểm tra email
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit(data) {
    try {
      await forgotPasswordAPI({ email: data.email })
      // Luôn hiện thông báo thành công (kể cả khi email không tồn tại)
      setSent(true)
    } catch {
      // Lỗi network hoặc server 500 — backend 404 được xử lý ở server thành 200
      toast.error(t.auth.forgotPassword.error)
    }
  }

  return (
    <div className={styles.splitPanel}>
      {/* Left — gradient branding panel (không dùng ảnh) */}
      <div className={`${styles.imageSide} ${styles.gradientSide}`}>
        <div className={styles.imageBranding}>
          <div style={{ marginBottom: 20 }}><Wordmark size={40} color="#fff" /></div>
          <h1>Forgot your<br />password?</h1>
          <p>No worries — we&apos;ll send you a secure link to reset it and get you back in.</p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className={styles.formSide}>
        <div className={styles.formSideInner}>
          {/* Logo chỉ hiện trên mobile (panel ảnh bị ẩn) */}
          <div className="d-flex d-md-none justify-content-center mb-4">
            <Wordmark size={32} color="#fff" />
          </div>

          {sent ? (
            // Trạng thái đã gửi — không lộ email có tồn tại hay không
            <div style={{ textAlign: 'center' }}>
              <div className={styles.sentIcon} aria-hidden="true">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>
                {t.auth.forgotPassword.checkEmail}
              </h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
                {t.auth.forgotPassword.sentMessage}
              </p>
              <Link to="/login" className="w-100" style={{ display: 'block' }}>
                <Button type="button" className="btn-primary w-100">
                  {t.auth.forgotPassword.backToLogin}
                </Button>
              </Link>
            </div>
          ) : (
            // Form nhập email
            <>
              <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 6 }}>
                {t.auth.forgotPassword.title}
              </h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
                {t.auth.forgotPassword.description}
              </p>

              <Form onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 500, fontSize: 14 }}>
                    {t.auth.forgotPassword.emailLabel}
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder={t.auth.forgotPassword.emailPlaceholder}
                    {...register('email', {
                      required: t.auth.forgotPassword.emailRequired,
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t.auth.forgotPassword.emailInvalid },
                    })}
                    isInvalid={!!errors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Button type="submit" className="btn-primary w-100" loading={isSubmitting}>
                  {t.auth.forgotPassword.button}
                </Button>
              </Form>

              <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--ink-muted)' }}>
                <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  {t.auth.forgotPassword.backToLogin}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
