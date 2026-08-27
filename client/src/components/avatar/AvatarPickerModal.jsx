// components/avatar/AvatarPickerModal.jsx
// Bảng chọn nguồn ảnh đại diện — dựng trên Dialog của MUI
//
// Hai chế độ:
//   'menu'   — chọn tải ảnh lên / chụp ảnh / gỡ ảnh hiện tại
//   'camera' — xem trực tiếp webcam và bấm chụp
//
// Props giữ nguyên: onImageReady(dataUrl), onRemove, onClose
// Toàn bộ logic camera, đọc file và kiểm tra dung lượng giữ nguyên như bản cũ

import { useRef, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ImageIcon from '@mui/icons-material/Image'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import DeleteIcon from '@mui/icons-material/Delete'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../common/Button'

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

  // Đóng modal: phải tắt camera trước, nếu không webcam vẫn sáng đèn
  function handleClose() {
    stopCamera()
    onClose()
  }

  return (
    <Dialog open onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', fontSize: 16, fontWeight: 600 }}>
        {mode === 'menu' ? ep.pickerTitle : ep.pickerCameraTitle}
      </DialogTitle>

      {mode === 'menu' ? (
        <>
          <DialogContent dividers sx={{ p: 0 }}>
            <List disablePadding>
              <ListItemButton onClick={() => fileRef.current.click()}>
                <ListItemIcon sx={{ minWidth: 40 }}><ImageIcon /></ListItemIcon>
                <ListItemText primary={ep.pickerUpload} />
              </ListItemButton>

              <ListItemButton onClick={startCamera}>
                <ListItemIcon sx={{ minWidth: 40 }}><PhotoCameraIcon /></ListItemIcon>
                <ListItemText primary={ep.pickerCamera} />
              </ListItemButton>

              {/* Gỡ ảnh là hành động khó hoàn tác nên để tông đỏ */}
              <ListItemButton onClick={onRemove} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}><DeleteIcon /></ListItemIcon>
                <ListItemText primary={ep.pickerRemove} />
              </ListItemButton>
            </List>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outline-secondary" fullWidth onClick={handleClose}>
              {ep.cancel}
            </Button>
          </DialogActions>

          {/* Input file ẩn — bấm nút phía trên sẽ kích hoạt nó */}
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
          <DialogContent dividers>
            {cameraError ? (
              <Typography sx={{ fontSize: 14, color: 'error.main', textAlign: 'center', py: 3 }}>
                {cameraError}
              </Typography>
            ) : (
              <Box
                component="video"
                ref={videoRef}
                autoPlay
                playsInline
                muted
                sx={{ width: '100%', borderRadius: 2, display: 'block', bgcolor: '#000' }}
              />
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, gap: 1.25 }}>
            <Button
              variant="outline-secondary"
              fullWidth
              onClick={() => { stopCamera(); setMode('menu') }}
            >
              {ep.pickerCameraBack}
            </Button>
            {!cameraError && (
              <Button fullWidth onClick={capturePhoto}>
                {ep.pickerCameraCapture}
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
