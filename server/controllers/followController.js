// followController.js
// Xử lý logic follow/unfollow và duyệt follow request
//
// Logic tài khoản riêng tư (isPrivate):
//   - Follow tài khoản công khai → status = 'accepted' ngay, tăng counter luôn
//   - Follow tài khoản riêng tư  → status = 'pending', chờ chủ tài khoản duyệt
//   - Khi accept → mới tăng counter
//
// Counter followersCount / followingCount được cập nhật trực tiếp trên User
// thay vì count lại từ Follow collection mỗi lần query (tối ưu hiệu suất)

const Follow = require('../models/Follow');
const User = require('../models/User');
const { createNotification } = require('../utils/notification');
const { getPagination } = require('../utils/pagination');

// POST /api/follow/:userId
async function followUser(req, res, next) {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    if (followerId === followingId) {
      return res.status(400).json({ message: 'Không thể tự follow bản thân' });
    }

    const existing = await Follow.findOne({ followerId, followingId });
    if (existing) {
      return res.status(400).json({ message: 'Đã follow người này rồi' });
    }

    const targetUser = await User.findById(followingId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Tài khoản riêng tư → yêu cầu phê duyệt; công khai → chấp nhận ngay
    let status = 'accepted';
    if (targetUser.isPrivate) {
      status = 'pending';
    }

    await Follow.create({ followerId, followingId, status });

    // Chỉ tăng counter khi được chấp nhận ngay (tài khoản công khai)
    if (status === 'accepted') {
      await User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } });
      await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
    }

    // Gửi thông báo: follow_request nếu pending, follow nếu accepted
    var notifType = status === 'pending' ? 'follow_request' : 'follow';
    await createNotification(followingId, followerId, notifType, null, '');

    const message = status === 'pending' ? 'Đã gửi yêu cầu follow' : 'Follow thành công';
    res.status(201).json({ message, status });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/follow/:userId
async function unfollowUser(req, res, next) {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    const follow = await Follow.findOne({ followerId, followingId });
    if (!follow) {
      return res.status(404).json({ message: 'Chưa follow người này' });
    }

    await follow.deleteOne();

    // Chỉ giảm counter nếu trước đó đã accepted (pending thì counter chưa tăng)
    if (follow.status === 'accepted') {
      await User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } });
      await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
    }

    res.json({ message: 'Unfollow thành công' });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/follow/:followerId/accept
// Chỉ chủ tài khoản (followingId = req.user.id) mới được duyệt
async function acceptFollow(req, res, next) {
  try {
    const followingId = req.user.id;
    const followerId = req.params.followerId;

    const follow = await Follow.findOne({ followerId, followingId, status: 'pending' });
    if (!follow) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu follow' });
    }

    follow.status = 'accepted';
    await follow.save();

    // Tăng counter khi duyệt (lúc follow ban đầu chưa tăng vì status = pending)
    await User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } });
    await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });

    res.json({ message: 'Đã chấp nhận yêu cầu follow' });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/follow/:followerId/reject
// Từ chối và xóa follow request, counter không thay đổi (vì chưa từng tăng)
async function rejectFollow(req, res, next) {
  try {
    const followingId = req.user.id;
    const followerId = req.params.followerId;

    const follow = await Follow.findOne({ followerId, followingId, status: 'pending' });
    if (!follow) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu follow' });
    }

    await follow.deleteOne();

    res.json({ message: 'Đã từ chối yêu cầu follow' });
  } catch (error) {
    next(error);
  }
}

// GET /api/follow/requests?page=&limit=
// Lấy danh sách người đang xin follow mình (status = pending)
async function getFollowRequests(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 20);

    var requestFilter = { followingId: req.user.id, status: 'pending' };
    var total = await Follow.countDocuments(requestFilter);
    var totalPages = Math.ceil(total / limit);

    const requests = await Follow.find(requestFilter)
      .populate('followerId', 'username fullName avatarUrl isTrusted')
      .skip(skip)
      .limit(limit);

    res.json({ requests, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

module.exports = { followUser, unfollowUser, acceptFollow, rejectFollow, getFollowRequests };
