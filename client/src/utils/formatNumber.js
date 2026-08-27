// utils/formatNumber.js
// Rút gọn số lớn thành dạng dễ đọc
//
// Ví dụ:
//   formatNumber(1500)       → "1.5K"
//   formatNumber(2000)       → "2K"   (bỏ .0)
//   formatNumber(1200000)    → "1.2M"
//   formatNumber(999)        → "999"
//   formatNumber(null)       → "0"

export function formatNumber(n) {
  // Trả về "0" nếu giá trị không hợp lệ
  if (n == null || isNaN(n)) return '0'

  if (n >= 1_000_000) {
    // Triệu → M (bỏ .0 nếu chẵn, ví dụ 2.0M → 2M)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  }

  if (n >= 1_000) {
    // Nghìn → K
    return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  }

  return String(n)
}
