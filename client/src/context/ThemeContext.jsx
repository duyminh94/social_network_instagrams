// context/ThemeContext.jsx
/* eslint-disable react-refresh/only-export-components */
// Chuyển giao diện sáng / tối — làm theo cùng kiểu LanguageContext
//
// Cách dùng trong bất kỳ component nào:
//   import { useTheme } from '../../context/ThemeContext'
//   var { theme, toggleTheme } = useTheme()
//
// Theme mặc định: tối ('dark')
// Lưu lựa chọn vào localStorage để nhớ qua các lần load
//
// Provider này điều khiển CẢ HAI hệ màu cùng lúc:
//   1. Gắn data-theme lên <html> → 32 file CSS Module đổi bộ biến --ig-*
//   2. MuiThemeProvider          → component MUI đổi palette theo cùng mode
//   Nhờ vậy chỉ cần bấm 1 nút là toàn trang đổi màu đồng bộ
//
// Chưa dùng <CssBaseline /> ở giai đoạn này: nó reset lại CSS toàn cục và sẽ
//   phá layout của các file CSS Module đang chạy. Chỉ bật khi đã chuyển xong
//   toàn bộ sang MUI và gỡ Bootstrap

import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import createAppTheme from '../theme/muiTheme'

var ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  var saved = localStorage.getItem('theme') || 'dark'
  var [theme, setTheme] = useState(saved)

  // Mỗi khi theme đổi: gắn data-theme lên <html> để áp dụng biến màu tương ứng
  useEffect(function () {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Chỉ dựng lại theme MUI khi mode thật sự đổi.
  // Thiếu useMemo thì mỗi lần re-render sẽ tạo object theme mới
  // → toàn bộ component MUI bên dưới tính lại style, gây giật
  var muiTheme = useMemo(function () {
    return createAppTheme(theme)
  }, [theme])

  function toggleTheme() {
    var newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme: theme, toggleTheme: toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
