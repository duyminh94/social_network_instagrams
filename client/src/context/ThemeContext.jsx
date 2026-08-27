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
// Gắn thuộc tính data-theme lên thẻ <html> để CSS đổi bộ biến màu

import { createContext, useContext, useState, useEffect } from 'react'

var ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  var saved = localStorage.getItem('theme') || 'dark'
  var [theme, setTheme] = useState(saved)

  // Mỗi khi theme đổi: gắn data-theme lên <html> để áp dụng biến màu tương ứng
  useEffect(function () {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function toggleTheme() {
    var newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme: theme, toggleTheme: toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
