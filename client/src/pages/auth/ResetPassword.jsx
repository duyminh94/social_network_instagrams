// pages/auth/ResetPassword.jsx
// Trang đặt lại mật khẩu — user click link trong email rồi đến đây
//
// Luồng:
//   1. Đọc ?token=... từ URL
//   2. Hiển thị form nhập mật khẩu mới + xác nhận
//   3. Submit → POST /api/auth/reset-password { token, newPassword }
//   4. Thành công → redirect /login

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Form } from 'react-bootstrap'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { resetPassword as resetPasswordAPI } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import styles from './Auth.module.css'

export default function ResetPassword() {
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  var { t } = useLanguage()

  // Đã đăng nhập rồi → không cần reset password
  useEffect(function () {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()

  // watch('password') để so sánh với field confirm
  var password = watch('password')

  async function onSubmit(data) {
    var token = searchParams.get('token')

    // Không có token trong URL → lỗi ngay
    if (!token) {
      toast.error(t.auth.resetPassword.invalidLink)
      return
    }

    try {
      await resetPasswordAPI({ token: token, newPassword: data.password })
      toast.success(t.auth.resetPassword.success)
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || t.auth.resetPassword.invalidToken)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        <div className={styles.box}>
          <div className={styles.logo}><Wordmark size={32} color="#fff" /></div>
          <p style={{ textAlign: 'center', color: 'var(--ig-text-light)', marginBottom: 20, fontSize: 14 }}>
            {t.auth.resetPassword.description}
          </p>

          <Form onSubmit={handleSubmit(onSubmit)}>
            {/* Mật khẩu mới */}
            <Form.Group className="mb-3">
              <Form.Control
                type="password"
                placeholder={t.auth.resetPassword.newPasswordPlaceholder}
                {...register('password', {
                  required: t.auth.resetPassword.passwordRequired,
                  minLength: { value: 6, message: t.auth.resetPassword.minChars },
                })}
                isInvalid={!!errors.password}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password?.message}
              </Form.Control.Feedback>
            </Form.Group>

            {/* Xác nhận mật khẩu */}
            <Form.Group className="mb-3">
              <Form.Control
                type="password"
                placeholder={t.auth.resetPassword.confirmPlaceholder}
                {...register('confirm', {
                  required: t.auth.resetPassword.confirmRequired,
                  validate: function (value) {
                    return value === password || t.auth.resetPassword.confirmMismatch
                  },
                })}
                isInvalid={!!errors.confirm}
              />
              <Form.Control.Feedback type="invalid">
                {errors.confirm?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Button type="submit" className="btn-primary w-100" loading={isSubmitting}>
              {t.auth.resetPassword.button}
            </Button>
          </Form>
        </div>

        <div className={styles.box} style={{ marginTop: 12 }}>
          <div className={styles.switchText}>
            <Link to="/login">{t.auth.resetPassword.backToLogin}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
