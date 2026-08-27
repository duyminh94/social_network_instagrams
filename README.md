# FPT Aptech Social Network

Clone mạng xã hội Instagram — dự án nhóm 4 người, học kỳ 2.

**Stack**: Node.js + Express.js + MongoDB + Socket.IO (backend) · React + Vite (frontend)

---

## Tính năng đã hoàn thành

| Nhóm | Tính năng |
|------|-----------|
| Xác thực | Đăng ký, đăng nhập, kích hoạt email, quên mật khẩu, đổi mật khẩu, đăng xuất |
| Profile | Xem, chỉnh sửa profile, đổi avatar, tìm kiếm user, gợi ý theo dõi |
| Follow | Follow/unfollow, chấp nhận/từ chối (tài khoản riêng tư), xem followers/following |
| Block | Chặn/bỏ chặn user |
| Bài viết | Đăng (ảnh/carousel/video), feed, khám phá, xem theo user, sửa caption, xóa |
| Like | Like/unlike bài viết và comment |
| Comment | Comment và reply lồng nhau, sửa, xóa |
| Lưu bài | Lưu/bỏ lưu, phân bộ sưu tập |
| Story | Đăng story 24h, xem feed, xem người đã xem, like story, comment story |
| Reels | Đăng video ngắn, xem feed reels, like/comment reel *(đang phát triển)* |
| Tin nhắn | Chat 1-1 và nhóm, realtime qua Socket.IO, gửi ảnh/video, xóa tin nhắn |
| Thông báo | Realtime qua Socket.IO, đánh dấu đã đọc, xóa |
| Báo cáo | Báo cáo vi phạm (post/comment/user), xem lịch sử báo cáo |
| Admin | Quản lý user, xử lý báo cáo, xóa nội dung vi phạm, thống kê, nhật ký hành động |

---

## Yêu cầu môi trường

- Node.js >= 18
- MongoDB (local hoặc Atlas)
- Tài khoản Cloudinary (để upload ảnh/video)

---

## Cài đặt và chạy

### 1. Clone repo

```bash
git clone <repo-url>
cd Instagrams
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env   # điền thông tin vào .env
npm run dev            # chạy tại http://localhost:5001
```

### 3. Frontend

```bash
cd client
npm install
npm run dev            # chạy tại http://localhost:5173
```

---

## Cấu trúc thư mục

```
Instagrams/
├── server/
│   ├── models/          # Mongoose schemas (20 model)
│   ├── routes/          # Express routers
│   ├── controllers/     # Logic xử lý route
│   ├── middleware/
│   │   ├── auth.js      # Xác thực JWT (user)
│   │   ├── adminAuth.js # Xác thực JWT (admin)
│   │   └── upload.js    # Multer nhận file upload
│   ├── utils/
│   │   ├── generateToken.js
│   │   ├── cloudinary.js
│   │   ├── mailer.js    # Gửi email kích hoạt / reset mật khẩu
│   │   └── notification.js
│   └── index.js         # Entry point: Express + Socket.IO
└── client/
    └── src/
        ├── pages/       # Home, Profile, Chat, Admin, ...
        ├── components/  # PostCard, Avatar, Story, ...
        ├── services/    # Axios instance
        └── routes/      # React Router v6
```

---

## Danh sách API

### Auth — `/api/auth`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/register` | Đăng ký tài khoản, gửi email kích hoạt | Không |
| POST | `/login` | Đăng nhập, trả về JWT token | Không |
| GET | `/verify-email?token=` | Kích hoạt tài khoản qua link email | Không |
| POST | `/resend-verification` | Gửi lại email kích hoạt | Không |
| POST | `/forgot-password` | Gửi email đặt lại mật khẩu | Không |
| POST | `/reset-password` | Đặt lại mật khẩu bằng token | Không |
| GET | `/me` | Lấy thông tin user đang đăng nhập | ✅ |
| POST | `/logout` | Đăng xuất, vô hiệu hoá token | ✅ |
| PATCH | `/change-password` | Đổi mật khẩu | ✅ |

### User — `/api/users`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/search?q=` | Tìm kiếm user theo username | Tùy chọn |
| GET | `/suggestions` | Danh sách user gợi ý để follow | ✅ |
| GET | `/:username` | Xem profile user | Tùy chọn |
| PATCH | `/profile` | Cập nhật thông tin profile | ✅ |
| PATCH | `/avatar` | Đổi avatar | ✅ |
| PATCH | `/privacy` | Bật/tắt tài khoản riêng tư | ✅ |
| GET | `/:id/followers` | Danh sách followers | Tùy chọn |
| GET | `/:id/following` | Danh sách đang follow | Tùy chọn |

### Follow — `/api/follow`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/:userId` | Follow user | ✅ |
| DELETE | `/:userId` | Unfollow user | ✅ |
| PATCH | `/:followerId/accept` | Chấp nhận follow request | ✅ |
| DELETE | `/:followerId/reject` | Từ chối follow request | ✅ |
| GET | `/requests` | Danh sách follow request đang chờ | ✅ |

### Block — `/api/block`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/:userId` | Chặn user | ✅ |
| DELETE | `/:userId` | Bỏ chặn user | ✅ |
| GET | `/` | Danh sách user đang chặn | ✅ |

### Post — `/api/posts`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Đăng bài mới (multipart, field: `media`, tối đa 10 file) | ✅ |
| GET | `/feed` | Feed bài viết (của người đang follow) | ✅ |
| GET | `/explore` | Trang khám phá | Tùy chọn |
| GET | `/user/:userId` | Tất cả bài của 1 user | Tùy chọn |
| GET | `/:id` | Chi tiết 1 bài | Tùy chọn |
| PATCH | `/:id` | Sửa caption | ✅ |
| DELETE | `/:id` | Xóa bài (soft delete) | ✅ |

### Like — `/api/likes`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Like (`targetType`: post/comment, `targetId`) | ✅ |
| DELETE | `/` | Unlike | ✅ |
| GET | `/:targetType/:targetId` | Danh sách người đã like | Không |

### Comment — `/api/comments`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Đăng comment hoặc reply (`parentId` nếu là reply) | ✅ |
| GET | `/post/:postId` | Comments của bài viết | Không |
| GET | `/:id/replies` | Replies của 1 comment | Không |
| PATCH | `/:id` | Sửa comment | ✅ |
| DELETE | `/:id` | Xóa comment | ✅ |

### Saved — `/api/saved`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Lưu bài viết | ✅ |
| DELETE | `/:postId` | Bỏ lưu bài viết | ✅ |
| GET | `/` | Danh sách bài đã lưu | ✅ |
| GET | `/collections` | Danh sách bộ sưu tập | ✅ |

### Story — `/api/stories`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Đăng story (tự hết hạn sau 24h, field: `media`) | ✅ |
| GET | `/feed` | Stories của người đang follow | ✅ |
| GET | `/user/:userId` | Stories của 1 user | ✅ |
| GET | `/:id` | Xem story (tự ghi StoryViewer) | ✅ |
| DELETE | `/:id` | Xóa story | ✅ |
| GET | `/:id/viewers` | Danh sách người đã xem | ✅ |
| POST | `/:id/like` | Tim story | ✅ |
| DELETE | `/:id/like` | Bỏ tim story | ✅ |
| GET | `/:id/comments` | Comments của story | ✅ |
| POST | `/:id/comments` | Comment story | ✅ |

### Reel — `/api/reels` *(đang phát triển)*

> Tính năng Reels đang được một thành viên trong nhóm phát triển thêm.

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Đăng reel mới (multipart, field: `video`) | ✅ |
| GET | `/` | Feed reels (explore) | ✅ |
| GET | `/user/:userId` | Reels của 1 user | Tùy chọn |
| GET | `/:id` | Chi tiết 1 reel | Tùy chọn |
| DELETE | `/:id` | Xóa reel (soft delete) | ✅ |
| PATCH | `/:id/view` | Tăng lượt xem | Không |

### Message — `/api/messages`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/conversations` | Danh sách cuộc trò chuyện | ✅ |
| GET | `/conversations/pending` | Tin nhắn đang chờ (chưa accept) | ✅ |
| POST | `/conversations` | Tạo conversation mới (direct/group) | ✅ |
| GET | `/conversations/:id` | Lấy tin nhắn trong conversation | ✅ |
| POST | `/conversations/:id` | Gửi tin nhắn văn bản | ✅ |
| POST | `/conversations/:id/media` | Gửi ảnh/video (field: `file`) | ✅ |
| PATCH | `/conversations/:id/accept` | Chấp nhận tin nhắn đang chờ | ✅ |
| DELETE | `/conversations/:id/decline` | Từ chối tin nhắn đang chờ | ✅ |
| DELETE | `/conversations/:id` | Xóa conversation | ✅ |
| DELETE | `/:messageId` | Xóa tin nhắn | ✅ |
| GET | `/conversations/:id/members` | Danh sách thành viên nhóm | ✅ |
| POST | `/conversations/:id/members` | Thêm thành viên | ✅ |
| DELETE | `/conversations/:id/members/:memberId` | Xóa thành viên / rời nhóm | ✅ |
| PATCH | `/conversations/:id/members/:memberId/role` | Đổi role thành viên | ✅ |
| PATCH | `/conversations/:id` | Đổi tên / ảnh nhóm | ✅ |

### Notification — `/api/notifications`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Danh sách thông báo (phân trang) | ✅ |
| GET | `/unread-count` | Số thông báo chưa đọc | ✅ |
| PATCH | `/read-all` | Đánh dấu tất cả đã đọc | ✅ |
| PATCH | `/:id/read` | Đánh dấu đọc 1 thông báo | ✅ |
| DELETE | `/:id` | Xóa thông báo | ✅ |

### Report — `/api/reports`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Gửi báo cáo vi phạm | ✅ |
| GET | `/my` | Báo cáo mình đã gửi | ✅ |

### Admin — `/api/admin`

> Yêu cầu role `moderator` hoặc `super_admin`. Các endpoint có `*` chỉ `super_admin` mới dùng được.

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/stats` | Thống kê tổng quan |
| GET | `/users` * | Danh sách user (filter `?isBanned=&q=`) |
| GET | `/users/:id` * | Chi tiết user |
| PATCH | `/users/:id/ban` | Ban tài khoản |
| PATCH | `/users/:id/unban` * | Gỡ ban |
| PATCH | `/users/:id/trust` * | Cấp tick xanh |
| PATCH | `/users/:id/untrust` * | Thu hồi tick xanh |
| PATCH | `/users/:id/role` * | Đổi role user |
| GET | `/reports` | Danh sách báo cáo (filter `?status=&targetType=`) |
| PATCH | `/reports/:id` | Xử lý báo cáo (resolved/dismissed) |
| DELETE | `/posts/:id` | Xóa bài vi phạm |
| DELETE | `/comments/:id` | Xóa comment vi phạm |
| DELETE | `/stories/:id` | Xóa story vi phạm |
| GET | `/logs` * | Lịch sử hành động admin |

---

## Xác thực

Endpoint có ✅ yêu cầu header:

```
Authorization: Bearer <token>
```

Endpoint "Tùy chọn" hoạt động với hoặc không có token (dữ liệu trả về có thể khác nhau).

---

## Phân trang

Tất cả endpoint trả về danh sách hỗ trợ:

```
?page=1&limit=20
```

---

## Socket.IO — Realtime

Kết nối: `ws://localhost:5001?userId=<userId>`

| Client → Server | Payload | Mô tả |
|----------------|---------|-------|
| `send_message` | `{ conversationId, content, messageType }` | Gửi tin nhắn |
| `typing` | `{ conversationId }` | Đang gõ |
| `stop_typing` | `{ conversationId }` | Ngừng gõ |
| `mark_read` | `{ conversationId }` | Đánh dấu đã đọc |

| Server → Client | Payload | Mô tả |
|----------------|---------|-------|
| `receive_message` | Message object | Tin nhắn mới |
| `user_typing` | `{ senderId, conversationId, isTyping }` | Trạng thái đang gõ |
| `message_read` | `{ userId, conversationId, readAt }` | Đã đọc |
| `online_users` | `[userId, ...]` | Danh sách online |
| `new_notification` | Notification object | Thông báo realtime |

---

## Bảo mật

- **Helmet.js**: bảo mật HTTP headers
- **Rate limiting**: 5 req/15p cho `/resend-verification`; 100 req/15p cho toàn bộ API
- **mongo-sanitize**: chặn NoSQL injection
- **JWT blacklist**: token bị vô hiệu hoá ngay khi logout (lưu vào MongoDB với TTL)
- **bcrypt**: mật khẩu hash với salt round = 10

---

## Lưu ý khi phát triển

- Port 5000 bị macOS AirPlay chiếm — backend chạy ở **5001**
- Story TTL 24h: MongoDB tự xóa qua TTL index trên trường `expiresAt`
- Email cần Gmail App Password 16 ký tự, không dùng mật khẩu Gmail thường
- File upload lưu local tại `server/uploads/` nếu không cấu hình Cloudinary
