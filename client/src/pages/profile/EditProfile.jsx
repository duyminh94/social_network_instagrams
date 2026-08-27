// pages/profile/EditProfile.jsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import BioEditor from '../../components/common/BioEditor'
import AvatarPickerModal from '../../components/avatar/AvatarPickerModal'
import AvatarEditor from '../../components/avatar/AvatarEditor'
import SettingsSidebar from './SettingsSidebar'
import styles from './EditProfile.module.css'

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
    <div className={styles.page}>

      {/* ── Sidebar navigation ── */}
      <SettingsSidebar active="edit" />

      {/* ── Main form ── */}
      <main className={styles.main}>
        <div className={styles.sectionTitle}>{t.editProfile.title}</div>

        {/* Avatar */}
        <div className={styles.avatarRow}>
          <div
            className={styles.avatarWrap}
            onClick={() => !avatarUploading && setShowPicker(true)}
          >
            <Avatar src={avatarPreview} username={user?.username} size="lg" />
            <div className={styles.avatarOverlay}>
              {avatarUploading ? (
                <Spinner size="sm" />
              ) : (
                <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </div>
          </div>

          <div className={styles.avatarInfo}>
            <div className={styles.avatarUsername}>{user?.username}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* Full Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t.editProfile.fullNameLabel}</label>
            <input
              className={`${styles.fieldInput} ${errors.fullName ? styles.error : ''}`}
              placeholder={t.editProfile.fullNamePlaceholder}
              {...register('fullName', { required: t.editProfile.fullNameRequired })}
            />
            {errors.fullName && <div className={styles.fieldError}>{errors.fullName.message}</div>}
          </div>

          {/* Username */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t.editProfile.usernameLabel}</label>
            <input
              className={`${styles.fieldInput} ${errors.username ? styles.error : ''}`}
              placeholder="username"
              {...register('username', {
                required: t.editProfile.usernameRequired,
                pattern: { value: /^[a-z0-9_.]{3,30}$/, message: t.editProfile.usernamePattern },
              })}
            />
            {errors.username
              ? <div className={styles.fieldError}>{errors.username.message}</div>
              : <div className={styles.fieldHint}>{t.editProfile.usernameHint}</div>
            }
          </div>

          {/* Bio */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t.editProfile.bioLabel}</label>
            <BioEditor
              value={bioHtml}
              onChange={setBioHtml}
              placeholder={t.editProfile.bioPlaceholder}
            />
          </div>

          {/* Website */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t.editProfile.websiteLabel}</label>
            <input
              type="url"
              className={styles.fieldInput}
              placeholder={t.editProfile.websitePlaceholder}
              {...register('website')}
            />
          </div>

          <div className={styles.divider} />

          {/* Private account toggle */}
          <div className={styles.privacyRow}>
            <div className={styles.privacyInfo}>
              <div className={styles.privacyLabel}>{t.editProfile.privateLabel}</div>
              <div className={styles.privacyDesc}>
                {isPrivate ? t.editProfile.privateOn : t.editProfile.privateOff}
              </div>
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${isPrivate ? styles.on : ''}`}
              onClick={() => setIsPrivate(p => !p)}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.btnSave}
              disabled={isSubmitting || avatarUploading}
            >
              {isSubmitting ? t.editProfile.saving : t.editProfile.save}
            </button>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => navigate('/' + user?.username)}
            >
              {t.editProfile.cancel}
            </button>
          </div>
        </form>
      </main>

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

    </div>
  )
}
