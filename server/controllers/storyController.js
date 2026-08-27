// storyController.js
// Xử lý Story — nội dung tự xóa sau 24h
//
// TTL: MongoDB tự xóa document khi expiresAt < thời điểm hiện tại
//      (background job chạy mỗi 60 giây, không xóa tức thời)
// isDeleted: xóa mềm thủ công khi user tự xóa trước 24h
//
// Lượt xem (viewsCount):
//   - Ghi nhận qua StoryViewer, mỗi user chỉ tính 1 lần
//   - Chủ story xem story của mình không tính lượt xem
//   - Dùng findByIdAndUpdate({ new: true }) để lấy viewsCount mới nhất sau khi tăng

const Story = require('../models/Story');
const StoryViewer = require('../models/StoryViewer');
const { getPagination } = require('../utils/pagination');
const StoryLike = require('../models/StoryLike');
const StoryComment = require('../models/StoryComment');
const Conversation = require('../models/Conversation');
const ConversationMember = require('../models/ConversationMember');
const Message = require('../models/Message');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { autoModerate } = require('../utils/autoModerate');

async function canViewStory(story, viewerId) {
  var ownerId = story.userId?._id ? story.userId._id.toString() : story.userId.toString();

  if (ownerId === viewerId) {
    return true;
  }

  var block = await Block.findOne({
    $or: [
      { blockerId: viewerId, blockedId: ownerId },
      { blockerId: ownerId, blockedId: viewerId },
    ],
  });
  if (block) {
    return false;
  }

  var owner = story.userId?.isPrivate !== undefined
    ? story.userId
    : await User.findById(ownerId).select('isPrivate isBanned');

  if (owner && owner.isBanned) {
    return false;
  }

  if (owner && owner.isPrivate) {
    var follow = await Follow.findOne({
      followerId: viewerId,
      followingId: ownerId,
      status: 'accepted',
    });
    return !!follow;
  }

  return true;
}

async function findOrCreateStoryReplyConversation(senderId, receiverId) {
  var senderMemberships = await ConversationMember.find({ userId: senderId }).lean();
  var receiverMemberships = await ConversationMember.find({ userId: receiverId }).lean();

  var senderConvIds = senderMemberships.map(function (m) {
    return m.conversationId.toString();
  });
  var receiverConvIds = receiverMemberships.map(function (m) {
    return m.conversationId.toString();
  });

  for (var i = 0; i < senderConvIds.length; i++) {
    if (receiverConvIds.indexOf(senderConvIds[i]) === -1) continue;

    var existingConv = await Conversation.findOne({ _id: senderConvIds[i], type: 'direct' });
    if (existingConv) {
      // Story reply cần hiện ở Chat lớn và MiniChat, nên đảm bảo cả 2 member là accepted.
      await ConversationMember.updateMany(
        { conversationId: existingConv._id, userId: { $in: [senderId, receiverId] } },
        { status: 'accepted' }
      );
      return existingConv;
    }
  }

  var newConv = await Conversation.create({
    type: 'direct',
    createdBy: senderId,
    lastActivityAt: new Date(),
  });

  await ConversationMember.create({
    conversationId: newConv._id,
    userId: senderId,
    role: 'member',
    status: 'accepted',
  });
  await ConversationMember.create({
    conversationId: newConv._id,
    userId: receiverId,
    role: 'member',
    status: 'accepted',
  });

  return newConv;
}

async function createChatMessageFromStoryReply(story, senderId, content, customMessage) {
  var receiverId = story.userId?._id ? story.userId._id.toString() : story.userId.toString();

  if (receiverId === senderId) {
    return null;
  }

  var conversation = await findOrCreateStoryReplyConversation(senderId, receiverId);
  // customMessage: dùng cho thả tim (❤️). Mặc định là reply story (💬).
  var messageContent = customMessage || ('💬 Trả lời story: ' + content);

  var newMessage = await Message.create({
    conversationId: conversation._id,
    senderId: senderId,
    content: messageContent,
    messageType: 'text',
    // Lưu media của story để bên Chat/MiniChat render thumbnail kèm reply.
    storyMediaUrl: story.mediaUrl || '',
    storyMediaType: story.mediaType || '',
  });

  await Conversation.findByIdAndUpdate(conversation._id, { lastActivityAt: new Date() });

  var populated = await Message.findById(newMessage._id)
    .populate('senderId', 'username fullName avatarUrl')
    .lean();

  var updatedConversation = await Conversation.findById(conversation._id).lean();
  var members = await ConversationMember.find({ conversationId: conversation._id })
    .populate('userId', 'username fullName avatarUrl')
    .lean();

  var conversationItem = {
    conversation: updatedConversation,
    members: members,
    lastMessage: populated,
    isUnread: false,
  };

  try {
    var socketModule = require('../index.js');
    var acceptedMembers = await ConversationMember.find({ conversationId: conversation._id, status: 'accepted' }).lean();
    for (var i = 0; i < acceptedMembers.length; i++) {
      var memberId = acceptedMembers[i].userId.toString();
      socketModule.io.to(memberId).emit('receive_message', populated);
      socketModule.io.to(memberId).emit('conversation_updated', {
        conversationId: conversation._id.toString(),
        action: 'story_reply',
      });
    }
  } catch (socketErr) {
    console.warn('Socket emit story reply thất bại:', socketErr.message);
  }

  return {
    message: populated,
    conversationItem: conversationItem,
  };
}

// POST /api/stories
async function createStory(req, res, next) {
  try {
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Chưa chọn ảnh hoặc video' });
    }

    // FormData gửi lên dạng chuỗi: chỉ tắt khi nhận đúng 'false', mặc định cho phép
    const allowComments = req.body.allowComments !== 'false';

    const uploadResult = await uploadToCloudinary(req.file.buffer, 'stories', req.file.mimetype);

    // TTL index trên trường expiresAt: MongoDB tự xóa document sau 24h
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

    const story = await Story.create({
      userId: req.user.id,
      mediaUrl: uploadResult.secure_url,
      mediaType: mediaType,
      caption: caption || '',
      allowComments: allowComments,
      expiresAt: expiresAt,
    });

    // Kiểm duyệt caption + ảnh tự động (ảnh story; video thì chỉ quét caption)
    autoModerate(
      story.caption,
      'story',
      story._id,
      mediaType === 'image' ? [uploadResult.secure_url] : []
    );

    res.status(201).json({ message: 'Đăng story thành công', story });
  } catch (error) {
    next(error);
  }
}

// GET /api/stories/feed
// Ưu tiên story của người mình follow.
// Với demo/fresher: nếu follow ít quá thì lấy thêm story public của user thường để Home không bị trống.
async function getStoriesFeed(req, res, next) {
  try {
    var now = new Date();
    var viewerId = req.user.id;

    var follows = await Follow.find({ followerId: viewerId, status: 'accepted' });
    var followingIds = follows.map(function (f) { return f.followingId; });

    var blocks = await Block.find({
      $or: [
        { blockerId: viewerId },
        { blockedId: viewerId },
      ],
    }).lean();

    var blockedUserIds = blocks.map(function (b) {
      if (b.blockerId.toString() === viewerId) {
        return b.blockedId;
      }
      return b.blockerId;
    });

    // CHỈ hiện story của người mình đang follow — giống feed bài viết.
    // (Trước đây còn nhét thêm story của TẤT CẢ tài khoản công khai → tài khoản
    //  chưa follow ai vẫn thấy story người lạ. Bỏ phần đó đi.)
    var followedStories = await Story.find({
      userId: { $in: followingIds, $nin: blockedUserIds },
      isDeleted: false,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'username avatarUrl isTrusted isPrivate role isBanned');

    // Loại story của người đã bị ban
    var stories = followedStories.filter(function (story) {
      return story.userId && !story.userId.isBanned;
    });

    // Đề xuất: CHỈ khi đã follow ít nhất 1 người → gợi ý thêm story của "bạn-của-bạn"
    // (người mà những người mình follow đang follow). Chưa follow ai → không gợi ý gì.
    if (followingIds.length > 0) {
      var followingSet = {};
      followingIds.forEach(function (id) { followingSet[id.toString()] = true; });
      var blockedSet = {};
      blockedUserIds.forEach(function (id) { blockedSet[id.toString()] = true; });

      var friendsOfFollowing = await Follow.find({
        followerId: { $in: followingIds },
        status: 'accepted',
      }).lean();

      var suggestedIds = [];
      var seen = {};
      friendsOfFollowing.forEach(function (f) {
        var id = f.followingId.toString();
        if (id === viewerId) return;        // không phải mình
        if (followingSet[id]) return;        // đã follow rồi (story đã có ở trên)
        if (blockedSet[id]) return;          // bị block
        if (seen[id]) return;
        seen[id] = true;
        suggestedIds.push(f.followingId);
      });

      if (suggestedIds.length > 0) {
        var suggestedStories = await Story.find({
          userId: { $in: suggestedIds },
          isDeleted: false,
          expiresAt: { $gt: now },
        })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('userId', 'username avatarUrl isTrusted isPrivate role isBanned');

        // Chỉ lấy tài khoản công khai, không bị ban, role user
        suggestedStories = suggestedStories.filter(function (story) {
          var owner = story.userId;
          return owner && !owner.isPrivate && !owner.isBanned && owner.role === 'user';
        });

        stories = stories.concat(suggestedStories);
      }
    }

    var storyIds = stories.map(function (story) {
      return story._id;
    });

    var viewedStories = await StoryViewer.find({
      storyId: { $in: storyIds },
      viewerId: req.user.id,
    }).lean();

    var viewedMap = {};
    viewedStories.forEach(function (view) {
      viewedMap[view.storyId.toString()] = true;
    });

    // Normalize: populate giữ tên 'userId' → rename sang 'user' cho StoryBar/StoryViewer
    var normalizedStories = stories.map(function (s) {
      var obj = s.toObject();
      obj.user = obj.userId || null;
      obj.seen = !!viewedMap[obj._id.toString()];
      return obj;
    });

    res.json({ stories: normalizedStories });
  } catch (error) {
    next(error);
  }
}

// GET /api/stories/:id
// Tự động ghi nhận lượt xem khi xem story của người khác
// FIX: thêm kiểm tra block 2 chiều
async function getStory(req, res, next) {
  try {
    var viewerId = req.user.id;
    var now = new Date();

    let story = await Story.findOne({
      _id: req.params.id,
      isDeleted: false,
      expiresAt: { $gt: now },
    })
      .populate('userId', 'username avatarUrl isTrusted isPrivate isBanned');

    if (!story || !story.userId) {
      return res.status(404).json({ message: 'Không tìm thấy story' });
    }

    var ownerId = story.userId._id.toString();
    if (story.userId.isBanned && ownerId !== viewerId) {
      return res.status(404).json({ message: 'Không tìm thấy story' });
    }

    // Nếu không phải chủ story → kiểm tra block và quyền riêng tư
    if (ownerId !== viewerId) {
      // Kiểm tra block 2 chiều
      var block = await Block.findOne({
        $or: [
          { blockerId: viewerId, blockedId: ownerId },
          { blockerId: ownerId, blockedId: viewerId },
        ],
      });
      if (block) {
        return res.status(403).json({ message: 'Không có quyền xem story này' });
      }

      // Tài khoản riêng tư → phải follow (accepted) mới xem được
      if (story.userId.isPrivate) {
        var follow = await Follow.findOne({
          followerId: viewerId,
          followingId: ownerId,
          status: 'accepted',
        });
        if (!follow) {
          return res.status(403).json({ message: 'Tài khoản riêng tư' });
        }
      }

      // Ghi nhận lượt xem — chỉ tính 1 lần mỗi user
      const alreadyViewed = await StoryViewer.findOne({
        storyId: story._id,
        viewerId: viewerId,
      });

      if (!alreadyViewed) {
        try {
          await StoryViewer.create({ storyId: story._id, viewerId: viewerId });
          // { new: true } để lấy viewsCount đã tăng thay vì giá trị cũ
          story = await Story.findByIdAndUpdate(
            story._id,
            { $inc: { viewsCount: 1 } },
            { new: true }
          ).populate('userId', 'username avatarUrl isTrusted');
        } catch (createErr) {
          // Lỗi 11000 = duplicate key — race condition, request khác đã ghi nhận rồi
          // Không tăng count thêm, chỉ refetch để lấy viewsCount mới nhất
          if (createErr.code !== 11000) throw createErr;
          story = await Story.findById(story._id)
            .populate('userId', 'username avatarUrl isTrusted');
        }
      }
    }

    // Normalize userId → user
    var storyObj = story.toObject ? story.toObject() : story;
    storyObj.user = storyObj.userId || null;
    storyObj.likesCount = await StoryLike.countDocuments({ storyId: storyObj._id });
    storyObj.commentsCount = await StoryComment.countDocuments({ storyId: storyObj._id, isDeleted: false });
    storyObj.isLiked = !!(await StoryLike.findOne({ storyId: storyObj._id, userId: viewerId }));

    res.json({ story: storyObj });
  } catch (error) {
    next(error);
  }
}

// POST /api/stories/:id/like
async function likeStory(req, res, next) {
  try {
    var story = await Story.findOne({
      _id: req.params.id,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    })
      .populate('userId', 'username avatarUrl isPrivate isBanned');
    if (!story) {
      return res.status(404).json({ message: 'Không tìm thấy story' });
    }

    var allowed = await canViewStory(story, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: 'Không có quyền thả tim story này' });
    }

    // Theo dõi đây có phải lần thả tim MỚI không → tránh gửi chat trùng khi đã like rồi
    var isNewLike = false;
    try {
      await StoryLike.create({ storyId: story._id, userId: req.user.id });
      isNewLike = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      // 11000 = đã thả tim trước đó → không phải like mới
    }

    var likesCount = await StoryLike.countDocuments({ storyId: story._id });

    // Giống reply: thả tim cũng gửi 1 tin nhắn vào chat cho chủ story.
    // Chỉ gửi khi là like MỚI (helper tự bỏ qua nếu là story của chính mình).
    var chatResult = null;
    if (isNewLike) {
      chatResult = await createChatMessageFromStoryReply(story, req.user.id, '', '❤️ Đã thích story của bạn');
    }

    return res.json({
      message: 'Đã thả tim story',
      likesCount: likesCount,
      isLiked: true,
      chatMessage: chatResult?.message || null,
      conversationItem: chatResult?.conversationItem || null,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/stories/:id/like
async function unlikeStory(req, res, next) {
  try {
    var story = await Story.findOne({
      _id: req.params.id,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    });
    if (!story) {
      return res.status(404).json({ message: 'Không tìm thấy story' });
    }

    await StoryLike.deleteOne({ storyId: story._id, userId: req.user.id });
    var likesCount = await StoryLike.countDocuments({ storyId: story._id });
    return res.json({ message: 'Đã bỏ tim story', likesCount: likesCount, isLiked: false });
  } catch (error) {
    return next(error);
  }
}

// GET /api/stories/:id/comments
async function getStoryComments(req, res, next) {
  try {
    var story = await Story.findOne({
      _id: req.params.id,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    })
      .populate('userId', 'isPrivate isBanned');
    if (!story) {
      return res.status(404).json({ message: 'Không tìm thấy story' });
    }

    var allowed = await canViewStory(story, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: 'Không có quyền xem bình luận story này' });
    }

    var comments = await StoryComment.find({ storyId: story._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'username avatarUrl isTrusted')
      .lean();

    var normalizedComments = comments.map(function (comment) {
      comment.user = comment.userId || null;
      return comment;
    });

    return res.json({ comments: normalizedComments });
  } catch (error) {
    return next(error);
  }
}

// POST /api/stories/:id/comments
async function createStoryComment(req, res, next) {
  try {
    var content = (req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ message: 'Nội dung không được rỗng' });
    }

    var story = await Story.findOne({
      _id: req.params.id,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    })
      .populate('userId', 'isPrivate isBanned');
    if (!story) {
      return res.status(404).json({ message: 'Không tìm thấy story' });
    }

    // Chủ story đã tắt bình luận
    if (story.allowComments === false) {
      return res.status(403).json({ message: 'Story này đã tắt bình luận' });
    }

    var allowed = await canViewStory(story, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: 'Không có quyền bình luận story này' });
    }

    var created = await StoryComment.create({
      storyId: story._id,
      userId: req.user.id,
      content: content,
    });

    var comment = await StoryComment.findById(created._id)
      .populate('userId', 'username avatarUrl isTrusted')
      .lean();
    comment.user = comment.userId || null;

    var chatResult = await createChatMessageFromStoryReply(story, req.user.id, content);
    var commentsCount = await StoryComment.countDocuments({ storyId: story._id, isDeleted: false });
    return res.status(201).json({
      message: 'Đã bình luận story',
      comment: comment,
      commentsCount: commentsCount,
      chatMessage: chatResult?.message || null,
      conversationItem: chatResult?.conversationItem || null,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/stories/:id
// Xóa mềm, MongoDB TTL sẽ tự xóa thật sau 24h
async function deleteStory(req, res, next) {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    });

    if (!story) {
      return res.status(404).json({ message: 'Không tìm thấy story' });
    }

    if (story.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền xóa story này' });
    }

    story.isDeleted = true;
    await story.save();

    res.json({ message: 'Đã xóa story' });
  } catch (error) {
    next(error);
  }
}

// GET /api/stories/:id/viewers
// Chỉ chủ story mới xem được danh sách người đã xem
async function getViewers(req, res, next) {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    });

    if (!story) {
      return res.status(404).json({ message: 'Không tìm thấy story' });
    }

    if (story.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền xem danh sách này' });
    }

    const { page, limit, skip } = getPagination(req, 20);

    var total = await StoryViewer.countDocuments({ storyId: req.params.id });
    var totalPages = Math.ceil(total / limit);

    const viewers = await StoryViewer.find({ storyId: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('viewerId', 'username avatarUrl isTrusted');

    res.json({ viewers, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// GET /api/stories/user/:userId
// FIX: kiểm tra block 2 chiều và tài khoản riêng tư
async function getUserStories(req, res, next) {
  try {
    var viewerId = req.user.id;
    var targetUserId = req.params.userId;
    var now = new Date();

    // Nếu không phải xem story của chính mình → kiểm tra block và privacy
    if (targetUserId !== viewerId) {
      // Kiểm tra block 2 chiều
      var block = await Block.findOne({
        $or: [
          { blockerId: viewerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: viewerId },
        ],
      });
      if (block) {
        return res.json({ stories: [] });
      }

      // Kiểm tra tài khoản riêng tư
      var targetUser = await User.findById(targetUserId).select('isPrivate');
      if (targetUser && targetUser.isPrivate) {
        var follow = await Follow.findOne({
          followerId: viewerId,
          followingId: targetUserId,
          status: 'accepted',
        });
        if (!follow) {
          // Trả về rỗng — tài khoản riêng tư, chưa follow
          return res.json({ stories: [] });
        }
      }
    }

    // FIX: thêm populate userId (trước đây thiếu, story không có thông tin user)
    const stories = await Story.find({
      userId: targetUserId,
      isDeleted: false,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'username avatarUrl isTrusted');

    var storyIds = stories.map(function (story) {
      return story._id;
    });

    var viewedStories = await StoryViewer.find({
      storyId: { $in: storyIds },
      viewerId: viewerId,
    }).lean();

    var viewedMap = {};
    viewedStories.forEach(function (view) {
      viewedMap[view.storyId.toString()] = true;
    });

    // Normalize userId → user
    var normalizedUserStories = stories.map(function (s) {
      var obj = s.toObject();
      obj.user = obj.userId || null;
      obj.seen = !!viewedMap[obj._id.toString()];
      return obj;
    });

    res.json({ stories: normalizedUserStories });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createStory,
  getStoriesFeed,
  getStory,
  deleteStory,
  getViewers,
  getUserStories,
  likeStory,
  unlikeStory,
  getStoryComments,
  createStoryComment,
};
