// components/avatar/AvatarEditor.jsx
// Trình chỉnh ảnh đại diện 3 tab — dựng trên Dialog của MUI
//   'crop'    — cắt ảnh tròn, kéo thanh trượt để phóng to
//   'filter'  — chọn bộ lọc màu
//   'sticker' — dán emoji lên ảnh, kéo thả để đổi vị trí
//
// Props giữ nguyên: imageSrc, onApply(blob), onCancel
// Toàn bộ logic cắt ảnh, xuất canvas và kéo thả sticker giữ nguyên như bản cũ,
//   chỉ thay phần giao diện. Thanh trượt zoom đổi từ <input type="range">
//   sang Slider của MUI để đồng bộ màu với theme

import { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import toast from 'react-hot-toast'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Slider from '@mui/material/Slider'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import { useLanguage } from '../../i18n/LanguageContext'
import { getCroppedDataUrl, exportFinalImage } from '../../utils/canvasUtils'
import Button from '../common/Button'

const STICKER_SET = [
  '😀','😍','🥰','😎','🤩','🎉','✨','🔥',
  '💕','🌈','🌸','🦋','💫','⭐','🎀','🍀',
  '👑','💎','🌺','🎊','🥳','💯','🌙','☀️',
  '🐱','🐶','🦊','🐼','🐸','🎵','🍓','🍭',
]

export default function AvatarEditor({ imageSrc, onApply, onCancel }) {
  const { t } = useLanguage()
  const ep = t.editProfile

  const FILTERS = [
    { name: ep.editorFilterOriginal, css: 'none' },
    { name: ep.editorFilterBright,   css: 'brightness(1.2) contrast(1.05)' },
    { name: ep.editorFilterVivid,    css: 'brightness(1.1) saturate(1.5) contrast(1.1)' },
    { name: ep.editorFilterVintage,  css: 'sepia(0.4) contrast(0.9) brightness(1.1)' },
    { name: ep.editorFilterGray,     css: 'grayscale(1)' },
    { name: ep.editorFilterCool,     css: 'hue-rotate(180deg) saturate(0.9) brightness(1.05)' },
    { name: ep.editorFilterWarm,     css: 'sepia(0.25) saturate(1.4) brightness(1.05)' },
    { name: ep.editorFilterPurple,   css: 'hue-rotate(240deg) saturate(0.75) brightness(1.05)' },
  ]

  const [activeTab, setActiveTab] = useState('crop')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [activeFilter, setActiveFilter] = useState('none')
  const [stickers, setStickers] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isApplying, setIsApplying] = useState(false)
  const previewRef = useRef(null)
  const nextId = useRef(0)

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), [])

  // Rời tab crop thì phải sinh ảnh đã cắt trước, để tab filter/sticker
  // xem đúng phần ảnh người dùng vừa chọn chứ không phải ảnh gốc
  async function switchTab(tab) {
    if (tab !== 'crop' && croppedAreaPixels) {
      const url = await getCroppedDataUrl(imageSrc, croppedAreaPixels)
      setPreviewUrl(url)
    }
    setActiveTab(tab)
  }

  function addSticker(emoji) {
    setStickers(prev => [...prev, { id: nextId.current++, emoji, x: 0.5, y: 0.5 }])
  }

  function removeSticker(id) {
    setStickers(prev => prev.filter(s => s.id !== id))
  }

  function handleStickerPointerDown(e) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleStickerPointerMove(e, id) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height))
    setStickers(prev => prev.map(s => s.id === id ? { ...s, x, y } : s))
  }

  async function handleApply() {
    if (!croppedAreaPixels) return
    setIsApplying(true)
    try {
      const blob = await exportFinalImage(imageSrc, croppedAreaPixels, activeFilter, stickers, 400)
      onApply(blob)
    } catch {
      toast.error(ep.editorError)
    } finally {
      setIsApplying(false)
    }
  }

  const displaySrc = previewUrl || imageSrc

  // Ảnh xem trước dạng tròn 200px, dùng chung cho tab filter và sticker
  const previewImgSx = {
    width: 200,
    height: 200,
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
  }

  return (
    <Dialog open onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', fontSize: 16, fontWeight: 600, pb: 1 }}>
        {ep.editorTitle}
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(_, value) => value === 'crop' ? setActiveTab('crop') : switchTab(value)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="crop" label={'✂️ ' + ep.editorTabCrop} sx={{ fontSize: 13 }} />
        <Tab value="filter" label={'🎨 ' + ep.editorTabFilter} sx={{ fontSize: 13 }} />
        <Tab value="sticker" label={'🌟 ' + ep.editorTabSticker} sx={{ fontSize: 13 }} />
      </Tabs>

      <DialogContent sx={{ p: 0 }}>

        {/* ── Tab cắt ảnh ── */}
        {activeTab === 'crop' && (
          <Box>
            {/* Cropper định vị tuyệt đối nên container bắt buộc phải relative
                và có chiều cao rõ ràng, nếu không sẽ không hiện gì */}
            <Box sx={{ position: 'relative', height: 280, bgcolor: '#000' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2 }}>
              <ZoomInIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.01}
                onChange={(_, value) => setZoom(value)}
                size="small"
              />
            </Box>
          </Box>
        )}

        {/* ── Tab bộ lọc ── */}
        {activeTab === 'filter' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2.5, pb: 1.5 }}>
              <Box
                component="img"
                src={displaySrc}
                alt="preview"
                sx={{ ...previewImgSx, filter: activeFilter }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, px: 2, pb: 2, overflowX: 'auto' }}>
              {FILTERS.map(f => {
                var isActive = activeFilter === f.css
                return (
                  <Box
                    key={f.name}
                    component="button"
                    type="button"
                    onClick={() => setActiveFilter(f.css)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.75,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      p: 0,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        flexShrink: 0,
                        // Viền sáng đánh dấu bộ lọc đang chọn
                        outline: isActive ? '2px solid' : 'none',
                        outlineColor: 'primary.main',
                        outlineOffset: '2px',
                      }}
                    >
                      <Box
                        component="img"
                        src={displaySrc}
                        alt={f.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: f.css }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                        color: isActive ? 'primary.main' : 'text.secondary',
                        fontWeight: isActive ? 700 : 400,
                      }}
                    >
                      {f.name}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}

        {/* ── Tab sticker ── */}
        {activeTab === 'sticker' && (
          <Box>
            <Box
              ref={previewRef}
              sx={{
                position: 'relative',
                width: 200,
                height: 200,
                borderRadius: '50%',
                overflow: 'hidden',
                margin: '20px auto 12px',
                // touch-action none để kéo sticker trên điện thoại không cuộn trang
                touchAction: 'none',
              }}
            >
              <Box
                component="img"
                src={displaySrc}
                alt="preview"
                draggable={false}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: activeFilter }}
              />

              {stickers.map(s => (
                <Box
                  key={s.id}
                  onPointerDown={handleStickerPointerDown}
                  onPointerMove={e => handleStickerPointerMove(e, s.id)}
                  sx={{
                    position: 'absolute',
                    left: (s.x * 100) + '%',
                    top: (s.y * 100) + '%',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'grab',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    touchAction: 'none',
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontSize: 28,
                      lineHeight: 1,
                      // pointer-events none để con trỏ luôn rơi vào khối cha đang kéo
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
                    }}
                  >
                    {s.emoji}
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => removeSticker(s.id)}
                    onPointerDown={e => e.stopPropagation()}
                    sx={{
                      width: 16,
                      height: 16,
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      borderRadius: '50%',
                      color: '#fff',
                      fontSize: 12,
                      lineHeight: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 0,
                    }}
                  >
                    ×
                  </Box>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                px: 2,
                pb: 1.5,
                justifyContent: 'center',
              }}
            >
              {STICKER_SET.map(emoji => (
                <Box
                  key={emoji}
                  component="button"
                  type="button"
                  onClick={() => addSticker(emoji)}
                  sx={{
                    width: 40,
                    height: 40,
                    fontSize: 22,
                    background: 'none',
                    border: 'none',
                    borderRadius: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform .15s',
                    '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.2)' },
                  }}
                >
                  {emoji}
                </Box>
              ))}
            </Box>
          </Box>
        )}

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1.25, borderTop: 1, borderColor: 'divider' }}>
        <Button variant="outline-secondary" fullWidth onClick={onCancel}>
          {ep.cancel}
        </Button>
        <Button
          fullWidth
          onClick={handleApply}
          disabled={!croppedAreaPixels}
          loading={isApplying}
        >
          {isApplying ? ep.editorProcessing : ep.editorApply}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
