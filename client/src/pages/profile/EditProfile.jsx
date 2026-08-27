// pages/profile/EditProfile.jsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import BioEditor from '../../components/common/BioEditor'
import AvatarPickerModal from '../../components/avatar/AvatarPickerModal'
import AvatarEditor from '../../components/avatar/AvatarEditor'
import SettingsSidebar from './SettingsSidebar'
import * as s from './settingsStyles'

export default function EditProfile() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const { username } = useParams()
  const { t } = useLanguage()

  useEffect(function () {
    if (user && username && username !== user.username) {
      navigate('/' + username, { replace: true })
    }
  }, [user, username, navigate])

  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [editorSrc, setEditorSrc] = useState(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [bioHtml, setBioHtml] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  useEffect(function () {
    if (user) {
      reset({
        fullName: user.fullName || '',
        username: user.username || '',
        website: user.website || '',
      })
      setBioHtml(user.bio || '')
      setAvatarPreview(user.avatar || user.avatarUrl || null)
      setIsPrivate(!!user.isPrivate)
    }
  }, [user, reset])

  async function handleAvatarApplied(blob) {
    setEditorSrc(null)
    try {
      setAvatarUploading(true)
      const formData = new FormData()
      formData.append('avatar', blob, 'avatar.jpg')
      const res = await api.patch('/users/avatar', formData)
      updateUser({ avatarUrl: res.data.avatarUrl })
      setAvatarPreview(res.data.avatarUrl)
      toast.success(t.editProfile.avatarUpdated)
    } catch (err) {
      toast.error(err.response?.data?.message || t.editProfile.avatarFailed)
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleAvatarRemove() {
    setShowPicker(false)
    try {
      setAvatarUploading(true)
      await api.delete('/users/avatar')
      updateUser({ avatarUrl: null })
      setAvatarPreview(null)
      toast.success(t.editProfile.avatarRemoved)
    } catch {
      toast.error(t.editProfile.avatarRemoveFailed)
    } finally {
      setAvatarUploading(false)
    }
  }

  async function onSubmit(data) {
    try {
      const res = await api.patch('/users/profile', { ...data, bio: bioHtml, isPrivate })
      const updated = res.data.user || res.data
      updateUser(updated)
      toast.success(t.editProfile.profileUpdated)
      navigate('/' + (updated.username || data.username || user.username))
    } catch (err) {
      toast.error(err.response?.data?.message || t.editProfile.updateFailed)
    }
  }

  return (
    <Box sx={s.page}>

      {/* ── Sidebar navigation ── */}
      <SettingsSidebar active="edit" />

      {/* ── Main form ── */}
      <Box component="main" sx={s.main}>
        <Typography sx={s.sectionTitle}>{t.editProfile.title}</Typography>

        {/* Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
          <Box
            onClick={() => !avatarUploading && setShowPicker(true)}
            sx={{
              position: 'relative',
              flexShrink: 0,
              cursor: 'pointer',
              // Lớp phủ chỉ hiện khi rê chuột lên ảnh đại diện
              '&:hover .avatarOverlay': { opacity: 1 },
            }}
          >
            <Avatar src={avatarPreview} username={user?.username} size="lg" />
            <Box
              className="avatarOverlay"
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                bgcolor: 'rgba(0, 0, 0, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
            >
              {avatarUploading ? (
                <Spinner size="sm" />
              ) : (
                <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 600, mb: .75 }}>{user?.username}</Typography>
          </Box>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>

          {/* Full Name */}
          <Box sx={s.fieldGroup}>
            <Typography component="label" sx={s.fieldLabel}>{t.editProfile.fullNameLabel}</Typography>
            <Box
              component="input"
              sx={s.fieldInput(!!errors.fullName)}
              placeholder={t.editProfile.fullNamePlaceholder}
              {...register('fullName', { required: t.editProfile.fullNameRequired })}
            />
            {errors.fullName && <Typography sx={s.fieldError}>{errors.fullName.message}</Typography>}
          </Box>

          {/* Username */}
          <Box sx={s.fieldGroup}>
            <Typography component="label" sx={s.fieldLabel}>{t.editProfile.usernameLabel}</Typography>
            <Box
              component="input"
              sx={s.fieldInput(!!errors.username)}
              placeholder="username"
              {...register('username', {
                required: t.editProfile.usernameRequired,
                pattern: { value: /^[a-z0-9_.]{3,30}$/, message: t.editProfile.usernamePattern },
              })}
            />
            {errors.username
              ? <Typography sx={s.fieldError}>{errors.username.message}</Typography>
              : <Typography sx={s.fieldHint}>{t.editProfile.usernameHint}</Typography>
            }
          </Box>

          {/* Bio */}
          <Box sx={s.fieldGroup}>
            <Typography component="label" sx={s.fieldLabel}>{t.editProfile.bioLabel}</Typography>
            <BioEditor
              value={bioHtml}
              onChange={setBioHtml}
              placeholder={t.editProfile.bioPlaceholder}
            />
          </Box>

          {/* Website */}
          <Box sx={s.fieldGroup}>
            <Typography component="label" sx={s.fieldLabel}>{t.editProfile.websiteLabel}</Typography>
            <Box
              component="input"
              type="url"
              sx={s.fieldInput(false)}
              placeholder={t.editProfile.websitePlaceholder}
              {...register('website')}
            />
          </Box>

          <Box sx={{ height: '1px', bgcolor: 'divider', my: 3.5 }} />

          {/* Private account toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: .5, mb: 3 }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: .5 }}>
                {t.editProfile.privateLabel}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                {isPrivate ? t.editProfile.privateOn : t.editProfile.privateOff}
              </Typography>
            </Box>

            {/* Công tắc tự vẽ thay vì Switch của MUI để giữ đúng kích thước và màu bản cũ */}
            <Box
              component="button"
              type="button"
              onClick={() => setIsPrivate(p => !p)}
              sx={{
                flexShrink: 0,
                width: 48,
                height: 26,
                borderRadius: '13px',
                border: 'none',
                bgcolor: isPrivate ? '#0095f6' : 'divider',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  top: '3px',
                  left: isPrivate ? '25px' : '3px',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  bgcolor: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              />
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={s.actions}>
            <Box
              component="button"
              type="submit"
              sx={s.btnSave}
              disabled={isSubmitting || avatarUploading}
            >
              {isSubmitting ? t.editProfile.saving : t.editProfile.save}
            </Box>
            <Box
              component="button"
              type="button"
              sx={s.btnCancel}
              onClick={() => navigate('/' + user?.username)}
            >
              {t.editProfile.cancel}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Avatar picker */}
      {showPicker && !editorSrc && (
        <AvatarPickerModal
          onImageReady={src => { setShowPicker(false); setEditorSrc(src) }}
          onRemove={handleAvatarRemove}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Avatar editor */}
      {editorSrc && (
        <AvatarEditor
          imageSrc={editorSrc}
          onApply={handleAvatarApplied}
          onCancel={() => { setEditorSrc(null); setShowPicker(false) }}
        />
      )}

    </Box>
  )
}
