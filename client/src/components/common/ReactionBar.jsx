// components/common/ReactionBar.jsx
// Thanh chọn cảm xúc nổi lên khi hover/long-press nút like.
// Props:
//   onPick(type)         — chọn 1 cảm xúc
//   onMouseEnter/Leave   — để cha giữ thanh mở khi rê chuột vào

import { REACTIONS } from './reactions'

export default function ReactionBar({ onPick, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: 8,
        display: 'flex',
        gap: 4,
        padding: '6px 8px',
        background: 'var(--bg-elevated, #262626)',
        border: '1px solid var(--border, #363636)',
        borderRadius: 24,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        zIndex: 30,
      }}
    >
      {REACTIONS.map(function (r) {
        return (
          <button
            key={r.type}
            type="button"
            title={r.label}
            onClick={function () { onPick(r.type) }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 26,
              lineHeight: 1,
              padding: 2,
              transition: 'transform 0.12s',
            }}
            onMouseOver={function (e) { e.currentTarget.style.transform = 'scale(1.35)' }}
            onMouseOut={function (e) { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {r.emoji}
          </button>
        )
      })}
    </div>
  )
}
