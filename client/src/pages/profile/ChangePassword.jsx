// pages/profile/ChangePassword.jsx
// Trang doi mat khau cho user dang dang nhap.

import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { changePassword } from '../../features/auth/authAPI'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import SettingsSidebar from './SettingsSidebar'
import * as s from './settingsStyles'

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
    <Box sx={s.page}>
      <SettingsSidebar active="password" />

      <Box component="main" sx={s.main}>
        <Typography sx={s.sectionTitle}>{t.editProfile.changePassword}</Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={s.fieldGroup}>
            <Typography component="label" sx={s.fieldLabel}>{text.currentPasswordLabel}</Typography>
            <Box
              component="input"
              type="password"
              placeholder={text.currentPasswordPlaceholder}
              sx={s.fieldInput(!!errors.oldPassword)}
              autoComplete="current-password"
              {...register('oldPassword', {
                required: text.currentPasswordRequired,
              })}
            />
            {errors.oldPassword && <Typography sx={s.fieldError}>{errors.oldPassword.message}</Typography>}
          </Box>

          <Box sx={s.fieldGroup}>
            <Typography component="label" sx={s.fieldLabel}>{text.newPasswordLabel}</Typography>
            <Box
              component="input"
              type="password"
              placeholder={text.newPasswordPlaceholder}
              sx={s.fieldInput(!!errors.newPassword)}
              autoComplete="new-password"
              {...register('newPassword', {
                required: text.newPasswordRequired,
                minLength: { value: 6, message: text.minChars },
                validate: function (value) {
                  return value !== watch('oldPassword') || text.sameAsOld
                },
              })}
            />
            {errors.newPassword && <Typography sx={s.fieldError}>{errors.newPassword.message}</Typography>}
          </Box>

          <Box sx={s.fieldGroup}>
            <Typography component="label" sx={s.fieldLabel}>{text.confirmPasswordLabel}</Typography>
            <Box
              component="input"
              type="password"
              placeholder={text.confirmPasswordPlaceholder}
              sx={s.fieldInput(!!errors.confirmPassword)}
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: text.confirmPasswordRequired,
                validate: function (value) {
                  return value === newPassword || text.confirmPasswordMismatch
                },
              })}
            />
            {errors.confirmPassword && <Typography sx={s.fieldError}>{errors.confirmPassword.message}</Typography>}
          </Box>

          <Box sx={s.actions}>
            <Box component="button" type="submit" sx={s.btnSave} disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : t.editProfile.changePassword}
            </Box>
            <Box
              component="button"
              type="button"
              sx={s.btnCancel}
              onClick={goToEditProfile}
            >
              {t.common.cancel}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
