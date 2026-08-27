// pages/auth/VerifyEmail.jsx
// Trang xác thực email — user click link trong email rồi đến đây
//
// Luồng:
//   1. Đọc ?token=... từ URL
//   2. Gọi GET /api/auth/verify-email?token=...
//   3. Backend trả token + user → tự đăng nhập → redirect home
//   4. Lỗi → hiện nút gửi lại email

import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { useLanguage } from '../../i18n/LanguageContext'
import Spinner from '../../components/common/Spinner'
import { Wordmark } from '../../components/common/Icon'
import styles from './Auth.module.css'

// 4 trạng thái: 'loading' | 'success' | 'already_active' | 'expired'
export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  var { t } = useLanguage()

  useEffect(function () {
    var redirectTimer = null
    var token = searchParams.get('token')

    if (!token) {
      setStatus('expired')
      setMessage(t.auth.verifyEmail.invalidLink)
      return undefined
    }

    api.get('/auth/verify-email', { params: { token: token } })
      .then(function (res) {
        setStatus('success')
        setMessage(res.data.message || t.auth.verifyEmail.successFallback)
        // Chuyển về trang đăng nhập sau 2 giây
        redirectTimer = setTimeout(function () {
          navigate('/login', { replace: true })
        }, 2000)
      })
      .catch(function (err) {
        var reason = err.response?.data?.reason
        var msg = err.response?.data?.message || t.auth.verifyEmail.expiredFallback
        setMessage(msg)
        setStatus(reason === 'already_active' ? 'already_active' : 'expired')
      })

    return function () {
      if (redirectTimer) {
        clearTimeout(redirectTimer)
      }
    }
  }, [
    searchParams,
    navigate,
    t.auth.verifyEmail.invalidLink,
    t.auth.verifyEmail.successFallback,
    t.auth.verifyEmail.expiredFallback,
  ])

  return (
    <div className={styles.wrapper}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        <div className={styles.box}>
          <div className={styles.logo}><Wordmark size={32} color="#fff" /></div>

          {status === 'loading' && (
            <div style={{ textAlign: 'center' }}>
              <Spinner />
              <p style={{ color: 'var(--ig-text-light)', marginTop: 8 }}>{t.auth.verifyEmail.verifying}</p>
            </div>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>{message}</p>
              <p style={{ color: 'var(--ig-text-light)', fontSize: 14, marginBottom: 16 }}>
                {t.auth.verifyEmail.redirecting}
              </p>
              <Link to="/login" style={{
                display: 'inline-block', padding: '10px 24px',
                background: 'var(--accent)', color: '#fff',
                borderRadius: 8, fontWeight: 600, textDecoration: 'none',
              }}>
                {t.auth.verifyEmail.loginNow}
              </Link>
            </div>
          )}

          {/* Tài khoản đã active — token đã dùng rồi */}
          {status === 'already_active' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.auth.verifyEmail.alreadyActive}</p>
              <p style={{ color: 'var(--ig-text-light)', fontSize: 14, marginBottom: 16 }}>
                {t.auth.verifyEmail.alreadyActiveDesc}
              </p>
              <Link to="/login" style={{
                display: 'inline-block', padding: '10px 24px',
                background: 'var(--accent)', color: '#fff',
                borderRadius: 8, fontWeight: 600, textDecoration: 'none',
              }}>
                {t.auth.verifyEmail.loginNow}
              </Link>
            </div>
          )}

          {/* Token hết hạn hoặc sai — cần gửi lại */}
          {status === 'expired' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
              <p style={{ color: 'var(--ig-text-light)', marginBottom: 16 }}>{message}</p>
              <Link to="/resend-verification" style={{
                display: 'inline-block', padding: '10px 24px',
                background: 'var(--accent)', color: '#fff',
                borderRadius: 8, fontWeight: 600, textDecoration: 'none',
              }}>
                {t.auth.verifyEmail.resend}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
