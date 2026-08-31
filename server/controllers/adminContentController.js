const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const PostMedia = require('../models/PostMedia');
const Reel = require('../models/Reel');
const Story = require('../models/Story');
const Like = require('../models/Like');
const StoryLike = require('../models/StoryLike');
const Comment = require('../models/Comment');
const ReelComment = require('../models/ReelComment');
const StoryComment = require('../models/StoryComment');
const Report = require('../models/Report');
const AdminLog = require('../models/AdminLog');
const { applyPostsCountDelta } = require('../utils/postsCount');

const CONTENT_CONFIG = {
  post: { model: Post, commentModel: Comment, contentIdField: 'postId' },
  reel: { model: Reel, commentModel: ReelComment, contentIdField: 'reelId' },
  story: { model: Story, commentModel: StoryComment, contentIdField: 'storyId' },
};

function getConfig(contentType) {
  return CONTENT_CONFIG[contentType] || null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getPostMedia(postIds) {
  if (postIds.length === 0) return {};
  var media = await PostMedia.find({ postId: { $in: postIds } }).sort({ displayOrder: 1 }).lean();
  return media.reduce(function (result, item) {
    var key = item.postId.toString();
    if (!result[key]) result[key] = [];
    result[key].push(item);
    return result;
  }, {});
}

function serializeContent(content, contentType, media) {
  var result = Object.assign({}, content);
  result.contentType = contentType;
  result.author = content.userId || null;
  delete result.userId;
  if (contentType === 'post') result.media = media || [];
  if (contentType === 'reel') result.media = [{ url: content.videoUrl, mediaType: 'video', thumbnailUrl: '' }];
  if (contentType === 'story') result.media = [{ url: content.mediaUrl, mediaType: content.mediaType, thumbnailUrl: '' }];
  return result;
}

async function getAdminContentList(req, res, next) {
  try {
    var contentType = req.params.contentType;
    var config = getConfig(contentType);
    if (!config) return res.status(400).json({ message: 'Loai noi dung khong hop le' });

    var page = Math.max(parseInt(req.query.page) || 1, 1);
    var limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    var skip = (page - 1) * limit;
    var query = String(req.query.q || '').trim();
    var filter = {};

    if (query) {
      var pattern = new RegExp(escapeRegex(query), 'i');
      var users = await User.find({
        $or: [{ username: pattern }, { email: pattern }, { fullName: pattern }],
      }).select('_id').lean();
      filter.$or = [
        { caption: pattern },
        { userId: { $in: users.map(function (user) { return user._id; }) } },
      ];
    }

    var total = await config.model.countDocuments(filter);
    var contents = await config.model.find(filter)
      .sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('userId', 'username fullName email avatarUrl isTrusted').lean();
    var postMediaMap = contentType === 'post'
      ? await getPostMedia(contents.map(function (content) { return content._id; }))
      : {};
    var items = contents.map(function (content) {
      return serializeContent(content, contentType, postMediaMap[content._id.toString()]);
    });

    return res.json({ items: items, page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return next(error);
  }
}

async function getAdminContentDetail(req, res, next) {
  try {
    var contentType = req.params.contentType;
    var config = getConfig(contentType);
    if (!config || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Noi dung khong hop le' });
    }

    var content = await config.model.findById(req.params.id)
      .populate('userId', 'username fullName email avatarUrl isTrusted').lean();
    if (!content) return res.status(404).json({ message: 'Khong tim thay noi dung' });

    var media = contentType === 'post' ? await PostMedia.find({ postId: content._id }).sort({ displayOrder: 1 }).lean() : null;
    var likeFilter = contentType === 'story'
      ? { storyId: content._id }
      : { targetType: contentType, targetId: content._id };
    var counts = await Promise.all([
      (contentType === 'story' ? StoryLike : Like).countDocuments(likeFilter),
      config.commentModel.countDocuments({ [config.contentIdField]: content._id, isDeleted: false }),
      Report.countDocuments({ targetType: contentType, targetId: content._id }),
    ]);

    return res.json({
      content: serializeContent(content, contentType, media),
      counts: { likes: counts[0], comments: counts[1], reports: counts[2] },
    });
  } catch (error) {
    return next(error);
  }
}

async function getAdminContentInteractions(req, res, next) {
  try {
    var contentType = req.params.contentType;
    var kind = req.query.kind;
    var config = getConfig(contentType);
    if (!config || !['likes', 'comments', 'reports'].includes(kind) || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Yeu cau khong hop le' });
    }

    var page = Math.max(parseInt(req.query.page) || 1, 1);
    var limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    var skip = (page - 1) * limit;
    var filter;
    var model;
    var populateField;

    if (kind === 'likes') {
      model = contentType === 'story' ? StoryLike : Like;
      filter = contentType === 'story'
        ? { storyId: req.params.id }
        : { targetType: contentType, targetId: req.params.id };
      populateField = 'userId';
    } else if (kind === 'comments') {
      model = config.commentModel;
      filter = { [config.contentIdField]: req.params.id, isDeleted: false };
      populateField = 'userId';
    } else {
      model = Report;
      filter = { targetType: contentType, targetId: req.params.id };
      populateField = 'reporterId';
    }

    var total = await model.countDocuments(filter);
    var items = await model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate(populateField, 'username fullName email avatarUrl').lean();
    return res.json({ items: items, page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return next(error);
  }
}

async function hideAdminContent(req, res, next) {
  try {
    var contentType = req.params.contentType;
    var config = getConfig(contentType);
    if (!config || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Noi dung khong hop le' });
    }

    var content = await config.model.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Khong tim thay noi dung' });
    if (content.isDeleted) return res.status(400).json({ message: 'Noi dung da duoc an' });

    content.isDeleted = true;
    if ('deletedBy' in content) content.deletedBy = req.user.id;
    await content.save();

    if (contentType === 'post') {
      await applyPostsCountDelta(content, -1);
    }
    await AdminLog.create({
      adminId: req.user.id,
      action: 'hide_' + contentType,
      targetId: content._id,
      targetType: contentType,
      note: req.body.note || '',
    });

    return res.json({ message: 'Da an noi dung', content: { _id: content._id, isDeleted: true } });
  } catch (error) {
    return next(error);
  }
}

async function unhideAdminContent(req, res, next) {
  try {
    var contentType = req.params.contentType;
    var config = getConfig(contentType);
    if (!config || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Noi dung khong hop le' });
    }

    var content = await config.model.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Khong tim thay noi dung' });
    if (!content.isDeleted) return res.status(400).json({ message: 'Noi dung dang duoc hien thi' });

    content.isDeleted = false;
    if ('deletedBy' in content) content.deletedBy = null;
    await content.save();

    if (contentType === 'post') {
      await applyPostsCountDelta(content, 1);
    }
    await AdminLog.create({
      adminId: req.user.id,
      action: 'unhide_' + contentType,
      targetId: content._id,
      targetType: contentType,
      note: req.body.note || '',
    });

    return res.json({ message: 'Da bo an noi dung', content: { _id: content._id, isDeleted: false } });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAdminContentList,
  getAdminContentDetail,
  getAdminContentInteractions,
  hideAdminContent,
  unhideAdminContent,
};
