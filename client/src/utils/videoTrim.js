// videoTrim.js
// Client-side video trimming: canvas capture + MediaRecorder
// Không cần FFmpeg — ghi lại frame-by-frame từ video element qua canvas
//
// Giới hạn:
//   - Xử lý theo thời gian thực (đoạn 60s mất ~60s để xuất)
//   - Chất lượng thấp hơn gốc một chút (vp8/vp9 2.5 Mbps)
//   - Phải scale xuống max 1280px để giảm file size
//
// Dùng Web Audio API để capture audio từ video element
//   → muted=true trên video để tránh echo, nhưng audio vẫn được capture qua AudioContext

export async function trimAndExportVideo(videoBlob, startTime, endTime, onProgress) {
  const duration = endTime - startTime
  if (duration <= 0) throw new Error('Khoảng cắt không hợp lệ')

  const url = URL.createObjectURL(videoBlob)

  const video = document.createElement('video')
  video.src = url
  video.crossOrigin = 'anonymous'
  video.preload = 'auto'

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve
    video.onerror = () => reject(new Error('Không thể đọc video'))
    setTimeout(() => reject(new Error('Timeout khi tải video')), 15000)
  })

  // Scale xuống max 1280px để giảm file size khi video quá lớn
  const scale  = Math.min(1, 1280 / (video.videoWidth || 1280))
  const width  = Math.round((video.videoWidth  || 1280) * scale)
  const height = Math.round((video.videoHeight || 720)  * scale)

  const canvas = document.createElement('canvas')
  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Stream video qua canvas
  const canvasStream = canvas.captureStream(30)

  // Capture audio qua Web Audio API
  let audioTracks = []
  let audioCtx    = null
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const src = audioCtx.createMediaElementSource(video)
    const dst = audioCtx.createMediaStreamDestination()
    src.connect(dst)
    audioTracks = dst.stream.getAudioTracks()
  } catch {
    // Video không có audio hoặc browser không hỗ trợ — tiếp tục không có audio
  }

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ])

  const mimeType =
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' :
    MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' :
    'video/webm'

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 2_500_000, // 2.5 Mbps — cân bằng chất lượng / file size
  })

  const chunks = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  // Seek đến startTime
  video.currentTime = startTime
  await new Promise((resolve, reject) => {
    video.onseeked = resolve
    setTimeout(reject, 8000, new Error('Timeout khi seek video'))
  })

  recorder.start(200)
  video.muted = true   // tắt tiếng output, âm thanh đã được capture qua AudioContext
  video.playbackRate = 1
  await video.play()

  return new Promise((resolve, reject) => {
    let rafId = null
    let finished = false
    // Dùng wall-clock từ frame đầu tiên hợp lệ (currentTime >= startTime)
    // để tránh sai số do keyframe snap khiến video seek trước startTime
    let recordStartMs = null

    function drawLoop() {
      if (finished) return
      if (video.paused || video.ended) {
        stopRecording()
        return
      }

      // Bỏ qua frame nếu video chưa tới startTime (do keyframe snap)
      if (video.currentTime < startTime) {
        rafId = requestAnimationFrame(drawLoop)
        return
      }

      // Bắt đầu đếm thời gian từ frame hợp lệ đầu tiên
      if (recordStartMs === null) recordStartMs = performance.now()

      const elapsed = (performance.now() - recordStartMs) / 1000
      if (elapsed >= duration || video.currentTime >= endTime) {
        stopRecording()
        return
      }

      ctx.drawImage(video, 0, 0, width, height)
      onProgress?.(Math.min(elapsed, duration), duration)
      rafId = requestAnimationFrame(drawLoop)
    }

    function stopRecording() {
      if (finished) return
      finished = true
      cancelAnimationFrame(rafId)
      video.pause()
      if (recorder.state !== 'inactive') recorder.stop()
    }

    rafId = requestAnimationFrame(drawLoop)

    // Safety net: dừng nếu quá thời gian
    const watchdog = setTimeout(stopRecording, (duration + 10) * 1000)

    recorder.onstop = () => {
      clearTimeout(watchdog)
      audioCtx?.close()
      URL.revokeObjectURL(url)
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    recorder.onerror = e => {
      clearTimeout(watchdog)
      finished = true
      cancelAnimationFrame(rafId)
      audioCtx?.close()
      URL.revokeObjectURL(url)
      reject(new Error('Lỗi ghi video: ' + (e.error?.message || 'unknown')))
    }

    video.onerror = () => {
      clearTimeout(watchdog)
      stopRecording()
      reject(new Error('Lỗi phát video khi xuất'))
    }
  })
}

export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB'
  if (bytes >= 1024 * 1024)        return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024).toFixed(0) + ' KB'
}
