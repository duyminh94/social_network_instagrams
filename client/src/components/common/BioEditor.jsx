// BioEditor.jsx
// Rich-text bio editor: Bold, Italic, Underline, màu chữ, emoji
// Dùng contenteditable + execCommand — lưu innerHTML vào form
// Nhận: value (HTML string), onChange (fn nhận HTML string)

import { useRef, useState, useEffect } from 'react'
import EmojiPicker from 'emoji-picker-react'
import DOMPurify from 'dompurify'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined'
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions'
import { useTheme } from '../../context/ThemeContext'

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
  const { theme } = useTheme()
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

  // Nút định dạng đang bật, dạng mảng để ToggleButtonGroup hiểu
  var activeList = []
  if (activeFormats.bold) activeList.push('bold')
  if (activeFormats.italic) activeList.push('italic')
  if (activeFormats.underline) activeList.push('underline')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>

      {/* Thanh công cụ */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'wrap',
          px: 1,
          py: 0.75,
          bgcolor: 'background.default',
          border: 1,
          borderColor: 'divider',
          borderBottom: 'none',
          borderRadius: '10px 10px 0 0',
        }}
      >
        {/* onMouseDown + preventDefault thay cho onClick: giữ con trỏ đang
            đứng trong vùng soạn thảo, nếu để mất focus thì execCommand
            không biết áp định dạng vào đoạn văn bản nào */}
        <ToggleButtonGroup value={activeList} size="small">
          <ToggleButton
            value="bold"
            title="Đậm (Ctrl+B)"
            onMouseDown={e => { e.preventDefault(); applyFormat('bold') }}
          >
            <FormatBoldIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="italic"
            title="Nghiêng (Ctrl+I)"
            onMouseDown={e => { e.preventDefault(); applyFormat('italic') }}
          >
            <FormatItalicIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="underline"
            title="Gạch chân (Ctrl+U)"
            onMouseDown={e => { e.preventDefault(); applyFormat('underline') }}
          >
            <FormatUnderlinedIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Bảng màu chữ */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <Tooltip key={c.hex} title={c.label} arrow>
              <Box
                onMouseDown={e => { e.preventDefault(); applyColor(c.hex) }}
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  bgcolor: c.hex,
                  border: 1,
                  borderColor: 'divider',
                  // Viền sáng đánh dấu màu đang chọn
                  outline: activeColor === c.hex ? '2px solid' : 'none',
                  outlineColor: 'primary.main',
                  outlineOffset: '1px',
                }}
              />
            </Tooltip>
          ))}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Chèn emoji */}
        <Box sx={{ position: 'relative' }} data-emoji-wrap>
          <ToggleButton
            value="emoji"
            size="small"
            selected={showEmoji}
            title="Chèn emoji"
            onMouseDown={e => {
              e.preventDefault()
              saveSelection()
              setShowEmoji(v => !v)
            }}
          >
            <EmojiEmotionsIcon fontSize="small" />
          </ToggleButton>

          {showEmoji && (
            <Paper
              elevation={8}
              data-emoji-wrap
              sx={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 100,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                // Bảng emoji đổi màu theo giao diện app, bản cũ ghi cứng 'dark'
                theme={theme === 'light' ? 'light' : 'dark'}
                searchPlaceHolder="Tìm emoji..."
                height={380}
                width={320}
                lazyLoadEmojis
              />
            </Paper>
          )}
        </Box>
      </Box>

      {/* Vùng soạn thảo — contentEditable nên không dùng TextField được */}
      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={updateActiveFormats}
        onKeyUp={updateActiveFormats}
        onBlur={saveSelection}
        sx={{
          minHeight: 90,
          maxHeight: 200,
          overflowY: 'auto',
          px: 1.75,
          py: 1.25,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: '0 0 10px 10px',
          fontSize: 14,
          lineHeight: 1.6,
          outline: 'none',
          wordBreak: 'break-word',
          '&:focus': { borderColor: 'text.secondary' },
          // Placeholder cho contentEditable: chỉ hiện khi chưa gõ gì
          '&:empty::before': {
            content: 'attr(data-placeholder)',
            color: 'text.secondary',
            pointerEvents: 'none',
          },
        }}
      />

      {/* Bộ đếm ký tự */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
        <Typography
          sx={{
            fontSize: 12,
            color: charCount >= MAX_LENGTH ? 'error.main' : 'text.secondary',
          }}
        >
          {charCount} / {MAX_LENGTH}
        </Typography>
      </Box>
    </Box>
  )
}
