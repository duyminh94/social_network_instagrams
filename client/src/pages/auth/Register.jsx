// pages/auth/Register.jsx
// Trang đăng ký — hai trạng thái dùng chung bố cục 2 cột:
//   chưa gửi  : form nhập thông tin
//   đã gửi    : màn hình nhắc kiểm tra email kích hoạt

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GoogleLogin } from '@react-oauth/google'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { useAuth } from '../../hooks/useAuth'
import { register as registerAPI, googleLogin } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import AuthBackground from '../../components/auth/AuthBackground'
import * as s from './authStyles'

// Cột ảnh dùng lại ở cả 2 trạng thái, chỉ khác dòng tiêu đề.
// Đặt ở ngoài Register: khai báo component lồng trong component sẽ khiến React
//   coi đây là kiểu component mới sau mỗi lần render và dựng lại toàn bộ cây con
function ImagePanel({ title, desc }) {
  return (
    <Box sx={s.imageSide}>
      <AuthBackground>
        <Box sx={{ mb: 2.5 }}><Wordmark size={40} color="#fff" /></Box>
        <Typography component="h1" sx={s.brandingTitle}>{title}</Typography>
        <Typography sx={s.brandingDesc}>{desc}</Typography>
      </AuthBackground>
    </Box>
  )
}

export default function Register() {
  const [registered, setRegistered] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  var { t } = useLanguage()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onGoogleSuccess(credentialResponse) {
    try {
      const res = await googleLogin(credentialResponse.credential)
      login(res.data.token, res.data.user)
      toast.success('Đăng nhập thành công!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google login thất bại')
    }
  }

  async function onSubmit(data) {
    try {
      var res = await registerAPI(data)
      var message = res.data?.message || ''

      // Dev mode: backend kích hoạt tài khoản ngay, không gửi email
      if (message.includes('dev')) {
        toast.success(t.auth.register.success)
        navigate('/login')
        return
      }

      // Production: hiện màn hình "kiểm tra email"
      await registerAPI(data)
      setRegisteredEmail(data.email)
      setRegistered(true)
    } catch (err) {
      const message = err.response?.data?.message || t.auth.register.failed
      const field = err.response?.data?.field
      if (field === 'username' || field === 'email') {
        setError(field, { type: 'server', message })
      } else {
        toast.error(message)
      }
    }
  }

  // Trạng thái đã gửi email — thay chỗ form bằng lời nhắc kiểm tra hộp thư
  if (registered) {
    return (
      <Box sx={s.splitPanel}>
        <ImagePanel
          title={<>Welcome to<br />the community</>}
          desc="One more step — verify your email to start sharing with the world."
        />

        <Box sx={s.formSide}>
          <Box sx={{ ...s.formSideInner, textAlign: 'center' }}>
            <Box sx={{ fontSize: 56, mb: 2 }}>📧</Box>
            <Typography component="h2" sx={{ fontWeight: 700, fontSize: 22, mb: 1 }}>
              Check your email
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 14, mb: 0.5 }}>
              We sent an activation link to:
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 2 }}>
              {registeredEmail}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 3.5 }}>
              The link expires in 60 minutes. Check your spam folder if you don&apos;t see it.
            </Typography>

            <Link
              component={RouterLink}
              to="/resend-verification"
              sx={{ fontSize: 14, fontWeight: 600 }}
            >
              Didn&apos;t receive it? Resend
            </Link>

            <Typography sx={{ mt: 4, fontSize: 14, color: 'text.secondary' }}>
              <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
                Back to Log in
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={s.splitPanel}>
      <ImagePanel
        title={<>Join us today<br />and start sharing</>}
        desc="Create an account to connect with friends and share your best moments."
      />

      {/* Cột phải — form đăng ký */}
      <Box sx={s.formSide}>
        <Box sx={s.formSideInner}>
          <Typography component="h2" sx={s.pageTitle}>Create account</Typography>
          <Typography sx={s.pageDesc}>
            Sign up to see photos and videos from your friends.
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Full Name"
              placeholder={t.auth.register.fullNamePlaceholder}
              fullWidth
              margin="dense"
              slotProps={s.shrinkLabel}
              {...register('fullName', { required: t.auth.register.fullNameRequired })}
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
            />

            <TextField
              label="Username"
              placeholder={t.auth.register.usernamePlaceholder}
              fullWidth
              margin="dense"
              slotProps={s.shrinkLabel}
              {...register('username', {
                required: t.auth.register.usernameRequired,
                pattern: {
                  value: /^[a-z0-9_.]{3,30}$/,
                  message: t.auth.register.usernamePattern,
                },
              })}
              error={!!errors.username}
              helperText={errors.username?.message}
            />

            <TextField
              label="Email"
              type="email"
              placeholder={t.auth.register.emailPlaceholder}
              fullWidth
              margin="dense"
              slotProps={s.shrinkLabel}
              {...register('email', {
                required: t.auth.register.emailRequired,
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t.auth.register.emailInvalid },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              label="Password"
              type="password"
              placeholder={t.auth.register.passwordPlaceholder}
              fullWidth
              margin="dense"
              slotProps={s.shrinkLabel}
              {...register('password', {
                required: t.auth.register.passwordRequired,
                minLength: { value: 6, message: t.auth.register.minChars },
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 2 }}
            />

            <Button type="submit" fullWidth loading={isSubmitting}>
              {t.auth.register.button}
            </Button>
          </Box>

          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <>
              <Box sx={s.dividerRow}>
                <Box sx={s.dividerLine} />
                <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>
                  OR
                </Typography>
                <Box sx={s.dividerLine} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={onGoogleSuccess}
                  onError={() => toast.error('Google login thất bại')}
                  theme="filled_black"
                  shape="rectangular"
                  width="320"
                  text="signup_with"
                />
              </Box>
            </>
          )}

          <Typography sx={{ textAlign: 'center', mt: 3, fontSize: 14, color: 'text.secondary' }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
              Log in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
