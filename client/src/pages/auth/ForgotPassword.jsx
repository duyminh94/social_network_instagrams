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
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import { useAuth } from '../../hooks/useAuth'
import { forgotPassword as forgotPasswordAPI } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import AuthBackground from '../../components/auth/AuthBackground'
import * as s from './authStyles'

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
    <Box sx={s.splitPanel}>
      {/* Cột trái — dùng chung nền động với trang đăng nhập cho đồng bộ */}
      <Box sx={s.imageSide}>
        <AuthBackground>
          <Box sx={{ mb: 2.5 }}><Wordmark size={40} color="#fff" /></Box>
          <Typography component="h1" sx={s.brandingTitle}>
            Forgot your<br />password?
          </Typography>
          <Typography sx={s.brandingDesc}>
            No worries — we&apos;ll send you a secure link to reset it and get you back in.
          </Typography>
        </AuthBackground>
      </Box>

      {/* Cột phải — form */}
      <Box sx={s.formSide}>
        <Box sx={s.formSideInner}>
          {/* Logo chỉ hiện trên mobile, lúc đó cột gradient đã bị ẩn */}
          <Box sx={{ display: 'none', justifyContent: 'center', mb: 3, [s.MOBILE]: { display: 'flex' } }}>
            <Wordmark size={32} color="#fff" />
          </Box>

          {sent ? (
            // Trạng thái đã gửi — không lộ email có tồn tại hay không
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={s.sentIcon} aria-hidden="true">
                <EmailOutlinedIcon sx={{ fontSize: 30 }} />
              </Box>
              <Typography component="h2" sx={{ fontWeight: 700, fontSize: 22, mb: 1 }}>
                {t.auth.forgotPassword.checkEmail}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14, mb: 3.5, lineHeight: 1.6 }}>
                {t.auth.forgotPassword.sentMessage}
              </Typography>
              {/* Nút điều hướng: dùng component={RouterLink} thay vì bọc Button
                  trong thẻ Link, tránh lồng thẻ <a> quanh <button> */}
              <Button component={RouterLink} to="/login" fullWidth>
                {t.auth.forgotPassword.backToLogin}
              </Button>
            </Box>
          ) : (
            // Form nhập email
            <>
              <Typography component="h2" sx={s.pageTitle}>
                {t.auth.forgotPassword.title}
              </Typography>
              <Typography sx={{ ...s.pageDesc, lineHeight: 1.6 }}>
                {t.auth.forgotPassword.description}
              </Typography>

              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <TextField
                  label={t.auth.forgotPassword.emailLabel}
                  type="email"
                  placeholder={t.auth.forgotPassword.emailPlaceholder}
                  fullWidth
                  margin="dense"
                  slotProps={s.shrinkLabel}
                  {...register('email', {
                    required: t.auth.forgotPassword.emailRequired,
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t.auth.forgotPassword.emailInvalid },
                  })}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{ mb: 2 }}
                />

                <Button type="submit" fullWidth loading={isSubmitting}>
                  {t.auth.forgotPassword.button}
                </Button>
              </Box>

              <Typography sx={{ textAlign: 'center', mt: 3, fontSize: 14, color: 'text.secondary' }}>
                <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
                  {t.auth.forgotPassword.backToLogin}
                </Link>
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
