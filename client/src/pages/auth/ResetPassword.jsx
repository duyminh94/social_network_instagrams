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
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { useAuth } from '../../hooks/useAuth'
import { resetPassword as resetPasswordAPI } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import * as s from './authStyles'

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
    <Box sx={s.wrapper}>
      <Box sx={{ width: '100%', maxWidth: 400, px: 2 }}>
        <Box sx={s.box}>
          <Box sx={s.logoRow}><Wordmark size={32} color="#fff" /></Box>

          <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: 2.5, fontSize: 14 }}>
            {t.auth.resetPassword.description}
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {/* Mật khẩu mới */}
            <TextField
              type="password"
              placeholder={t.auth.resetPassword.newPasswordPlaceholder}
              fullWidth
              margin="dense"
              {...register('password', {
                required: t.auth.resetPassword.passwordRequired,
                minLength: { value: 6, message: t.auth.resetPassword.minChars },
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />

            {/* Xác nhận mật khẩu — validate so khớp với ô phía trên */}
            <TextField
              type="password"
              placeholder={t.auth.resetPassword.confirmPlaceholder}
              fullWidth
              margin="dense"
              {...register('confirm', {
                required: t.auth.resetPassword.confirmRequired,
                validate: function (value) {
                  return value === password || t.auth.resetPassword.confirmMismatch
                },
              })}
              error={!!errors.confirm}
              helperText={errors.confirm?.message}
              sx={{ mb: 2 }}
            />

            <Button type="submit" fullWidth loading={isSubmitting}>
              {t.auth.resetPassword.button}
            </Button>
          </Box>
        </Box>

        <Box sx={{ ...s.box, mt: 1.5, py: 2 }}>
          <Box sx={s.switchText}>
            <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
              {t.auth.resetPassword.backToLogin}
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
