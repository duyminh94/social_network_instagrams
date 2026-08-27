// userController.js
// Quản lý profile người dùng: tìm kiếm, xem profile, cập nhật thông tin,
// đổi avatar, thay đổi chế độ riêng tư, xem danh sách followers/following

const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const { getPagination } = require('../utils/pagination');
const Story = require('../models/Story');
const StoryViewer = require('../models/StoryViewer');
const UserChangeLog = require('../models/UserChangeLog');
const { uploadToCloudinary } = require('../utils/cloudinary');

// GET /api/users/search?q=&page=&limit=
// FIX: dùng optionalAuth ở route → req.user có thể có để check isFollowing
async function searchUsers(req, res, next) {
  try {
    const keyword = req.query.q || '';
    const { page, limit, skip } = getPagination(req, 10);

    // Loại bỏ người dùng bị/đang block (2 chiều) và chính mình khỏi kết quả tìm kiếm
    var viewerId = req.user?.id || null;
    var excludeIds = viewerId ? [viewerId] : [];
    if (viewerId) {
      var blockDocs = await Block.find({
        $or: [{ blockerId: viewerId }, { blockedId: viewerId }],
      }).select('blockerId blockedId').lean();
      blockDocs.forEach(function (b) {
        var otherId = b.blockerId.toString() === viewerId ? b.blockedId : b.blockerId;
        excludeIds.push(otherId);
      });
    }

    // Tìm theo username hoặc fullName, không phân biệt hoa thường ($options: 'i')
    var searchFilter = {
      role: 'user',
      isBanned: { $ne: true },
      $or: [
        { username: { $regex: keyword, $options: 'i' } },
        { fullName: { $regex: keyword, $options: 'i' } },
      ],
    };
    if (excludeIds.length > 0) {
      searchFilter._id = { $nin: excludeIds };
    }
    var total = await User.countDocuments(searchFilter);
    var totalPages = Math.ceil(total / limit);

    // Chỉ trả về các field cần thiết, không trả passwordHash hay thông tin nhạy cảm
    var rawUsers = await User.find(searchFilter)
      .select('username fullName avatarUrl isTrusted')
      .skip(skip)
      .limit(limit)
      .lean();

    // Thêm isFollowing + followStatus nếu đã đăng nhập
    // Batch query: 1 lần cho tất cả kết quả, không N+1
    if (viewerId && rawUsers.length > 0) {
      var userIds = rawUsers.map(function (u) { return u._id; });
      var follows = await Follow.find({
        followerId: viewerId,
        followingId: { $in: userIds },
      }).lean();

      var followMap = {};
      follows.forEach(function (f) {
        followMap[f.followingId.toString()] = f.status;
      });

      rawUsers = rawUsers.map(function (u) {
        var status = followMap[u._id.toString()] || null;
        u.isFollowing = !!status;
        u.followStatus = status;
        return u;
      });
    } else {
      rawUsers = rawUsers.map(function (u) {
        u.isFollowing = false;
        u.followStatus = null;
        return u;
      });
    }

    res.json({ users: rawUsers, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// GET /api/users/suggestions?recent=alice,bob&limit=5
// Gợi ý follow kiểu đơn giản cho fresher:
//   1. Loại bỏ chính mình, admin/moderator, user đã follow
//   2. User được người mình follow cũng follow → cộng điểm cao
//   3. User liên quan tới recent search → cộng thêm điểm
//   4. Fallback bằng followers/posts nếu user mới chưa có dữ liệu
async function getSuggestions(req, res, next) {
  try {
    var viewerId = req.user.id;
    var limit = Math.min(parseInt(req.query.limit) || 5, 20);
    var recentRaw = req.query.recent || '';
    var recentNames = recentRaw.split(',').map(function (name) {
      return name.trim().toLowerCase();
    }).filter(Boolean).slice(0, 5);

    var myFollows = await Follow.find({
      followerId: viewerId,
      status: 'accepted',
    }).lean();

    var followingIds = myFollows.map(function (follow) {
      return follow.followingId.toString();
    });

    var excludeIds = [viewerId].concat(followingIds);
    var scoreMap = {};

    function addScore(userId, point) {
      var key = userId.toString();
      if (excludeIds.indexOf(key) !== -1) return;
      scoreMap[key] = (scoreMap[key] || 0) + point;
    }

    // Bạn của người mình follow: nếu mình follow B, B follow C thì gợi ý C.
    if (followingIds.length > 0) {
      var friendsOfFollowing = await Follow.find({
        followerId: { $in: followingIds },
        status: 'accepted',
      }).lean();

      friendsOfFollowing.forEach(function (follow) {
        addScore(follow.followingId, 40);
      });
    }

    // Người liên quan recent search: nếu mình hay tìm B, lấy người B follow và người follow B.
    if (recentNames.length > 0) {
      var recentUsers = await User.find({
        role: 'user',
        username: { $in: recentNames },
      }).select('_id').lean();

      var recentIds = recentUsers.map(function (item) {
        return item._id.toString();
      });

      if (recentIds.length > 0) {
        var recentRelations = await Follow.find({
          status: 'accepted',
          $or: [
            { followerId: { $in: recentIds } },
            { followingId: { $in: recentIds } },
          ],
        }).lean();

        recentRelations.forEach(function (follow) {
          addScore(follow.followerId, 25);
          addScore(follow.followingId, 25);
        });
      }
    }

    // Fallback: user mới chưa follow/tìm ai vẫn thấy vài người phổ biến để bắt đầu.
    var fallbackUsers = await User.find({
      role: 'user',
      isBanned: { $ne: true },
      _id: { $nin: excludeIds },
    })
      .select('_id followersCount postsCount')
      .sort({ followersCount: -1, postsCount: -1, createdAt: -1 })
      .limit(limit * 3)
      .lean();

    fallbackUsers.forEach(function (user) {
      addScore(user._id, 10 + Math.min(user.followersCount || 0, 50) + Math.min(user.postsCount || 0, 20));
    });

    var scoredIds = Object.keys(scoreMap).sort(function (a, b) {
      return scoreMap[b] - scoreMap[a];
    }).slice(0, limit);

    var users = await User.find({
      _id: { $in: scoredIds },
      role: 'user',
      isBanned: { $ne: true },
    }).select('username fullName avatarUrl isTrusted followersCount postsCount').lean();

    var userMap = {};
    users.forEach(function (user) {
      userMap[user._id.toString()] = user;
    });

    var suggestions = scoredIds.map(function (id) {
      return userMap[id];
    }).filter(Boolean);

    return res.json({ users: suggestions });
  } catch (error) {
    return next(error);
  }
}

// GET /api/users/:username  — route công khai (không cần đăng nhập)
// FIX: Chỉ trả về field an toàn để tránh lộ email/phone/role/token nhạy cảm
// FIX: Kiểm tra block 2 chiều (chỉ khi đã đăng nhập)
// FIX: req.user có thể undefined với route công khai — dùng optional chaining
async function getProfile(req, res, next) {
  try {
    var user = await User.findOne({ username: req.params.username })
      .select('username fullName avatarUrl bio website gender isTrusted isPrivate isBanned postsCount followersCount followingCount createdAt email phone');

    if (!user || user.isBanned) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // req.user có thể undefined nếu gọi từ route không có authMiddleware
    var viewerId = req.user?.id || null;
    var isOwner = viewerId && user._id.toString() === viewerId;

    // Kiểm tra block 2 chiều — chỉ khi viewer đã đăng nhập và không phải chủ tài khoản
    if (viewerId && !isOwner) {
      var block = await Block.findOne({
        $or: [
          { blockerId: viewerId, blockedId: user._id },
          { blockerId: user._id, blockedId: viewerId },
        ],
      });
      if (block) {
        return res.status(403).json({ message: 'Không thể xem hồ sơ này' });
      }
    }

    var userObj = user.toObject();

    // Email và phone chỉ trả về cho chủ tài khoản
    if (!isOwner) {
      delete userObj.email;
      delete userObj.phone;
    }

    // Kiểm tra trạng thái follow — trả về để client hiển thị nút đúng
    // isFollowing = true khi đã follow (accepted) HOẶC đã gửi request (pending)
    //   → cả 2 trường hợp click nút đều gọi DELETE (unfollow / hủy request)
    // followStatus = 'accepted' | 'pending' | null
    userObj.isFollowing = false;
    userObj.followStatus = null;
    // incomingFollowStatus: profile owner → viewer (để hiện nút Accept/Decline trên profile)
    userObj.incomingFollowStatus = null;
    if (viewerId && !isOwner) {
      var [existingFollow, incomingFollow] = await Promise.all([
        Follow.findOne({ followerId: viewerId, followingId: user._id }),
        Follow.findOne({ followerId: user._id, followingId: viewerId }),
      ]);
      if (existingFollow) {
        userObj.isFollowing = true;
        userObj.followStatus = existingFollow.status;
      }
      if (incomingFollow) {
        userObj.incomingFollowStatus = incomingFollow.status;
      }
    }

    // Kiểm tra user có story đang hoạt động không (chưa hết hạn 24h)
    var activeStories = await Story.find({
      userId: user._id,
      expiresAt: { $gt: new Date() },
      isDeleted: false,
    }).select('_id').lean();
    userObj.hasActiveStory = activeStories.length > 0;

    // storySeen: viewer đã xem hết story active của user này chưa → frontend vẽ vòng xám
    userObj.storySeen = false;
    if (activeStories.length > 0 && viewerId && user._id.toString() === viewerId.toString()) {
      // Story của chính mình: server không ghi StoryViewer cho chủ story,
      // nên coi như đã xem để không hiện vòng cầu vồng trên avatar của mình
      userObj.storySeen = true;
    } else if (activeStories.length > 0 && viewerId) {
      var storyIds = activeStories.map(function (s) { return s._id; });
      var seenStoryIds = await StoryViewer.distinct('storyId', {
        storyId: { $in: storyIds },
        viewerId: viewerId,
      });
      userObj.storySeen = seenStoryIds.length >= storyIds.length;
    }

    res.json({ user: userObj });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/users/profile
// Chỉ cập nhật các field được gửi lên, field nào undefined thì giữ nguyên
async function updateProfile(req, res, next) {
  try {
    const { fullName, bio, website, gender, phone, username, isPrivate } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    var changes = [];

    // Kiểm tra username mới chưa bị dùng
    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(400).json({ message: 'Username đã được sử dụng' });
      }
      changes.push({ changeType: 'username_changed', oldValue: user.username, newValue: username });
      user.username = username;
    }

    if (fullName !== undefined && fullName !== user.fullName) {
      changes.push({ changeType: 'full_name_changed', oldValue: user.fullName || '', newValue: fullName || '' });
      user.fullName = fullName;
    }
    if (bio !== undefined && bio !== user.bio) {
      changes.push({ changeType: 'bio_changed', oldValue: user.bio || '', newValue: bio || '' });
      user.bio = bio;
    }
    if (website !== undefined) user.website = website;
    if (gender !== undefined) user.gender = gender;
    if (phone !== undefined) user.phone = phone;
    if (isPrivate !== undefined) user.isPrivate = isPrivate;

    await user.save();

    if (changes.length > 0) {
      try {
        await UserChangeLog.insertMany(changes.map(function (change) {
          return Object.assign({}, change, {
            userId: user._id,
            changedBy: user._id,
            source: 'user',
          });
        }));
      } catch (logError) {
        console.error('Khong the ghi lich su thay doi user:', logError);
      }
    }

    // Trả về user với field an toàn — không trả passwordHash hay token nhạy cảm
    var updated = await User.findById(req.user.id)
      .select('username fullName avatarUrl bio website gender phone isTrusted isPrivate postsCount followersCount followingCount email createdAt');

    res.json({ message: 'Cập nhật profile thành công', user: updated });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/users/avatar
// Upload ảnh qua multer (middleware upload.js) → lưu lên Cloudinary → cập nhật avatarUrl
async function updateAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Chưa chọn ảnh' });
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, 'avatars', req.file.mimetype);

    const user = await User.findById(req.user.id);
    user.avatarUrl = uploadResult.secure_url;
    await user.save();

    res.json({ message: 'Đổi avatar thành công', avatarUrl: user.avatarUrl });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/users/avatar
async function removeAvatar(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    user.avatarUrl = null
    await user.save()
    res.json({ message: 'Đã xóa ảnh đại diện' })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/users/privacy
// isPrivate = true: tài khoản riêng tư, cần duyệt follow request
// isPrivate = false: tài khoản công khai, ai cũng follow được ngay
async function updatePrivacy(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    user.isPrivate = req.body.isPrivate !== undefined ? req.body.isPrivate : user.isPrivate;
    await user.save();

    res.json({ message: 'Cập nhật quyền riêng tư thành công', isPrivate: user.isPrivate });
  } catch (error) {
    next(error);
  }
}

// Gắn isFollowing + followStatus của NGƯỜI XEM cho từng user trong danh sách.
// Dùng batch query 1 lần (giống searchUsers) để tránh N+1.
// Các user phải là plain object (query có .lean()) thì gán field mới mới serialize được.
async function attachViewerFollowStatus(users, viewerId) {
  if (!viewerId || users.length === 0) {
    return users.map(function (u) {
      u.isFollowing = false;
      u.followStatus = null;
      return u;
    });
  }

  var userIds = users.map(function (u) { return u._id; });
  var follows = await Follow.find({
    followerId: viewerId,
    followingId: { $in: userIds },
  }).lean();

  var followMap = {};
  follows.forEach(function (f) {
    followMap[f.followingId.toString()] = f.status;
  });

  return users.map(function (u) {
    var status = followMap[u._id.toString()] || null;
    u.isFollowing = !!status;
    u.followStatus = status;
    return u;
  });
}

// GET /api/users/:id/followers?page=&limit=
// Chỉ lấy những follow có status = 'accepted' (đã được duyệt)
// Private account: chỉ chủ tài khoản hoặc người đã follow (accepted) mới xem được
async function getFollowers(req, res, next) {
  try {
    const targetId = req.params.id;
    const viewerId = req.user?.id || null;

    const targetUser = await User.findById(targetId).select('isPrivate isBanned');
    if (!targetUser || targetUser.isBanned) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const isOwner = viewerId && viewerId === targetId;
    if (targetUser.isPrivate && !isOwner) {
      if (!viewerId) return res.status(403).json({ message: 'Tài khoản riêng tư' });
      const follow = await Follow.findOne({ followerId: viewerId, followingId: targetId, status: 'accepted' });
      if (!follow) return res.status(403).json({ message: 'Tài khoản riêng tư' });
    }

    const { page, limit, skip } = getPagination(req, 20);

    var followerFilter = { followingId: targetId, status: 'accepted' };
    var total = await Follow.countDocuments(followerFilter);
    var totalPages = Math.ceil(total / limit);

    const follows = await Follow.find(followerFilter)
      .populate({ path: 'followerId', select: 'username fullName avatarUrl isTrusted', match: { isBanned: { $ne: true } } })
      .skip(skip)
      .limit(limit)
      .lean();

    // Trả về mảng user thay vì mảng follow document
    var followers = follows.map(function (f) { return f.followerId; }).filter(Boolean);

    // Gắn trạng thái follow của người xem để nút hiện đúng "Following" thay vì "Follow"
    followers = await attachViewerFollowStatus(followers, viewerId);

    res.json({ followers, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// GET /api/users/:id/following?page=&limit=
// Private account: chỉ chủ tài khoản hoặc người đã follow (accepted) mới xem được
async function getFollowing(req, res, next) {
  try {
    const targetId = req.params.id;
    const viewerId = req.user?.id || null;

    const targetUser = await User.findById(targetId).select('isPrivate isBanned');
    if (!targetUser || targetUser.isBanned) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const isOwner = viewerId && viewerId === targetId;
    if (targetUser.isPrivate && !isOwner) {
      if (!viewerId) return res.status(403).json({ message: 'Tài khoản riêng tư' });
      const follow = await Follow.findOne({ followerId: viewerId, followingId: targetId, status: 'accepted' });
      if (!follow) return res.status(403).json({ message: 'Tài khoản riêng tư' });
    }

    const { page, limit, skip } = getPagination(req, 20);

    var followingFilter = { followerId: targetId, status: 'accepted' };
    var total = await Follow.countDocuments(followingFilter);
    var totalPages = Math.ceil(total / limit);

    const follows = await Follow.find(followingFilter)
      .populate({ path: 'followingId', select: 'username fullName avatarUrl isTrusted', match: { isBanned: { $ne: true } } })
      .skip(skip)
      .limit(limit)
      .lean();

    var following = follows.map(function (f) { return f.followingId; }).filter(Boolean);

    // Gắn trạng thái follow của người xem để nút hiện đúng "Following" thay vì "Follow"
    following = await attachViewerFollowStatus(following, viewerId);

    res.json({ following, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

module.exports = { searchUsers, getSuggestions, getProfile, updateProfile, updateAvatar, removeAvatar, updatePrivacy, getFollowers, getFollowing };
