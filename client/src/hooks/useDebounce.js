// hooks/useDebounce.js
// Trả về giá trị bị delay sau một khoảng thời gian (mặc định 500ms)
//
// Dùng để tránh gọi API mỗi khi user gõ một ký tự
// Chỉ kích hoạt query khi user ngừng gõ trong 500ms
//
// Ví dụ:
//   const debouncedSearch = useDebounce(search, 500)
//   useQuery({ enabled: debouncedSearch.length >= 2 })

import { useState, useEffect } from 'react'

export function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value)

  useEffect(function () {
    // Đặt timer: sau `delay` ms mới cập nhật giá trị debounced
    const timer = setTimeout(function () {
      setDebounced(value)
    }, delay)

    // Cleanup: nếu value thay đổi trước khi timer chạy → hủy timer cũ
    return function () {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debounced
}
