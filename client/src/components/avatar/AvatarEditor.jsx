import { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import toast from 'react-hot-toast'
import { useLanguage } from '../../i18n/LanguageContext'
import { getCroppedDataUrl, exportFinalImage } from '../../utils/canvasUtils'
import styles from './AvatarEditor.module.css'

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

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <div className={styles.title}>{ep.editorTitle}</div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'crop' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('crop')}
          >
            ✂️ {ep.editorTabCrop}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'filter' ? styles.tabActive : ''}`}
            onClick={() => switchTab('filter')}
          >
            🎨 {ep.editorTabFilter}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'sticker' ? styles.tabActive : ''}`}
            onClick={() => switchTab('sticker')}
          >
            🌟 {ep.editorTabSticker}
          </button>
        </div>

        {/* ── Crop tab ── */}
        {activeTab === 'crop' && (
          <div className={styles.cropSection}>
            <div className={styles.cropArea}>
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
            </div>
            <div className={styles.zoomRow}>
              <span className={styles.zoomIcon}>🔍</span>
              <input
                type="range"
                min={1} max={3} step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className={styles.zoomSlider}
              />
            </div>
          </div>
        )}

        {/* ── Filter tab ── */}
        {activeTab === 'filter' && (
          <div className={styles.filterSection}>
            <div className={styles.previewCircle}>
              <img
                src={displaySrc}
                style={{ filter: activeFilter }}
                className={styles.previewImg}
                alt="preview"
              />
            </div>
            <div className={styles.filterStrip}>
              {FILTERS.map(f => (
                <button
                  key={f.name}
                  className={`${styles.filterItem} ${activeFilter === f.css ? styles.filterActive : ''}`}
                  onClick={() => setActiveFilter(f.css)}
                >
                  <div className={styles.filterThumbWrap}>
                    <img
                      src={displaySrc}
                      style={{ filter: f.css }}
                      className={styles.filterThumb}
                      alt={f.name}
                    />
                  </div>
                  <span className={styles.filterName}>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Sticker tab ── */}
        {activeTab === 'sticker' && (
          <div className={styles.stickerSection}>
            <div ref={previewRef} className={styles.stickerPreview}>
              <img
                src={displaySrc}
                style={{ filter: activeFilter }}
                className={styles.previewImg}
                alt="preview"
                draggable={false}
              />
              {stickers.map(s => (
                <div
                  key={s.id}
                  className={styles.stickerPin}
                  style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
                  onPointerDown={handleStickerPointerDown}
                  onPointerMove={e => handleStickerPointerMove(e, s.id)}
                >
                  <span className={styles.stickerEmoji}>{s.emoji}</span>
                  <button
                    className={styles.stickerRemoveBtn}
                    onClick={() => removeSticker(s.id)}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.stickerGrid}>
              {STICKER_SET.map(emoji => (
                <button
                  key={emoji}
                  className={styles.stickerChoice}
                  onClick={() => addSticker(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onCancel}>{ep.cancel}</button>
          <button
            className={styles.btnApply}
            onClick={handleApply}
            disabled={isApplying || !croppedAreaPixels}
          >
            {isApplying ? ep.editorProcessing : ep.editorApply}
          </button>
        </div>

      </div>
    </div>
  )
}
