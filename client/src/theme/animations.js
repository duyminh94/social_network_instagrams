// theme/animations.js
// Các mảnh sx hiệu ứng dùng chung
//
// Vì sao gom về một chỗ: hiệu ứng rải rác mỗi nơi một kiểu (chỗ 120ms, chỗ 0.2s,
//   chỗ ease, chỗ ease-out) thì cảm giác chuyển động của app bị lệch nhịp.
//   Gom lại để mọi nơi dùng chung một bộ thời lượng và đường cong
//
// Cách dùng: spread vào sx —  sx={{ ...fadeIn(), color: 'red' }}

// Bộ thời lượng chuẩn — bám theo thang của MUI (theme.transitions.duration)
export var DUR = {
  fast: 150,      // đổi màu khi rê chuột, nhấn nút
  normal: 220,    // panel trượt, phần tử xuất hiện
  slow: 320,      // modal lớn, lớp phủ toàn màn hình
}

// Đường cong: vào nhanh - ra chậm, cảm giác "bật ra" tự nhiên hơn ease mặc định
export var EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Trình duyệt chỉ chạy mượt (trên compositor) với opacity và transform.
//   Tránh animate width/height/top/left vì buộc trình duyệt tính lại layout mỗi khung hình
export function fadeIn(duration) {
  return {
    animation: 'aptechFadeIn ' + (duration || DUR.normal) + 'ms ' + EASE + ' both',
    '@keyframes aptechFadeIn': {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  }
}

// Phóng nhẹ từ 96% — dùng cho hộp thoại, menu, thẻ nổi
export function scaleIn(duration) {
  return {
    animation: 'aptechScaleIn ' + (duration || DUR.normal) + 'ms ' + EASE + ' both',
    '@keyframes aptechScaleIn': {
      from: { opacity: 0, transform: 'scale(0.96)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
  }
}

// Trôi lên từ dưới — dùng cho bottom-sheet, thanh hành động
export function slideUp(duration, distance) {
  var d = distance || 12
  return {
    animation: 'aptechSlideUp ' + (duration || DUR.normal) + 'ms ' + EASE + ' both',
    '@keyframes aptechSlideUp': {
      from: { opacity: 0, transform: 'translateY(' + d + 'px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
  }
}

// Danh sách hiện lần lượt so le.
// index là thứ tự phần tử; càng về sau càng trễ, nhưng CHẶN TRẦN ở maxDelay
//   để danh sách dài không bắt người dùng ngồi đợi phần tử cuối
export function staggerIn(index, options) {
  var opts = options || {}
  var step = opts.step || 40
  var maxDelay = opts.maxDelay || 300
  var delay = Math.min(index * step, maxDelay)
  return {
    animation: 'aptechStagger ' + (opts.duration || DUR.normal) + 'ms ' + EASE + ' both',
    animationDelay: delay + 'ms',
    '@keyframes aptechStagger': {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
  }
}

// Nhấn xuống thì thu nhỏ một nhịp — phản hồi xúc giác cho nút bấm
export var pressable = {
  transition: 'transform ' + DUR.fast + 'ms ' + EASE,
  '&:active': { transform: 'scale(0.94)' },
}

// Nảy một nhịp rồi về — dùng cho badge số thông báo khi có tin mới
export var pop = {
  animation: 'aptechPop 320ms ' + EASE,
  '@keyframes aptechPop': {
    '0%': { transform: 'scale(1)' },
    '45%': { transform: 'scale(1.35)' },
    '100%': { transform: 'scale(1)' },
  },
}
