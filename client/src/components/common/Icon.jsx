// components/common/Icon.jsx
// Thư viện SVG icon dùng chung toàn app
//
// Export:
//   default  Icon        - Component icon theo name (switch-case)
//   named    Wordmark    - Text logo "aptech."
//   named    Mark        - Logo vuông có chữ "a."
//   named    StoryRing   - Vòng ring bọc avatar story
//   named    HeartBurst  - Animation trái tim khi double-tap like
//
// Cách dùng:
//   import Icon, { Mark } from '../common/Icon'
//   <Icon name="home" size={22} />
//   <Icon name="heart" fill={true} />   ← fill=true để tô đặc icon

// ── Main Icon component ──────────────────────────────────────────────────────

function Icon({ name, size = 22, fill = false, stroke = 'currentColor' }) {
  // Thuộc tính SVG dùng chung cho tất cả icon
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: fill ? stroke : 'none',
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (name) {
    case 'home':
      return <svg {...svgProps}><path d="M3 11.2 12 4l9 7.2V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>

    case 'reels':
      return <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m10 9 6 3-6 3z" fill={stroke} /></svg>

    case 'paperplane':
      return <svg {...svgProps}><path d="M21 3 3 11l7 2 2 7z" /><path d="M21 3 10 13" /></svg>

    case 'search':
      return <svg {...svgProps}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>

    case 'eye':
      return <svg {...svgProps}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.7" /></svg>

    case 'compass':
      return <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="m15 9-2 5-5 2 2-5z" /></svg>

    case 'heart':
      return <svg {...svgProps}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>

    case 'plus':
      return <svg {...svgProps}><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M12 8v8M8 12h8" /></svg>

    case 'user':
      return <svg {...svgProps}><circle cx="12" cy="9" r="3.6" /><path d="M5 20c1.6-3.4 4.3-5 7-5s5.4 1.6 7 5" /></svg>

    case 'menu':
      return <svg {...svgProps}><path d="M4 7h16M4 12h16M4 17h10" /></svg>

    case 'grid':
      return <svg {...svgProps}><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></svg>

    case 'comment':
      return <svg {...svgProps}><path d="M4 5h16v11H9l-5 4z" /></svg>

    case 'share':
      return <svg {...svgProps}><path d="M22 3 3 11l7 2 2 7z" /></svg>

    case 'tag':
      return <svg {...svgProps}><path d="M3 3h9l9 9-9 9-9-9z" /><circle cx="8" cy="8" r="1.4" fill={stroke} /></svg>

    case 'bookmark':
      return <svg {...svgProps}><path d="M6 3h12v18l-6-4-6 4z" /></svg>

    case 'verified':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="m12 2 2.4 1.8 3-.4 1.4 2.7 2.6 1.6-.6 3 1.2 2.8-2 2.3.2 3-2.8 1.2-1.6 2.6-3-.6-2.6 1.4-2.6-1.4-3 .6-1.6-2.6-2.8-1.2.2-3-2-2.3 1.2-2.8-.6-3 2.6-1.6L7.2 3.4l3 .4z" fill="#3897f0" />
          <path d="m8.5 12 2.6 2.6L16 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )

    case 'arrow':
      return <svg {...svgProps}><path d="M5 12h14M13 6l6 6-6 6" /></svg>

    case 'arrowL':
      return <svg {...svgProps}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>

    case 'x':
      return <svg {...svgProps}><path d="M5 5l14 14M19 5 5 19" /></svg>

    case 'mic':
      return <svg {...svgProps}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>

    case 'emoji':
      return <svg {...svgProps}><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="0.8" fill={stroke} /><circle cx="15" cy="10" r="0.8" fill={stroke} /><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" /></svg>

    case 'image':
      return <svg {...svgProps}><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><circle cx="9" cy="9.5" r="1.6" /><path d="m4 17 5-5 4 4 3-3 4 4" /></svg>

    case 'check':
      return <svg {...svgProps}><path d="m5 12 5 5L20 7" /></svg>

    case 'shield':
      return <svg {...svgProps}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /></svg>

    case 'lock':
      return <svg {...svgProps}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>

    case 'flag':
      return <svg {...svgProps}><path d="M5 22V4" /><path d="M5 4h12l-2 4 2 4H5" /></svg>

    case 'trash':
      return <svg {...svgProps}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" /><path d="M10 11v6M14 11v6" /></svg>

    case 'ban':
      return <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></svg>

    case 'star':
      return <svg {...svgProps}><path d="m12 3 2.6 5.8 6.4.7-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.7z" /></svg>

    case 'folder':
      return <svg {...svgProps}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>

    case 'dots':
      return <svg {...svgProps}><circle cx="6" cy="12" r="1.4" fill={stroke} /><circle cx="12" cy="12" r="1.4" fill={stroke} /><circle cx="18" cy="12" r="1.4" fill={stroke} /></svg>

    case 'play':
      return <svg {...svgProps}><polygon points="5,3 19,12 5,21" /></svg>

    default:
      return null
  }
}

// ── Wordmark: text logo "aptech." ────────────────────────────────────────────

export function Wordmark({ size = 24, color = 'currentColor', accent = '#ff6b58' }) {
  return (
    <span style={{
      fontFamily: '"Fraunces", "Georgia", serif',
      fontSize: size,
      fontWeight: 600,
      letterSpacing: '-0.04em',
      color,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      aptech<span style={{ color: accent }}>.</span>
    </span>
  )
}

// ── Mark: logo vuông "a." ────────────────────────────────────────────────────

export function Mark({ size = 28, accent = '#ff6b58', dark = true }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.24,
      background: dark ? '#16161a' : '#fff',
      color: dark ? '#fff' : '#0e0e10',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Fraunces", "Georgia", serif',
      fontWeight: 700,
      fontSize: size * 0.6,
      letterSpacing: '-0.04em',
      lineHeight: 1,
      flex: '0 0 auto',
      border: dark ? '1px solid rgba(255,255,255,0.1)' : 'none',
    }}>
      a<span style={{ color: accent, marginLeft: -1 }}>.</span>
    </div>
  )
}

// ── StoryRing: vòng ring bọc avatar story ────────────────────────────────────
// ring: 'rainbow' (gradient màu) | 'brand' (màu accent) | 'seen' (màu xám)

export function StoryRing({ children, ring = 'rainbow', size = 60, onClick, accent = '#3897f0' }) {
  // Tính màu nền ring dựa trên trạng thái
  let ringStyle
  if (ring === 'rainbow') {
    ringStyle = 'conic-gradient(from 200deg, ' + accent + ', #ffd166, #ff6b58, #c084fc, #60a5fa, ' + accent + ')'
  } else if (ring === 'brand') {
    ringStyle = accent
  } else {
    ringStyle = 'rgba(255,255,255,0.18)' // seen → xám mờ
  }

  return (
    <button
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: ringStyle,
        padding: ring === 'seen' ? 1.5 : 2.5,
        border: 0,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
      }}
    >
      <span style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        padding: 2,
        background: '#0e0e10',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {children}
      </span>
    </button>
  )
}

// ── HeartBurst: animation trái tim khi double-tap like ───────────────────────

export function HeartBurst({ show, size = 80 }) {
  // Không hiện nếu chưa trigger
  if (!show) return null

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{
          animation: 'aptechHeartBurst 800ms ease-out forwards',
          filter: 'drop-shadow(0 4px 18px rgba(0,0,0,.5))',
        }}
      >
        <path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" fill="#fff" />
      </svg>
    </div>
  )
}

export default Icon
