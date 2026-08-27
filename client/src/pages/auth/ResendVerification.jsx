// pages/auth/ResendVerification.jsx
// Trang gửi lại email kích hoạt tài khoản
//
// Dùng khi: token verify-email hết hạn (30 phút) hoặc email bị lọc spam
//
// Rate limit: backend giới hạn 2 lần/giờ/IP
//   → Nếu vượt limit → hiện thông báo thử lại sau 1 giờ

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink } from 'react-router-dom'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { resendVerification as resendAPI } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import * as s from './authStyles'

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
    <Box sx={s.wrapper}>
      <Box sx={{ width: '100%', maxWidth: 400, px: 2 }}>
        <Box sx={s.box}>
          <Box sx={s.logoRow}><Wordmark size={32} color="#fff" /></Box>

          {sent ? (
            // Đã gửi lại — hướng dẫn kiểm tra hộp thư
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ fontSize: 40, mb: 1.5 }}>📧</Box>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>
                {t.auth.resendVerification.sent}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14, mb: 2.5 }}>
                {t.auth.resendVerification.sentDesc}
              </Typography>
              <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
                {t.auth.resendVerification.backToLogin}
              </Link>
            </Box>
          ) : (
            // Form nhập email
            <>
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: 2.5, fontSize: 14 }}>
                {t.auth.resendVerification.description}
              </Typography>

              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <TextField
                  type="email"
                  placeholder={t.auth.resendVerification.emailPlaceholder}
                  fullWidth
                  margin="dense"
                  {...register('email', {
                    required: t.auth.resendVerification.emailRequired,
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t.auth.resendVerification.emailInvalid },
                  })}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{ mb: 2 }}
                />
                <Button type="submit" fullWidth loading={isSubmitting}>
                  {t.auth.resendVerification.button}
                </Button>
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ ...s.box, mt: 1.5, py: 2 }}>
          <Box sx={s.switchText}>
            <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
              {t.auth.resendVerification.backToLogin}
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
