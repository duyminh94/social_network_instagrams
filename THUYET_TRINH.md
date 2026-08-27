# Tài liệu thuyết trình — Phần của Duy Minh

**Phạm vi 5 chức năng:** Chat · Realtime (Socket.IO) · Notification · Trợ lý AI Admin · Block

> Mỗi mục có 3 phần: **Luồng hoạt động** (kể mạch lạc) · **Điểm nhấn** (câu nên nói để ghi điểm) · **Có thể bị hỏi** (chuẩn bị trước).

---

## A. Realtime với Socket.IO (nền tảng cho Chat + Notification)

Đây là phần "lõi kỹ thuật" — nói phần này trước vì Chat và Notification đều dựa trên nó.

### Socket.IO chạy chung server với Express
`http.createServer(app)` rồi gắn cả Express lẫn Socket.IO lên → **cùng cổng 5001**, không cần server riêng.

### Xác thực kết nối bằng JWT (điểm bảo mật quan trọng nhất)
Khi client kết nối phải gửi JWT trong `handshake.auth.token`. Server tự làm:
1. `jwt.verify` chữ ký + thời hạn.
2. Kiểm tra token **không nằm trong TokenBlacklist** (chưa logout).
3. Lấy `userId` **từ token đã verify** — không hợp lệ thì `socket.disconnect()` ngay.

> **Vì sao quan trọng:** Bản cũ lấy `userId` từ query string mà không verify → ai cũng giả mạo userId người khác được. Giờ client **không được tự khai userId**.

### Hỗ trợ đa tab / đa thiết bị
- `onlineUsers` là `Map<userId, Set<socketId>>` — một user mở 3 tab thì có 3 socketId trong cùng 1 Set.
- Mỗi user **join room theo userId** → `io.to(userId)` đẩy event tới **tất cả tab** của họ.
- Khi `disconnect`: chỉ xoá đúng socketId đó; user chỉ tính là offline khi Set rỗng (đóng hết tab).
- Mỗi thay đổi đều `io.emit('online_users', [...])` để mọi người thấy ai đang online.

**Điểm nhấn:** "Em dùng Socket.IO room theo userId thay vì lưu 1 socketId/user, nên 1 người mở nhiều tab vẫn nhận tin đồng bộ ở mọi tab."

**Có thể bị hỏi:**
- *Room là gì?* → Một "nhóm" socket có tên; emit vào room thì mọi socket trong đó đều nhận.
- *Sao không lưu 1 socketId mỗi user?* → Mở tab thứ 2 sẽ ghi đè, tab đầu mất kết nối logic. Dùng Set giữ được tất cả.

---

## B. Chat (Messaging)

Chat là phần lớn nhất: có **direct + group**, **message request**, **quản lý nhóm**, gửi **media/reply/share post**. REST API lo phần lưu trữ & quản lý; Socket.IO lo phần realtime.

### B1. Hai loại hội thoại
- **direct**: 1-1 giữa 2 người.
- **group**: nhiều người, cần tên nhóm, người tạo mặc định là **admin** nhóm.

### B2. Message Request — pending / accepted (giống Instagram)
Khi A nhắn cho B lần đầu (`createConversation`):
- Nếu **B đã follow A** → B "biết" A → trạng thái thành viên của B là **accepted** (vào thẳng hộp thư).
- Nếu **B chưa follow A** → **pending** → tin nằm ở mục "Tin nhắn đang chờ", B phải **Accept** mới chat tiếp.
- Đã có direct conversation cũ giữa 2 người thì **trả về cái cũ**, không tạo trùng.

**Điểm nhấn:** "Em làm cơ chế message request như Instagram: người lạ nhắn tới thì vào hộp chờ, người nhận duyệt mới thành cuộc trò chuyện chính thức."

### B3. Gửi tin nhắn realtime (`send_message` qua Socket.IO)
Kiểm tra theo thứ tự rồi mới lưu + emit `receive_message`:
1. Là thành viên hội thoại? → 2. Trạng thái **accepted**? (pending phải accept trước) → 3. Không gửi text rỗng → 4. **Không bị block 2 chiều** → 5. Người nhận chưa bị ban → **lưu DB → emit tới tất cả thành viên**.
Đồng thời cập nhật `lastActivityAt` của conversation để sắp xếp danh sách theo hoạt động gần nhất.

### B4. Trạng thái tin nhắn (đã đọc / đang gõ)
- `typing` / `stop_typing` → phát `user_typing` cho thành viên khác (chỉ accepted).
- `mark_read` → cập nhật `lastSeenAt` + tạo `MessageRead` cho tin cuối → phát `message_read` để hiện "đã xem".

### B5. Quản lý nhóm (REST)
- Role: **admin** / **member**. Chỉ admin được thêm/xoá thành viên, đổi role, sửa thông tin nhóm.
- Thành viên nào cũng tự rời nhóm được.
- **Tự bàn giao quyền:** nếu admin cuối cùng rời nhóm → tự chỉ định 1 thành viên bất kỳ làm admin mới (`reassignGroupLeadership`) → nhóm không bao giờ "mất chủ".
- Gửi **media** (`/media`, upload Cloudinary), **reply** (`replyToId`), **share post** (`sharedPostId`).

**Điểm nhấn:** "Nhóm có phân quyền admin/member, và em xử lý cả tình huống admin cuối cùng rời nhóm — hệ thống tự đưa người khác lên làm admin để nhóm vẫn quản lý được."

**Có thể bị hỏi:**
- *Tại sao có cả REST lẫn Socket cho chat?* → REST để lưu trữ, phân trang, quản lý nhóm (cần độ tin cậy + truy vấn); Socket để đẩy tin tức thời. Hai cái bổ trợ nhau.
- *Tránh tạo conversation trùng thế nào?* → Trước khi tạo direct, đối chiếu danh sách conversation chung của 2 người; có rồi thì trả về cái cũ.

---

## C. Notification (thông báo)

### Luồng tạo thông báo
Thông báo tạo **phía server**, không cần client gọi — qua hàm `createNotification(recipientId, senderId, type, ...)`:
1. **Bỏ qua nếu `recipientId === senderId`** (tự like/comment bài mình thì không báo).
2. Lưu vào DB.
3. Nếu người nhận đang online (`onlineUsers.has`) → emit `new_notification` tới room của họ → hiện badge tức thì.

Tạo khi: có người like / comment / follow (hoặc gửi follow request) / admin ban tài khoản.

### REST đi kèm
`GET /` (danh sách, phân trang) · `GET /unread-count` (số chưa đọc cho badge) · `PATCH /:id/read` · `PATCH /read-all` · `DELETE /:id`. Chỉ **người nhận** mới được đánh dấu đọc / xoá thông báo của mình.

### Chi tiết kỹ thuật đáng nói: Circular dependency
`index.js` import `notification.js`, mà `notification.js` lại cần `io` từ `index.js` → vòng lặp import. Nếu require ngay đầu file, Node trả về `{}` (module chưa load xong).
**Giải pháp:** `require('../index')` **đặt trong thân hàm** (lazy require) → chạy sau khi cả 2 file đã load xong → phá được vòng.

**Điểm nhấn:** "Thông báo do server chủ động tạo và đẩy realtime; em xử lý circular dependency giữa file thông báo và file server bằng lazy require."

**Có thể bị hỏi:**
- *Circular dependency là gì?* → Hai module require lẫn nhau lúc khởi động; require muộn trong hàm để phá vòng.
- *User offline thì sao?* → Vẫn lưu DB; lần sau đăng nhập gọi `GET /` là thấy. Realtime chỉ là "đẩy thêm" khi online.

---

## D. Trợ lý AI cho Admin (Gemini) ⭐

Điểm "wow" — cho admin hỏi tự nhiên (vd "có bao nhiêu report chưa xử lý", "tìm user tên Minh").

### Cách hoạt động — 2 lần gọi Gemini, không cần function-calling
1. **Lập kế hoạch:** Gemini đọc câu hỏi → trả **JSON kế hoạch**: cần data gì (`wantStats`, `wantReports`, `wantTopReported`) + từ khoá tìm (`search`). Ép JSON bằng `jsonMode`.
2. **Gom data:** Backend tự query DB đúng theo kế hoạch (`gatherContext`) — đếm user/report, tìm user/post theo từ khoá.
3. **Viết trả lời:** Gửi data đã gom cho Gemini → Gemini viết câu trả lời tiếng Việt.

### Bảo mật & ổn định
- Route bọc `adminAuth` → **chỉ admin** gọi được.
- Từ khoá tìm được **escape regex** (`escapeRegex`) trước khi đưa vào `$regex` → an toàn.
- Dùng chung `utils/gemini.js` có **fallback nhiều API key** (key dính 429/401/403 thì nhảy key kế tiếp).

**Điểm nhấn:** "Thay vì làm function-calling phức tạp, em tách 2 bước: Gemini *lập kế hoạch query* rồi *viết trả lời*. Backend mới là chỗ thật sự chạm DB, nên AI không bao giờ tự ý truy vấn bậy — vừa an toàn vừa nhẹ."

**Có thể bị hỏi:**
- *Sao không để AI query thẳng DB?* → Nguy hiểm + không kiểm soát. AI chỉ "đề xuất cần gì", backend mới quyết định query gì.
- *AI bịa số liệu không?* → Số liệu là backend query thật rồi đưa cho AI diễn đạt, không phải AI tự nghĩ ra.

---

## E. Block (chặn người dùng)

### Khi chặn (`POST /api/block/:userId`)
1. Không cho tự chặn mình; không chặn trùng.
2. Tạo bản ghi `Block { blockerId, blockedId }`.
3. **Xoá follow cả 2 chiều** nếu có — và chỉ giảm counter (`followersCount`/`followingCount`) khi follow đã `accepted` (pending thì counter chưa tăng nên chỉ cần xoá).

### Khi bỏ chặn (`DELETE`)
Chỉ xoá bản ghi Block — **KHÔNG tự follow lại**; 2 người muốn thì tự follow lại.

### Block ảnh hưởng toàn hệ thống (đáng nói nhất)
Block không chỉ là 1 bản ghi — nó được kiểm tra ở khắp nơi:
- **Chat:** không tạo được direct conversation, không gửi được tin (check block 2 chiều trong cả REST `createConversation` lẫn Socket `send_message`).
- **Feed/Explore:** lọc bỏ bài của người trong quan hệ block.
- Kiểm tra **2 chiều**: A chặn B hay B chặn A đều bị chặn như nhau (`$or` đảo `blockerId/blockedId`).

**Điểm nhấn:** "Block xử lý nhất quán 2 chiều và lan ra mọi tính năng — chặn xong là cắt luôn follow, không nhắn tin được, không thấy bài của nhau."

**Có thể bị hỏi:**
- *Vì sao xoá follow khi block?* → Block là cắt quan hệ; giữ follow lại vô lý và vẫn lọt nội dung.
- *Counter lệch thì sao?* → Em phân biệt rõ accepted (đã tính counter, phải `-1`) và pending (chưa tính, chỉ xoá) nên counter không lệch.

---

## Bản đồ liên kết 5 chức năng (vẽ 1 slide sơ đồ)

```
        ┌──────────── Socket.IO (xác thực JWT, room theo userId) ────────────┐
        │                                                                    │
   [ CHAT ]  ──send_message──►  receive_message / typing / message_read      │
        │                                                                    │
        └── kiểm tra BLOCK 2 chiều trước khi gửi ◄──────── [ BLOCK ] ─────────┘
                                                                │
   [ NOTIFICATION ] ── createNotification → lưu DB → emit new_notification (nếu online)
                                                                
   [ AI ADMIN ] ── Gemini lập kế hoạch → backend query DB → Gemini trả lời (chỉ admin)
```

---

## Thứ tự trình bày gợi ý (cho phần của bạn, ~6–8 phút)

1. **Realtime/Socket.IO** (mục A) — nền tảng, nói kỹ phần verify JWT + multi-tab.
2. **Chat** (mục B) — message request + quản lý nhóm là điểm nhấn.
3. **Notification** (mục C) — server chủ động đẩy + circular dependency.
4. **AI Admin** (mục D) — điểm "wow", nói rõ kiến trúc 2 bước.
5. **Block** (mục E) — nhấn tính nhất quán 2 chiều + lan toả toàn hệ thống.

### 3 thứ nên khoe nhất nếu thiếu thời gian
1. **Socket.IO tự verify JWT + multi-tab** (room theo userId).
2. **AI Admin 2 bước** — AI lập kế hoạch, backend mới chạm DB (an toàn).
3. **Message request pending/accepted** dựa trên quan hệ follow.
