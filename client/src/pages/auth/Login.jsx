// pages/auth/Login.jsx
// Trang đăng nhập — bố cục 2 cột: ảnh giới thiệu bên trái, form bên phải
//
// Form dùng react-hook-form như cũ, chỉ thay lớp hiển thị từ react-bootstrap
//   sang TextField của MUI: lỗi validate đưa vào error + helperText

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GoogleLogin } from '@react-oauth/google'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import { useAuth } from '../../hooks/useAuth'
import { login as loginAPI, googleLogin } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import AuthBackground from '../../components/auth/AuthBackground'
import * as s from './authStyles'

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  var { t } = useLanguage()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm()

  function getRedirectPath(loginUser) {
    var adminRoles = ['super_admin', 'moderator']
    if (adminRoles.includes(loginUser?.role)) return '/admin'
    return '/'
  }

  useEffect(function () {
    if (isAuthenticated) navigate(getRedirectPath(user), { replace: true })
  }, [isAuthenticated, navigate, user])

  async function onGoogleSuccess(credentialResponse) {
    try {
      const res = await googleLogin(credentialResponse.credential)
      login(res.data.token, res.data.user)
      toast.success('Welcome back!')
      navigate(getRedirectPath(res.data.user))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google login thất bại')
    }
  }

  async function onSubmit(data) {
    try {
      const res = await loginAPI(data.email, data.password)
      login(res.data.token, res.data.user)
      toast.success(t.auth.login.success)
      navigate(getRedirectPath(res.data.user))
    } catch (err) {
      const message = err.response?.data?.message || t.auth.login.failed
      // Tài khoản chưa kích hoạt thì gắn lỗi vào ô email kèm link gửi lại mail,
      // các lỗi khác chỉ cần toast là đủ
      if (message.includes('chưa được kích hoạt') || message.includes('kích hoạt')) {
        setError('email', { type: 'server', message })
      } else {
        toast.error(message)
      }
    }
  }

  return (
    <Box sx={s.splitPanel}>
      {/* Cột trái — nền động: quỹ đạo icon mạng xã hội trên lưới chòm sao */}
      <Box sx={s.imageSide}>
        <AuthBackground>
          <Box sx={{ mb: 2.5 }}><Wordmark size={40} color="#fff" /></Box>
          <Typography component="h1" sx={s.brandingTitle}>
            Connect with<br />your world
          </Typography>
          <Typography sx={s.brandingDesc}>
            Share moments, follow friends, and discover what&apos;s happening around you.
          </Typography>
        </AuthBackground>
      </Box>

      {/* Cột phải — form đăng nhập */}
      <Box sx={s.formSide}>
        <Box sx={s.formSideInner}>
          {/* Logo chỉ hiện trên mobile, vì lúc đó cột ảnh đã bị ẩn */}
          <Box sx={{ display: 'none', justifyContent: 'center', mb: 3, [s.MOBILE]: { display: 'flex' } }}>
            <Wordmark size={32} color="#fff" />
          </Box>

          <Typography component="h2" sx={s.pageTitle}>Log in</Typography>
          <Typography sx={s.pageDesc}>Welcome back! Enter your details below.</Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Email or Username"
              placeholder={t.auth.login.emailPlaceholder}
              fullWidth
              margin="dense"
              slotProps={s.shrinkLabel}
              {...register('email', { required: t.auth.login.emailRequired })}
              error={!!errors.email}
              helperText={
                errors.email?.type === 'server' ? (
                  <>
                    {errors.email.message}{' — '}
                    <Link component={RouterLink} to="/resend-verification">
                      {t.auth.login.resendLink}
                    </Link>
                  </>
                ) : errors.email?.message
              }
            />

            <TextField
              label="Password"
              type="password"
              placeholder={t.auth.login.passwordPlaceholder}
              fullWidth
              margin="dense"
              slotProps={s.shrinkLabel}
              {...register('password', {
                required: t.auth.login.passwordRequired,
                minLength: { value: 6, message: t.auth.login.minChars },
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />

            <Box sx={{ textAlign: 'right', mb: 2.5 }}>
              <Link component={RouterLink} to="/forgot-password" sx={{ fontSize: 13 }}>
                {t.auth.login.forgotPassword}
              </Link>
            </Box>

            <Button type="submit" fullWidth loading={isSubmitting}>
              {t.auth.login.button}
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
                />
              </Box>
            </>
          )}

          <Typography sx={{ textAlign: 'center', mt: 3, fontSize: 14, color: 'text.secondary' }}>
            Don&apos;t have an account?{' '}
            <Link component={RouterLink} to="/register" sx={{ fontWeight: 600 }}>
              Sign up
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
