# 🎨 FRONTEND PLAN — Instagram Clone
> Dành cho Thành viên 3 (Frontend React)
> Cập nhật tiến độ: đổi `[ ]` → `[x]` khi hoàn thành

---

## 📦 Tech Stack Frontend

| Thư viện | Mục đích | Version |
|---|---|---|
| `react` | UI framework | ^18.x |
| `vite` | Build tool | ^5.x |
| `react-router-dom` | Routing, điều hướng trang | ^6.x |
| `axios` | Gọi REST API | ^1.x |
| `socket.io-client` | Realtime chat + notification | ^4.x |
| `bootstrap` | CSS framework layout + form + component | ^5.x |
| `react-bootstrap` | Bootstrap component cho React | ^2.x |
| `zustand` | Quản lý state toàn app | ^4.x |
| `@tanstack/react-query` | Cache + fetch data từ API | ^5.x |
| `react-hook-form` | Quản lý form | ^7.x |
| `react-hot-toast` | Thông báo toast | ^2.x |
| `dayjs` | Format thời gian | ^1.x |

### Cách phân chia Bootstrap vs CSS thường

| Dùng Bootstrap | Viết CSS riêng (`.module.css`) |
|---|---|
| Grid layout (`row`, `col-*`) | Animation, transition |
| Form, Input, Button, Badge | Màu Instagram (`--ig-primary`) |
| Modal, Dropdown, Navbar | Layout đặc thù (PostCard, chat) |
| Table, Pagination (Admin) | Story ring gradient |
| Spacing (`mt-2`, `p-3`) | Sidebar cố định, Reels scroll snap |

---

## 🗂️ GIAI ĐOẠN F0 — Setup dự án

### F0.1 Khởi tạo project
- [ ] Tạo project Vite + React
```bash
npm create vite@latest client -- --template react
cd client
```

### F0.2 Cài đặt packages
- [ ] Cài tất cả packages một lần
```bash
npm install react-router-dom axios socket.io-client zustand @tanstack/react-query react-hook-form react-hot-toast dayjs bootstrap react-bootstrap
npm install -D @tanstack/react-query-devtools
```

### F0.3 Cấu hình Bootstrap + CSS gốc

- [ ] Tạo `src/styles/index.css` — biến màu + reset + ghi đè Bootstrap
```css
/* ===== BIẾN MÀU INSTAGRAM ===== */
:root {
  --ig-primary:      #E1306C;
  --ig-primary-dark: #C13584;
  --ig-blue:         #405DE6;
  --ig-yellow:       #FCAF45;
  --ig-orange:       #FD1D1D;
  --ig-bg:           #FAFAFA;
  --ig-white:        #FFFFFF;
  --ig-border:       #DBDBDB;
  --ig-text:         #262626;
  --ig-text-light:   #8E8E8E;
  --ig-hover:        #F5F5F5;
  --ig-radius:       8px;
  --ig-radius-lg:    12px;
}

/* ===== RESET ===== */
*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: var(--ig-bg);
  color: var(--ig-text);
  font-size: 14px;
}
a { color: inherit; text-decoration: none; }
a:hover { color: inherit; }
img { max-width: 100%; display: block; }

/* ===== GHI ĐÈ BOOTSTRAP ===== */
.btn-primary {
  background-color: var(--ig-primary) !important;
  border-color: var(--ig-primary) !important;
}
.btn-primary:hover, .btn-primary:focus {
  background-color: var(--ig-primary-dark) !important;
  border-color: var(--ig-primary-dark) !important;
}
.btn-outline-primary {
  color: var(--ig-primary) !important;
  border-color: var(--ig-primary) !important;
}
.btn-outline-primary:hover {
  background-color: var(--ig-primary) !important;
  border-color: var(--ig-primary) !important;
  color: white !important;
}
.form-control:focus, .form-select:focus {
  border-color: var(--ig-primary) !important;
  box-shadow: 0 0 0 0.2rem rgba(225, 48, 108, 0.15) !important;
}
.text-primary { color: var(--ig-primary) !important; }
```

- [ ] Tạo `src/styles/components.css` — class CSS dùng chung
```css
/* ===== AVATAR ===== */
.avatar { border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.avatar-sm  { width: 32px;  height: 32px; }
.avatar-md  { width: 44px;  height: 44px; }
.avatar-lg  { width: 56px;  height: 56px; }
.avatar-xl  { width: 80px;  height: 80px; }
.avatar-xxl { width: 150px; height: 150px; }

/* Story ring gradient */
.avatar-story {
  padding: 2px;
  background: linear-gradient(45deg, #FCAF45, #FD1D1D, #E1306C, #C13584, #405DE6);
  border-radius: 50%;
  display: inline-block;
}
.avatar-story img { border: 2px solid white; border-radius: 50%; }
.avatar-story.seen { background: var(--ig-border); }

/* ===== NÚT ICON (không viền, nền trong) ===== */
.btn-icon {
  background: none; border: none;
  padding: 6px; cursor: pointer;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  transition: opacity 0.2s;
  color: var(--ig-text);
}
.btn-icon:hover { opacity: 0.6; }

/* ===== SPINNER ===== */
.spinner-ig {
  width: 24px; height: 24px;
  border: 2px solid var(--ig-border);
  border-top-color: var(--ig-text);
  border-radius: 50%;
  animation: igSpin 0.8s linear infinite;
}
@keyframes igSpin { to { transform: rotate(360deg); } }

/* ===== SKELETON LOADING ===== */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ===== TIỆN ÍCH ===== */
.text-ig-light   { color: var(--ig-text-light); }
.text-ig-primary { color: var(--ig-primary); }
.cursor-pointer  { cursor: pointer; }
.fw-semibold     { font-weight: 600; }
```

### F0.4 Tạo cấu trúc thư mục
- [ ] Chạy lệnh tạo thư mục
```bash
mkdir -p src/{assets/{images,icons},styles,routes,services,context,hooks,utils}
mkdir -p src/components/{common,layout,post,story,comment,chat,notification}
mkdir -p src/features/{auth,post,story,reel,chat,notification}
mkdir -p src/pages/{auth,home,profile,explore,reels,chat,notifications,admin}
```

### F0.5 Tạo file .env
- [ ] Tạo `client/.env`
```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

### F0.6 Sửa main.jsx — import Bootstrap trước CSS riêng
- [ ] Sửa `src/main.jsx`
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles/index.css'
import './styles/components.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

### F0.7 Kiểm tra setup
- [ ] `npm run dev` chạy thành công tại `http://localhost:5173`
- [ ] `class="btn btn-primary"` hiển thị màu hồng Instagram
- [ ] `var(--ig-primary)` hoạt động trong CSS
- [ ] Không có lỗi đỏ trong terminal

---

## 🗂️ GIAI ĐOẠN F1 — Nền tảng

### F1.1 Services
- [ ] Tạo `src/services/api.js`
```js
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
```

- [ ] Tạo `src/services/socket.js`
```js
import { io } from 'socket.io-client'
let socket = null
// Backend nhận userId qua query param (xem server/index.js: socket.handshake.query.userId)
export const connectSocket    = (userId) => {
  if (socket?.connected) return socket
  socket = io(import.meta.env.VITE_SOCKET_URL, { query: { userId } })
  return socket
}
export const getSocket        = () => socket
export const disconnectSocket = () => { socket?.disconnect(); socket = null }
```

### F1.2 Context
- [ ] Tạo `src/context/AuthContext.jsx` (xem code mẫu ở SKILLS.md)
- [ ] Tạo `src/context/SocketContext.jsx`

### F1.3 Hooks + Utils
- [ ] Tạo `src/hooks/useAuth.js`
- [ ] Tạo `src/hooks/useSocket.js`
- [ ] Tạo `src/hooks/useDebounce.js`
- [ ] Tạo `src/hooks/useInfiniteScroll.js`
- [ ] Tạo `src/utils/formatTime.js` — dùng `dayjs`
- [ ] Tạo `src/utils/formatNumber.js` — 1200 → "1.2K"
- [ ] Tạo `src/utils/validators.js` — validate email, password

### F1.4 Routes
- [ ] Tạo `src/routes/PrivateRoute.jsx`
- [ ] Tạo `src/routes/AdminRoute.jsx`
- [ ] Tạo `src/routes/AppRoutes.jsx`

### F1.5 App.jsx
- [ ] Tạo `src/App.jsx` — bọc QueryClient + BrowserRouter + AuthProvider + SocketProvider

### F1.6 Components cơ bản

- [ ] `src/components/common/Spinner.jsx` + `Spinner.module.css`
```css
/* Spinner.module.css */
.wrap { display: flex; justify-content: center; padding: 20px; }
.sm { width: 16px; height: 16px; border-width: 2px; }
.lg { width: 40px; height: 40px; border-width: 3px; }
```

- [ ] `src/components/common/Avatar.jsx`
- [ ] `src/components/common/Button.jsx` — bọc Bootstrap Button + spinner khi loading
- [ ] `src/components/common/Modal.jsx` — bọc react-bootstrap Modal

### F1.7 Kiểm tra
- [ ] Route `/login` hiển thị (chưa cần có UI đẹp)
- [ ] Route `/` redirect về `/login` khi chưa đăng nhập
- [ ] Bootstrap class hoạt động

---

## 🗂️ GIAI ĐOẠN F2 — Auth

### F2.1 CSS Auth
- [ ] Tạo `src/pages/auth/Auth.module.css`
```css
.wrapper {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: var(--ig-bg);
}
.box {
  background: var(--ig-white);
  border: 1px solid var(--ig-border);
  border-radius: var(--ig-radius);
  padding: 40px 40px 30px;
  width: 100%; max-width: 400px;
}
.logo {
  font-size: 36px;
  font-family: 'Billabong', cursive;
  text-align: center;
  margin-bottom: 28px;
}
.divider {
  display: flex; align-items: center; gap: 16px;
  margin: 16px 0;
  color: var(--ig-text-light); font-size: 13px; font-weight: 600;
}
.divider::before, .divider::after {
  content: ''; flex: 1;
  height: 1px; background: var(--ig-border);
}
.switchText {
  text-align: center;
  border-top: 1px solid var(--ig-border);
  margin-top: 16px; padding-top: 16px;
  font-size: 14px; color: var(--ig-text-light);
}
.switchText a { color: var(--ig-primary); font-weight: 600; }
```

### F2.2 Pages Auth
- [ ] Tạo `src/pages/auth/Login.jsx`
  - Dùng `react-bootstrap` Form.Control
  - Dùng `react-hook-form` validate
  - Spinner khi đang loading
  - Hiện lỗi dưới input bằng `<small className="text-danger">`

- [ ] Tạo `src/pages/auth/Register.jsx`
  - 4 trường: fullName, username, email, password
  - Validate realtime + thông báo lỗi

### F2.3 Kiểm tra
- [ ] Form đẹp, responsive mobile
- [ ] Đăng nhập/ký thành công redirect về Home
- [ ] F5 giữ trạng thái đăng nhập

---

## 🗂️ GIAI ĐOẠN F3 — Layout

### F3.1 CSS Layout
- [ ] Tạo `src/components/layout/Layout.module.css`
```css
.appLayout { display: flex; min-height: 100vh; }

.sidebar {
  width: 244px; position: fixed; top: 0; left: 0;
  height: 100vh; background: var(--ig-white);
  border-right: 1px solid var(--ig-border);
  padding: 20px 12px;
  display: flex; flex-direction: column;
  z-index: 100;
}

.mainContent { margin-left: 244px; flex: 1; }

/* Tablet — sidebar thu gọn */
@media (max-width: 1024px) {
  .sidebar { width: 72px; }
  .sidebarLabel { display: none; }
  .mainContent { margin-left: 72px; }
}

/* Mobile — ẩn sidebar */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .mainContent { margin-left: 0; padding-bottom: 64px; }
}

/* Nav item trong sidebar */
.navItem {
  display: flex; align-items: center; gap: 16px;
  padding: 12px; border-radius: var(--ig-radius);
  cursor: pointer; font-size: 16px; color: var(--ig-text);
  border: none; background: none; width: 100%; text-align: left;
  transition: background 0.15s;
}
.navItem:hover { background: var(--ig-hover); }
.navItem.active { font-weight: 600; }

/* Mobile bottom nav */
.mobileNav {
  display: none; position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--ig-white); border-top: 1px solid var(--ig-border);
  z-index: 200; padding: 8px 0;
}
@media (max-width: 768px) {
  .mobileNav { display: flex; justify-content: space-around; }
}
.mobileNavItem {
  display: flex; flex-direction: column; align-items: center;
  padding: 4px 12px; border: none; background: none;
  cursor: pointer; color: var(--ig-text);
  font-size: 10px; gap: 3px;
  position: relative;
}
```

### F3.2 Components Layout
- [ ] Hoàn thiện `src/components/layout/Sidebar.jsx`
  - Logo + menu items + badge thông báo + nút đăng xuất
- [ ] Tạo `src/components/layout/MobileNav.jsx`
  - 5 icon bottom: Home, Tìm kiếm, Reels, Chat, Profile
- [ ] Tạo `src/components/layout/MainLayout.jsx`
  - Bọc Sidebar + MobileNav cho mọi trang cần login

### F3.3 Kiểm tra
- [ ] Sidebar hiển thị đúng trên desktop
- [ ] Sidebar thu nhỏ trên tablet (chỉ icon)
- [ ] Mobile nav hiển thị đúng trên điện thoại

---

## 🗂️ GIAI ĐOẠN F4 — Home Feed + Story

### F4.1 Features Post + Story
- [ ] Tạo `src/features/post/postAPI.js`
- [ ] Tạo `src/features/story/storyAPI.js`

### F4.2 CSS PostCard
- [ ] Tạo `src/components/post/PostCard.module.css`
```css
.card {
  background: var(--ig-white);
  border: 1px solid var(--ig-border);
  border-radius: var(--ig-radius);
  margin-bottom: 24px; max-width: 614px;
}
.header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
}
.userInfo { display: flex; align-items: center; gap: 10px; }
.username { font-weight: 600; font-size: 14px; }
.location { font-size: 12px; color: var(--ig-text-light); }

.media { width: 100%; aspect-ratio: 1; object-fit: cover; }

.actions {
  display: flex; align-items: center;
  gap: 4px; padding: 6px 12px 0;
}
.saveBtn { margin-left: auto; }

.likesCount { padding: 2px 16px; font-weight: 600; font-size: 14px; }

.caption { padding: 4px 16px 8px; font-size: 14px; line-height: 1.5; }
.caption .username { margin-right: 6px; }

/* Like button animation */
.likeBtn {
  background: none; border: none;
  cursor: pointer; padding: 6px;
  transition: transform 0.15s;
  color: var(--ig-text);
}
.likeBtn:active { transform: scale(1.3); }
.liked svg { fill: #E1306C; color: #E1306C; }
```

### F4.3 CSS Story
- [ ] Tạo `src/components/story/Story.module.css`
```css
.storyBar {
  display: flex; gap: 16px;
  padding: 16px;
  overflow-x: auto;
  background: var(--ig-white);
  border: 1px solid var(--ig-border);
  border-radius: var(--ig-radius);
  margin-bottom: 24px;
}
.storyBar::-webkit-scrollbar { display: none; }

.storyItem {
  display: flex; flex-direction: column;
  align-items: center; gap: 6px;
  cursor: pointer; flex-shrink: 0;
}
.storyName {
  font-size: 12px; color: var(--ig-text);
  max-width: 64px; text-align: center;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Story viewer fullscreen */
.viewer {
  position: fixed; inset: 0;
  background: black; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.viewerMedia { max-height: 100vh; max-width: 100%; object-fit: contain; }
.progress {
  position: absolute; top: 0; left: 0; right: 0;
  display: flex; gap: 4px; padding: 12px;
}
.progressBar {
  flex: 1; height: 2px; background: rgba(255,255,255,0.4);
  border-radius: 2px; overflow: hidden;
}
.progressFill {
  height: 100%; background: white;
  animation: storyProgress 5s linear forwards;
}
@keyframes storyProgress { from { width: 0%; } to { width: 100%; } }
```

### F4.4 Components Post + Story
- [ ] Hoàn thiện `src/components/post/PostCard.jsx`
- [ ] Tạo `src/components/post/PostActions.jsx`
- [ ] Tạo `src/components/post/PostModal.jsx` — dùng `react-bootstrap` Modal
- [ ] Tạo `src/components/post/CreatePostForm.jsx`
- [ ] Tạo `src/components/comment/CommentList.jsx`
- [ ] Tạo `src/components/comment/CommentItem.jsx`
- [ ] Tạo `src/components/story/StoryBar.jsx`
- [ ] Tạo `src/components/story/StoryViewer.jsx`

### F4.5 Page Home
- [ ] Hoàn thiện `src/pages/home/Home.jsx`
  - Dùng Bootstrap `container`, `row`, `col-lg-8 col-12`
  - Feed trái + cột phải (ẩn trên mobile): avatar + tên mình, link đến trang Search để tìm người follow
  - API feed: `GET /api/posts/feed?page=1&limit=10`
  - API like: `POST /api/likes` body `{ targetType: 'post', targetId }` / `DELETE /api/likes` cùng body
  - IntersectionObserver load thêm bài

### F4.6 Kiểm tra
- [ ] Feed hiển thị bài đúng
- [ ] Like/Unlike với animation tim đỏ
- [ ] Story bar cuộn ngang, click xem được
- [ ] Infinite scroll hoạt động

---

## 🗂️ GIAI ĐOẠN F5 — Profile

### F5.1 CSS Profile
- [ ] Tạo `src/pages/profile/Profile.module.css`
```css
.header {
  display: flex; align-items: center;
  gap: 60px; padding: 30px 0;
}
.stats { display: flex; gap: 32px; margin-top: 16px; }
.statItem { text-align: center; }
.statNum { font-weight: 600; font-size: 18px; display: block; }
.statLabel { font-size: 14px; color: var(--ig-text-light); }

/* Grid ảnh 3 cột */
.postsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px; margin-top: 0;
}
.postThumb {
  aspect-ratio: 1; object-fit: cover;
  width: 100%; cursor: pointer;
  transition: opacity 0.15s;
}
.postThumb:hover { opacity: 0.85; }

/* Tabs */
.tabs {
  display: flex; justify-content: center;
  border-top: 1px solid var(--ig-border);
}
.tab {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 24px;
  font-size: 13px; font-weight: 600;
  letter-spacing: 1px; text-transform: uppercase;
  color: var(--ig-text-light);
  border: none; background: none; cursor: pointer;
  border-top: 1px solid transparent; margin-top: -1px;
}
.tab.active { color: var(--ig-text); border-top-color: var(--ig-text); }

@media (max-width: 576px) {
  .header { flex-direction: column; gap: 16px; align-items: flex-start; }
}
```

### F5.2 Pages Profile
- [ ] Tạo `src/pages/profile/Profile.jsx`
- [ ] Tạo `src/pages/profile/EditProfile.jsx`
  - Dùng Bootstrap Form.Group, Form.Control
  - Upload ảnh preview trước khi lưu

### F5.3 Kiểm tra
- [ ] Grid 3 cột hiển thị đúng
- [ ] Follow/Unfollow cập nhật số ngay
- [ ] EditProfile lưu thành công

---

## 🗂️ GIAI ĐOẠN F6–F10 — Checklist nhanh

### F6 — Explore & Search
- [ ] `src/pages/explore/Explore.jsx`
  - Search bar tìm user: `GET /api/users/search?q=&page=1&limit=10` — debounce 500ms
  - Grid bài khám phá: `GET /api/posts/explore?page=1&limit=20`
  - Bootstrap `input-group` cho search bar
  - Bootstrap `row row-cols-2 row-cols-md-3` cho grid bài
  - **Lưu ý:** backend không có API tìm theo hashtag — chỉ tìm user và xem bài explore

### F7 — Chat Realtime
- [ ] `src/pages/chat/` + CSS module
```css
/* Chat.module.css */
.layout { display: flex; height: calc(100vh - 0px); }
.sidebar { width: 380px; border-right: 1px solid var(--ig-border); overflow-y: auto; }
.window { flex: 1; display: flex; flex-direction: column; }
.messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.inputArea { border-top: 1px solid var(--ig-border); padding: 12px 16px; display: flex; gap: 10px; }

/* Bong bóng tin nhắn */
.bubble { max-width: 60%; padding: 8px 12px; border-radius: 18px; font-size: 14px; word-break: break-word; }
.bubbleMine { background: #3797F0; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
.bubbleOther { background: var(--ig-hover); color: var(--ig-text); align-self: flex-start; border-bottom-left-radius: 4px; }

/* Typing indicator */
.typing { display: flex; gap: 4px; align-items: center; padding: 6px 12px; }
.typingDot { width: 6px; height: 6px; background: var(--ig-text-light); border-radius: 50%; animation: typingBounce 1.2s infinite; }
.typingDot:nth-child(2) { animation-delay: 0.2s; }
.typingDot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

@media (max-width: 768px) {
  .sidebar { width: 100%; display: block; }
  .window  { display: none; }
  .window.active { display: flex; width: 100%; }
}
```
- [ ] API REST: `GET /api/messages/conversations` — danh sách cuộc trò chuyện
- [ ] API REST: `POST /api/messages/conversations` — tạo chat mới (body: `{ participantId }` cho DM, hoặc `{ name, memberIds }` cho nhóm)
- [ ] API REST: `GET /api/messages/conversations/:id` — lấy tin nhắn (phân trang)
- [ ] Socket emit `send_message`: `{ conversationId, content }` → nhận lại `receive_message`
- [ ] Socket emit `typing` / `stop_typing`: `{ conversationId }` → nhận lại `user_typing`
- [ ] Socket emit `mark_read`: `{ conversationId }` → nhận lại `message_read`
- [ ] Realtime hoạt động 2 tab

### F8 — Notifications
- [ ] `src/pages/notifications/Notifications.jsx`
  - API: `GET /api/notifications?page=1&limit=20`
  - API: `PATCH /api/notifications/read-all` — đánh dấu tất cả đã đọc
  - API: `PATCH /api/notifications/:id/read` — đánh dấu 1 thông báo đã đọc
  - API: `GET /api/notifications/unread-count` — đếm badge khi load trang
  - Bootstrap `list-group` cho danh sách
  - Bootstrap `badge` cho số chưa đọc
  - Socket `new_notification` → tăng badge chuông ngay

### F9 — Admin
- [ ] `src/pages/admin/Dashboard.jsx`
  - API: `GET /api/admin/stats`
  - Bootstrap `card` cho stats (tổng user, post, report)
- [ ] `src/pages/admin/UserManagement.jsx`
  - API: `GET /api/admin/users?page=1&limit=10`
  - API: `PATCH /api/admin/users/:id/ban` / `unban` / `trust` / `untrust`
  - API: `PATCH /api/admin/users/:id/role` body `{ role: 'moderator' | 'user' }`
  - Bootstrap `table table-hover table-bordered` + `pagination`
- [ ] `src/pages/admin/ReportManagement.jsx`
  - API: `GET /api/admin/reports?status=pending&page=1`
  - API: `PATCH /api/admin/reports/:id` body `{ status: 'resolved' | 'dismissed' }`
  - API: `DELETE /api/admin/posts/:id` / `comments/:id` / `stories/:id` — xóa nội dung vi phạm
  - Bootstrap `badge` cho status + `btn-group` cho filter

---

## 🗂️ GIAI ĐOẠN F11 — Tối ưu & Test

### F11.1 Tối ưu hiệu năng
- [ ] Skeleton loading dùng class `.skeleton` trên: Feed, Profile grid, Chat list, Notifications
- [ ] Empty states (không có bài, không có tin nhắn, chưa follow ai) — thêm text + icon gợi ý
- [ ] Lazy load ảnh: `<img loading="lazy" />` trên PostCard, Profile grid, Explore
- [ ] Code splitting: `React.lazy()` + `Suspense` cho các trang: Chat, Admin

---

### F11.2 Test Auth
- [ ] Đăng ký tài khoản mới → redirect về Home
- [ ] Đăng nhập sai mật khẩu → hiện thông báo lỗi dưới input
- [ ] Đăng nhập đúng → có token trong `localStorage`
- [ ] F5 trang (reload) → vẫn giữ trạng thái đăng nhập
- [ ] Đăng xuất → token bị xóa → redirect về `/login`
- [ ] Truy cập `/` khi chưa đăng nhập → redirect về `/login`

---

### F11.3 Test Feed & Post
- [ ] Feed hiển thị bài của người mình follow
- [ ] Like bài → tim đỏ ngay, số like tăng 1
- [ ] Like lại → tim trắng, số like giảm 1
- [ ] Click icon comment → mở PostModal, thấy danh sách comment
- [ ] Gõ comment → submit → comment hiển thị ngay dưới
- [ ] Click "..." trên bài của mình → có nút Xóa
- [ ] Xóa bài → bài biến mất khỏi feed ngay
- [ ] Tạo bài mới (upload ảnh + caption) → bài xuất hiện đầu feed
- [ ] Cuộn xuống cuối feed → tự động load thêm bài (infinite scroll)

---

### F11.4 Test Story
- [ ] Story bar hiển thị avatar người có story
- [ ] Avatar có ring gradient (chưa xem), ring xám (đã xem)
- [ ] Click story → mở viewer fullscreen
- [ ] Thanh tiến trình chạy 5s → tự chuyển story tiếp theo
- [ ] Click nửa trái → story trước, click nửa phải → story tiếp
- [ ] Nhấn X hoặc ESC → đóng viewer
- [ ] Đăng story mới → story của mình xuất hiện đầu story bar

---

### F11.5 Test Profile
- [ ] Truy cập profile của mình → thấy ảnh, số post/follower/following đúng
- [ ] Grid 3 cột hiển thị ảnh bài đăng
- [ ] Click ảnh thumbnail → mở PostModal
- [ ] Tab "Đã lưu" → thấy bài đã saved
- [ ] Truy cập profile người khác → nút Follow/Unfollow
- [ ] Click Follow → số follower tăng 1, nút đổi thành Unfollow
- [ ] Click Unfollow → số follower giảm 1
- [ ] Vào Edit Profile → sửa bio → lưu → profile cập nhật ngay

---

### F11.6 Test Explore & Search
- [ ] Gõ tên user → danh sách gợi ý xuất hiện sau 500ms (debounce)
- [ ] Click kết quả → vào profile người đó
- [ ] Xóa ô tìm kiếm → kết quả biến mất
- [ ] Explore grid hiển thị bài của toàn mạng (`GET /api/posts/explore`)

---

### F11.7 Test Chat (cần 2 tab / 2 tài khoản)
- [ ] Mở cuộc trò chuyện → thấy lịch sử tin nhắn
- [ ] Gửi tin nhắn → tin hiện bên phải (màu xanh) ngay
- [ ] Tab 2 nhận tin → hiện bên trái ngay (không cần F5)
- [ ] Đang gõ → tab 2 thấy "..." (typing indicator)
- [ ] Ngừng gõ → typing indicator biến mất
- [ ] Cuộn lên trên → load thêm tin nhắn cũ
- [ ] Socket kết nối dùng `query: { userId }` — kiểm tra `online_users` emit đúng

---

### F11.8 Test Notifications
- [ ] Ai đó like bài → badge chuông tăng lên (qua socket `new_notification`)
- [ ] Ai đó comment → thông báo mới xuất hiện đầu danh sách
- [ ] Click vào thông báo → điều hướng đúng bài/profile
- [ ] Click "Đánh dấu tất cả đã đọc" → gọi `PATCH /api/notifications/read-all` → badge về 0

---

### F11.9 Test Admin
- [ ] Đăng nhập bằng tài khoản `role: 'super_admin'` hoặc `'moderator'` → vào được `/admin`
- [ ] Đăng nhập bằng tài khoản `role: 'user'` → redirect ra khỏi `/admin`
- [ ] Dashboard hiển thị tổng user, post, report (từ `GET /api/admin/stats`)
- [ ] Bảng User Management phân trang đúng (10 user/trang)
- [ ] Ban user → user đó đăng nhập lại bị từ chối (403)
- [ ] Report Management: filter theo status pending/resolved
- [ ] Xóa bài vi phạm → gọi `DELETE /api/admin/posts/:id`

---

### F11.10 Test Responsive
- [ ] **375px (mobile)**: Sidebar ẩn, bottom nav hiện, feed full width
- [ ] **768px (tablet)**: Sidebar thu gọn còn icon, nội dung dịch phải
- [ ] **1024px (desktop nhỏ)**: Sidebar đầy đủ label
- [ ] **1280px+ (desktop lớn)**: Layout đúng, cột phải hiện bên cạnh feed
- [ ] Không có overflow ngang ở bất kỳ breakpoint nào

---

## 📊 Bảng theo dõi tiến độ

| Giai đoạn | Nội dung | Ước tính | Trạng thái |
|---|---|---|---|
| F0 | Setup Vite + Bootstrap + CSS biến | 0.5 ngày | ⬜ |
| F1 | Services + Context + Routes + Component cơ bản | 1 ngày | ⬜ |
| F2 | Auth (Login + Register) | 1 ngày | ⬜ |
| F3 | Layout: Sidebar + MainLayout + MobileNav | 1 ngày | ⬜ |
| F4 | Home Feed + PostCard + Story | 3 ngày | ⬜ |
| F5 | Profile (xem + chỉnh sửa) | 2 ngày | ⬜ |
| F6 | Explore + Search (user + bài khám phá) | 1 ngày | ⬜ |
| F7 | Chat Realtime + Socket.IO | 3 ngày | ⬜ |
| F8 | Notifications realtime | 1.5 ngày | ⬜ |
| F9 | Admin Dashboard | 2 ngày | ⬜ |
| F11.1 | Tối ưu hiệu năng (skeleton, lazy load, code splitting) | 0.5 ngày | ⬜ |
| F11.2 | Test Auth | 0.5 ngày | ⬜ |
| F11.3 | Test Feed & Post | 1 ngày | ⬜ |
| F11.4 | Test Story | 0.5 ngày | ⬜ |
| F11.5 | Test Profile | 0.5 ngày | ⬜ |
| F11.6 | Test Explore & Search | 0.5 ngày | ⬜ |
| F11.7 | Test Chat (2 tab) | 1 ngày | ⬜ |
| F11.8 | Test Notifications | 0.5 ngày | ⬜ |
| F11.9 | Test Admin | 0.5 ngày | ⬜ |
| F11.10 | Test Responsive (4 breakpoint) | 0.5 ngày | ⬜ |
| | **Tổng** | **~23 ngày** | |

**Trạng thái:** ⬜ Chưa bắt đầu · 🟡 Đang làm · ✅ Hoàn thành · ❌ Bỏ qua
