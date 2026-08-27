// reportController.js
// Cho phép người dùng báo cáo nội dung vi phạm
//
// targetType hợp lệ: 'post' | 'reel' | 'story' | 'comment' | 'user'
// reason: chuỗi mô tả lý do (spam, hate, nude, ...)
// Mỗi user chỉ được báo cáo một đối tượng đúng một lần, bất kể report đã xử lý hay chưa.
// Admin xử lý qua /api/admin/reports

const Report = require('../models/Report');
const Post = require('../models/Post');
const { getPagination } = require('../utils/pagination');
const Reel = require('../models/Reel');
const Story = require('../models/Story');
const Comment = require('../models/Comment');
const User = require('../models/User');

// POST /api/reports
// Body: { targetId, targetType, reason, description? }
async function createReport(req, res, next) {
  try {
    var userId = req.user.id;
    var targetId = req.body.targetId;
    var targetType = req.body.targetType;
    var reason = req.body.reason;
    var description = req.body.description || '';

    if (!targetId || !targetType || !reason) {
      return res.status(400).json({ message: 'Thiếu targetId, targetType hoặc reason' });
    }

    var validTypes = ['post', 'reel', 'story', 'comment', 'user'];
    if (validTypes.indexOf(targetType) === -1) {
      return res.status(400).json({ message: 'targetType không hợp lệ' });
    }

    if (targetType === 'user' && targetId === userId) {
      return res.status(400).json({ message: 'Không thể tự báo cáo bản thân' });
    }

    // Kiểm tra target có thực sự tồn tại — tránh lưu report rác vào DB
    if (targetType === 'post') {
      var targetPost = await Post.findOne({ _id: targetId, isDeleted: false });
      if (!targetPost) {
        return res.status(404).json({ message: 'Bài viết không tồn tại' });
      }
    } else if (targetType === 'reel') {
      var targetReel = await Reel.findOne({ _id: targetId, isDeleted: false });
      if (!targetReel) {
        return res.status(404).json({ message: 'Reel không tồn tại' });
      }
    } else if (targetType === 'story') {
      var targetStory = await Story.findOne({ _id: targetId, isDeleted: false });
      if (!targetStory) {
        return res.status(404).json({ message: 'Story không tồn tại' });
      }
    } else if (targetType === 'comment') {
      var targetComment = await Comment.findOne({ _id: targetId, isDeleted: false });
      if (!targetComment) {
        return res.status(404).json({ message: 'Comment không tồn tại' });
      }
    } else if (targetType === 'user') {
      var targetUserDoc = await User.findById(targetId);
      if (!targetUserDoc) {
        return res.status(404).json({ message: 'Người dùng không tồn tại' });
      }
    }

    // Một user chỉ được report cùng một target đúng một lần ở mọi trạng thái.
    var existing = await Report.findOne({
      reporterId: userId,
      targetId: targetId,
      targetType: targetType,
    });
    if (existing) {
      return res.status(409).json({ message: 'Bạn đã báo cáo đối tượng này rồi' });
    }

    var report = await Report.create({
      reporterId: userId,
      targetId: targetId,
      targetType: targetType,
      reason: reason,
      description: description,
    });

    return res.status(201).json({ message: 'Gửi báo cáo thành công', report });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Bạn đã báo cáo đối tượng này rồi' });
    }
    return next(error);
  }
}

// GET /api/reports/my?page=&limit=
async function getMyReports(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 20);

    var total = await Report.countDocuments({ reporterId: req.user.id });
    var totalPages = Math.ceil(total / limit);

    var reports = await Report.find({ reporterId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ reports, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createReport, getMyReports };
