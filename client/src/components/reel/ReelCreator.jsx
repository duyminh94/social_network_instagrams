import { useRef, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { createReel } from '../../features/reel/reelAPI'
import { generateCaption } from '../../features/ai/aiAPI'
import { trimAndExportVideo, formatFileSize } from '../../utils/videoTrim'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './ReelCreator.module.css'

const VIDEO_FILTERS = [
  { id: 'none',     name: 'Gốc',       css: 'none' },
  { id: 'bright',   name: 'Sáng',      css: 'brightness(1.25) contrast(1.05)' },
  { id: 'vivid',    name: 'Tươi',      css: 'brightness(1.1) saturate(1.6) contrast(1.1)' },
  { id: 'vintage',  name: 'Vintage',   css: 'sepia(0.4) contrast(0.9) brightness(1.1)' },
  { id: 'bw',       name: 'Đen trắng', css: 'grayscale(1)' },
  { id: 'cool',     name: 'Lạnh',      css: 'hue-rotate(180deg) saturate(0.9) brightness(1.05)' },
  { id: 'warm',     name: 'Ấm',        css: 'sepia(0.25) saturate(1.4) brightness(1.05)' },
  { id: 'dramatic', name: 'Kịch tính', css: 'contrast(1.5) saturate(1.2) brightness(0.88)' },
]

// Tất cả track dùng nguồn CC0 / Public Domain — không yêu cầu attribution thương mại
// Pixabay Music License: https://pixabay.com/service/license-summary/
// Internet Archive: Public Domain
const PRESET_TRACKS = [
  { id: 't1',  name: 'Lofi Study Chill',   artist: 'Pixabay Music', genre: 'Lofi',     duration: 130, color: '#f97316', url: 'https://cdn.pixabay.com/audio/2023/10/10/audio_9b28c14fdb.mp3' },
  { id: 't2',  name: 'Calm Piano',          artist: 'Pixabay Music', genre: 'Piano',    duration: 120, color: '#3b82f6', url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_af8e5b4e6d.mp3' },
  { id: 't3',  name: 'Acoustic Guitar',     artist: 'Pixabay Music', genre: 'Acoustic', duration: 145, color: '#22c55e', url: 'https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3' },
  { id: 't4',  name: 'Summer Vibes',        artist: 'Pixabay Music', genre: 'Pop',      duration: 165, color: '#ec4899', url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_b6f5e61950.mp3' },
  { id: 't5',  name: 'Happy Ukulele',       artist: 'Pixabay Music', genre: 'Ukulele',  duration: 110, color: '#8b5cf6', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749e7d4.mp3' },
  { id: 't6',  name: 'Epic Cinematic',      artist: 'Pixabay Music', genre: 'Epic',     duration: 175, color: '#06b6d4', url: 'https://cdn.pixabay.com/audio/2022/08/04/audio_2dde668d05.mp3' },
  { id: 't7',  name: 'Corporate Upbeat',    artist: 'Pixabay Music', genre: 'Corporate',duration: 155, color: '#eab308', url: 'https://cdn.pixabay.com/audio/2023/06/22/audio_0db9b012b5.mp3' },
  { id: 't8',  name: 'Ambient Meditation',  artist: 'Pixabay Music', genre: 'Ambient',  duration: 190, color: '#ef4444', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 't9',  name: 'Funky Beat',          artist: 'Pixabay Music', genre: 'Funk',     duration: 140, color: '#a16207', url: 'https://cdn.pixabay.com/audio/2023/07/25/audio_df54e2e3e2.mp3' },
  { id: 't10', name: 'Jazz Coffee',         artist: 'Pixabay Music', genre: 'Jazz',     duration: 200, color: '#6b7280', url: 'https://cdn.pixabay.com/audio/2022/09/13/audio_4db8ab3e5f.mp3' },
]

const MAX_RECORD_SEC = 60
const formatTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function ReelCreator({ onClose, onCreated }) {
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()

  const [step, setStep] = useState('source') // source | camera | edit | details

  // Video
  const [videoBlob, setVideoBlob] = useState(null)
  const [videoObjectUrl, setVideoObjectUrl] = useState(null)
  const [videoDuration, setVideoDuration] = useState(0)

  // Trim
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const trimRef = useRef(null)
  const draggingHandle = useRef(null)

  // Filter
  const [activeFilter, setActiveFilter] = useState('none')
  const [activeFilterCss, setActiveFilterCss] = useState('none')

  // Music — preset
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [previewingId, setPreviewingId] = useState(null)
  const [brokenTrackIds, setBrokenTrackIds] = useState(new Set()) // track bị 403/lỗi → tự ẩn
  const presetAudioRef = useRef(null)
  // Music — upload
  const [audioFile, setAudioFile] = useState(null)
  const [audioObjectUrl, setAudioObjectUrl] = useState(null)
  const uploadAudioRef = useRef(null)
  const [uploadPlaying, setUploadPlaying] = useState(false)

  // Edit preview ref — dùng để enforce trim trong khi user chỉnh thanh trim
  const editPreviewRef = useRef(null)

  // Trim export
  const [isOversized, setIsOversized] = useState(false)
  const [isTrimming, setIsTrimming] = useState(false)
  const [trimProgress, setTrimProgress] = useState(0)

  // Details
  const [caption, setCaption] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [aiCaptionLoading, setAiCaptionLoading] = useState(false)
  const detailsVideoRef = useRef(null)

  // Camera
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [facingMode, setFacingMode] = useState('user')
  const [cameraError, setCameraError] = useState(null)
  const cameraVideoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  // Edit
  const [editTab, setEditTab] = useState('trim')

  useEffect(() => {
    return () => {
      stopCamera()
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl)
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl)
    }
  }, [])

  // ── Camera ──────────────────────────────────────────────────────────
  async function startCamera() {
    setCameraError(null)
    setStep('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      })
      streamRef.current = stream
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream
    } catch {
      setCameraError(t.reelCreator.cameraError)
    }
  }

  async function flipCamera() {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    stopCamera()
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: true })
      streamRef.current = stream
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream
    } catch {
      setCameraError(t.reelCreator.flipError)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    clearInterval(timerRef.current)
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      handleVideoReady(blob)
    }
    recorder.start(100)
    recorderRef.current = recorder
    setIsRecording(true)
    setRecordingTime(0)
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev + 1 >= MAX_RECORD_SEC) { stopRecording(); return MAX_RECORD_SEC }
        return prev + 1
      })
    }, 1000)
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    recorderRef.current?.stop()
    setIsRecording(false)
  }

  function handleVideoReady(blob) {
    stopCamera()
    setIsOversized(false)
    const url = URL.createObjectURL(blob)
    setVideoBlob(blob)
    setVideoObjectUrl(url)
    const tmp = document.createElement('video')
    tmp.src = url
    tmp.onloadedmetadata = () => {
      const dur = Math.min(tmp.duration, MAX_RECORD_SEC)
      setVideoDuration(dur)
      setTrimStart(0)
      setTrimEnd(dur)
    }
    setStep('edit')
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { toast.error(t.reelCreator.videoOnly); return }
    handleVideoReady(file)
    if (file.size > 200 * 1024 * 1024) setIsOversized(true)
  }

  // Seek preview về trimStart mỗi khi user kéo handle
  useEffect(() => {
    const v = editPreviewRef.current
    if (!v || !videoDuration) return
    if (v.currentTime < trimStart || v.currentTime > trimEnd) {
      v.currentTime = trimStart
    }
  }, [trimStart, trimEnd, videoDuration])

  // Enforce trim loop trong edit preview
  function handleEditTimeUpdate() {
    const v = editPreviewRef.current
    if (!v || !videoDuration) return
    if (v.currentTime >= trimEnd) {
      v.currentTime = trimStart
    }
  }

  // ── Trim ────────────────────────────────────────────────────────────
  const handleTrimPointerDown = useCallback((e, handle) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingHandle.current = handle
  }, [])

  const handleTrimPointerMove = useCallback((e) => {
    if (!draggingHandle.current || !videoDuration || !trimRef.current) return
    const rect = trimRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const time = pct * videoDuration
    if (draggingHandle.current === 'start') setTrimStart(Math.min(time, trimEnd - 0.5))
    else setTrimEnd(Math.max(time, trimStart + 0.5))
  }, [videoDuration, trimStart, trimEnd])

  const handleTrimPointerUp = useCallback(() => { draggingHandle.current = null }, [])

  // ── Trim export (re-encode oversized video via canvas + MediaRecorder) ──
  async function handleTrimExport() {
    if (!videoBlob || isTrimming) return
    setIsTrimming(true)
    setTrimProgress(0)
    try {
      const trimmedBlob = await trimAndExportVideo(
        videoBlob,
        trimStart,
        trimEnd,
        (elapsed, total) => setTrimProgress(Math.round((elapsed / total) * 100))
      )
      if (trimmedBlob.size > 200 * 1024 * 1024) {
        toast.error(`${t.reelCreator.exportStillLarge} (${formatFileSize(trimmedBlob.size)})`)
        return
      }
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl)
      const newUrl = URL.createObjectURL(trimmedBlob)
      const newDuration = trimEnd - trimStart
      setVideoBlob(trimmedBlob)
      setVideoObjectUrl(newUrl)
      setVideoDuration(newDuration)
      setTrimStart(0)
      setTrimEnd(newDuration)
      setIsOversized(false)
      toast.success(t.reelCreator.exportSuccess)
    } catch (err) {
      toast.error(t.reelCreator.exportError + ': ' + (err.message || 'unknown'))
    } finally {
      setIsTrimming(false)
      setTrimProgress(0)
    }
  }

  // ── Music: preset ───────────────────────────────────────────────────
  function toggleTrackPreview(track) {
    const el = presetAudioRef.current
    if (!el) return
    if (previewingId === track.id) {
      el.pause()
      setPreviewingId(null)
    } else {
      setPreviewingId(track.id)
      el.pause()
      el.src = track.url
      el.onerror = () => {
        setBrokenTrackIds(prev => new Set([...prev, track.id]))
        setPreviewingId(null)
        if (selectedPreset?.id === track.id) setSelectedPreset(null)
      }
      el.load()
      el.play().catch(() => {
        toast.error('Không thể phát nhạc này')
        setPreviewingId(null)
      })
    }
  }

  function selectPreset(track) {
    // Dừng preview nếu đang phát
    if (presetAudioRef.current) presetAudioRef.current.pause()
    setPreviewingId(null)
    // Bỏ chọn nếu click lại track đã chọn
    if (selectedPreset?.id === track.id) {
      setSelectedPreset(null)
      return
    }
    setSelectedPreset(track)
    // Xóa file upload nếu có
    setAudioFile(null)
    if (audioObjectUrl) { URL.revokeObjectURL(audioObjectUrl); setAudioObjectUrl(null) }
    setUploadPlaying(false)
  }

  // ── Music: upload ───────────────────────────────────────────────────
  function handleAudioChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) { toast.error('Chỉ chấp nhận file âm thanh'); return }
    if (file.size > 20 * 1024 * 1024) { toast.error('File nhạc không được vượt quá 20MB'); return }
    if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl)
    const url = URL.createObjectURL(file)
    setAudioFile(file)
    setAudioObjectUrl(url)
    setSelectedPreset(null) // Xóa preset đã chọn
    if (uploadAudioRef.current) uploadAudioRef.current.src = url
    e.target.value = ''
  }

  function toggleUploadPreview() {
    const el = uploadAudioRef.current
    if (!el) return
    if (uploadPlaying) { el.pause(); setUploadPlaying(false) }
    else { el.play(); setUploadPlaying(true) }
  }

  function removeAudio() {
    if (uploadAudioRef.current) uploadAudioRef.current.pause()
    if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl)
    setAudioFile(null)
    setAudioObjectUrl(null)
    setUploadPlaying(false)
    setSelectedPreset(null)
    if (presetAudioRef.current) presetAudioRef.current.pause()
    setPreviewingId(null)
  }

  // Active audio display
  const activeAudioName = selectedPreset
    ? `${selectedPreset.name} — ${selectedPreset.artist}`
    : audioFile?.name || null

  // ── Post ─────────────────────────────────────────────────────────────
  async function handlePost() {
    if (!videoBlob) return
    if (videoBlob.size > 200 * 1024 * 1024) {
      toast.error(t.reelCreator.stillTooLarge)
      setStep('edit')
      setEditTab('trim')
      return
    }
    setIsPosting(true)
    // Dừng preview nhạc
    presetAudioRef.current?.pause()
    uploadAudioRef.current?.pause()
    try {
      const formData = new FormData()
      const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm'
      formData.append('media', videoBlob, `reel.${ext}`)
      if (audioFile) {
        formData.append('audio', audioFile)
      } else if (selectedPreset) {
        formData.append('presetAudioUrl', selectedPreset.url)
      }
      formData.append('caption', caption)
      formData.append('filter', activeFilterCss)
      formData.append('trimStart', trimStart)
      formData.append('trimEnd', trimEnd)
      formData.append('duration', videoDuration)
      formData.append('audioName', activeAudioName || '')

      await createReel(formData)
      toast.success(t.reelCreator.posted)
      queryClient.invalidateQueries({ queryKey: ['reels'] })
      onCreated?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || t.reelCreator.postFailed)
    } finally {
      setIsPosting(false)
    }
  }

  // ── Gợi ý caption: chụp 1 khung hình từ video preview → gửi Gemini Vision ──
  async function handleSuggestCaption() {
    const video = detailsVideoRef.current
    if (!video || !video.videoWidth) {
      toast.error(t.ai.captionError)
      return
    }
    // Vẽ frame hiện tại ra canvas → data URL (blob video cùng origin nên không bị taint)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

    setAiCaptionLoading(true)
    try {
      const res = await generateCaption(dataUrl, 'image/jpeg', lang)
      const data = res.data
      let newCaption = data.caption || ''
      if (data.hashtags && data.hashtags.length) {
        newCaption = (newCaption + '\n\n' + data.hashtags.join(' ')).trim()
      }
      setCaption(newCaption.slice(0, 2200))
    } catch (err) {
      toast.error(err.response?.data?.message || t.ai.captionError)
    } finally {
      setAiCaptionLoading(false)
    }
  }

  const startPct    = videoDuration ? (trimStart / videoDuration) * 100 : 0
  const endPct      = videoDuration ? (trimEnd   / videoDuration) * 100 : 100
  const trimDuration = trimEnd - trimStart

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${step === 'edit' ? styles.editModal : ''}`}>

        {/* ── SOURCE ── */}
        {step === 'source' && (
          <div className={styles.sourceStep}>
            <div className={styles.stepTitle}>{t.reelCreator.title}</div>
            <div className={styles.sourceOptions}>
              <button className={styles.sourceBtn} onClick={startCamera}>
                <span className={styles.sourceBtnIcon}>📷</span>
                <span className={styles.sourceBtnLabel}>{t.reelCreator.recordOption}</span>
                <span className={styles.sourceBtnDesc}>{t.reelCreator.recordDesc}</span>
              </button>
              <label className={styles.sourceBtn}>
                <span className={styles.sourceBtnIcon}>🖼️</span>
                <span className={styles.sourceBtnLabel}>{t.reelCreator.uploadOption}</span>
                <span className={styles.sourceBtnDesc}>{t.reelCreator.uploadDesc}</span>
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileChange} />
              </label>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>{t.reelCreator.cancel}</button>
          </div>
        )}

        {/* ── CAMERA ── */}
        {step === 'camera' && (
          <div className={styles.cameraStep}>
            <div className={styles.cameraHeader}>
              <button className={styles.backBtn} onClick={() => { stopCamera(); setStep('source') }}>←</button>
              <div className={styles.stepTitle}>{t.reelCreator.recordStep}</div>
              <button className={styles.flipBtn} onClick={flipCamera} title={t.reelCreator.flipCamera}>🔄</button>
            </div>
            {cameraError ? (
              <div className={styles.cameraError}>{cameraError}</div>
            ) : (
              <div className={styles.cameraPreviewWrap}>
                <video ref={cameraVideoRef} className={styles.cameraPreview} autoPlay playsInline muted />
                {isRecording && (
                  <div className={styles.recordingTimer}>
                    🔴 {formatTime(recordingTime)} / {formatTime(MAX_RECORD_SEC)}
                  </div>
                )}
              </div>
            )}
            {!cameraError && (
              <div className={styles.cameraControls}>
                <button
                  className={`${styles.recordBtn} ${isRecording ? styles.recordBtnActive : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? '⏹' : '⏺'}
                </button>
                <div className={styles.recordLabel}>{isRecording ? t.reelCreator.stopRecord : t.reelCreator.startRecord}</div>
              </div>
            )}
          </div>
        )}

        {/* ── EDIT ── */}
        {step === 'edit' && (
          <div className={styles.editStep}>
            {isTrimming && (
              <div className={styles.trimProgressOverlay}>
                <div className={styles.trimProgressBox}>
                  <div className={styles.trimProgressTitle}>{t.reelCreator.exportOverlayTitle}</div>
                  <div className={styles.trimProgressTrack}>
                    <div className={styles.trimProgressFill} style={{ width: `${trimProgress}%` }} />
                  </div>
                  <div className={styles.trimProgressPct}>{trimProgress}%</div>
                  <div className={styles.trimProgressHint}>{t.reelCreator.exportOverlayHint}</div>
                </div>
              </div>
            )}

            {/* Cột trái: video preview */}
            <div className={styles.editLeft}>
              <div className={styles.editPreviewWrap}>
                <video
                  ref={editPreviewRef}
                  src={videoObjectUrl}
                  style={{ filter: activeFilterCss }}
                  className={styles.editPreview}
                  loop={!trimEnd || trimEnd >= videoDuration}
                  autoPlay muted playsInline
                  onTimeUpdate={handleEditTimeUpdate}
                />
                {activeAudioName && (
                  <div className={styles.audioOverlay}>🎵 {activeAudioName}</div>
                )}
              </div>
            </div>

            {/* Cột phải: header + tabs + panels */}
            <div className={styles.editRight}>
            <div className={styles.editHeader}>
              <button className={styles.backBtn} onClick={() => setStep('source')}>←</button>
              <div className={styles.stepTitle}>{t.reelCreator.editStep}</div>
              <button className={styles.nextBtn} onClick={() => setStep('details')}>{t.reelCreator.next}</button>
            </div>

            <div className={styles.editTabs}>
              {[
                { id: 'trim',   label: t.reelCreator.trimTab },
                { id: 'filter', label: t.reelCreator.filterTab },
                { id: 'music',  label: t.reelCreator.musicTab },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`${styles.editTab} ${editTab === tab.id ? styles.editTabActive : ''}`}
                  onClick={() => setEditTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Trim */}
            {editTab === 'trim' && (
              <div className={styles.trimPanel}>
                {isOversized && (
                  <div className={styles.oversizedWarning}>
                    ⚠️ {t.reelCreator.oversizedWarning}
                  </div>
                )}
                <div className={styles.trimInfo}>
                  <span>{formatTime(trimStart)}</span>
                  <span className={styles.trimDuration}>{formatTime(trimDuration)} / {formatTime(videoDuration)}</span>
                  <span>{formatTime(trimEnd)}</span>
                </div>
                <div ref={trimRef} className={styles.trimTrack}>
                  <div className={styles.trimFill} style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
                  <div
                    className={`${styles.trimHandle} ${styles.trimHandleStart}`}
                    style={{ left: `${startPct}%` }}
                    onPointerDown={e => handleTrimPointerDown(e, 'start')}
                    onPointerMove={handleTrimPointerMove}
                    onPointerUp={handleTrimPointerUp}
                  />
                  <div
                    className={`${styles.trimHandle} ${styles.trimHandleEnd}`}
                    style={{ left: `${endPct}%` }}
                    onPointerDown={e => handleTrimPointerDown(e, 'end')}
                    onPointerMove={handleTrimPointerMove}
                    onPointerUp={handleTrimPointerUp}
                  />
                </div>
                <div className={styles.trimHint}>{t.reelCreator.trimHint}</div>
                {isOversized && (
                  <button
                    className={styles.exportBtn}
                    onClick={handleTrimExport}
                    disabled={isTrimming}
                  >
                    {isTrimming ? `⏳ ${trimProgress}%` : t.reelCreator.exportBtn}
                  </button>
                )}
              </div>
            )}

            {/* Filter */}
            {editTab === 'filter' && (
              <div className={styles.filterPanel}>
                {VIDEO_FILTERS.map(f => (
                  <button
                    key={f.id}
                    className={`${styles.filterItem} ${activeFilter === f.id ? styles.filterActive : ''}`}
                    onClick={() => { setActiveFilter(f.id); setActiveFilterCss(f.css) }}
                  >
                    <div className={styles.filterThumbWrap}>
                      <video src={videoObjectUrl} className={styles.filterThumb} style={{ filter: f.css }} muted playsInline preload="metadata" />
                    </div>
                    <span className={styles.filterName}>{f.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Music */}
            {editTab === 'music' && (
              <div className={styles.musicPanel}>

                {/* Section: nhạc hot */}
                <div className={styles.musicSectionTitle}>{t.reelCreator.musicHot}</div>
                <div className={styles.trackList}>
                  {PRESET_TRACKS.filter(t => !brokenTrackIds.has(t.id)).map(track => {
                    const isSelected  = selectedPreset?.id === track.id
                    const isPreviewing = previewingId === track.id
                    return (
                      <div
                        key={track.id}
                        className={`${styles.trackItem} ${isSelected ? styles.trackSelected : ''}`}
                        onClick={() => selectPreset(track)}
                      >
                        {/* Album art */}
                        <div className={styles.trackArt} style={{ background: track.color }}>
                          <span className={styles.trackNote}>{isPreviewing ? '🎵' : '♪'}</span>
                        </div>

                        {/* Info */}
                        <div className={styles.trackInfo}>
                          <div className={styles.trackName}>{track.name}</div>
                          <div className={styles.trackMeta}>
                            <span className={styles.trackArtist}>{track.artist}</span>
                            <span className={styles.trackGenreBadge}>{track.genre}</span>
                          </div>
                        </div>

                        {/* Duration + preview */}
                        <div className={styles.trackRight}>
                          <span className={styles.trackDuration}>{formatTime(track.duration)}</span>
                          <button
                            className={`${styles.trackPlayBtn} ${isPreviewing ? styles.trackPlayBtnActive : ''}`}
                            onClick={e => { e.stopPropagation(); toggleTrackPreview(track) }}
                            title={isPreviewing ? 'Dừng' : 'Nghe thử'}
                          >
                            {isPreviewing ? '⏸' : '▶'}
                          </button>
                        </div>

                        {/* Check mark khi chọn */}
                        {isSelected && <div className={styles.trackCheck}>✓</div>}
                      </div>
                    )
                  })}
                </div>

                {/* Divider */}
                <div className={styles.musicDivider}>
                  <span>{t.reelCreator.musicOr}</span>
                </div>

                {/* Upload nhạc riêng */}
                {audioFile ? (
                  <div className={styles.audioSelected}>
                    <div className={styles.audioInfo}>
                      <span className={styles.audioIcon}>🎵</span>
                      <div>
                        <div className={styles.audioName}>{audioFile.name}</div>
                        <div className={styles.audioSize}>{(audioFile.size / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                    </div>
                    <div className={styles.audioActions}>
                      <button className={styles.audioPlayBtn} onClick={toggleUploadPreview}>
                        {uploadPlaying ? '⏸' : '▶️'}
                      </button>
                      <button className={styles.audioRemoveBtn} onClick={removeAudio}>✕</button>
                    </div>
                  </div>
                ) : (
                  <label className={styles.audioUploadBtn}>
                    {t.reelCreator.musicUpload}
                    <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioChange} />
                  </label>
                )}
              </div>
            )}
            </div> {/* end editRight */}
          </div>
        )}

        {/* ── DETAILS ── */}
        {step === 'details' && (
          <div className={styles.detailsStep}>
            <div className={styles.detailsHeader}>
              <button className={styles.backBtn} onClick={() => setStep('edit')}>←</button>
              <div className={styles.stepTitle}>{t.reelCreator.detailsStep}</div>
            </div>

            <div className={styles.detailsPreview}>
              <video ref={detailsVideoRef} src={videoObjectUrl} style={{ filter: activeFilterCss }} className={styles.detailsMiniVideo} loop autoPlay muted playsInline />
              <div className={styles.detailsPreviewMeta}>
                {activeFilter !== 'none' && <span className={styles.metaTag}>🎨 {VIDEO_FILTERS.find(f => f.id === activeFilter)?.name}</span>}
                {activeAudioName && <span className={styles.metaTag}>🎵 {activeAudioName}</span>}
                <span className={styles.metaTag}>✂️ {formatTime(trimDuration)}</span>
              </div>
            </div>

            <div className={styles.detailsField}>
              <label className={styles.detailsLabel}>{t.reelCreator.captionLabel}</label>
              <button
                type="button"
                onClick={handleSuggestCaption}
                disabled={aiCaptionLoading}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  margin: '0 0 8px', padding: '7px 12px',
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 13, fontWeight: 600,
                  color: '#0095f6',
                  cursor: aiCaptionLoading ? 'not-allowed' : 'pointer',
                  opacity: aiCaptionLoading ? 0.6 : 1,
                }}
              >
                {aiCaptionLoading ? t.ai.suggesting : t.ai.suggestCaption}
              </button>
              <textarea
                className={styles.captionInput}
                placeholder={t.reelCreator.captionPlaceholder}
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={2200}
                rows={3}
              />
              <div className={styles.captionCount}>{caption.length} / 2200</div>
            </div>

            <button className={styles.postBtn} onClick={handlePost} disabled={isPosting}>
              {isPosting ? t.reelCreator.posting : t.reelCreator.postBtn}
            </button>
          </div>
        )}

      {/* Audio elements luôn tồn tại — không đặt trong conditional tab để tránh unmount */}
      <audio ref={presetAudioRef} onEnded={() => setPreviewingId(null)} style={{ display: 'none' }} />
      <audio ref={uploadAudioRef} onEnded={() => setUploadPlaying(false)} style={{ display: 'none' }} />

      </div>
    </div>
  )
}
