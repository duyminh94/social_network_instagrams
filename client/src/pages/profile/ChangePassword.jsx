// pages/profile/ChangePassword.jsx
// Trang doi mat khau cho user dang dang nhap.

import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { changePassword } from '../../features/auth/authAPI'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import SettingsSidebar from './SettingsSidebar'
import styles from './EditProfile.module.css'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const text = t.changePasswordPage

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  const newPassword = watch('newPassword')

  function goToEditProfile() {
    if (user?.username) {
      navigate('/' + user.username + '/edit')
    }
  }

  async function onSubmit(data) {
    try {
      await changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      })
      reset()
      toast.success(text.success)
      goToEditProfile()
    } catch (err) {
      toast.error(err.response?.data?.message || text.failed)
    }
  }

  return (
    <div className={styles.page}>
      <SettingsSidebar active="password" />

      <main className={styles.main}>
        <div className={styles.sectionTitle}>{t.editProfile.changePassword}</div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{text.currentPasswordLabel}</label>
            <input
              type="password"
              placeholder={text.currentPasswordPlaceholder}
              className={`${styles.fieldInput} ${errors.oldPassword ? styles.error : ''}`}
              autoComplete="current-password"
              {...register('oldPassword', {
                required: text.currentPasswordRequired,
              })}
            />
            {errors.oldPassword && <div className={styles.fieldError}>{errors.oldPassword.message}</div>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{text.newPasswordLabel}</label>
            <input
              type="password"
              placeholder={text.newPasswordPlaceholder}
              className={`${styles.fieldInput} ${errors.newPassword ? styles.error : ''}`}
              autoComplete="new-password"
              {...register('newPassword', {
                required: text.newPasswordRequired,
                minLength: { value: 6, message: text.minChars },
                validate: function (value) {
                  return value !== watch('oldPassword') || text.sameAsOld
                },
              })}
            />
            {errors.newPassword && <div className={styles.fieldError}>{errors.newPassword.message}</div>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{text.confirmPasswordLabel}</label>
            <input
              type="password"
              placeholder={text.confirmPasswordPlaceholder}
              className={`${styles.fieldInput} ${errors.confirmPassword ? styles.error : ''}`}
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: text.confirmPasswordRequired,
                validate: function (value) {
                  return value === newPassword || text.confirmPasswordMismatch
                },
              })}
            />
            {errors.confirmPassword && <div className={styles.fieldError}>{errors.confirmPassword.message}</div>}
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.btnSave} disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : t.editProfile.changePassword}
            </button>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={goToEditProfile}
            >
              {t.common.cancel}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
