// components/post/CreatePostForm.jsx
// Form tạo bài viết mới — upload ảnh/video lên server
//
// Luồng:
//   1. User kéo thả hoặc chọn file → preview ngay bằng FileReader
//   2. Submit → gửi FormData lên POST /api/posts
//   3. Server xác định type tự động: 'image' | 'carousel' | 'video'
//
// Validation (client-side trước khi upload):
//   - Chỉ chấp nhận image/* và video/*
//   - Tối đa 10 file mỗi bài
//   - Ảnh: tối đa 10MB/file | Video: tối đa 100MB/file
//
// show=false → không render gì (tránh tạo DOM không cần thiết)

import { useState, useRef, useEffect } from 'react'
import EmojiPicker from 'emoji-picker-react'
import toast from 'react-hot-toast'
import { createPost } from '../../features/post/postAPI'
import { generateCaption } from '../../features/ai/aiAPI'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './CreatePostForm.module.css'

// Giới hạn kích thước file
const MAX_IMAGE_SIZE = 10 * 1024 * 1024   // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024  // 100 MB
const MAX_FILES = 10

// Bộ filter đổi màu cho ảnh — dùng chuỗi CSS filter, ghép chết vào ảnh khi đăng
const IMAGE_FILTERS = [
  { id: 'none',     name: 'Gốc',       css: 'none' },
  { id: 'bright',   name: 'Sáng',      css: 'brightness(1.25) contrast(1.05)' },
  { id: 'vivid',    name: 'Tươi',      css: 'brightness(1.1) saturate(1.6) contrast(1.1)' },
  { id: 'vintage',  name: 'Vintage',   css: 'sepia(0.4) contrast(0.9) brightness(1.1)' },
  { id: 'bw',       name: 'Đen trắng', css: 'grayscale(1)' },
  { id: 'cool',     name: 'Lạnh',      css: 'hue-rotate(180deg) saturate(0.9) brightness(1.05)' },
  { id: 'warm',     name: 'Ấm',        css: 'sepia(0.25) saturate(1.4) brightness(1.05)' },
  { id: 'dramatic', name: 'Kịch tính', css: 'contrast(1.5) saturate(1.2) brightness(0.88)' },
]

// Emoji để dán lên ảnh (sticker)
const STICKER_EMOJIS = ['❤️', '😍', '😂', '🔥', '✨', '😎', '👍', '🎉', '🌟', '💯', '🥳', '🌈', '☀️', '🍕', '🎵', '📍']

// Tra chuỗi CSS filter theo id
function filterCssById(id) {
  var f = IMAGE_FILTERS.find(function (x) { return x.id === id })
  return f ? f.css : 'none'
}

function captureVideoThumbnail(file) {
  return new Promise(function (resolve) {
    var video = document.createElement('video')
    var canvas = document.createElement('canvas')
    var objectUrl = URL.createObjectURL(file)
    var done = false
    var fallbackTimer = null

    function cleanup() {
      if (fallbackTimer) clearTimeout(fallbackTimer)
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
    }

    function drawThumbnail() {
      if (done || video.readyState < 2) return
      done = true

      var width = video.videoWidth || 640
      var height = video.videoHeight || 640
      var maxSize = 720
      var scale = Math.min(1, maxSize / Math.max(width, height))

      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)

      var thumbnail = canvas.toDataURL('image/jpeg', 0.8)
      cleanup()
      resolve(thumbnail)
    }

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    video.onerror = function () {
      cleanup()
      resolve('')
    }

    video.onloadedmetadata = function () {
      var targetTime = Math.min(0.1, video.duration || 0)
      if (targetTime > 0) {
        video.currentTime = targetTime
      } else {
        drawThumbnail()
      }
    }

    video.onloadeddata = drawThumbnail
    video.onseeked = drawThumbnail
    fallbackTimer = setTimeout(function () {
      if (done) return
      done = true
      cleanup()
      resolve('')
    }, 2500)
  })
}

// Ghép filter màu + sticker emoji vào ảnh bằng canvas → trả về File mới để upload.
// Không sửa gì (filter 'none' và không sticker) → giữ nguyên file gốc cho nhẹ.
// Toạ độ/cỡ sticker lưu theo % nên map đúng sang kích thước thật của ảnh.
function renderEditedImage(file, edit) {
  return new Promise(function (resolve) {
    var hasEdit = edit && (edit.filter !== 'none' || (edit.stickers && edit.stickers.length > 0))
    if (!hasEdit) {
      resolve(file)
      return
    }

    var img = new Image()
    var objectUrl = URL.createObjectURL(file)

    img.onload = function () {
      var canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      var ctx = canvas.getContext('2d')

      // 0. Nền trắng — ảnh PNG trong suốt khi xuất JPEG sẽ thành đen nếu không đổ nền
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 1. Vẽ ảnh kèm filter màu (ctx.filter nhận chuỗi CSS filter)
      var css = filterCssById(edit.filter)
      ctx.filter = css === 'none' ? 'none' : css
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      ctx.filter = 'none'

      // 2. Vẽ sticker emoji lên trên — toạ độ theo % của ảnh
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      edit.stickers.forEach(function (s) {
        var fontPx = (s.sizePct / 100) * canvas.width
        ctx.font = fontPx + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
        ctx.fillText(s.emoji, (s.xPct / 100) * canvas.width, (s.yPct / 100) * canvas.height)
      })

      URL.revokeObjectURL(objectUrl)
      canvas.toBlob(function (blob) {
        if (!blob) {
          resolve(file)
          return
        }
        var newName = file.name.replace(/\.\w+$/, '') + '.jpg'
        resolve(new File([blob], newName, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.92)
    }

    img.onerror = function () {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

export default function CreatePostForm({ show, onClose, onCreated }) {
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [videoThumbnails, setVideoThumbnails] = useState([])
  const [thumbnailLoading, setThumbnailLoading] = useState(false)
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  // Chỉnh sửa ảnh: mỗi ảnh 1 bản ghi { filter, stickers[] } song song với files
  const [imageEdits, setImageEdits] = useState([])
  const [imageRatios, setImageRatios] = useState([])   // tỷ lệ "w / h" ảnh thật → khung khớp ảnh, sticker không lệch
  const [activeIdx, setActiveIdx] = useState(0)   // ảnh đang chỉnh trong khung lớn
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const { t, lang } = useLanguage()
  const fileRef = useRef()
  const captionRef = useRef()

  // Đóng emoji picker khi click ra ngoài vùng picker
  useEffect(function () {
    if (!showEmojiPicker) return
    function onClickOutside(e) {
      if (!e.target.closest('[data-emoji-wrap]')) setShowEmojiPicker(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return function () { document.removeEventListener('mousedown', onClickOutside) }
  }, [showEmojiPicker])

  // Không render khi đang ẩn
  if (!show) return null

  // Validate và tạo preview cho danh sách file được chọn
  async function handleFiles(selected) {
    const arr = Array.from(selected)
    if (!arr.length) return

    // Kiểm tra số lượng file
    if (arr.length > MAX_FILES) {
      toast.error('Tối đa ' + MAX_FILES + ' file mỗi bài')
      return
    }

    // Kiểm tra từng file: loại và kích thước
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i]
      var isVideo = f.type.startsWith('video')
      var isImage = f.type.startsWith('image')

      if (!isVideo && !isImage) {
        toast.error(f.name + ': chỉ chấp nhận ảnh hoặc video')
        return
      }

      if (isImage && f.size > MAX_IMAGE_SIZE) {
        toast.error(f.name + ': ảnh phải nhỏ hơn 10MB')
        return
      }

      if (isVideo && f.size > MAX_VIDEO_SIZE) {
        toast.error(f.name + ': video phải nhỏ hơn 100MB')
        return
      }
    }

    setFiles(arr)
    setVideoThumbnails([])
    setThumbnailLoading(arr.some(function (f) { return f.type.startsWith('video') }))
    // Mỗi file 1 bản ghi chỉnh sửa rỗng (chỉ ảnh mới dùng tới)
    setImageEdits(arr.map(function () { return { filter: 'none', stickers: [] } }))
    setImageRatios([])
    setActiveIdx(0)

    // Tạo preview bằng FileReader — không cần upload xong mới thấy
    var newPreviews = []
    arr.forEach(function (f, i) {
      var reader = new FileReader()
      reader.onload = function (ev) {
        newPreviews[i] = {
          url: ev.target.result,
          type: f.type.startsWith('video') ? 'video' : 'image',
        }
        // Khi tất cả file đã đọc xong → cập nhật state 1 lần
        if (newPreviews.filter(Boolean).length === arr.length) {
          setPreviews([...newPreviews])
        }
      }
      reader.readAsDataURL(f)
    })

    try {
      var thumbnails = await Promise.all(arr.map(function (f) {
        return f.type.startsWith('video') ? captureVideoThumbnail(f) : Promise.resolve('')
      }))
      setVideoThumbnails(thumbnails)
    } finally {
      setThumbnailLoading(false)
    }
  }

  // Xử lý kéo thả file vào dropzone
  function handleDrop(e) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  // Cập nhật bản ghi chỉnh sửa của ảnh đang active
  function patchActiveEdit(updater) {
    setImageEdits(function (prev) {
      var next = prev.slice()
      var cur = next[activeIdx] || { filter: 'none', stickers: [] }
      next[activeIdx] = updater(cur)
      return next
    })
  }

  // Chọn filter màu cho ảnh đang active
  function chooseFilter(filterId) {
    patchActiveEdit(function (cur) {
      return Object.assign({}, cur, { filter: filterId })
    })
  }

  // Dán sticker emoji vào giữa ảnh đang active
  function addSticker(emoji) {
    patchActiveEdit(function (cur) {
      var sticker = { id: Date.now() + '_' + Math.random(), emoji: emoji, xPct: 50, yPct: 50, sizePct: 12 }
      return Object.assign({}, cur, { stickers: cur.stickers.concat([sticker]) })
    })
  }

  // Xoá sticker (double click)
  function removeSticker(stickerId) {
    patchActiveEdit(function (cur) {
      return Object.assign({}, cur, {
        stickers: cur.stickers.filter(function (s) { return s.id !== stickerId }),
      })
    })
  }

  // Kéo sticker quanh ảnh — cập nhật toạ độ % theo vị trí con trỏ trong khung stage
  function startDragSticker(e, stickerId, stageEl) {
    e.preventDefault()
    var idx = activeIdx

    function onMove(ev) {
      // Chặn cuộn trang khi kéo sticker bằng ngón tay (touch)
      if (ev.cancelable) ev.preventDefault()
      var rect = stageEl.getBoundingClientRect()
      var clientX = ev.touches ? ev.touches[0].clientX : ev.clientX
      var clientY = ev.touches ? ev.touches[0].clientY : ev.clientY
      var xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      var yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
      setImageEdits(function (prev) {
        var next = prev.slice()
        var cur = next[idx]
        if (!cur) return prev
        next[idx] = Object.assign({}, cur, {
          stickers: cur.stickers.map(function (s) {
            return s.id === stickerId ? Object.assign({}, s, { xPct: xPct, yPct: yPct }) : s
          }),
        })
        return next
      })
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }

  // Chèn emoji vào caption tại vị trí con trỏ
  function insertEmoji(emoji) {
    var el = captionRef.current
    var start = el ? el.selectionStart : caption.length
    var end = el ? el.selectionEnd : caption.length
    var next = (caption.slice(0, start) + emoji + caption.slice(end)).slice(0, 2200)
    setCaption(next)
    // Đặt lại con trỏ ngay sau emoji vừa chèn
    setTimeout(function () {
      if (!el) return
      el.focus()
      var pos = start + emoji.length
      el.setSelectionRange(pos, pos)
    }, 0)
  }

  // Gợi ý caption + hashtag từ ảnh bằng AI (Gemini Vision)
  // Dùng lại data URL của preview ảnh đầu tiên — không cần upload trước
  async function handleSuggestCaption() {
    var imgPreview = previews.find(function (p) { return p.type === 'image' })
    if (!imgPreview) {
      toast.error(t.ai.needImage)
      return
    }
    setAiLoading(true)
    try {
      var res = await generateCaption(imgPreview.url, '', lang)
      var data = res.data
      var newCaption = data.caption || ''
      if (data.hashtags && data.hashtags.length) {
        newCaption = (newCaption + '\n\n' + data.hashtags.join(' ')).trim()
      }
      setCaption(newCaption.slice(0, 2200))
    } catch (err) {
      toast.error(err.response?.data?.message || t.ai.captionError)
    } finally {
      setAiLoading(false)
    }
  }

  // Submit form — gửi file + caption lên server
  async function handleSubmit(e) {
    e.preventDefault()
    if (!files.length) {
      toast.error('Vui lòng chọn ảnh hoặc video')
      return
    }

    setLoading(true)
    try {
      // Ghép filter + sticker vào ảnh; video giữ nguyên
      var processedFiles = await Promise.all(files.map(function (f, i) {
        if (f.type.startsWith('image')) {
          return renderEditedImage(f, imageEdits[i])
        }
        return Promise.resolve(f)
      }))

      var fd = new FormData()
      processedFiles.forEach(function (f) { fd.append('media', f) })
      fd.append('videoThumbnails', JSON.stringify(videoThumbnails))
      fd.append('caption', caption)

      var res = await createPost(fd)
      toast.success('Đã chia sẻ bài viết!')
      // Trả bài mới về component cha để update feed
      onCreated?.(res.data.post || res.data)
      handleClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng bài thất bại')
    } finally {
      setLoading(false)
    }
  }

  // Reset form và đóng modal
  function handleClose() {
    setFiles([])
    setPreviews([])
    setVideoThumbnails([])
    setThumbnailLoading(false)
    setCaption('')
    setImageEdits([])
    setImageRatios([])
    setActiveIdx(0)
    setShowEmojiPicker(false)
    onClose()
  }

  // Ảnh/video đang hiển thị lớn trong khung edit
  var activePreview = previews[activeIdx] || null
  var activeEdit = imageEdits[activeIdx] || { filter: 'none', stickers: [] }
  var activeIsImage = activePreview && activePreview.type === 'image'

  return (
    // Click overlay bên ngoài dialog → đóng modal
    <div className={styles.overlay} onClick={function (e) { if (e.target === e.currentTarget) handleClose() }}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <span />
          <span className={styles.title}>Create new post</span>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          {previews.length === 0 ? (
            // Dropzone: kéo thả hoặc click để chọn file
            <div
              className={styles.dropzone}
              onClick={function () { fileRef.current.click() }}
              onDrop={handleDrop}
              onDragOver={function (e) { e.preventDefault() }}
            >
              <div className={styles.dropIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
              <div className={styles.dropText}>Drag photos and videos here</div>
              <div className={styles.dropSub}>JPG, PNG, MP4, MOV • Max {MAX_FILES} files • Image ≤10MB • Video ≤100MB</div>
              <button type="button" className={styles.selectBtn}>Select from device</button>
              {/* Input file ẩn — trigger bằng ref */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: 'none' }}
                onChange={function (e) { handleFiles(e.target.files) }}
              />
            </div>
          ) : (
            // Khung chỉnh sửa: ảnh lớn (filter + sticker) + dải thumbnail + bộ filter/sticker
            <div className={styles.previewArea}>
              {/* Stage: ảnh đang active, dán sticker kéo thả lên trên.
                  Với ảnh, khung lấy đúng tỷ lệ ảnh thật → không có viền → sticker map vị trí chính xác */}
              <div
                className={styles.stage}
                style={activeIsImage && imageRatios[activeIdx] ? { aspectRatio: imageRatios[activeIdx] } : undefined}
              >
                {activePreview && activePreview.type === 'video' ? (
                  <video src={activePreview.url} className={styles.stageMedia} controls muted />
                ) : activePreview ? (
                  <img
                    src={activePreview.url}
                    alt={'preview-' + activeIdx}
                    className={styles.stageMedia}
                    style={{ filter: filterCssById(activeEdit.filter) }}
                    onLoad={function (e) {
                      var nw = e.target.naturalWidth
                      var nh = e.target.naturalHeight
                      if (!nw || !nh) return
                      var ratio = nw + ' / ' + nh
                      setImageRatios(function (prev) {
                        if (prev[activeIdx] === ratio) return prev
                        var next = prev.slice()
                        next[activeIdx] = ratio
                        return next
                      })
                    }}
                  />
                ) : null}

                {/* Sticker emoji — kéo để di chuyển, double click để xoá */}
                {activeIsImage && activeEdit.stickers.map(function (s) {
                  return (
                    <span
                      key={s.id}
                      className={styles.stageSticker}
                      style={{ left: s.xPct + '%', top: s.yPct + '%', fontSize: s.sizePct + 'cqw' }}
                      onMouseDown={function (e) { startDragSticker(e, s.id, e.currentTarget.parentNode) }}
                      onTouchStart={function (e) { startDragSticker(e, s.id, e.currentTarget.parentNode) }}
                      onDoubleClick={function () { removeSticker(s.id) }}
                      title="Kéo để di chuyển • Double click để xoá"
                    >
                      {s.emoji}
                    </span>
                  )
                })}
              </div>

              {/* Dải thumbnail chuyển ảnh active (chỉ hiện khi nhiều file) */}
              {previews.length > 1 && (
                <div className={styles.thumbStrip}>
                  {previews.map(function (p, i) {
                    return (
                      <button
                        type="button"
                        key={i}
                        className={i === activeIdx ? styles.thumbActive : styles.thumb}
                        onClick={function () { setActiveIdx(i) }}
                      >
                        {p.type === 'video'
                          ? <video src={p.url} muted />
                          : <img src={p.url} alt={'thumb-' + i} />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Bộ filter + sticker — chỉ áp dụng cho ảnh, không cho video */}
              {activeIsImage && (
                <>
                  <div className={styles.editLabel}>Bộ lọc màu</div>
                  <div className={styles.filterRow}>
                    {IMAGE_FILTERS.map(function (f) {
                      return (
                        <button
                          type="button"
                          key={f.id}
                          className={activeEdit.filter === f.id ? styles.filterChipActive : styles.filterChip}
                          onClick={function () { chooseFilter(f.id) }}
                        >
                          <span className={styles.filterThumbWrap}>
                            <img src={activePreview.url} alt={f.name} style={{ filter: f.css }} />
                          </span>
                          <span>{f.name}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className={styles.editLabel}>Dán sticker</div>
                  <div className={styles.stickerRow}>
                    {STICKER_EMOJIS.map(function (emoji) {
                      return (
                        <button
                          type="button"
                          key={emoji}
                          className={styles.stickerBtn}
                          onClick={function () { addSticker(emoji) }}
                        >
                          {emoji}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Nút đổi file — reset preview về dropzone */}
              <button
                type="button"
                className={styles.clearBtn}
                onClick={function () {
                  setFiles([]); setPreviews([]); setVideoThumbnails([]); setThumbnailLoading(false)
                  setImageEdits([]); setImageRatios([]); setActiveIdx(0)
                }}
              >
                Change files
              </button>
            </div>
          )}

          {/* Nút gợi ý caption bằng AI — chỉ hiện khi đã chọn ít nhất 1 ảnh */}
          {previews.some(function (p) { return p.type === 'image' }) && (
            <button
              type="button"
              onClick={handleSuggestCaption}
              disabled={aiLoading}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                margin: '4px 0', padding: '7px 12px',
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                color: '#0095f6',
                cursor: aiLoading ? 'not-allowed' : 'pointer',
                opacity: aiLoading ? 0.6 : 1,
              }}
            >
              {aiLoading ? t.ai.suggesting : t.ai.suggestCaption}
            </button>
          )}

          {/* Caption + nút emoji */}
          <div className={styles.captionWrap}>
            <textarea
              ref={captionRef}
              className={styles.caption}
              placeholder="Write a caption…"
              value={caption}
              onChange={function (e) { setCaption(e.target.value) }}
              rows={3}
              maxLength={2200}
            />
            <div className={styles.emojiWrap} data-emoji-wrap>
              <button
                type="button"
                className={styles.emojiToggle}
                onClick={function () { setShowEmojiPicker(function (v) { return !v }) }}
                aria-label="Chèn emoji"
                title="Chèn emoji"
              >
                😊
              </button>
              {showEmojiPicker && (
                <div className={styles.emojiPopup} data-emoji-wrap>
                  <EmojiPicker
                    onEmojiClick={function (emojiData) { insertEmoji(emojiData.emoji) }}
                    theme="dark"
                    searchPlaceHolder="Tìm emoji..."
                    height={380}
                    width={320}
                    lazyLoadEmojis
                  />
                </div>
              )}
            </div>
          </div>
          <div className={styles.captionCount}>{caption.length} / 2200</div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
            <button
              type="submit"
              className={styles.shareBtn}
              disabled={!files.length || loading || thumbnailLoading}
            >
              {loading ? 'Sharing…' : (thumbnailLoading ? 'Preparing…' : 'Share')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
