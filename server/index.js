// index.js
// Entry point của server — khởi tạo Express, Socket.IO, kết nối MongoDB
//
// Thứ tự quan trọng:
//   1. Middleware bảo mật (helmet, mongoSanitize, cors) phải đứng trước routes
//   2. Rate limiter auth (/login, /register) đặt trước generalLimiter
//      vì Express khớp theo thứ tự — nếu general đặt trước, auth limiter không bao giờ chạy
//   3. Routes đặt sau tất cả middleware
//   4. Global error handler phải đặt SAU routes (Express nhận biết qua 4 tham số err,req,res,next)
//
// Socket.IO chạy trên cùng HTTP server với Express (dùng http.createServer)
//   → Không cần port riêng, cùng port 5001
//
// module.exports = { io, onlineUsers } ở cuối để utils/notification.js dùng lazy require
//   → Tránh circular dependency: index.js → notification.js → index.js

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' },
});

// Bảo mật HTTP headers
app.use(helmet());

// Chống NoSQL injection: loại bỏ $ và . trong input
app.use(mongoSanitize());

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
// limit 8mb: đủ cho ảnh base64 gửi tới endpoint AI gợi ý caption (ảnh ≤5MB → base64 ~6.8MB)
app.use(express.json({ limit: '8mb' }));

// Serve file upload tĩnh — đặt Cross-Origin-Resource-Policy: cross-origin
// để browser ở localhost:5173 load được ảnh từ localhost:5001
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Rate limiting chung: 500 request / 15 phút / IP
var generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting riêng cho auth: 50 lần / 15 phút / IP
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Quá nhiều lần đăng nhập, vui lòng thử lại sau 15 phút' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', generalLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/block', require('./routes/block'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/likes', require('./routes/likes'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/saved', require('./routes/saved'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reels', require('./routes/reels'));
app.use('/api/hashtags', require('./routes/hashtags'));
app.use('/api/audios', require('./routes/audios'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/ai', require('./routes/ai'));

app.get('/', function (req, res) {
  res.json({ message: 'Instagram Clone API đang chạy' });
});

// Global error handler — bắt lỗi từ tất cả controller
app.use(function (err, req, res, next) {
  console.error('Lỗi server:', err.message);
  var status = err.status || 500;
  res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
});

// Models và thư viện dùng trong Socket.IO
const jwt = require('jsonwebtoken');
const TokenBlacklist = require('./models/TokenBlacklist');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const ConversationMember = require('./models/ConversationMember');
const MessageRead = require('./models/MessageRead');
const MessageReaction = require('./models/MessageReaction');
const Block = require('./models/Block');
const User = require('./models/User');
const { runMigrations } = require('./migrations/runMigrations');
const BANNED_CHAT_MESSAGE = 'Người dùng này đã bị khóa';

// Map userId (string) → Set<socketId> để hỗ trợ đa tab/đa thiết bị
// Khi user connect: thêm socketId vào Set. Khi disconnect: xóa socketId khỏi Set.
// Set rỗng → user offline → xóa userId khỏi map.
const onlineUsers = new Map();

// Helper: emit event đến tất cả thành viên trong conversation
// Dùng Socket.IO room (mỗi user join room theo userId) để hỗ trợ đa tab/thiết bị
// Truyền excludeUserId để bỏ qua chính người gửi (tùy trường hợp)
// skipPending = true → chỉ emit cho accepted member (receive_message, typing, mark_read)
// skipPending = false/undefined → emit tất cả, kể cả pending (conversation_updated, member_removed)
async function emitToConversation(conversationId, event, payload, excludeUserId, skipPending) {
  var memberQuery = { conversationId: conversationId };
  if (skipPending) {
    memberQuery.status = 'accepted';
  }
  var members = await ConversationMember.find(memberQuery).lean();
  for (var i = 0; i < members.length; i++) {
    var memberId = members[i].userId.toString();
    if (excludeUserId && memberId === excludeUserId) {
      continue;
    }
    // io.to(userId) emit đến tất cả socket của user đó (multi-tab safe)
    io.to(memberId).emit(event, payload);
  }
}

// Client kết nối Socket.IO phải truyền JWT token:
//   socket = io('http://localhost:5001', { auth: { token: 'Bearer <jwt>' } })
//   hoặc:   socket = io('http://localhost:5001', { query: { token: '<jwt>' } })
//
// FIX: trước đây lấy userId từ query string mà không verify JWT
//      → bất kỳ ai cũng có thể truyền userId của người khác để giả mạo
// Giờ server tự extract userId từ JWT đã verify — client không còn được tự khai userId
// Middleware xác thực: chạy XONG trước khi sự kiện 'connection' được bắn ra.
// Phải đặt ở đây (không đặt trong 'connection') vì verify token có await —
// nếu await nằm trong 'connection' thì các socket.on(...) bên dưới chỉ được đăng ký
// sau khi await xong, khiến event client emit ngay lúc connect bị rơi mất im lặng.
io.use(async function (socket, next) {
  // Đọc token từ socket.handshake.auth.token hoặc socket.handshake.query.token
  var rawToken = (socket.handshake.auth && socket.handshake.auth.token)
    || socket.handshake.query.token
    || '';

  // Loại bỏ tiền tố 'Bearer ' nếu có
  var token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;

  if (!token) {
    return next(new Error('unauthorized'));
  }

  try {
    // Verify chữ ký và thời hạn
    var decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kiểm tra token chưa bị logout (blacklist)
    var isBlacklisted = await TokenBlacklist.findOne({ token: token });
    if (isBlacklisted) {
      return next(new Error('unauthorized'));
    }

    // Gắn userId đã verify vào socket để handler bên dưới dùng lại
    socket.userId = decoded.id;
    return next();
  } catch (e) {
    // Token không hợp lệ hoặc hết hạn → từ chối kết nối
    return next(new Error('unauthorized'));
  }
});

io.on('connection', function (socket) {
  // userId đã được middleware io.use() xác thực — không cần verify lại
  var userId = socket.userId;

  // Join room theo userId → io.to(userId) sẽ emit đến TẤT CẢ tab/thiết bị của user
  socket.join(userId);

  // Thêm socketId vào Set của user (multi-tab: mỗi tab 1 socketId trong cùng Set)
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);
  io.emit('online_users', Array.from(onlineUsers.keys()));

  // --- Gửi tin nhắn ---
  // Client gửi: { conversationId, content, messageType, replyToId, sharedPostId }
  // Server lưu vào DB rồi emit receive_message đến tất cả thành viên
  socket.on('send_message', async function (data) {
    try {
      var conversationId = data.conversationId;
      var content = data.content || '';
      var messageType = data.messageType || 'text';
      var replyToId = data.replyToId || null;
      var sharedPostId = data.sharedPostId || null;

      if (!conversationId || !userId) {
        return;
      }

      // Kiểm tra membership
      var membership = await ConversationMember.findOne({ conversationId: conversationId, userId: userId });
      if (!membership) {
        return;
      }

      // Chỉ cho phép thành viên đã accepted gửi tin — pending member phải Accept trước
      if (membership.status !== 'accepted') {
        return;
      }

      // Không cho phép gửi tin nhắn text rỗng (tránh bypass client-side validation)
      if (messageType === 'text' && !content.trim()) {
        return;
      }

      // Kiểm tra block 2 chiều trong direct conversation
      var conv = await Conversation.findById(conversationId).lean();
      if (conv && conv.type === 'direct') {
        var convMembers = await ConversationMember.find({ conversationId: conversationId }).lean();
        var otherMember = convMembers.find(function (m) { return m.userId.toString() !== userId; });
        if (otherMember) {
          var blocked = await Block.findOne({
            $or: [
              { blockerId: userId, blockedId: otherMember.userId },
              { blockerId: otherMember.userId, blockedId: userId },
            ],
          });
          if (blocked) {
            socket.emit('message_error', { message: 'Không thể gửi tin nhắn cho người dùng này' });
            return;
          }

          var otherUser = await User.findById(otherMember.userId).select('isBanned').lean();
          if (otherUser && otherUser.isBanned) {
            socket.emit('message_error', { message: BANNED_CHAT_MESSAGE });
            return;
          }
        }
      }

      var newMessage = await Message.create({
        conversationId: conversationId,
        senderId: userId,
        content: content,
        messageType: messageType,
        replyToId: replyToId,
        sharedPostId: sharedPostId,
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastActivityAt: new Date(),
        lastMessageId: newMessage._id,
      });

      var populated = await Message.findById(newMessage._id)
        .populate('senderId', 'username fullName avatarUrl isTrusted')
        .populate('replyToId', 'content senderId')
        .lean();

      // Room-based emit → tất cả tab/thiết bị của mỗi thành viên đều nhận
      await emitToConversation(conversationId, 'receive_message', populated, null, true);
    } catch (error) {
      console.error('Lỗi send_message socket:', error.message);
    }
  });

  // --- Đánh dấu đã đọc ---
  // Client gửi: { conversationId }
  // Server cập nhật lastSeenAt và tạo MessageRead cho tin nhắn cuối
  socket.on('mark_read', async function (data) {
    try {
      var conversationId = data.conversationId;
      if (!conversationId || !userId) {
        return;
      }

      // Kiểm tra membership và trạng thái — pending member chưa accept thì không mark_read
      var membership = await ConversationMember.findOne({ conversationId: conversationId, userId: userId });
      if (!membership || membership.status !== 'accepted') {
        return;
      }

      var now = new Date();

      // Cập nhật lastSeenAt trong ConversationMember
      await ConversationMember.updateOne(
        { conversationId: conversationId, userId: userId },
        { lastSeenAt: now }
      );

      // Tạo MessageRead cho tin nhắn mới nhất (bỏ qua nếu đã tồn tại)
      var lastMessage = await Message.findOne({ conversationId: conversationId, isDeleted: false })
        .sort({ createdAt: -1 })
        .lean();

      if (lastMessage) {
        try {
          await MessageRead.create({ messageId: lastMessage._id, userId: userId, readAt: now });
        } catch (e) {
          // Lỗi duplicate key nghĩa là đã đánh dấu đọc rồi — bỏ qua
        }
      }

      // Thông báo cho các thành viên khác biết user này đã đọc
      await emitToConversation(conversationId, 'message_read', {
        userId: userId,
        conversationId: conversationId,
        readAt: now,
      }, userId, true);
    } catch (error) {
      console.error('Lỗi mark_read socket:', error.message);
    }
  });

  // --- Thả cảm xúc tin nhắn ---
  // Client gửi: { messageId, reactionType }
  // Thả lại đúng cảm xúc đang có = bỏ cảm xúc (giống REST POST /:messageId/reactions)
  socket.on('react_message', async function (data) {
    try {
      var messageId = data.messageId;
      var reactionType = data.reactionType || 'love';
      var allowedReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

      if (!messageId || !userId || allowedReactions.indexOf(reactionType) === -1) {
        return;
      }

      var message = await Message.findOne({ _id: messageId, isDeleted: false }).lean();
      if (!message) {
        return;
      }

      // Chỉ thành viên đã chấp nhận mới được thả cảm xúc
      var membership = await ConversationMember.findOne({
        conversationId: message.conversationId,
        userId: userId,
        status: 'accepted',
      });
      if (!membership) {
        return;
      }

      var existing = await MessageReaction.findOne({ messageId: messageId, userId: userId });
      var newReaction = reactionType;

      if (existing && existing.reactionType === reactionType) {
        await MessageReaction.deleteOne({ _id: existing._id });
        newReaction = null;
      } else {
        await MessageReaction.updateOne(
          { messageId: messageId, userId: userId },
          {
            $set: { reactionType: reactionType },
            $setOnInsert: { messageId: messageId, userId: userId },
          },
          { upsert: true }
        );
      }

      await emitToConversation(message.conversationId, 'message_reaction', {
        messageId: messageId,
        conversationId: message.conversationId.toString(),
        userId: userId,
        reactionType: newReaction,
      }, null, true);
    } catch (error) {
      console.error('Lỗi react_message socket:', error.message);
    }
  });

  // --- Đang gõ ---
  // Client gửi: { conversationId }
  socket.on('typing', async function (data) {
    try {
      var conversationId = data.conversationId;
      if (!conversationId || !userId) {
        return;
      }

      // Chỉ accepted member mới được báo typing — pending member chưa có quyền
      var membership = await ConversationMember.findOne({ conversationId: conversationId, userId: userId });
      if (!membership || membership.status !== 'accepted') {
        return;
      }

      await emitToConversation(conversationId, 'user_typing', {
        senderId: userId,
        conversationId: conversationId,
        isTyping: true,
      }, userId, true);
    } catch (error) {
      console.error('Lỗi typing socket:', error.message);
    }
  });

  // --- Dừng gõ ---
  socket.on('stop_typing', async function (data) {
    try {
      var conversationId = data.conversationId;
      if (!conversationId || !userId) {
        return;
      }

      var membership = await ConversationMember.findOne({ conversationId: conversationId, userId: userId });
      if (!membership || membership.status !== 'accepted') {
        return;
      }

      await emitToConversation(conversationId, 'user_typing', {
        senderId: userId,
        conversationId: conversationId,
        isTyping: false,
      }, userId, true);
    } catch (error) {
      console.error('Lỗi stop_typing socket:', error.message);
    }
  });

  // --- Ngắt kết nối ---
  // Chỉ xóa socketId này khỏi Set — các tab khác vẫn giữ kết nối
  // userId chỉ bị xóa khỏi onlineUsers khi không còn tab/thiết bị nào kết nối
  socket.on('disconnect', function () {
    var userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
      }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(async function () {
    console.log('Kết nối MongoDB thành công');

    // Cập nhật dữ liệu cũ cho khớp schema mới.
    // Tất cả bước đều idempotent (chỉ đụng record thiếu dữ liệu) → chạy mỗi lần khởi động vẫn an toàn.
    await runMigrations();

    var PORT = process.env.PORT || 5001;
    server.listen(PORT, function () {
      console.log('Server đang chạy tại http://localhost:' + PORT);
    });
  })
  .catch(function (err) {
    console.error('Kết nối MongoDB thất bại:', err.message);
    process.exit(1);
  });

module.exports = { io, onlineUsers };
