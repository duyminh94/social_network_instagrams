import { useRef, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './AvatarPickerModal.module.css'

export default function AvatarPickerModal({ onImageReady, onRemove, onClose }) {
  const { t } = useLanguage()
  const ep = t.editProfile
  const [mode, setMode] = useState('menu') // 'menu' | 'camera'
  const [cameraError, setCameraError] = useState(null)
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    return () => stopCamera()
  }, [])

  async function startCamera() {
    setCameraError(null)
    setMode('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 640 } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setCameraError(ep.pickerCameraError)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function capturePhoto() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 640
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    stopCamera()
    onImageReady(dataUrl)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(ep.pickerImageOnly)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(ep.pickerImageTooLarge)
      return
    }
    const reader = new FileReader()
    reader.onload = ev => onImageReady(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      stopCamera()
      onClose()
    }
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        {mode === 'menu' ? (
          <>
            <div className={styles.title}>{ep.pickerTitle}</div>
            <div className={styles.options}>
              <button className={styles.optionBtn} onClick={() => fileRef.current.click()}>
                <span className={styles.optionIcon}>🖼️</span>
                <span>{ep.pickerUpload}</span>
              </button>
              <button className={styles.optionBtn} onClick={startCamera}>
                <span className={styles.optionIcon}>📷</span>
                <span>{ep.pickerCamera}</span>
              </button>
              <button className={`${styles.optionBtn} ${styles.optionDanger}`} onClick={onRemove}>
                <span className={styles.optionIcon}>🗑️</span>
                <span>{ep.pickerRemove}</span>
              </button>
            </div>
            <button className={styles.cancelBtn} onClick={onClose}>{ep.cancel}</button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </>
        ) : (
          <>
            <div className={styles.title}>{ep.pickerCameraTitle}</div>
            {cameraError ? (
              <div className={styles.cameraError}>{cameraError}</div>
            ) : (
              <video
                ref={videoRef}
                className={styles.video}
                autoPlay
                playsInline
                muted
              />
            )}
            <div className={styles.cameraActions}>
              <button className={styles.cancelBtn} onClick={() => { stopCamera(); setMode('menu') }}>
                {ep.pickerCameraBack}
              </button>
              {!cameraError && (
                <button className={styles.captureBtn} onClick={capturePhoto}>
                  📸 {ep.pickerCameraCapture}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
