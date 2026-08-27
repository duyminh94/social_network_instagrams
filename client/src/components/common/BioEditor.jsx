// BioEditor.jsx
// Rich-text bio editor: Bold, Italic, Underline, màu chữ, emoji
// Dùng contenteditable + execCommand — lưu innerHTML vào form
// Nhận: value (HTML string), onChange (fn nhận HTML string)

import { useRef, useState, useEffect, useCallback } from 'react'
import EmojiPicker from 'emoji-picker-react'
import DOMPurify from 'dompurify'
import styles from './BioEditor.module.css'

const MAX_LENGTH = 150

const COLORS = [
  { hex: '#ffffff', label: 'Trắng' },
  { hex: '#000000', label: 'Đen' },
  { hex: '#ef4444', label: 'Đỏ' },
  { hex: '#f97316', label: 'Cam' },
  { hex: '#eab308', label: 'Vàng' },
  { hex: '#22c55e', label: 'Xanh lá' },
  { hex: '#3b82f6', label: 'Xanh dương' },
  { hex: '#8b5cf6', label: 'Tím' },
  { hex: '#ec4899', label: 'Hồng' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#a16207', label: 'Nâu' },
  { hex: '#6b7280', label: 'Xám' },
]

// Chỉ cho phép thẻ an toàn — loại bỏ script, event handler, v.v.
function sanitize(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'br', 'span', 'p', 'div', 'strong', 'em'],
    ALLOWED_ATTR: ['style'],
    ALLOWED_STYLE: { '*': { color: [/.*/] } },
  })
}

// Đếm số ký tự thật (bỏ HTML tags)
function countChars(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || div.innerText || '').length
}

export default function BioEditor({ value, onChange, placeholder = 'Giới thiệu bản thân...' }) {
  const editorRef = useRef(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [activeColor, setActiveColor] = useState(null)
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false })
  const savedSelectionRef = useRef(null)

  // Set nội dung ban đầu (chỉ 1 lần khi mount hoặc khi value thay đổi từ bên ngoài)
  useEffect(function () {
    if (!editorRef.current) return
    const sanitized = sanitize(value || '')
    // Chỉ update nếu khác để tránh reset cursor
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized
      setCharCount(countChars(sanitized))
    }
  }, [value])

  // Cập nhật trạng thái active format khi selection thay đổi
  function updateActiveFormats() {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    })
  }

  function handleInput() {
    const html = editorRef.current.innerHTML
    const chars = countChars(html)
    setCharCount(chars)
    onChange(sanitize(html))
    updateActiveFormats()
  }

  // Lưu selection trước khi mất focus (cần cho emoji picker)
  function saveSelection() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  // Khôi phục selection đã lưu
  function restoreSelection() {
    const sel = window.getSelection()
    if (savedSelectionRef.current && sel) {
      sel.removeAllRanges()
      sel.addRange(savedSelectionRef.current)
    }
  }

  // Áp dụng format (bold/italic/underline)
  function applyFormat(cmd) {
    editorRef.current.focus()
    document.execCommand(cmd, false, null)
    updateActiveFormats()
    handleInput()
  }

  // Áp dụng màu chữ
  function applyColor(hex) {
    editorRef.current.focus()
    document.execCommand('styleWithCSS', false, true)
    document.execCommand('foreColor', false, hex)
    setActiveColor(hex)
    handleInput()
  }

  // Chèn emoji tại vị trí cursor đã lưu
  function handleEmojiClick(emojiData) {
    setShowEmoji(false)
    editorRef.current.focus()
    restoreSelection()

    const emoji = emojiData.emoji
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      // Fallback: chèn vào cuối
      editorRef.current.innerHTML += emoji
    } else {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      const node = document.createTextNode(emoji)
      range.insertNode(node)
      range.setStartAfter(node)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    handleInput()
  }

  // Giới hạn ký tự
  function handleKeyDown(e) {
    if (charCount >= MAX_LENGTH && e.key !== 'Backspace' && e.key !== 'Delete' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
    }
  }

  // Đóng emoji picker khi click ngoài
  useEffect(function () {
    function onClickOutside(e) {
      if (!e.target.closest('[data-emoji-wrap]')) {
        setShowEmoji(false)
      }
    }
    if (showEmoji) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showEmoji])

  return (
    <div className={styles.wrap}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Bold */}
        <button
          type="button"
          className={`${styles.toolBtn} ${styles.toolBtnBold} ${activeFormats.bold ? styles.active : ''}`}
          onMouseDown={e => { e.preventDefault(); applyFormat('bold') }}
          title="Đậm (Ctrl+B)"
        >
          B
        </button>

        {/* Italic */}
        <button
          type="button"
          className={`${styles.toolBtn} ${styles.toolBtnItalic} ${activeFormats.italic ? styles.active : ''}`}
          onMouseDown={e => { e.preventDefault(); applyFormat('italic') }}
          title="Nghiêng (Ctrl+I)"
        >
          I
        </button>

        {/* Underline */}
        <button
          type="button"
          className={`${styles.toolBtn} ${styles.toolBtnUnderline} ${activeFormats.underline ? styles.active : ''}`}
          onMouseDown={e => { e.preventDefault(); applyFormat('underline') }}
          title="Gạch chân (Ctrl+U)"
        >
          U
        </button>

        <div className={styles.sep} />

        {/* Color palette */}
        <div className={styles.colorRow}>
          {COLORS.map(c => (
            <div
              key={c.hex}
              className={`${styles.colorSwatch} ${activeColor === c.hex ? styles.selected : ''}`}
              style={{ background: c.hex, border: c.hex === '#ffffff' ? '2px solid var(--border)' : undefined }}
              title={c.label}
              onMouseDown={e => { e.preventDefault(); applyColor(c.hex) }}
            />
          ))}
        </div>

        <div className={styles.sep} />

        {/* Emoji picker */}
        <div className={styles.emojiWrap} data-emoji-wrap>
          <button
            type="button"
            className={`${styles.toolBtn} ${showEmoji ? styles.active : ''}`}
            onMouseDown={e => {
              e.preventDefault()
              saveSelection()
              setShowEmoji(v => !v)
            }}
            title="Chèn emoji"
          >
            😊
          </button>
          {showEmoji && (
            <div className={styles.emojiPopup} data-emoji-wrap>
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme="dark"
                searchPlaceHolder="Tìm emoji..."
                height={380}
                width={320}
                lazyLoadEmojis
              />
            </div>
          )}
        </div>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={updateActiveFormats}
        onKeyUp={updateActiveFormats}
        onBlur={saveSelection}
      />

      {/* Char counter */}
      <div className={styles.footer}>
        <span style={{ color: charCount >= MAX_LENGTH ? '#ef4444' : undefined }}>
          {charCount} / {MAX_LENGTH}
        </span>
      </div>
    </div>
  )
}
