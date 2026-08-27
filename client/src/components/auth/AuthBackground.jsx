// components/auth/AuthBackground.jsx
// Nền động cho cột trái các trang đăng nhập / đăng ký
//
// Bố cục mô phỏng ảnh mẫu: icon mạng xã hội rải thành mạng lưới nối với nhau,
//   nằm trên mặt phẳng dữ liệu dạng chấm nhìn nghiêng
//
// Bảy hiệu ứng, mỗi cái làm bằng cách rẻ nhất có thể:
//   Orbit    — icon nhỏ chạy vòng quanh tâm          → @keyframes xoay trục
//   Rotate   — vòng nét đứt tự quay                   → @keyframes
//   Floating — mỗi icon trôi lên xuống lệch pha nhau  → @keyframes
//   Pulse    — chấm sáng và quầng halo phồng rồi tắt  → @keyframes
//   Parallax — 3 lớp xa/giữa/gần dịch khác biên độ    → JS ghi biến CSS
//   Magnetic — icon gần con trỏ bị hút về phía đó     → JS tính khoảng cách
//   Trail    — vệt sáng bám theo con trỏ              → JS tạo thẻ rồi tự xoá
//
// Vì sao không dùng GSAP dù dự án đã cài:
//   4 hiệu ứng đầu chỉ là vòng lặp đơn giản. Viết bằng @keyframes thì trình duyệt
//   chạy thẳng trên compositor, không tốn một dòng JS nào mỗi khung hình.
//   GSAP đáng dùng khi cần timeline nhiều bước hoặc tua đi tua lại — ở đây chưa cần
//
// Ba hiệu ứng cuối phụ thuộc vị trí chuột nên bắt buộc dùng JS. Chỗ này gom tất cả
//   vào MỘT listener pointermove, và dồn phần tính toán vào requestAnimationFrame
//   để mỗi khung hình chỉ chạy đúng một lần

import { useEffect, useRef } from 'react'
import InstagramIcon from '@mui/icons-material/Instagram'
import FacebookIcon from '@mui/icons-material/Facebook'
import YouTubeIcon from '@mui/icons-material/YouTube'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import TwitterIcon from '@mui/icons-material/Twitter'
import PinterestIcon from '@mui/icons-material/Pinterest'
import TelegramIcon from '@mui/icons-material/Telegram'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import RedditIcon from '@mui/icons-material/Reddit'
import GitHubIcon from '@mui/icons-material/GitHub'
import PersonIcon from '@mui/icons-material/Person'
import FavoriteIcon from '@mui/icons-material/Favorite'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import EmailIcon from '@mui/icons-material/Email'
import networkBg from '../../assets/images/network-bg.webp'
import styles from './AuthBackground.module.css'

// Toạ độ tính theo phần trăm khung. Vùng giữa (khoảng 34-66% ngang, 30-70% dọc)
// để trống cho khối chữ, nên các icon đều nằm lệch ra rìa
//
// size  : đường kính viên tròn
// dur   : số giây trôi hết một nhịp lên xuống
// delay : lệch pha để các icon không nhấp nhô cùng lúc trông như đồng hồ
var NEAR_ICONS = [
  { Icon: FacebookIcon,  color: '#1877f2', x: 76, y: 38, size: 'clamp(58px, 8.2vw, 108px)',  dur: 8.5, delay: -2.5 },
  { Icon: InstagramIcon, color: '#e1306c', x: 21, y: 22, size: 'clamp(54px, 7.6vw, 100px)',  dur: 7.5, delay: 0 },
  { Icon: YouTubeIcon,   color: '#ff0000', x: 63, y: 82, size: 'clamp(50px, 7vw, 92px)',     dur: 7,   delay: -4 },
  { Icon: LinkedInIcon,  color: '#0a66c2', x: 90, y: 64, size: 'clamp(48px, 6.6vw, 86px)',   dur: 9,   delay: -1.5 },
  { Icon: RedditIcon,    color: '#ff4500', x: 12, y: 68, size: 'clamp(46px, 6.4vw, 84px)',   dur: 7.8, delay: -3 },
  { Icon: TwitterIcon,   color: '#1da1f2', x: 55, y: 10, size: 'clamp(44px, 6vw, 78px)',     dur: 8,   delay: -5.5 },
]

var MID_ICONS = [
  { Icon: PinterestIcon, color: '#e60023', x: 91, y: 17, size: 'clamp(36px, 4.8vw, 62px)', dur: 8.2, delay: -1 },
  { Icon: TelegramIcon,  color: '#2aabee', x: 32, y: 92, size: 'clamp(34px, 4.6vw, 58px)', dur: 7.4, delay: -3.6 },
  { Icon: WhatsAppIcon,  color: '#25d366', x: 6,  y: 41, size: 'clamp(34px, 4.6vw, 58px)', dur: 9.2, delay: -6 },
  { Icon: GitHubIcon,    color: '#c9d1d9', x: 40, y: 4,  size: 'clamp(30px, 4vw, 52px)',   dur: 8.8, delay: -2 },
  { Icon: FavoriteIcon,  color: '#ff6b81', x: 84, y: 90, size: 'clamp(28px, 3.8vw, 48px)', dur: 6.8, delay: -4.4 },
]

// Lớp xa: biểu tượng chung chung, mờ đi để làm nền cho hai lớp trước.
// Bớt số lượng so với trước vì icon lớp gần đã to hơn nhiều, để nhiều nữa thì rối
var FAR_ICONS = [
  { Icon: PersonIcon,     color: '#60a5fa', x: 36, y: 30, size: 'clamp(26px, 3.4vw, 44px)', dur: 9,   delay: 0 },
  { Icon: PersonIcon,     color: '#60a5fa', x: 66, y: 22, size: 'clamp(24px, 3.2vw, 40px)', dur: 7.6, delay: -2 },
  { Icon: PersonIcon,     color: '#60a5fa', x: 22, y: 50, size: 'clamp(24px, 3.2vw, 40px)', dur: 8.4, delay: -5 },
  { Icon: PersonIcon,     color: '#60a5fa', x: 79, y: 74, size: 'clamp(24px, 3.2vw, 40px)', dur: 7.2, delay: -3.2 },
  { Icon: ThumbUpIcon,    color: '#3897f0', x: 8,  y: 28, size: 'clamp(24px, 3.2vw, 40px)', dur: 8,   delay: -1.4 },
  { Icon: ChatBubbleIcon, color: '#a855f7', x: 94, y: 44, size: 'clamp(24px, 3.2vw, 40px)', dur: 7.9, delay: -4.8 },
  { Icon: EmailIcon,      color: '#38bdf8', x: 6,  y: 84, size: 'clamp(24px, 3.2vw, 40px)', dur: 8.6, delay: -2.6 },
  { Icon: FavoriteIcon,   color: '#f472b6', x: 50, y: 94, size: 'clamp(22px, 3vw, 38px)',   dur: 7.1, delay: -5.4 },
]

// Icon nhỏ chạy vòng quanh tâm khung
var ORBIT_ICONS = [
  { Icon: PersonIcon,   color: '#60a5fa', dur: 26, delay: 0 },
  { Icon: FavoriteIcon, color: '#f472b6', dur: 26, delay: -8.7 },
  { Icon: ThumbUpIcon,  color: '#3897f0', dur: 26, delay: -17.4 },
]

// Điểm nút của mạng lưới, toạ độ trùng đơn vị phần trăm nhờ viewBox 100x100
var WEB_POINTS = [
  { x: 76, y: 38 }, { x: 21, y: 22 }, { x: 63, y: 82 }, { x: 90, y: 64 },
  { x: 12, y: 68 }, { x: 55, y: 10 }, { x: 91, y: 17 }, { x: 32, y: 92 },
  { x: 6,  y: 41 }, { x: 40, y: 4  }, { x: 36, y: 30 }, { x: 66, y: 22 },
  { x: 22, y: 50 }, { x: 79, y: 74 }, { x: 94, y: 44 }, { x: 50, y: 94 },
]

// Cặp chỉ số điểm được nối với nhau
var WEB_LINKS = [
  [0, 10], [10, 12], [12, 5], [5, 7], [7, 15], [15, 2], [2, 13], [13, 3],
  [3, 14], [14, 1], [1, 11], [11, 4], [4, 9], [9, 0], [0, 8], [8, 12],
  [4, 6], [6, 14], [1, 13], [10, 11], [5, 8], [2, 15],
]

var LINK_COLORS = ['#3897f0', '#a855f7', '#f472b6', '#38bdf8']

// Con trỏ vào trong bán kính này thì icon bị hút (px)
var MAGNET_RADIUS = 140

export default function AuthBackground({ children }) {
  var wrapRef = useRef(null)
  var frameRef = useRef(0)
  var lastTrailRef = useRef(0)

  useEffect(function () {
    var wrap = wrapRef.current
    if (!wrap) return undefined

    // Người dùng đã bật giảm chuyển động thì không gắn tương tác nào
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    // Lấy danh sách icon hút một lần lúc gắn, tránh truy vấn DOM mỗi khung hình
    var magnets = Array.prototype.slice.call(wrap.querySelectorAll('[data-magnetic]'))
    var pointer = { x: 0, y: 0 }

    function handleMove(event) {
      var rect = wrap.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top

      // Parallax: chỉ ghi 2 biến CSS, việc dịch chuyển để CSS lo
      wrap.style.setProperty('--mx', ((pointer.x / rect.width) * 2 - 1).toFixed(3))
      wrap.style.setProperty('--my', ((pointer.y / rect.height) * 2 - 1).toFixed(3))

      // Trail: giới hạn 45ms một chấm, nếu không sẽ tạo hàng trăm thẻ mỗi giây
      if (event.timeStamp - lastTrailRef.current > 45) {
        lastTrailRef.current = event.timeStamp
        spawnTrail(pointer.x, pointer.y)
      }

      if (!frameRef.current) {
        frameRef.current = window.requestAnimationFrame(applyMagnet)
      }
    }

    function spawnTrail(x, y) {
      var dot = document.createElement('span')
      dot.className = styles.trailDot
      dot.style.left = x + 'px'
      dot.style.top = y + 'px'
      wrap.appendChild(dot)
      // Tự gỡ khi animation xong, nếu không DOM phình ra vô hạn
      dot.addEventListener('animationend', function () { dot.remove() })
    }

    function applyMagnet() {
      frameRef.current = 0
      var wrapBox = wrap.getBoundingClientRect()

      magnets.forEach(function (el) {
        var box = el.getBoundingClientRect()
        // Tâm icon quy về hệ toạ độ của khung nền
        var cx = box.left - wrapBox.left + box.width / 2
        var cy = box.top - wrapBox.top + box.height / 2
        var dx = pointer.x - cx
        var dy = pointer.y - cy
        var distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < MAGNET_RADIUS) {
          // Càng gần hút càng mạnh, tối đa dịch khoảng 1/3 quãng đường
          var strength = (1 - distance / MAGNET_RADIUS) * 0.32
          el.style.setProperty('--pull-x', (dx * strength).toFixed(1) + 'px')
          el.style.setProperty('--pull-y', (dy * strength).toFixed(1) + 'px')
          el.classList.add(styles.pulled)
        } else {
          el.classList.remove(styles.pulled)
        }
      })
    }

    function handleLeave() {
      wrap.style.setProperty('--mx', 0)
      wrap.style.setProperty('--my', 0)
      magnets.forEach(function (el) { el.classList.remove(styles.pulled) })
    }

    wrap.addEventListener('pointermove', handleMove)
    wrap.addEventListener('pointerleave', handleLeave)

    return function () {
      wrap.removeEventListener('pointermove', handleMove)
      wrap.removeEventListener('pointerleave', handleLeave)
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

  // Dựng một icon trên mạng lưới. showHalo chỉ bật cho lớp gần,
  // bật cho cả lớp xa sẽ rối mắt vì quá nhiều vòng sáng cùng lan ra
  function renderNode(item, i, showHalo) {
    var Icon = item.Icon
    return (
      <span
        key={i}
        data-magnetic
        className={styles.node + ' ' + styles.magnetic}
        style={{
          left: item.x + '%',
          top: item.y + '%',
          color: item.color,
          '--size': item.size,
          '--dur': item.dur + 's',
          '--delay': item.delay + 's',
        }}
      >
        {showHalo && <span className={styles.halo} style={{ '--delay': item.delay + 's' }} />}
        <span className={styles.chip}>
          {/* Không đặt fontSize ở đây: CSS tự tính bằng nửa --size */}
          <Icon sx={{ color: item.color }} />
        </span>
      </span>
    )
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      {/* Ảnh nền bản đồ mạng lưới */}
      <div className={styles.photo} style={{ backgroundImage: 'url(' + networkBg + ')' }} />
      <div className={styles.photoOverlay} />

      {/* Mạng lưới đường nối + chấm sáng tại các nút */}
      <svg className={styles.web} viewBox="0 0 100 100" preserveAspectRatio="none">
        {WEB_LINKS.map(function (link, i) {
          var a = WEB_POINTS[link[0]]
          var b = WEB_POINTS[link[1]]
          var color = LINK_COLORS[i % LINK_COLORS.length]
          return (
            <g key={i}>
              <line
                className={styles.link}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={color}
                style={{ animationDelay: (i * -0.35) + 's' }}
              />
              {/* Hạt sáng chạy dọc đường, chỉ bật ở một phần ba số đường
                  để không quá nhộn nhịp */}
              {i % 3 === 0 && (
                <line
                  className={styles.spark}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={color}
                  style={{ animationDelay: (i * -0.6) + 's' }}
                />
              )}
            </g>
          )
        })}

        {WEB_POINTS.map(function (point, i) {
          return (
            <circle
              key={i}
              className={styles.dot}
              cx={point.x} cy={point.y} r="0.55"
              fill={LINK_COLORS[i % LINK_COLORS.length]}
              style={{ animationDelay: (i * 0.28) + 's' }}
            />
          )
        })}
      </svg>

      {/* Vòng quỹ đạo quanh tâm, mang vài icon nhỏ */}
      <div className={styles.orbit}>
        {ORBIT_ICONS.map(function (item, i) {
          var Icon = item.Icon
          return (
            <span
              key={i}
              className={styles.orbitArm}
              style={{ '--dur': item.dur + 's', '--delay': item.delay + 's' }}
            >
              <span
                className={styles.orbitIcon}
                style={{
                  '--radius': 'clamp(95px, 15vw, 150px)',
                  '--size': '30px',
                  '--dur': item.dur + 's',
                  '--delay': item.delay + 's',
                  color: item.color,
                }}
              >
                <span className={styles.chip}>
                  <Icon sx={{ color: item.color }} />
                </span>
              </span>
            </span>
          )
        })}
      </div>

      {/* Ba lớp icon: xa mờ nhất, gần nét nhất */}
      <div className={styles.layer + ' ' + styles.layerFar}>
        {FAR_ICONS.map(function (item, i) { return renderNode(item, i, false) })}
      </div>

      <div className={styles.layer + ' ' + styles.layerMid}>
        {MID_ICONS.map(function (item, i) { return renderNode(item, i, false) })}
      </div>

      <div className={styles.layer + ' ' + styles.layerNear}>
        {NEAR_ICONS.map(function (item, i) { return renderNode(item, i, true) })}
      </div>

      {/* Quầng tối tách chữ khỏi nền, nằm trên icon nhưng dưới chữ */}
      <div className={styles.veil} />

      <div className={styles.content}>{children}</div>
    </div>
  )
}
