// i18n/LanguageContext.jsx
/* eslint-disable react-refresh/only-export-components */
// Hệ thống song ngữ Anh - Việt đơn giản dùng React Context
//
// Cách dùng trong bất kỳ component nào:
//   import { useLanguage } from '../../i18n/LanguageContext'
//   var { t, lang, toggleLang } = useLanguage()
//   <button>{t.nav.home}</button>
//
// Ngôn ngữ mặc định: tiếng Việt ('vi')
// Lưu lựa chọn vào localStorage để nhớ qua các lần load

import { createContext, useContext, useState } from 'react'
import translations from './translations'

var LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  var saved = localStorage.getItem('lang') || 'vi'
  var [lang, setLang] = useState(saved)

  function toggleLang() {
    var newLang = lang === 'vi' ? 'en' : 'vi'
    setLang(newLang)
    localStorage.setItem('lang', newLang)
  }

  var t = translations[lang]

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
