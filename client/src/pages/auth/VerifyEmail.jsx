// pages/auth/VerifyEmail.jsx
// Trang xác thực email — user click link trong email rồi đến đây
//
// Luồng:
//   1. Đọc ?token=... từ URL
//   2. Gọi GET /api/auth/verify-email?token=...
//   3. Backend trả token + user → tự đăng nhập → redirect home
//   4. Lỗi → hiện nút gửi lại email

import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import api from '../../services/api'
import { useLanguage } from '../../i18n/LanguageContext'
import Spinner from '../../components/common/Spinner'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import * as s from './authStyles'

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
    <Box sx={s.wrapper}>
      <Box sx={{ width: '100%', maxWidth: 400, px: 2 }}>
        <Box sx={s.box}>
          <Box sx={s.logoRow}><Wordmark size={32} color="#fff" /></Box>

          {status === 'loading' && (
            <Box sx={{ textAlign: 'center' }}>
              <Spinner />
              <Typography sx={{ color: 'text.secondary', mt: 1 }}>
                {t.auth.verifyEmail.verifying}
              </Typography>
            </Box>
          )}

          {status === 'success' && (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ fontSize: 40, mb: 1.5 }}>✅</Box>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>{message}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14, mb: 2 }}>
                {t.auth.verifyEmail.redirecting}
              </Typography>
              <Button component={RouterLink} to="/login">
                {t.auth.verifyEmail.loginNow}
              </Button>
            </Box>
          )}

          {/* Tài khoản đã active — token đã dùng rồi */}
          {status === 'already_active' && (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ fontSize: 40, mb: 1.5 }}>✅</Box>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>
                {t.auth.verifyEmail.alreadyActive}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14, mb: 2 }}>
                {t.auth.verifyEmail.alreadyActiveDesc}
              </Typography>
              <Button component={RouterLink} to="/login">
                {t.auth.verifyEmail.loginNow}
              </Button>
            </Box>
          )}

          {/* Token hết hạn hoặc sai — cần gửi lại */}
          {status === 'expired' && (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ fontSize: 40, mb: 1.5 }}>❌</Box>
              <Typography sx={{ color: 'text.secondary', mb: 2 }}>{message}</Typography>
              <Button component={RouterLink} to="/resend-verification">
                {t.auth.verifyEmail.resend}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
