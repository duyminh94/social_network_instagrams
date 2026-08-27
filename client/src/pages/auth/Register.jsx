// pages/auth/Register.jsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Form } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../hooks/useAuth'
import { register as registerAPI, googleLogin } from '../../features/auth/authAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'
import { Wordmark } from '../../components/common/Icon'
import aptechImg from '../../assets/images/aptech.jpg'
import styles from './Auth.module.css'

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

  // Success state — show email check message in place of form
  if (registered) {
    return (
      <div className={styles.splitPanel}>
        <div className={styles.imageSide}>
          <img src={aptechImg} alt="" />
          <div className={styles.imageOverlay} />
          <div className={styles.imageBranding}>
            <div style={{ marginBottom: 20 }}><Wordmark size={40} color="#fff" /></div>
            <h1>Welcome to<br />the community</h1>
            <p>One more step — verify your email to start sharing with the world.</p>
          </div>
        </div>

        <div className={styles.formSide}>
          <div className={styles.formSideInner} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 4 }}>
              We sent an activation link to:
            </p>
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{registeredEmail}</p>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 28 }}>
              The link expires in 60 minutes. Check your spam folder if you don&apos;t see it.
            </p>
            <Link
              to="/resend-verification"
              style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}
            >
              Didn&apos;t receive it? Resend
            </Link>
            <p style={{ marginTop: 32, fontSize: 14, color: 'var(--ink-muted)' }}>
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Back to Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.splitPanel}>
      {/* Left — image panel */}
      <div className={styles.imageSide}>
        <img src={aptechImg} alt="" />
        <div className={styles.imageOverlay} />
        <div className={styles.imageBranding}>
          <div style={{ marginBottom: 20 }}><Wordmark size={40} color="#fff" /></div>
          <h1>Join us today<br />and start sharing</h1>
          <p>Create an account to connect with friends and share your best moments.</p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className={styles.formSide}>
        <div className={styles.formSideInner}>
          <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 6 }}>Create account</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 28 }}>
            Sign up to see photos and videos from your friends.
          </p>

          <Form onSubmit={handleSubmit(onSubmit)}>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 500, fontSize: 14 }}>Full Name</Form.Label>
              <Form.Control
                type="text"
                placeholder={t.auth.register.fullNamePlaceholder}
                {...register('fullName', { required: t.auth.register.fullNameRequired })}
                isInvalid={!!errors.fullName}
              />
              <Form.Control.Feedback type="invalid">
                {errors.fullName?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 500, fontSize: 14 }}>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder={t.auth.register.usernamePlaceholder}
                {...register('username', {
                  required: t.auth.register.usernameRequired,
                  pattern: {
                    value: /^[a-z0-9_.]{3,30}$/,
                    message: t.auth.register.usernamePattern,
                  },
                })}
                isInvalid={!!errors.username}
              />
              <Form.Control.Feedback type="invalid">
                {errors.username?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 500, fontSize: 14 }}>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder={t.auth.register.emailPlaceholder}
                {...register('email', {
                  required: t.auth.register.emailRequired,
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t.auth.register.emailInvalid },
                })}
                isInvalid={!!errors.email}
              />
              <Form.Control.Feedback type="invalid">
                {errors.email?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label style={{ fontWeight: 500, fontSize: 14 }}>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder={t.auth.register.passwordPlaceholder}
                {...register('password', {
                  required: t.auth.register.passwordRequired,
                  minLength: { value: 6, message: t.auth.register.minChars },
                })}
                isInvalid={!!errors.password}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Button type="submit" className="btn-primary w-100" loading={isSubmitting}>
              {t.auth.register.button}
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
                  text="signup_with"
                />
              </div>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--ink-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
