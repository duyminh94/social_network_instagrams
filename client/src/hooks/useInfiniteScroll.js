// hooks/useInfiniteScroll.js
// Custom hook tự động load thêm dữ liệu khi cuộn đến cuối trang
//
// Cách dùng:
//   const sentinelRef = useInfiniteScroll(loadMore, hasNextPage)
//   <div ref={sentinelRef} />   ← đặt div này ở cuối danh sách
//
// Dùng IntersectionObserver: khi div sentinel xuất hiện trong viewport
//   → gọi callback (thường là fetchNextPage của React Query)
//
// Tại sao dùng IntersectionObserver thay vì scroll event?
//   → Scroll event bắn liên tục, phải debounce thủ công
//   → IntersectionObserver hiệu suất tốt hơn, browser tự quản lý

import { useEffect, useRef } from 'react'

export function useInfiniteScroll(callback, hasMore) {
  // ref gắn vào phần tử sentinel (div ẩn ở cuối danh sách)
  const ref = useRef(null)

  useEffect(function () {
    const el = ref.current
    if (!el) return

    // threshold: 0.1 nghĩa là khi 10% sentinel hiện trong viewport thì kích hoạt
    const observer = new IntersectionObserver(function ([entry]) {
      if (entry.isIntersecting && hasMore) {
        callback()
      }
    }, { threshold: 0.1 })

    observer.observe(el)

    // Cleanup: dừng observe khi component unmount hoặc dependency thay đổi
    return function () {
      observer.disconnect()
    }
  }, [callback, hasMore])

  return ref
}
