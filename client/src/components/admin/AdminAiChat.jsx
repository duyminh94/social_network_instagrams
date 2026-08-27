// components/admin/AdminAiChat.jsx
// Trợ lý AI nổi ở góc trang admin — chat hỏi đáp + nhờ tìm dữ liệu.
// Gọi POST /api/admin/ai/ask. Lịch sử chat giữ trong state (không lưu DB).

import { useState, useRef, useEffect } from 'react'
import api from '../../services/api'

var SUGGESTIONS = [
  'Có bao nhiêu báo cáo đang chờ xử lý?',
  'Thống kê tổng quan nền tảng',
  'Nội dung nào bị báo cáo nhiều nhất?',
  'Tìm user tên minh',
]

export default function AdminAiChat() {
  var [open, setOpen] = useState(false)
  var [question, setQuestion] = useState('')
  var [loading, setLoading] = useState(false)
  // messages: { role: 'user' | 'ai', text }
  var [messages, setMessages] = useState([])
  var scrollRef = useRef(null)

  useEffect(function () {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  async function send(text) {
    var q = (text || question).trim()
    if (!q || loading) return

    setMessages(function (prev) { return prev.concat([{ role: 'user', text: q }]) })
    setQuestion('')
    setLoading(true)

    try {
      var res = await api.post('/admin/ai/ask', { question: q })
      var answer = res.data?.answer || 'Không có phản hồi.'
      setMessages(function (prev) { return prev.concat([{ role: 'ai', text: answer }]) })
    } catch (err) {
      var msg = err.response?.data?.message || 'Trợ lý AI gặp lỗi. Thử lại sau.'
      setMessages(function (prev) { return prev.concat([{ role: 'ai', text: '⚠️ ' + msg }]) })
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Nút nổi mở trợ lý */}
      <button
        type="button"
        onClick={function () { setOpen(function (v) { return !v }) }}
        title="Trợ lý AI"
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 1200,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #4f5df7, #8b5cf6)', color: '#fff',
          fontSize: 24, boxShadow: '0 6px 20px rgba(79,93,247,0.45)',
        }}
      >
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', right: 24, bottom: 92, zIndex: 1200,
            width: 380, maxWidth: 'calc(100vw - 48px)', height: 520, maxHeight: 'calc(100vh - 130px)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--bg-elevated, #1c1c1f)', border: '1px solid var(--border, #333)',
            borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px', background: 'linear-gradient(135deg, #4f5df7, #8b5cf6)', color: '#fff',
          }}>
            <strong style={{ fontSize: 15 }}>🤖 Trợ lý quản trị</strong>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Hỏi về số liệu, báo cáo, hoặc nhờ tìm user/bài</div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 13, color: 'var(--ig-text-light, #999)', margin: 0 }}>Gợi ý câu hỏi:</p>
                {SUGGESTIONS.map(function (s) {
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={function () { send(s) }}
                      style={{
                        textAlign: 'left', padding: '8px 12px', fontSize: 13,
                        background: 'var(--bg, #2a2a2e)', border: '1px solid var(--border, #383838)',
                        borderRadius: 10, color: 'var(--ig-text, #eee)', cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            )}

            {messages.map(function (m, i) {
              var isUser = m.role === 'user'
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '9px 12px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    background: isUser ? '#4f5df7' : 'var(--bg, #2a2a2e)',
                    color: isUser ? '#fff' : 'var(--ig-text, #eee)',
                  }}
                >
                  {m.text}
                </div>
              )
            })}

            {loading && (
              <div style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--ig-text-light, #999)' }}>
                Đang suy nghĩ…
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border, #333)' }}>
            <textarea
              value={question}
              onChange={function (e) { setQuestion(e.target.value) }}
              onKeyDown={onKeyDown}
              placeholder="Hỏi trợ lý…"
              rows={1}
              style={{
                flex: 1, resize: 'none', maxHeight: 80, padding: '9px 12px',
                background: 'var(--bg, #2a2a2e)', border: '1px solid var(--border, #383838)',
                borderRadius: 10, color: 'var(--ig-text, #eee)', fontSize: 13.5, outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={function () { send() }}
              disabled={loading || !question.trim()}
              style={{
                padding: '0 16px', border: 'none', borderRadius: 10, cursor: 'pointer',
                background: '#4f5df7', color: '#fff', fontWeight: 600,
                opacity: loading || !question.trim() ? 0.5 : 1,
              }}
            >
              Gửi
            </button>
          </div>
        </div>
      )}
    </>
  )
}
