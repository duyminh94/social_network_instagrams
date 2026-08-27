// blockController.js
// Xử lý chặn/bỏ chặn người dùng
//
// Khi chặn:
//   - Tạo bản ghi Block giữa 2 người
//   - Xóa follow cả 2 chiều nếu có
//   - Nếu follow đã accepted thì giảm counter trước khi xóa
//   - Nếu follow đang pending thì chỉ cần xóa (counter chưa tăng)
//
// Khi bỏ chặn:
//   - Chỉ xóa bản ghi Block, KHÔNG tự động follow lại

const Block = require('../models/Block');
const Follow = require('../models/Follow');
const User = require('../models/User');
const { getPagination } = require('../utils/pagination');

// POST /api/block/:userId
async function blockUser(req, res, next) {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.userId;

    if (blockerId === blockedId) {
      return res.status(400).json({ message: 'Không thể tự chặn bản thân' });
    }

    const existing = await Block.findOne({ blockerId, blockedId });
    if (existing) {
      return res.status(400).json({ message: 'Đã chặn người này rồi' });
    }

    await Block.create({ blockerId, blockedId });

    // Chiều A → B (mình follow người bị chặn)
    const followA = await Follow.findOne({ followerId: blockerId, followingId: blockedId });
    if (followA) {
      if (followA.status === 'accepted') {
        await User.findByIdAndUpdate(blockedId, { $inc: { followersCount: -1 } });
        await User.findByIdAndUpdate(blockerId, { $inc: { followingCount: -1 } });
      }
      await followA.deleteOne();
    }

    // Chiều B → A (người bị chặn follow mình)
    const followB = await Follow.findOne({ followerId: blockedId, followingId: blockerId });
    if (followB) {
      if (followB.status === 'accepted') {
        await User.findByIdAndUpdate(blockerId, { $inc: { followersCount: -1 } });
        await User.findByIdAndUpdate(blockedId, { $inc: { followingCount: -1 } });
      }
      await followB.deleteOne();
    }

    res.status(201).json({ message: 'Đã chặn người dùng' });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/block/:userId
// Bỏ chặn không tự động follow lại, 2 người phải tự follow nhau lại nếu muốn
async function unblockUser(req, res, next) {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.userId;

    const block = await Block.findOne({ blockerId, blockedId });
    if (!block) {
      return res.status(404).json({ message: 'Chưa chặn người này' });
    }

    await block.deleteOne();

    res.json({ message: 'Đã bỏ chặn người dùng' });
  } catch (error) {
    next(error);
  }
}

// GET /api/block
async function getBlockList(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 20);

    var total = await Block.countDocuments({ blockerId: req.user.id });
    var totalPages = Math.ceil(total / limit);

    const blocks = await Block.find({ blockerId: req.user.id })
      .populate('blockedId', 'username fullName avatarUrl isTrusted')
      .skip(skip)
      .limit(limit);

    // Trả về mảng user thay vì mảng block document
    const blockedUsers = blocks.map(function (b) { return b.blockedId; });

    res.json({ blockedUsers, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

module.exports = { blockUser, unblockUser, getBlockList };
