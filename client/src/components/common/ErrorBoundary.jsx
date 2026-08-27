// components/common/ErrorBoundary.jsx
// Bắt lỗi runtime khi render của toàn bộ cây component bên trong
//
// Tại sao cần: React 18 mặc định unmount cả cây khi một component throw lúc render
//   → người dùng thấy TRANG TRẮNG, không biết chuyện gì xảy ra, không có cách thoát
//   ErrorBoundary chặn lại và hiển thị màn hình lỗi kèm nút khôi phục
//
// Bắt buộc là class component: React chưa có hook tương đương
//   getDerivedStateFromError → cập nhật state để render UI lỗi
//   componentDidCatch        → nơi ghi log (console, sau này gắn Sentry ở đây)
//
// Lưu ý phạm vi: chỉ bắt lỗi lúc RENDER của component con.
//   KHÔNG bắt được lỗi trong event handler (onClick), setTimeout, hay async/await
//   → những chỗ đó vẫn phải try/catch thủ công như hiện tại

import { Component } from 'react'
import styles from './ErrorBoundary.module.css'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  // Chạy khi component con throw — trả về state mới để render UI lỗi
  static getDerivedStateFromError(error) {
    return { hasError: true, error: error }
  }

  // Chạy sau khi đã bắt lỗi — dùng để ghi log lại lỗi
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Lỗi render:', error, errorInfo)
  }

  // Tải lại trang: cách khôi phục chắc chắn nhất sau khi cây component đã hỏng
  handleReload = () => {
    window.location.reload()
  }

  // Về trang chủ: dùng window.location thay vì navigate của React Router
  // vì ErrorBoundary nằm NGOÀI BrowserRouter nên không gọi được hook điều hướng
  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    // Không có lỗi → render bình thường
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className={styles.wrapper}>
        <div className={styles.box}>
          <div className={styles.icon}>⚠️</div>

          <h1 className={styles.title}>Đã có lỗi xảy ra</h1>

          <p className={styles.message}>
            Trang gặp sự cố ngoài dự kiến. Bạn thử tải lại trang, nếu vẫn lỗi thì
            quay về trang chủ nhé.
          </p>

          {/* Chi tiết lỗi chỉ hiện ở môi trường dev — tránh lộ thông tin nội bộ khi chạy thật */}
          {import.meta.env.DEV && this.state.error && (
            <pre className={styles.detail}>
              {this.state.error.toString()}
            </pre>
          )}

          <div className={styles.actions}>
            <button className={styles.primaryBtn} onClick={this.handleReload}>
              Tải lại trang
            </button>
            <button className={styles.secondaryBtn} onClick={this.handleGoHome}>
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    )
  }
}
