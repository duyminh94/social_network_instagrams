// messageController.js
// Xử lý tin nhắn và quản lý nhóm chat (REST API)
// Realtime qua Socket.IO được xử lý riêng trong server/index.js
//
// Hai loại conversation:
//   - 'direct': 1-1 giữa 2 người, kiểm tra block 2 chiều trước khi tạo
//   - 'group' : nhiều người, cần tên nhóm, người tạo tự động là admin
//
// Role trong nhóm: 'admin' | 'member'
//   - Chỉ admin mới thêm/xóa thành viên, đổi role, sửa thông tin nhóm
//   - Bất kỳ thành viên nào cũng có thể tự rời nhóm
//   - Nếu admin cuối cùng rời/bị xóa → tự động chỉ định 1 thành viên bất kỳ làm admin mới
//
// lastActivityAt trên Conversation được cập nhật mỗi khi có tin nhắn mới
// → dùng để sắp xếp conversation theo hoạt động gần nhất

const Conversation = require('../models/Conversation');
const ConversationMember = require('../models/ConversationMember');
const { getPagination } = require('../utils/pagination');
const Message = require('../models/Message');
const Block = require('../models/Block');
const Follow = require('../models/Follow');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');

var BANNED_CHAT_MESSAGE = 'Người dùng này đã bị khóa';

async function getBannedDirectParticipant(conversationId, senderId) {
  var conv = await Conversation.findById(conversationId).lean();
  if (!conv || conv.type !== 'direct') {
    return null;
  }

  var members = await ConversationMember.find({ conversationId: conversationId }).lean();
  var otherMember = members.find(function (member) {
    return member.userId.toString() !== senderId;
  });
  if (!otherMember) {
    return null;
  }

  var otherUser = await User.findById(otherMember.userId).select('isBanned').lean();
  return otherUser && otherUser.isBanned ? otherUser : null;
}

// GET /api/messages/conversations?page=&limit=
// FIX: trước đây phân trang theo membership.createdAt rồi mới sort conversation theo lastActivityAt
//      → kết quả sai thứ tự và bỏ sót chat mới nhất (nếu đó là conversation cũ trong membership)
// FIX: phân trang trực tiếp trên Conversation sort theo lastActivityAt
async function getConversations(req, res, next) {
  try {
    var userId = req.user.id;
    var { page, limit, skip } = getPagination(req, 20);

    // Chỉ lấy conversation đã accepted — pending nằm trong endpoint riêng
    // Giữ nguyên membership objects (cần lastSeenAt để tính isUnread)
    var memberships = await ConversationMember.find({ userId: userId, status: 'accepted' })
      .select('conversationId lastSeenAt')
      .lean();

    var conversationIds = memberships.map(function (m) { return m.conversationId; });

    // Map conversationId → lastSeenAt để tra nhanh
    var lastSeenMap = {};
    memberships.forEach(function (m) {
      lastSeenMap[m.conversationId.toString()] = m.lastSeenAt;
    });

    // Đếm tổng conversation để tính totalPages
    var total = conversationIds.length;
    var totalPages = Math.ceil(total / limit);

    // Phân trang theo lastActivityAt — đúng thứ tự: chat mới nhất lên đầu
    var conversations = await Conversation.find({ _id: { $in: conversationIds } })
      .sort({ lastActivityAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Ghép thêm members và tin nhắn cuối vào từng conversation
    var result = [];
    for (var i = 0; i < conversations.length; i++) {
      var conv = conversations[i];

      var members = await ConversationMember.find({ conversationId: conv._id })
        .populate('userId', 'username fullName avatarUrl')
        .lean();

      var lastMessage = await Message.findOne({ conversationId: conv._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .populate('senderId', 'username')
        .lean();

      // isUnread: tin nhắn cuối do người khác gửi và mới hơn lần cuối mình đọc
      var isUnread = false;
      if (lastMessage) {
        var lastMsgSenderId = String(lastMessage.senderId?._id || lastMessage.senderId || '');
        var isOtherSender = lastMsgSenderId !== userId;
        if (isOtherSender) {
          var myLastSeen = lastSeenMap[conv._id.toString()];
          if (!myLastSeen || new Date(lastMessage.createdAt) > new Date(myLastSeen)) {
            isUnread = true;
          }
        }
      }

      result.push({
        conversation: conv,
        members: members,
        lastMessage: lastMessage || null,
        isUnread: isUnread,
      });
    }

    return res.json({ conversations: result, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// POST /api/messages/conversations
// Body direct: { type: 'direct', targetUserId }
// Body group:  { type: 'group', name, memberIds: [...] }
async function createConversation(req, res, next) {
  try {
    var userId = req.user.id;
    var type = req.body.type || 'direct';
    var targetUserId = req.body.targetUserId;
    var memberIds = req.body.memberIds || [];
    var name = req.body.name || '';

    if (type === 'direct') {
      if (!targetUserId) {
        return res.status(400).json({ message: 'Thiếu targetUserId' });
      }

      if (targetUserId === userId) {
        return res.status(400).json({ message: 'Không thể tự nhắn tin cho bản thân' });
      }

      var targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'Người dùng không tồn tại' });
      }
      if (targetUser.isBanned) {
        return res.status(403).json({ message: BANNED_CHAT_MESSAGE });
      }

      // Kiểm tra block 2 chiều: ai block ai cũng không nhắn tin được
      var blocked = await Block.findOne({
        $or: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId },
        ],
      });
      if (blocked) {
        return res.status(403).json({ message: 'Không thể nhắn tin với người dùng này' });
      }

      // Nếu đã có direct conversation giữa 2 người thì trả về conversation cũ
      // (tránh tạo nhiều conversation trùng)
      var myMemberships = await ConversationMember.find({ userId: userId }).lean();
      var theirMemberships = await ConversationMember.find({ userId: targetUserId }).lean();

      var myConvIds = myMemberships.map(function (m) { return m.conversationId.toString(); });
      var theirConvIds = theirMemberships.map(function (m) { return m.conversationId.toString(); });

      // Duyệt từng conversation của mình, kiểm tra xem người kia có trong đó không
      // Nếu có và là type 'direct' thì đã tồn tại — trả về luôn
      var existingDirectConv = null;
      for (var i = 0; i < myConvIds.length; i++) {
        if (theirConvIds.indexOf(myConvIds[i]) !== -1) {
          var conv = await Conversation.findOne({ _id: myConvIds[i], type: 'direct' });
          if (conv) {
            existingDirectConv = conv;
            break;
          }
        }
      }

      if (existingDirectConv) {
        return res.json({ message: 'Đã tồn tại', conversation: existingDirectConv });
      }

      // Kiểm tra receiver có follow sender không
      // Nếu receiver follow sender → receiver biết sender → accepted
      // Nếu không → receiver chưa biết sender → pending (tin nhắn đang chờ)
      var receiverFollowsSender = await Follow.findOne({
        followerId: targetUserId,
        followingId: userId,
        status: 'accepted',
      });
      var receiverStatus = receiverFollowsSender ? 'accepted' : 'pending';

      var newConv = await Conversation.create({ type: 'direct', createdBy: userId });
      await ConversationMember.create({ conversationId: newConv._id, userId: userId, role: 'member', status: 'accepted' });
      await ConversationMember.create({ conversationId: newConv._id, userId: targetUserId, role: 'member', status: receiverStatus });

      // Thông báo realtime cho người nhận — badge pending hoặc conversation list cập nhật ngay
      try {
        var directCreateSocket = require('../index.js');
        directCreateSocket.io.to(targetUserId.toString()).emit('conversation_updated', {
          conversationId: newConv._id.toString(),
          action: 'direct_created',
        });
      } catch (e) { /* ignore */ }

      return res.status(201).json({ message: 'Tạo conversation thành công', conversation: newConv });
    }

    if (type === 'group') {
      if (!name) {
        return res.status(400).json({ message: 'Nhóm cần có tên' });
      }

      // Lọc bỏ chính người tạo, validate sự tồn tại + block từng member
      var validGroupMemberIds = [];
      for (var k = 0; k < memberIds.length; k++) {
        if (memberIds[k] === userId) continue;

        var groupMemberUser = await User.findById(memberIds[k]).lean();
        if (!groupMemberUser) {
          return res.status(400).json({ message: 'Một hoặc nhiều người dùng không tồn tại' });
        }
        if (groupMemberUser.isBanned) {
          return res.status(403).json({ message: BANNED_CHAT_MESSAGE });
        }

        var groupMemberBlocked = await Block.findOne({
          $or: [
            { blockerId: userId, blockedId: memberIds[k] },
            { blockerId: memberIds[k], blockedId: userId },
          ],
        });
        if (groupMemberBlocked) {
          return res.status(403).json({ message: 'Không thể thêm người dùng bị chặn vào nhóm' });
        }

        validGroupMemberIds.push(memberIds[k]);
      }

      if (validGroupMemberIds.length < 2) {
        return res.status(400).json({ message: 'Nhóm cần ít nhất 2 thành viên khác' });
      }

      var groupConv = await Conversation.create({ type: 'group', name: name, createdBy: userId });

      // Người tạo là admin
      await ConversationMember.create({ conversationId: groupConv._id, userId: userId, role: 'admin' });

      for (var j = 0; j < validGroupMemberIds.length; j++) {
        await ConversationMember.create({
          conversationId: groupConv._id,
          userId: validGroupMemberIds[j],
          role: 'member',
        });
      }

      // Thông báo realtime cho tất cả thành viên nhóm vừa tạo
      try {
        var groupCreateSocket = require('../index.js');
        var groupCreateMembers = await ConversationMember.find({ conversationId: groupConv._id }).lean();
        for (var gi = 0; gi < groupCreateMembers.length; gi++) {
          groupCreateSocket.io.to(groupCreateMembers[gi].userId.toString()).emit('conversation_updated', {
            conversationId: groupConv._id.toString(),
            action: 'group_created',
          });
        }
      } catch (e) { /* ignore socket error */ }

      return res.status(201).json({ message: 'Tạo nhóm thành công', conversation: groupConv });
    }

    return res.status(400).json({ message: 'type phải là direct hoặc group' });
  } catch (error) {
    return next(error);
  }
}

// GET /api/messages/conversations/:id?page=&limit=
// Tin nhắn mới nhất lên đầu (client đảo ngược lại để hiển thị)
// Tự động cập nhật lastSeenAt khi mở cuộc trò chuyện
async function getMessages(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;
    var { page, limit, skip } = getPagination(req, 30);

    var membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership) {
      return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });
    }

    // Pending member chỉ được xem tin nhắn qua getPendingConversations (first message)
    // Truy cập trực tiếp getMessages bị chặn để tránh hack xem toàn bộ lịch sử
    if (membership.status === 'pending') {
      return res.status(403).json({ message: 'Bạn chưa chấp nhận tin nhắn này' });
    }

    var msgFilter = { conversationId, isDeleted: false };
    var total = await Message.countDocuments(msgFilter);
    var totalPages = Math.ceil(total / limit);

    var messages = await Message.find(msgFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username fullName avatarUrl')
      .populate('replyToId', 'content senderId')
      .lean();

    // Cập nhật thời điểm user đọc tin nhắn gần nhất
    var now = new Date();
    await ConversationMember.updateOne(
      { conversationId, userId },
      { lastSeenAt: now }
    );

    // Trả kèm trạng thái đã xem của các thành viên khác.
    // Nếu A mở chat sau khi B đã xem, A vẫn thấy "Đã xem" thay vì phải chờ socket event mới.
    var acceptedMembers = await ConversationMember.find({
      conversationId: conversationId,
      status: 'accepted',
      lastSeenAt: { $ne: null },
    }).lean();

    var readBy = {};
    acceptedMembers.forEach(function (member) {
      readBy[member.userId.toString()] = member.lastSeenAt;
    });

    // Trạng thái chặn (chỉ direct) — để frontend hiện "bức màn" khóa nhắn tin
    //   isBlocked: có chặn ở BẤT KỲ chiều nào → không nhắn tin được
    //   iBlocked : mình là người chặn → mới hiện nút "Bỏ chặn"
    var isBlocked = false;
    var iBlocked = false;
    var convForBlock = await Conversation.findById(conversationId).lean();
    if (convForBlock && convForBlock.type === 'direct') {
      var blockMembers = await ConversationMember.find({ conversationId: conversationId }).lean();
      var otherBlockMember = blockMembers.find(function (m) { return m.userId.toString() !== userId; });
      if (otherBlockMember) {
        var iBlockDoc = await Block.findOne({ blockerId: userId, blockedId: otherBlockMember.userId }).lean();
        var theyBlockDoc = await Block.findOne({ blockerId: otherBlockMember.userId, blockedId: userId }).lean();
        iBlocked = !!iBlockDoc;
        isBlocked = !!(iBlockDoc || theyBlockDoc);
      }
    }

    return res.json({ messages, readBy, isBlocked: isBlocked, iBlocked: iBlocked, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// POST /api/messages/conversations/:id
// Gửi tin nhắn qua REST (dùng khi không cần realtime hoặc fallback)
// Realtime dùng socket event 'send_message' trong index.js
async function sendMessage(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;
    var content = req.body.content || '';
    var messageType = req.body.messageType || 'text';
    var replyToId = req.body.replyToId || null;
    var sharedPostId = req.body.sharedPostId || null;

    var membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership) {
      return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });
    }

    // Pending member (chưa accept) không được gửi tin — phải Accept conversation trước
    if (membership.status !== 'accepted') {
      return res.status(403).json({ message: 'Bạn chưa chấp nhận tin nhắn này' });
    }

    if (await getBannedDirectParticipant(conversationId, userId)) {
      return res.status(403).json({ message: BANNED_CHAT_MESSAGE });
    }

    // Kiểm tra block 2 chiều trong direct conversation
    var convInfo = await Conversation.findById(conversationId).lean();
    if (convInfo && convInfo.type === 'direct') {
      var allMembers = await ConversationMember.find({ conversationId }).lean();
      var otherMember = allMembers.find(function (m) { return m.userId.toString() !== userId; });
      if (otherMember) {
        var blocked = await Block.findOne({
          $or: [
            { blockerId: userId, blockedId: otherMember.userId },
            { blockerId: otherMember.userId, blockedId: userId },
          ],
        });
        if (blocked) {
          return res.status(403).json({ message: 'Không thể gửi tin nhắn cho người dùng này' });
        }
      }
    }

    if (messageType === 'text' && !content.trim()) {
      return res.status(400).json({ message: 'Tin nhắn không được rỗng' });
    }

    var newMessage = await Message.create({
      conversationId,
      senderId: userId,
      content,
      messageType,
      replyToId,
      sharedPostId,
    });

    await Conversation.findByIdAndUpdate(conversationId, { lastActivityAt: new Date() });

    var populated = await Message.findById(newMessage._id)
      .populate('senderId', 'username fullName avatarUrl')
      .populate('replyToId', 'content senderId')
      .lean();

    // Emit realtime cho tất cả thành viên accepted (giống socket send_message)
    try {
      var socketModule = require('../index.js');
      var textConvMembers = await ConversationMember.find({ conversationId, status: 'accepted' }).lean();
      for (var ti = 0; ti < textConvMembers.length; ti++) {
        socketModule.io.to(textConvMembers[ti].userId.toString()).emit('receive_message', populated);
      }
    } catch (socketErr) {
      console.warn('Socket emit text message thất bại:', socketErr.message);
    }

    return res.status(201).json({ message: 'Gửi tin nhắn thành công', data: populated });
  } catch (error) {
    return next(error);
  }
}

// POST /api/messages/conversations/:id/media
// Upload ảnh hoặc video, lưu Cloudinary, tạo message, emit socket cho tất cả thành viên
async function sendMediaMessage(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ message: 'Chưa có file được gửi lên' });
    }

    var membership = await ConversationMember.findOne({ conversationId: conversationId, userId: userId });
    if (!membership) {
      return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });
    }

    if (membership.status !== 'accepted') {
      return res.status(403).json({ message: 'Bạn chưa chấp nhận tin nhắn này' });
    }

    if (await getBannedDirectParticipant(conversationId, userId)) {
      return res.status(403).json({ message: BANNED_CHAT_MESSAGE });
    }

    var mediaConvInfo = await Conversation.findById(conversationId).lean();
    if (mediaConvInfo && mediaConvInfo.type === 'direct') {
      var mediaMembers = await ConversationMember.find({ conversationId: conversationId }).lean();
      var mediaOther = mediaMembers.find(function (m) { return m.userId.toString() !== userId; });
      if (mediaOther) {
        var mediaBlocked = await Block.findOne({
          $or: [
            { blockerId: userId, blockedId: mediaOther.userId },
            { blockerId: mediaOther.userId, blockedId: userId },
          ],
        });
        if (mediaBlocked) {
          return res.status(403).json({ message: 'Không thể gửi file cho người dùng này' });
        }
      }
    }

    var IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    var isImage = IMAGE_TYPES.indexOf(req.file.mimetype) !== -1;
    var messageType = isImage ? 'image' : 'video';

    var uploadResult = await uploadToCloudinary(req.file.buffer, 'chat_media', req.file.mimetype);

    var newMessage = await Message.create({
      conversationId: conversationId,
      senderId: userId,
      content: uploadResult.secure_url,
      messageType: messageType,
    });

    await Conversation.findByIdAndUpdate(conversationId, { lastActivityAt: new Date() });

    var populated = await Message.findById(newMessage._id)
      .populate('senderId', 'username fullName avatarUrl')
      .lean();

    // Emit realtime — room-based (io.to(userId)) hỗ trợ đa tab/thiết bị
    try {
      var socketModule = require('../index.js');
      var mediaConvMembers = await ConversationMember.find({ conversationId: conversationId, status: 'accepted' }).lean();
      for (var mi = 0; mi < mediaConvMembers.length; mi++) {
        socketModule.io.to(mediaConvMembers[mi].userId.toString()).emit('receive_message', populated);
      }
    } catch (socketErr) {
      console.warn('Socket emit media thất bại:', socketErr.message);
    }

    return res.status(201).json({ message: 'Gửi file thành công', data: populated });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/messages/:messageId
// Xóa mềm, chỉ người gửi mới xóa được tin nhắn của mình
async function deleteMessage(req, res, next) {
  try {
    var message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Tin nhắn không tồn tại' });
    }

    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa tin nhắn này' });
    }

    message.isDeleted = true;
    await message.save();

    // Emit realtime để các thành viên khác ẩn tin nhắn ngay lập tức
    try {
      var socketModule = require('../index.js');
      var delMembers = await ConversationMember.find({ conversationId: message.conversationId, status: 'accepted' }).lean();
      for (var di = 0; di < delMembers.length; di++) {
        socketModule.io.to(delMembers[di].userId.toString()).emit('delete_message', {
          messageId: message._id.toString(),
          conversationId: message.conversationId.toString(),
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit delete_message thất bại:', socketErr.message);
    }

    return res.json({ message: 'Đã xóa tin nhắn' });
  } catch (error) {
    return next(error);
  }
}

// POST /api/messages/conversations/:id/members
// Chỉ admin của nhóm mới thêm được thành viên
async function addMember(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;
    var newMemberId = req.body.userId;

    if (!newMemberId) {
      return res.status(400).json({ message: 'Thiếu userId' });
    }

    var conv = await Conversation.findById(conversationId);
    if (!conv || conv.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ nhóm chat mới thêm được thành viên' });
    }

    var requesterMembership = await ConversationMember.findOne({ conversationId, userId });
    if (!requesterMembership || requesterMembership.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới thêm được thành viên' });
    }

    var newUser = await User.findById(newMemberId);
    if (!newUser) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    if (newUser.isBanned) {
      return res.status(403).json({ message: BANNED_CHAT_MESSAGE });
    }

    var alreadyMember = await ConversationMember.findOne({ conversationId, userId: newMemberId });
    if (alreadyMember) {
      return res.status(400).json({ message: 'Người dùng đã là thành viên' });
    }

    // Không cho phép thêm người đã bị chặn (2 chiều)
    var addMemberBlocked = await Block.findOne({
      $or: [
        { blockerId: userId, blockedId: newMemberId },
        { blockerId: newMemberId, blockedId: userId },
      ],
    });
    if (addMemberBlocked) {
      return res.status(403).json({ message: 'Không thể thêm người dùng bị chặn vào nhóm' });
    }

    await ConversationMember.create({ conversationId, userId: newMemberId, role: 'member' });

    // Thông báo realtime cho tất cả thành viên
    try {
      var addMemberSocket = require('../index.js');
      var addMemberConvMembers = await ConversationMember.find({ conversationId }).lean();
      for (var ai = 0; ai < addMemberConvMembers.length; ai++) {
        addMemberSocket.io.to(addMemberConvMembers[ai].userId.toString()).emit('conversation_updated', {
          conversationId,
          action: 'member_added',
          newMemberId,
        });
      }
    } catch (e) { /* ignore */ }

    return res.status(201).json({ message: 'Thêm thành viên thành công' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/messages/conversations/:id/members/:memberId
// Admin xóa người khác, hoặc bất kỳ ai tự rời nhóm (isSelf)
// Nếu admin cuối cùng rời → tự động chỉ định 1 thành viên bất kỳ làm admin mới
// Khi một thành viên rời nhóm: đảm bảo nhóm luôn còn ít nhất 1 admin,
// và nếu người rời là nhóm trưởng (createdBy) thì chuyển quyền cho người kế nhiệm.
// Người kế nhiệm = admin còn lại CŨ NHẤT; nếu không còn admin → thành viên CŨ NHẤT (nâng lên admin).
// Lưu ý: phải gọi SAU khi đã xóa membership của người rời.
async function reassignGroupLeadership(conv, leavingUserId) {
  var conversationId = conv._id;

  // Ưu tiên admin còn lại, cũ nhất trước
  var successor = await ConversationMember.findOne({ conversationId: conversationId, role: 'admin' })
    .sort({ createdAt: 1 });

  // Không còn admin nào → chọn thành viên cũ nhất rồi nâng lên admin
  if (!successor) {
    successor = await ConversationMember.findOne({ conversationId: conversationId })
      .sort({ createdAt: 1 });
    if (successor) {
      successor.role = 'admin';
      await successor.save();
    }
  }

  // Nếu người rời là nhóm trưởng → chuyển createdBy cho người kế nhiệm
  if (successor && String(conv.createdBy) === String(leavingUserId)) {
    await Conversation.findByIdAndUpdate(conversationId, { createdBy: successor.userId });
  }

  return successor;
}

async function removeMember(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;
    var targetMemberId = req.params.memberId;

    var conv = await Conversation.findById(conversationId);
    if (!conv || conv.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho nhóm chat' });
    }

    var requesterMembership = await ConversationMember.findOne({ conversationId, userId });
    if (!requesterMembership) {
      return res.status(403).json({ message: 'Bạn không thuộc nhóm này' });
    }

    var isSelf = (userId === targetMemberId);
    if (!isSelf && requesterMembership.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới xóa được thành viên khác' });
    }

    var targetMembership = await ConversationMember.findOne({ conversationId, userId: targetMemberId });
    if (!targetMembership) {
      return res.status(404).json({ message: 'Thành viên không tồn tại trong nhóm' });
    }

    // Admin không được kick admin khác — chỉ kick thành viên thường
    if (!isSelf && targetMembership.role === 'admin') {
      return res.status(403).json({ message: 'Không thể mời trưởng nhóm khác ra khỏi nhóm' });
    }

    var targetUser = await User.findById(targetMemberId).lean();
    var requesterUser = await User.findById(userId).lean();
    var targetName = targetUser?.fullName || targetUser?.username || 'Một thành viên';
    var requesterName = requesterUser?.fullName || requesterUser?.username || 'Admin';

    await ConversationMember.deleteOne({ conversationId, userId: targetMemberId });

    // Nếu không còn ai → xóa conversation để tránh orphaned data
    var remainingCount = await ConversationMember.countDocuments({ conversationId });
    if (remainingCount === 0) {
      await Message.deleteMany({ conversationId });
      await Conversation.findByIdAndDelete(conversationId);
      return res.json({ message: isSelf ? 'Đã rời nhóm' : 'Đã xóa thành viên' });
    }

    // Người rời/bị xóa là admin hoặc là nhóm trưởng → chỉ định người kế nhiệm
    // (đảm bảo nhóm còn admin + chuyển createdBy nếu nhóm trưởng vừa rời)
    if (targetMembership.role === 'admin' || String(conv.createdBy) === String(targetMemberId)) {
      await reassignGroupLeadership(conv, targetMemberId);
    }

    var noticeText = targetName + ' đã rời nhóm';
    if (!isSelf) {
      noticeText = requesterName + ' đã mời ' + targetName + ' ra khỏi nhóm';
    }

    var noticeMessage = await Message.create({
      conversationId: conversationId,
      senderId: userId,
      content: noticeText,
      messageType: 'system',
    });

    await Conversation.findByIdAndUpdate(conversationId, { lastActivityAt: new Date() });

    var populatedNotice = await Message.findById(noticeMessage._id)
      .populate('senderId', 'username fullName avatarUrl')
      .lean();

    // Thông báo realtime cho tất cả thành viên còn lại
    try {
      var removeMemberSocket = require('../index.js');
      var currentMembers = await ConversationMember.find({ conversationId }).lean();
      for (var ri = 0; ri < currentMembers.length; ri++) {
        removeMemberSocket.io.to(currentMembers[ri].userId.toString()).emit('receive_message', populatedNotice);
        removeMemberSocket.io.to(currentMembers[ri].userId.toString()).emit('conversation_updated', {
          conversationId,
          action: 'member_removed',
          removedMemberId: targetMemberId,
        });
      }
      // Thông báo riêng cho người BỊ KICK (không phải tự rời) để client navigate ra ngoài
      // Nếu isSelf = true: client tự xử lý sau khi API trả về → không emit member_removed
      //   để tránh 2 toast + 2 navigate chạy cùng lúc
      if (!isSelf) {
        removeMemberSocket.io.to(targetMemberId).emit('member_removed', { conversationId });
      }
    } catch (e) { /* ignore */ }

    return res.json({ message: isSelf ? 'Đã rời nhóm' : 'Đã xóa thành viên' });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/messages/conversations/:id/members/:memberId/role
// Chỉ admin mới đổi role của thành viên khác
async function changeMemberRole(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;
    var targetMemberId = req.params.memberId;
    var newRole = req.body.role;

    if (newRole !== 'admin' && newRole !== 'member') {
      return res.status(400).json({ message: 'Role phải là admin hoặc member' });
    }

    var conv = await Conversation.findById(conversationId);
    if (!conv || conv.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho nhóm chat' });
    }

    var requesterMembership = await ConversationMember.findOne({ conversationId, userId });
    if (!requesterMembership || requesterMembership.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới đổi được role' });
    }

    var targetMembership = await ConversationMember.findOne({ conversationId, userId: targetMemberId });
    if (!targetMembership) {
      return res.status(404).json({ message: 'Thành viên không tồn tại trong nhóm' });
    }

    targetMembership.role = newRole;
    await targetMembership.save();

    try {
      var roleSocket = require('../index.js');
      var roleConvMembers = await ConversationMember.find({ conversationId }).lean();
      for (var rli = 0; rli < roleConvMembers.length; rli++) {
        roleSocket.io.to(roleConvMembers[rli].userId.toString()).emit('conversation_updated', {
          conversationId,
          action: 'role_changed',
          targetMemberId,
          newRole,
        });
      }
    } catch (e) { /* ignore */ }

    return res.json({ message: 'Đổi role thành công' });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/messages/conversations/:id
// Đổi tên hoặc avatar nhóm, chỉ admin mới sửa được
async function updateGroup(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;

    var conv = await Conversation.findById(conversationId);
    if (!conv || conv.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho nhóm chat' });
    }

    var membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới sửa được thông tin nhóm' });
    }

    if (req.body.name) {
      conv.name = req.body.name;
    }

    if (req.file) {
      var uploadResult = await uploadToCloudinary(req.file.buffer, 'group_avatars', req.file.mimetype);
      conv.avatarUrl = uploadResult.secure_url;
    }

    await conv.save();

    try {
      var updateGroupSocket = require('../index.js');
      var updateGroupMembers = await ConversationMember.find({ conversationId }).lean();
      for (var ugi = 0; ugi < updateGroupMembers.length; ugi++) {
        updateGroupSocket.io.to(updateGroupMembers[ugi].userId.toString()).emit('conversation_updated', {
          conversationId,
          action: 'group_updated',
          name: conv.name,
          avatarUrl: conv.avatarUrl,
        });
      }
    } catch (e) { /* ignore */ }

    return res.json({ message: 'Cập nhật nhóm thành công', conversation: conv });
  } catch (error) {
    return next(error);
  }
}

// GET /api/messages/conversations/:id/members
// Phải là thành viên mới xem được danh sách
async function getMembers(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;

    var membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership) {
      return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });
    }

    var members = await ConversationMember.find({ conversationId })
      .populate('userId', 'username fullName avatarUrl')
      .lean();

    return res.json({ members });
  } catch (error) {
    return next(error);
  }
}

// GET /api/messages/conversations/pending
// Danh sách conversation đang chờ user chấp nhận (status='pending')
async function getPendingConversations(req, res, next) {
  try {
    var userId = req.user.id;

    var memberships = await ConversationMember.find({ userId: userId, status: 'pending' })
      .select('conversationId')
      .lean();

    var conversationIds = memberships.map(function (m) { return m.conversationId; });

    var conversations = await Conversation.find({ _id: { $in: conversationIds } })
      .sort({ lastActivityAt: -1 })
      .lean();

    var result = [];
    for (var i = 0; i < conversations.length; i++) {
      var conv = conversations[i];

      var members = await ConversationMember.find({ conversationId: conv._id })
        .populate('userId', 'username fullName avatarUrl')
        .lean();

      // Chỉ hiện tin nhắn đầu tiên trong pending (không cho xem hết)
      var firstMessage = await Message.findOne({ conversationId: conv._id, isDeleted: false })
        .sort({ createdAt: 1 })
        .populate('senderId', 'username')
        .lean();

      result.push({ conversation: conv, members: members, lastMessage: firstMessage || null });
    }

    return res.json({ conversations: result, total: result.length });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/messages/conversations/:id/accept
// Chấp nhận tin nhắn đang chờ → chuyển status thành 'accepted'
async function acceptConversation(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;

    var membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership) {
      return res.status(404).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });
    }
    if (membership.status !== 'pending') {
      return res.status(400).json({ message: 'Conversation này không ở trạng thái chờ' });
    }

    membership.status = 'accepted';
    await membership.save();

    return res.json({ message: 'Đã chấp nhận tin nhắn' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/messages/conversations/:id/decline
// Từ chối tin nhắn đang chờ → xóa conversation và tất cả dữ liệu liên quan
async function declineConversation(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;

    var membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership) {
      return res.status(404).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });
    }
    if (membership.status !== 'pending') {
      return res.status(400).json({ message: 'Conversation này không ở trạng thái chờ' });
    }

    // Xóa toàn bộ dữ liệu conversation
    await Message.deleteMany({ conversationId });
    await ConversationMember.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    return res.json({ message: 'Đã từ chối tin nhắn' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/messages/conversations/:id
// Xóa đoạn chat khỏi danh sách. Direct: xóa toàn bộ conversation; Group: rời nhóm.
async function deleteConversation(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;

    var conv = await Conversation.findById(conversationId);
    if (!conv) {
      return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
    }

    var membership = await ConversationMember.findOne({ conversationId: conversationId, userId: userId });
    if (!membership) {
      return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });
    }

    if (conv.type === 'direct') {
      await Message.deleteMany({ conversationId: conversationId });
      await ConversationMember.deleteMany({ conversationId: conversationId });
      await Conversation.findByIdAndDelete(conversationId);
      return res.json({ message: 'Đã xóa đoạn chat' });
    }

    var leavingMembership = membership;
    await ConversationMember.deleteOne({ conversationId: conversationId, userId: userId });

    var remainingCount = await ConversationMember.countDocuments({ conversationId: conversationId });
    if (remainingCount === 0) {
      await Message.deleteMany({ conversationId: conversationId });
      await Conversation.findByIdAndDelete(conversationId);
      return res.json({ message: 'Đã rời khỏi nhóm' });
    }

    // Admin hoặc nhóm trưởng vừa rời → chỉ định người kế nhiệm
    // (đảm bảo nhóm còn admin + chuyển createdBy nếu nhóm trưởng vừa rời)
    if (leavingMembership.role === 'admin' || String(conv.createdBy) === String(userId)) {
      await reassignGroupLeadership(conv, userId);
    }

    // Tạo system message và emit realtime — giống removeMember(isSelf=true)
    var leavingUser = await User.findById(userId).lean();
    var leavingName = leavingUser?.fullName || leavingUser?.username || 'Một thành viên';
    var leaveNotice = await Message.create({
      conversationId: conversationId,
      senderId: userId,
      content: leavingName + ' đã rời nhóm',
      messageType: 'system',
    });
    await Conversation.findByIdAndUpdate(conversationId, { lastActivityAt: new Date() });
    var populatedLeaveNotice = await Message.findById(leaveNotice._id)
      .populate('senderId', 'username fullName avatarUrl')
      .lean();

    try {
      var leaveSocket = require('../index.js');
      var remainingMembers = await ConversationMember.find({ conversationId: conversationId }).lean();
      for (var li = 0; li < remainingMembers.length; li++) {
        leaveSocket.io.to(remainingMembers[li].userId.toString()).emit('receive_message', populatedLeaveNotice);
        leaveSocket.io.to(remainingMembers[li].userId.toString()).emit('conversation_updated', {
          conversationId: conversationId,
          action: 'member_removed',
          removedMemberId: userId,
        });
      }
    } catch (e) { /* ignore socket error */ }

    return res.json({ message: 'Đã rời khỏi nhóm' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/messages/conversations/:id/group
// Xóa hẳn cả nhóm — CHỈ người tạo nhóm (createdBy) mới có quyền.
// Khác deleteConversation: deleteConversation với group chỉ cho "rời nhóm".
async function deleteGroup(req, res, next) {
  try {
    var userId = req.user.id;
    var conversationId = req.params.id;

    var conv = await Conversation.findById(conversationId);
    if (!conv) {
      return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
    }

    // Chỉ áp dụng cho nhóm
    if (conv.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ có thể xóa nhóm chat' });
    }

    // Chỉ người tạo nhóm mới được xóa cả nhóm
    if (String(conv.createdBy) !== String(userId)) {
      return res.status(403).json({ message: 'Chỉ người tạo nhóm mới được xóa nhóm' });
    }

    // Lấy danh sách thành viên TRƯỚC khi xóa để còn báo realtime
    var members = await ConversationMember.find({ conversationId: conversationId }).lean();

    // Xóa toàn bộ tin nhắn, thành viên và chính conversation
    await Message.deleteMany({ conversationId: conversationId });
    await ConversationMember.deleteMany({ conversationId: conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    // Báo cho tất cả thành viên để client đóng cửa sổ + xóa khỏi danh sách
    try {
      var socketModule = require('../index.js');
      for (var i = 0; i < members.length; i++) {
        socketModule.io.to(members[i].userId.toString()).emit('group_deleted', {
          conversationId: conversationId,
        });
      }
    } catch (e) { /* bỏ qua lỗi socket */ }

    return res.json({ message: 'Đã xóa nhóm' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getConversations,
  getPendingConversations,
  createConversation,
  getMessages,
  sendMessage,
  sendMediaMessage,
  deleteMessage,
  addMember,
  removeMember,
  changeMemberRole,
  updateGroup,
  getMembers,
  acceptConversation,
  declineConversation,
  deleteConversation,
  deleteGroup,
};
