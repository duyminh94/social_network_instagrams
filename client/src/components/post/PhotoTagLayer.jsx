// components/post/PhotoTagLayer.jsx
// Lớp phủ hiển thị người được gắn thẻ trên ảnh của bài viết.
//
// Vì sao cần lớp riêng: ảnh trong PostModal dùng objectFit: 'contain' nên KHÔNG phủ kín
// khung — hai bên (hoặc trên dưới) còn dải trống. PhotoTag lưu x, y theo tỉ lệ 0→1 của
// CHÍNH TẤM ẢNH, nên muốn đặt chấm đúng chỗ phải quy đổi qua vùng ảnh thật, không dùng
// kích thước khung. Tính sai chỗ này thì thẻ lệch đúng bằng bề rộng dải trống.
//
// Lớp phủ nằm cùng khung với ảnh nên toạ độ tính theo offsetLeft/offsetTop của ảnh.

import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import { useLanguage } from '../../i18n/LanguageContext'

// Vùng hiển thị thật của ảnh bên trong khung, khi ảnh dùng object-fit: contain.
// Ảnh co theo cạnh chật hơn, phần dư chia đều hai bên thành dải trống.
function getImageDisplayBox(imgEl) {
  if (!imgEl) return null

  var frameWidth = imgEl.clientWidth
  var frameHeight = imgEl.clientHeight
  var naturalWidth = imgEl.naturalWidth
  var naturalHeight = imgEl.naturalHeight

  // Ảnh chưa tải xong thì chưa có kích thước gốc để quy đổi
  if (!frameWidth || !frameHeight || !naturalWidth || !naturalHeight) return null

  var scale = Math.min(frameWidth / naturalWidth, frameHeight / naturalHeight)
  var displayWidth = naturalWidth * scale
  var displayHeight = naturalHeight * scale

  return {
    left: imgEl.offsetLeft + (frameWidth - displayWidth) / 2,
    top: imgEl.offsetTop + (frameHeight - displayHeight) / 2,
    width: displayWidth,
    height: displayHeight,
  }
}

// imgEl        : thẻ <img> đang hiển thị, lấy qua ref callback ở PostModal
// refreshToken : đổi giá trị để tính lại vùng ảnh (ảnh vừa tải xong, vừa chuyển ảnh khác)
// tags         : các thẻ của đúng tấm ảnh đang xem
// tagging      : chủ bài đang bật chế độ gắn thẻ — bấm vào ảnh để chọn vị trí
// canRemoveTag : hàm xét quyền gỡ của từng thẻ (chủ bài, hoặc chính người bị gắn)
export default function PhotoTagLayer({
  imgEl,
  refreshToken,
  tags,
  visible,
  tagging,
  onPickPosition,
  canRemoveTag,
  onRemoveTag,
}) {
  var { t } = useLanguage()
  var [box, setBox] = useState(null)

  var updateBox = useCallback(function () {
    setBox(getImageDisplayBox(imgEl))
  }, [imgEl])

  // Khung ảnh co giãn theo cửa sổ nên phải đo lại mỗi lần resize
  useEffect(function () {
    updateBox()
    window.addEventListener('resize', updateBox)
    return function () {
      window.removeEventListener('resize', updateBox)
    }
  }, [updateBox, refreshToken])

  if (!box) return null
  if (!visible && !tagging) return null

  // Quy đổi điểm bấm trong khung về tỉ lệ trên ảnh
  function handlePick(e) {
    if (!tagging) return

    var frameRect = e.currentTarget.getBoundingClientRect()
    var pointX = e.clientX - frameRect.left - box.left
    var pointY = e.clientY - frameRect.top - box.top

    var ratioX = pointX / box.width
    var ratioY = pointY / box.height

    // Bấm trúng dải trống ngoài ảnh thì bỏ qua, vì server chỉ nhận 0 → 1
    if (ratioX < 0 || ratioX > 1 || ratioY < 0 || ratioY > 1) return

    onPickPosition(ratioX, ratioY)
  }

  return (
    <Box
      onClick={handlePick}
      sx={{
        position: 'absolute',
        inset: 0,
        // Chỉ nuốt click khi đang gắn thẻ; lúc xem thường phải để lọt xuống ảnh
        // cho thao tác double-click thả tim vẫn chạy như cũ
        pointerEvents: tagging ? 'auto' : 'none',
        cursor: tagging ? 'crosshair' : 'default',
      }}
    >
      {tagging && (
        <Box
          sx={{
            position: 'absolute', top: 12, left: 0, right: 0,
            textAlign: 'center', color: '#fff', fontSize: 13, fontWeight: 600,
            textShadow: '0 1px 6px rgba(0,0,0,.8)', pointerEvents: 'none',
          }}
        >
          {t.post.tagPeopleHint}
        </Box>
      )}

      {visible && tags.map(function (tag) {
        return (
          <Box
            key={tag._id}
            sx={{
              position: 'absolute',
              left: box.left + tag.x * box.width,
              top: box.top + tag.y * box.height,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              pointerEvents: 'auto',
            }}
          >
            {/* Chấm tròn đánh dấu đúng điểm được gắn thẻ */}
            <Box
              sx={{
                width: 12, height: 12, borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,.9)',
                border: '2px solid rgba(0,0,0,.35)',
              }}
            />
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.375, borderRadius: 1,
                bgcolor: 'rgba(0,0,0,.72)', color: '#fff',
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >
              {tag.user?.username}
              {canRemoveTag(tag) && (
                <Box
                  component="button"
                  type="button"
                  aria-label={t.post.tagRemoved}
                  onClick={function (e) {
                    e.stopPropagation()
                    onRemoveTag(tag)
                  }}
                  sx={{
                    background: 'none', border: 'none', p: 0,
                    color: '#fff', fontSize: 14, lineHeight: 1, cursor: 'pointer',
                  }}
                >
                  ×
                </Box>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
