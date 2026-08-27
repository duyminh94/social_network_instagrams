// pages/auth/Login.jsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Form } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../hooks/useAuth'
import { login as loginAPI, googleLogin } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import aptechImg from '../../assets/images/aptech.jpg'
import styles from './Auth.module.css'

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
      if (message.includes('chưa được kích hoạt') || message.includes('kích hoạt')) {
        setError('email', { type: 'server', message })
      } else {
        toast.error(message)
      }
    }
  }

  return (
    <div className={styles.splitPanel}>
      {/* Left — image panel */}
      <div className={styles.imageSide}>
        <img src={aptechImg} alt="" />
        <div className={styles.imageOverlay} />
        <div className={styles.imageBranding}>
          <div style={{ marginBottom: 20 }}><Wordmark size={40} color="#fff" /></div>
          <h1>Connect with<br />your world</h1>
          <p>Share moments, follow friends, and discover what's happening around you.</p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className={styles.formSide}>
        <div className={styles.formSideInner}>
          {/* Logo visible only on mobile (image panel hidden) */}
          <div style={{ display: 'none' }} className="d-flex d-md-none justify-content-center mb-4">
            <Wordmark size={32} color="#fff" />
          </div>

          <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 6 }}>Log in</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 28 }}>
            Welcome back! Enter your details below.
          </p>

          <Form onSubmit={handleSubmit(onSubmit)}>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 500, fontSize: 14 }}>Email or Username</Form.Label>
              <Form.Control
                type="text"
                placeholder={t.auth.login.emailPlaceholder}
                {...register('email', { required: t.auth.login.emailRequired })}
                isInvalid={!!errors.email}
              />
              <Form.Control.Feedback type="invalid">
                {errors.email?.message}
                {errors.email?.type === 'server' && (
                  <span>
                    {' '}— <Link to="/resend-verification" style={{ color: 'var(--accent)' }}>
                      {t.auth.login.resendLink}
                    </Link>
                  </span>
                )}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label style={{ fontWeight: 500, fontSize: 14 }}>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder={t.auth.login.passwordPlaceholder}
                {...register('password', {
                  required: t.auth.login.passwordRequired,
                  minLength: { value: 6, message: t.auth.login.minChars },
                })}
                isInvalid={!!errors.password}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--accent)' }}>
                {t.auth.login.forgotPassword}
              </Link>
            </div>

            <Button type="submit" className="btn-primary w-100" loading={isSubmitting}>
              {t.auth.login.button}
            </Button>
          </Form>

          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 600 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={onGoogleSuccess}
                  onError={() => toast.error('Google login thất bại')}
                  theme="filled_black"
                  shape="rectangular"
                  width="320"
                />
              </div>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--ink-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
