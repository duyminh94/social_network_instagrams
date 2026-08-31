// postController.js
// Xử lý CRUD bài viết, feed, trang khám phá
//
// Ảnh/video được upload lên Cloudinary qua multer (upload.array('media', 10))
// → tối đa 10 file mỗi bài
// isDeleted = true là xóa mềm (soft delete), bài vẫn còn trong DB
// postsCount trên User được cập nhật trực tiếp khi tạo/xóa bài

const Post = require('../models/Post');
const PostMedia = require('../models/PostMedia');
const { getPagination } = require('../utils/pagination');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const User = require('../models/User');
const Like = require('../models/Like');
const SavedPost = require('../models/SavedPost');
const Story = require('../models/Story');
const StoryViewer = require('../models/StoryViewer');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { autoModerate } = require('../utils/autoModerate');
const { extractHashtags, syncHashtagCounts } = require('../utils/hashtags');
const HashtagFollow = require('../models/HashtagFollow');
const Hashtag = require('../models/Hashtag');
const { syncMentions, removeMentions } = require('../utils/mentions');
const PostView = require('../models/PostView');
const PhotoTag = require('../models/PhotoTag');
const Mention = require('../models/Mention');
const Comment = require('../models/Comment');
const Reel = require('../models/Reel');
const Mute = require('../models/Mute');
const Restrict = require('../models/Restrict');
const { createNotification } = require('../utils/notification');
const { applyPostsCountDelta } = require('../utils/postsCount');

function parseVideoThumbnails(rawValue) {
  if (!rawValue) return [];

  try {
    var parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function dataUrlToImageBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;

  var match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
  if (!match) return null;

  return {
    mimetype: match[1] === 'image/jpg' ? 'image/jpeg' : match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

// Helper: lấy tập hợp userId đã block hoặc bị block bởi userId
// Dùng để lọc nội dung trước khi trả về
async function getBlockedUserIds(userId) {
  var blocks = await Block.find({
    $or: [{ blockerId: userId }, { blockedId: userId }],
  }).lean();

  return blocks.map(function (b) {
    return b.blockerId.toString() === userId
      ? b.blockedId.toString()
      : b.blockerId.toString();
  });
}

// Helper: thêm isLiked + isSaved vào danh sách post (chỉ khi đã đăng nhập)
// Dùng batch query: 1 query Like + 1 query SavedPost thay vì N query lặp
async function attachLikeAndSave(posts, userId) {
  if (!userId || posts.length === 0) {
    return posts.map(function (p) {
      return Object.assign({}, p, { isLiked: false, isSaved: false, myReaction: null });
    });
  }

  var postIds = posts.map(function (p) { return p._id; });

  var likes = await Like.find({
    userId: userId,
    targetType: 'post',
    targetId: { $in: postIds },
  }).lean();

  var saves = await SavedPost.find({
    userId: userId,
    targetType: 'post',
    targetId: { $in: postIds },
  }).lean();

  var likedSet = new Set(likes.map(function (l) { return l.targetId.toString(); }));
  var savedSet = new Set(saves.map(function (s) { return s.targetId.toString(); }));
  // Map targetId → loại cảm xúc của user (để hiện đúng emoji trên nút)
  var reactionMap = {};
  likes.forEach(function (l) { reactionMap[l.targetId.toString()] = l.reactionType || 'like'; });

  return posts.map(function (p) {
    return Object.assign({}, p, {
      isLiked: likedSet.has(p._id.toString()),
      isSaved: savedSet.has(p._id.toString()),
      myReaction: reactionMap[p._id.toString()] || null,
    });
  });
}

// Đính kèm media và chuẩn hoá trường user cho mỗi post
async function attachMedia(posts) {
  const postIds = posts.map(function (p) { return p._id; });
  const allMedia = await PostMedia.find({ postId: { $in: postIds } }).sort({ displayOrder: 1 });

  var mediaMap = {};
  allMedia.forEach(function (m) {
    var key = m.postId.toString();
    if (!mediaMap[key]) mediaMap[key] = [];
    mediaMap[key].push(m);
  });

  return posts.map(function (post) {
    var p = post.toObject ? post.toObject() : Object.assign({}, post);
    // populate('userId') returns user object in userId field — rename to user
    p.user = p.userId || null;
    if (p.user && p.user.avatarUrl) p.user.avatar = p.user.avatarUrl;
    delete p.userId;
    var media = mediaMap[p._id.toString()] || [];
    p.media = media;
    p.mediaUrl = media.length > 0 ? media[0].url : null;
    p.mediaType = media.length > 0 ? media[0].mediaType : null;
    p.thumbnailUrl = media.length > 0 ? media[0].thumbnailUrl : null;
    return p;
  });
}

// Đính kèm hasActiveStory + storySeen vào post.user để frontend hiện gradient ring đúng
// - hasActiveStory: tác giả còn story chưa hết hạn
// - storySeen: viewer đã xem hết story active của tác giả → frontend vẽ vòng xám
// Batch query: 1 lần cho tất cả user, tránh N+1
async function attachHasStory(posts, viewerId) {
  var userIds = posts
    .map(function (p) { return p.user?._id || p.user?.id || null; })
    .filter(Boolean);

  if (userIds.length === 0) return posts;

  // Tìm những story chưa hết hạn của các user này (lấy cả _id để biết đã xem chưa)
  var now = new Date();
  var activeStories = await Story.find({
    userId: { $in: userIds },
    expiresAt: { $gt: now },
    isDeleted: false,
  }).select('_id userId').lean();

  // Gom story id theo từng user
  var storiesByUser = {};
  var allStoryIds = [];
  activeStories.forEach(function (s) {
    var uid = s.userId.toString();
    if (!storiesByUser[uid]) storiesByUser[uid] = [];
    storiesByUser[uid].push(s._id.toString());
    allStoryIds.push(s._id);
  });

  // Tập story mà viewer đã xem (StoryViewer chỉ ghi nhận khi xem story người khác)
  var seenSet = new Set();
  if (viewerId && allStoryIds.length > 0) {
    var views = await StoryViewer.find({
      storyId: { $in: allStoryIds },
      viewerId: viewerId,
    }).select('storyId').lean();
    views.forEach(function (v) { seenSet.add(v.storyId.toString()); });
  }

  var viewerKey = viewerId ? viewerId.toString() : '';

  return posts.map(function (post) {
    if (post.user) {
      var uid = (post.user._id || post.user.id || '').toString();
      var ids = storiesByUser[uid] || [];
      post.user.hasActiveStory = ids.length > 0;
      if (uid === viewerKey) {
        // Story của chính mình: server không ghi StoryViewer cho chủ story,
        // nên coi như đã xem để không hiện vòng cầu vồng trên avatar của mình
        post.user.storySeen = ids.length > 0;
      } else {
        // Đã xem hết khi mọi story active đều nằm trong seenSet
        post.user.storySeen = ids.length > 0 && ids.every(function (id) {
          return seenSet.has(id);
        });
      }
    }
    return post;
  });
}

// POST /api/posts
async function createPost(req, res, next) {
  try {
    const { caption, type, location } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Chưa chọn ảnh hoặc video' });
    }

    const post = await Post.create({
      userId: req.user.id,
      caption: caption || '',
      hashtags: extractHashtags(caption),
      type: files.length > 1 ? 'carousel' : (files[0].mimetype.startsWith('video') ? 'video' : 'image'),
      location: location || '',
    });

    // Lưu danh sách media sau khi upload để trả về client
    var mediaList = [];
    var moderationImageUrls = []; // URL ảnh để kiểm duyệt (ảnh: url; video: thumbnail)
    var videoThumbnails = parseVideoThumbnails(req.body.videoThumbnails);

    for (var i = 0; i < files.length; i++) {
      var isVideo = files[i].mimetype.startsWith('video');
      const uploadResult = await uploadToCloudinary(files[i].buffer, 'posts', files[i].mimetype);
      var thumbnailUrl = '';

      if (isVideo) {
        var thumbnailImage = dataUrlToImageBuffer(videoThumbnails[i]);
        if (thumbnailImage) {
          var thumbnailResult = await uploadToCloudinary(thumbnailImage.buffer, 'posts/thumbnails', thumbnailImage.mimetype);
          thumbnailUrl = thumbnailResult.secure_url;
        }
      }

      const mediaDoc = await PostMedia.create({
        postId: post._id,
        mediaType: isVideo ? 'video' : 'image',
        url: uploadResult.secure_url,
        thumbnailUrl: thumbnailUrl,
        displayOrder: i,
      });
      mediaList.push(mediaDoc);
      // Gom URL ảnh để kiểm duyệt: ảnh dùng chính nó, video dùng thumbnail (nếu có)
      if (!isVideo) {
        moderationImageUrls.push(uploadResult.secure_url);
      } else if (thumbnailUrl) {
        moderationImageUrls.push(thumbnailUrl);
      }
    }

    // Kiểm duyệt caption + ảnh tự động — fire-and-forget, không chặn đăng
    autoModerate(post.caption, 'post', post._id, moderationImageUrls);

    await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: 1 } });
    // Ghi nhận hashtag của bài mới vào collection hashtags (tạo tag nếu chưa tồn tại)
    await syncHashtagCounts([], post.hashtags, 'post');
    // Ghi nhận @username trong caption và báo cho người được nhắc
    await syncMentions('post', post._id, post.caption, req.user.id, true);

    const creator = await User.findById(req.user.id).select('username fullName avatarUrl isTrusted');
    var postObj = post.toObject();
    postObj.user = Object.assign({}, creator.toObject(), { avatar: creator.avatarUrl });
    postObj.media = mediaList;
    postObj.mediaUrl = mediaList.length > 0 ? mediaList[0].url : null;
    postObj.mediaType = mediaList.length > 0 ? mediaList[0].mediaType : null;
    postObj.thumbnailUrl = mediaList.length > 0 ? mediaList[0].thumbnailUrl : null;

    res.status(201).json({ message: 'Đăng bài thành công', post: postObj });
  } catch (error) {
    next(error);
  }
}

// GET /api/posts/feed?page=&limit=
// Chỉ lấy bài của người mình đang follow và đã được chấp nhận (status = accepted)
async function getFeed(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 10);

    const follows = await Follow.find({ followerId: req.user.id, status: 'accepted' });
    const followingIds = follows.map(function (f) { return f.followingId; });
    const feedUserIds = [req.user.id].concat(followingIds);

    // Ẩn bài của tài khoản bị khoá (ban) — đồng bộ với Story (storyController đã lọc isBanned)
    const bannedUsers = await User.find({ isBanned: true }, '_id').lean();
    const bannedIds = bannedUsers.map(function (u) { return u._id; });

    // Hashtag user đang theo dõi — bài mang tag này cũng vào feed dù chưa follow tác giả
    const followedTags = await HashtagFollow.find({ userId: req.user.id }).select('name').lean();
    const followedTagNames = followedTags.map(function (f) { return f.name; });

    // Người đã bị tắt tiếng bài viết — vẫn follow nhưng bài không hiện trong feed
    const mutes = await Mute.find({ userId: req.user.id, mutePosts: true }).select('mutedUserId').lean();
    const mutedIds = mutes.map(function (m) { return m.mutedUserId; });

    // Điều kiện vào feed: bài của người mình follow (và của chính mình),
    // HOẶC bài công khai mang hashtag mình theo dõi
    var feedConditions = [{ userId: { $in: feedUserIds } }];
    if (followedTagNames.length > 0) {
      // Chỉ lấy bài của tài khoản công khai — không lộ bài của tài khoản riêng tư chưa follow
      var privateUsers = await User.find({ isPrivate: true }, '_id').lean();
      var privateIds = privateUsers
        .map(function (u) { return u._id.toString(); })
        .filter(function (id) { return id !== req.user.id; });

      feedConditions.push({
        hashtags: { $in: followedTagNames },
        userId: { $nin: privateIds },
      });
    }

    var feedFilter = {
      $or: feedConditions,
      // Loại cả tài khoản bị khoá lẫn người mình đã tắt tiếng
      userId: { $nin: bannedIds.concat(mutedIds) },
      isDeleted: false,
      // Bài đã lưu trữ không hiện trong feed, kể cả feed của chính chủ
      isArchived: { $ne: true },
    };
    var total = await Post.countDocuments(feedFilter);
    var totalPages = Math.ceil(total / limit);

    const posts = await Post.find(feedFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName avatarUrl isTrusted');

    const normalizedPosts = await attachMedia(posts);
    const withStory = await attachHasStory(normalizedPosts, req.user.id);
    // Thêm isLiked + isSaved cho từng post — feed luôn có auth nên req.user.id chắc chắn có
    const finalPosts = await attachLikeAndSave(withStory, req.user.id);
    res.json({ posts: finalPosts, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// GET /api/posts/explore?page=&limit=  — route công khai (optionalAuth)
// Trang khám phá CÁ NHÂN HOÁ — chỉ hiện bài gợi ý dựa trên tín hiệu của user:
//   Rule 1: chưa follow ai + chưa like gì  → trả rỗng (empty=true), frontend hiện hint
//   Rule 2: đã follow ai đó                → gợi ý bài của "bạn-của-bạn" (người mà follow của mình đang follow)
//   Rule 3: đã like bài nào đó             → gợi ý nội dung tương tự (cùng tác giả + co-like)
// Không có hashtag/chủ đề trong model → "nội dung tương tự" xấp xỉ bằng cùng tác giả & collaborative co-like
async function getExplore(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req, 20);

    var userId = req.user?.id || null;

    // Chưa đăng nhập → không có tín hiệu cá nhân hoá → rỗng
    if (!userId) {
      return res.json({ posts: [], page, limit, total: 0, totalPages: 0, empty: true });
    }

    // ── Tín hiệu của user ──
    var myFollows = await Follow.find({ followerId: userId, status: 'accepted' }).lean();
    var followingIds = myFollows.map(function (f) { return f.followingId.toString(); });

    var myLikes = await Like.find({ userId: userId, targetType: 'post' }).lean();
    var likedPostIds = myLikes.map(function (l) { return l.targetId.toString(); });

    // Rule 1: user mới hoàn toàn → rỗng + hint
    if (followingIds.length === 0 && likedPostIds.length === 0) {
      return res.json({ posts: [], page, limit, total: 0, totalPages: 0, empty: true });
    }

    // candidateUserIds: tác giả "ứng viên" để lấy bài
    var candidateUserIds = new Set();
    // candidatePostIds: bài "ứng viên" lấy theo từng bài cụ thể (co-like)
    var candidatePostIds = new Set();

    // ── Rule 2: bạn-của-bạn (người mà những người mình follow đang follow) ──
    if (followingIds.length > 0) {
      var secondDegree = await Follow.find({
        followerId: { $in: followingIds },
        status: 'accepted',
      }).lean();
      secondDegree.forEach(function (f) {
        candidateUserIds.add(f.followingId.toString());
      });
    }

    // ── Rule 3: nội dung giống bài mình đã like ──
    if (likedPostIds.length > 0) {
      // (A) Cùng tác giả: tác giả của các bài mình đã like
      var likedPosts = await Post.find({ _id: { $in: likedPostIds } }, 'userId').lean();
      likedPosts.forEach(function (p) {
        candidateUserIds.add(p.userId.toString());
      });

      // (B) Co-like: những người đã like CÙNG bài với mình
      var coLikes = await Like.find({
        targetType: 'post',
        targetId: { $in: likedPostIds },
        userId: { $ne: userId },
      }).lean();
      var coLikerIds = Array.from(new Set(coLikes.map(function (l) { return l.userId.toString(); })));

      // Các bài mà nhóm người đó đã like → ứng viên "nội dung tương tự"
      if (coLikerIds.length > 0) {
        var coLikedPosts = await Like.find({
          targetType: 'post',
          userId: { $in: coLikerIds },
        }).lean();
        coLikedPosts.forEach(function (l) {
          candidatePostIds.add(l.targetId.toString());
        });
      }
    }

    // ── Loại trừ ──
    // Bỏ: chính mình, người mình đã follow (đã có ở feed), người bị block, tài khoản riêng tư
    var blockedIds = await getBlockedUserIds(userId);
    var privateUsers = await User.find({ isPrivate: true }, '_id').lean();
    var privateUserIds = privateUsers.map(function (u) { return u._id.toString(); });

    // Ẩn bài của tài khoản bị khoá (ban) — đồng bộ với Story
    var bannedUsers = await User.find({ isBanned: true }, '_id').lean();
    var bannedIds = bannedUsers.map(function (u) { return u._id.toString(); });

    var excludedUserIds = new Set([userId].concat(followingIds, blockedIds, privateUserIds, bannedIds));

    var finalUserIds = Array.from(candidateUserIds).filter(function (id) {
      return !excludedUserIds.has(id);
    });

    // Bài thoả: tác giả thuộc finalUserIds HOẶC _id thuộc candidatePostIds
    var orConditions = [];
    if (finalUserIds.length > 0) {
      orConditions.push({ userId: { $in: finalUserIds } });
    }
    if (candidatePostIds.size > 0) {
      orConditions.push({ _id: { $in: Array.from(candidatePostIds) } });
    }

    // Không có ứng viên nào → rỗng
    if (orConditions.length === 0) {
      return res.json({ posts: [], page, limit, total: 0, totalPages: 0, empty: true });
    }

    var exploreFilter = {
      isDeleted: false,
      isArchived: { $ne: true },                            // bài đã lưu trữ không gợi ý cho ai
      _id: { $nin: likedPostIds },                          // bỏ bài mình đã like rồi
      userId: { $nin: Array.from(excludedUserIds) },        // chặn cả nhánh co-like về tác giả bị loại
      $or: orConditions,
    };

    var total = await Post.countDocuments(exploreFilter);
    var totalPages = Math.ceil(total / limit);

    var posts = await Post.find(exploreFilter)
      .sort({ likesCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName avatarUrl isTrusted');

    var normalizedPosts = await attachMedia(posts);
    var withStory = await attachHasStory(normalizedPosts, userId);
    var finalPosts = await attachLikeAndSave(withStory, userId);

    res.json({ posts: finalPosts, page, limit, total, totalPages, empty: total === 0 });
  } catch (error) {
    next(error);
  }
}

// GET /api/posts/:id  — route công khai (không cần đăng nhập)
// FIX: req.user có thể undefined — block check chỉ khi đã login
// FIX: tài khoản riêng tư → 403 cho mọi người chưa follow (kể cả chưa login)
async function getPost(req, res, next) {
  try {
    // req.user?.id: null nếu chưa đăng nhập
    var viewerId = req.user?.id || null;

    const post = await Post.findOne({ _id: req.params.id, isDeleted: false })
      .populate('userId', 'username fullName avatarUrl isTrusted isPrivate isBanned');

    if (!post || !post.userId) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    var ownerId = post.userId._id.toString();
    var isOwner = viewerId && ownerId === viewerId;
    if (post.userId.isBanned && !isOwner) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    // Bài đã lưu trữ chỉ chủ tài khoản xem được — với người khác coi như không tồn tại
    if (post.isArchived && !isOwner) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    // Chỉ kiểm tra block + privacy khi không phải chủ bài
    if (!isOwner) {
      // Block check — chỉ khi đã đăng nhập
      if (viewerId) {
        var block = await Block.findOne({
          $or: [
            { blockerId: viewerId, blockedId: ownerId },
            { blockerId: ownerId, blockedId: viewerId },
          ],
        });
        if (block) {
          return res.status(403).json({ message: 'Không có quyền xem bài viết này' });
        }
      }

      // Tài khoản riêng tư → phải follow (accepted) mới xem được
      if (post.userId.isPrivate) {
        if (!viewerId) {
          return res.status(403).json({ message: 'Tài khoản riêng tư' });
        }
        var follow = await Follow.findOne({
          followerId: viewerId,
          followingId: ownerId,
          status: 'accepted',
        });
        if (!follow) {
          return res.status(403).json({ message: 'Tài khoản riêng tư' });
        }
      }
    }

    const media = await PostMedia.find({ postId: post._id }).sort({ displayOrder: 1 });

    // Chuẩn hoá post để client (PostModal) dùng ngay khi mở qua deep-link /p/:id
    // - userId (đã populate) → user
    // - đính kèm media + cờ isLiked/isSaved/myReaction theo người đang xem
    var postObj = post.toObject();
    postObj.user = postObj.userId || null;
    if (postObj.user && postObj.user.avatarUrl) postObj.user.avatar = postObj.user.avatarUrl;
    delete postObj.userId;
    postObj.media = media;
    postObj.mediaUrl = media.length > 0 ? media[0].url : null;
    postObj.mediaType = media.length > 0 ? media[0].mediaType : null;
    postObj.thumbnailUrl = media.length > 0 ? media[0].thumbnailUrl : null;

    postObj.isLiked = false;
    postObj.isSaved = false;
    postObj.myReaction = null;
    if (viewerId) {
      var myLike = await Like.findOne({ userId: viewerId, targetType: 'post', targetId: post._id }).lean();
      var mySave = await SavedPost.findOne({ userId: viewerId, targetType: 'post', targetId: post._id }).lean();
      postObj.isLiked = !!myLike;
      postObj.myReaction = myLike ? (myLike.reactionType || 'like') : null;
      postObj.isSaved = !!mySave;
    }

    res.json({ post: postObj, media });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/posts/:id
// Chỉ chủ bài mới sửa được
async function updatePost(req, res, next) {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền sửa bài này' });
    }

    // Giữ lại tag cũ trước khi ghi đè để biết tag nào bị thêm/bớt
    var oldHashtags = post.hashtags || [];
    if (req.body.caption !== undefined) {
      post.caption = req.body.caption;
      post.hashtags = extractHashtags(req.body.caption);   // tách lại hashtag theo caption mới
    }
    if (req.body.location !== undefined) post.location = req.body.location;
    await post.save();

    await syncHashtagCounts(oldHashtags, post.hashtags, 'post');
    // Caption đổi → tính lại danh sách người được nhắc, chỉ báo cho người mới
    if (req.body.caption !== undefined) {
      await syncMentions('post', post._id, post.caption, req.user.id, true);
    }

    res.json({ message: 'Cập nhật bài viết thành công', post });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/posts/:id
// Xóa mềm: set isDeleted = true, giảm postsCount (trừ bài đã lưu trữ), bài vẫn còn trong DB
async function deletePost(req, res, next) {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền xóa bài này' });
    }

    post.isDeleted = true;
    await post.save();

    await applyPostsCountDelta(post, -1);
    // Bài bị ẩn thì không còn tính vào số lượng của hashtag nữa
    await syncHashtagCounts(post.hashtags, [], 'post');
    await removeMentions('post', post._id);

    res.json({ message: 'Đã xóa bài viết' });
  } catch (error) {
    next(error);
  }
}

// GET /api/posts/user/:userId?page=&limit=
// FIX: route công khai — req.user có thể undefined nếu chưa đăng nhập
// Tài khoản riêng tư + chưa follow (hoặc chưa login) → trả posts: [] (không lộ "có bài hay không")
async function getUserPosts(req, res, next) {
  try {
    // req.user?.id: null nếu chưa đăng nhập (route công khai)
    var viewerId = req.user?.id || null;
    var targetUserId = req.params.userId;

    const { page, limit, skip } = getPagination(req, 12);

    // Nếu không phải xem bài của chính mình → kiểm tra block và privacy
    if (targetUserId !== viewerId) {
      // Block check — chỉ khi đã đăng nhập (không thể block nếu chưa có tài khoản)
      if (viewerId) {
        var block = await Block.findOne({
          $or: [
            { blockerId: viewerId, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: viewerId },
          ],
        });
        if (block) {
          return res.status(403).json({ message: 'Không thể xem hồ sơ này' });
        }
      }

      // Kiểm tra tài khoản riêng tư
      var targetUser = await User.findById(targetUserId).select('isPrivate isBanned');
      if (!targetUser || targetUser.isBanned) {
        return res.json({ posts: [], page: 1, limit, total: 0, totalPages: 0 });
      }
      if (targetUser.isPrivate) {
        var follow = await Follow.findOne({
          followerId: viewerId,
          followingId: targetUserId,
          status: 'accepted',
        });
        if (!follow) {
          // Trả về rỗng — tài khoản riêng tư, chưa follow hoặc chưa đăng nhập
          return res.json({ posts: [], page: 1, limit, total: 0, totalPages: 0 });
        }
      }
    }

    // Bài đã lưu trữ chỉ chủ tài khoản xem được, qua GET /api/posts/archived
    var userPostFilter = { userId: targetUserId, isDeleted: false, isArchived: { $ne: true } };
    var total = await Post.countDocuments(userPostFilter);
    var totalPages = Math.ceil(total / limit);

    const posts = await Post.find(userPostFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName avatarUrl isTrusted');

    const normalizedPosts = await attachMedia(posts);
    const withStory = await attachHasStory(normalizedPosts, viewerId);
    // Thêm isLiked + isSaved — dùng viewerId (null nếu chưa login)
    const finalPosts = await attachLikeAndSave(withStory, viewerId);
    res.json({ posts: finalPosts, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// Helper: tập userId cần ẩn khi khám phá công khai (block + riêng tư + bị khoá).
// Vẫn giữ bài của chính viewer (không loại id của mình).
async function getDiscoverExcludeIds(viewerId) {
  var blockedIds = viewerId ? await getBlockedUserIds(viewerId) : [];
  var hiddenUsers = await User.find(
    { $or: [{ isPrivate: true }, { isBanned: true }] },
    '_id'
  ).lean();
  var hiddenIds = hiddenUsers
    .map(function (u) { return u._id.toString(); })
    .filter(function (id) { return id !== viewerId; });
  return Array.from(new Set(blockedIds.concat(hiddenIds)));
}

// GET /api/posts/hashtag/:tag?page=&limit=  (optionalAuth)
// Danh sách bài công khai gắn 1 hashtag — trang hashtag
async function getPostsByHashtag(req, res, next) {
  try {
    var viewerId = req.user?.id || null;
    var tag = (req.params.tag || '').toLowerCase();
    const { page, limit, skip } = getPagination(req, 12);

    if (!tag) {
      return res.json({ tag: tag, posts: [], page, limit, total: 0, totalPages: 0 });
    }

    var excludeIds = await getDiscoverExcludeIds(viewerId);
    var filter = { hashtags: tag, isDeleted: false, isArchived: { $ne: true } };
    if (excludeIds.length > 0) filter.userId = { $nin: excludeIds };

    var total = await Post.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName avatarUrl isTrusted');

    var normalizedPosts = await attachMedia(posts);
    var finalPosts = await attachLikeAndSave(normalizedPosts, viewerId);
    res.json({ tag: tag, posts: finalPosts, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// GET /api/posts/search?q=&page=&limit=  (optionalAuth)
// Tìm bài theo caption (không phân biệt hoa thường) hoặc trùng hashtag
async function searchPosts(req, res, next) {
  try {
    var viewerId = req.user?.id || null;
    var q = (req.query.q || '').trim();
    const { page, limit, skip } = getPagination(req, 12);

    if (!q) {
      return res.json({ posts: [], page, limit, total: 0, totalPages: 0 });
    }

    var excludeIds = await getDiscoverExcludeIds(viewerId);
    var safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');   // escape ký tự đặc biệt regex
    var tagQuery = q.replace(/^#/, '').toLowerCase();

    var filter = {
      isDeleted: false,
      isArchived: { $ne: true },
      $or: [
        { caption: { $regex: safe, $options: 'i' } },
        { hashtags: tagQuery },
      ],
    };
    if (excludeIds.length > 0) filter.userId = { $nin: excludeIds };

    var total = await Post.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName avatarUrl isTrusted');

    var normalizedPosts = await attachMedia(posts);
    var finalPosts = await attachLikeAndSave(normalizedPosts, viewerId);
    res.json({ posts: finalPosts, page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
}

// GET /api/posts/tags/search?q=&limit=  — gợi ý hashtag khớp + số bài (tab Tags)
//
// Trước đây phải aggregate $unwind toàn bộ collection posts cho mỗi lần gõ phím.
// Giờ đọc thẳng collection hashtags — counter đã được cập nhật sẵn lúc đăng/sửa/xoá bài.
async function searchTags(req, res, next) {
  try {
    var q = (req.query.q || '').replace(/^#/, '').trim().toLowerCase();
    var limit = Math.min(parseInt(req.query.limit, 10) || 15, 30);
    if (!q) return res.json({ tags: [] });

    var safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    var hashtags = await Hashtag.find({ name: { $regex: safe } })
      .sort({ postsCount: -1, reelsCount: -1 })
      .limit(limit)
      .lean();

    // Giữ nguyên hình dạng response cũ { tag, count } để client không phải sửa
    var tags = hashtags.map(function (h) {
      return { tag: h.name, count: h.postsCount + h.reelsCount };
    });
    res.json({ tags: tags });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/posts/:id/archive
// Lưu trữ bài: ẩn khỏi profile công khai nhưng chủ tài khoản vẫn xem lại được
async function archivePost(req, res, next) {
  try {
    var post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền lưu trữ bài này' });
    }
    if (post.isArchived) {
      return res.status(400).json({ message: 'Bài viết đã được lưu trữ' });
    }

    post.isArchived = true;
    post.archivedAt = new Date();
    await post.save();

    // Bài lưu trữ không hiện công khai nữa → trừ khỏi số bài trên profile
    await User.findByIdAndUpdate(post.userId, { $inc: { postsCount: -1 } });

    return res.json({ message: 'Đã lưu trữ bài viết' });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/posts/:id/unarchive
async function unarchivePost(req, res, next) {
  try {
    var post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền bỏ lưu trữ bài này' });
    }
    if (!post.isArchived) {
      return res.status(400).json({ message: 'Bài viết không ở trong mục lưu trữ' });
    }

    post.isArchived = false;
    post.archivedAt = null;
    await post.save();

    await User.findByIdAndUpdate(post.userId, { $inc: { postsCount: 1 } });

    return res.json({ message: 'Đã bỏ lưu trữ bài viết' });
  } catch (error) {
    return next(error);
  }
}

// GET /api/posts/archived?page=&limit=
// Danh sách bài đã lưu trữ — chỉ chủ tài khoản xem được
async function getArchivedPosts(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 12);

    var filter = { userId: req.user.id, isArchived: true, isDeleted: false };
    var total = await Post.countDocuments(filter);
    var totalPages = Math.ceil(total / limit);

    var posts = await Post.find(filter)
      .sort({ archivedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName avatarUrl isTrusted');

    var normalizedPosts = await attachMedia(posts);
    var finalPosts = await attachLikeAndSave(normalizedPosts, req.user.id);

    return res.json({ posts: finalPosts, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// POST /api/posts/:id/view
// Ghi nhận user đã xem bài — dùng để trang Khám phá không lặp lại nội dung cũ
async function recordPostView(req, res, next) {
  try {
    var post = await Post.findOne({ _id: req.params.id, isDeleted: false }).select('_id userId').lean();
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    // Chủ bài tự xem thì không tính lượt (giống StoryViewer)
    if (post.userId.toString() === req.user.id) {
      return res.json({ message: 'Bỏ qua lượt xem của chính chủ' });
    }

    // upsert: chưa có thì tạo mới, có rồi thì cộng dồn.
    // { new: true } trả về document SAU khi cập nhật để đọc viewCount mới nhất.
    var view = await PostView.findOneAndUpdate(
      { userId: req.user.id, postId: post._id },
      { $inc: { viewCount: 1 }, $set: { lastViewedAt: new Date() } },
      { upsert: true, new: true }
    );

    // viewCount === 1 nghĩa là bản ghi vừa được tạo → đây là lần xem đầu tiên của user này.
    // Post.viewsCount đếm số NGƯỜI đã xem, không phải tổng số lượt.
    if (view.viewCount === 1) {
      await Post.findByIdAndUpdate(post._id, { $inc: { viewsCount: 1 } });
    }

    return res.json({ message: 'Đã ghi nhận lượt xem' });
  } catch (error) {
    return next(error);
  }
}

// POST /api/posts/:id/tags
// Body: { mediaId, userId, x, y } — chỉ chủ bài viết mới gắn thẻ được
async function addPhotoTag(req, res, next) {
  try {
    var post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Chỉ chủ bài viết mới gắn thẻ được' });
    }

    var { mediaId, userId, x, y } = req.body;
    if (!mediaId || !userId) {
      return res.status(400).json({ message: 'Thiếu mediaId hoặc userId' });
    }

    // Ảnh phải thuộc đúng bài này
    var media = await PostMedia.findOne({ _id: mediaId, postId: post._id }).lean();
    if (!media) {
      return res.status(404).json({ message: 'Ảnh không thuộc bài viết này' });
    }

    var taggedUser = await User.findOne({ _id: userId, isBanned: { $ne: true } }).select('username').lean();
    if (!taggedUser) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    var existing = await PhotoTag.findOne({ mediaId: mediaId, userId: userId });
    if (existing) {
      return res.status(400).json({ message: 'Đã gắn thẻ người này trên ảnh rồi' });
    }

    var tag = await PhotoTag.create({
      postId: post._id,
      mediaId: mediaId,
      userId: userId,
      // Không có toạ độ thì đặt giữa ảnh
      x: typeof x === 'number' ? x : 0.5,
      y: typeof y === 'number' ? y : 0.5,
      taggedBy: req.user.id,
    });

    await createNotification(userId, req.user.id, 'photo_tag', post._id, 'post');

    return res.status(201).json({ message: 'Đã gắn thẻ', tag: tag });
  } catch (error) {
    return next(error);
  }
}

// GET /api/posts/:id/tags — danh sách người được gắn thẻ trên các ảnh của bài
async function getPhotoTags(req, res, next) {
  try {
    var tags = await PhotoTag.find({ postId: req.params.id })
      .populate('userId', 'username fullName avatarUrl isTrusted')
      .lean();

    // Đổi tên field cho client dùng thuận: userId (object) → user
    var normalized = tags.map(function (tag) {
      tag.user = tag.userId || null;
      return tag;
    });

    return res.json({ tags: normalized });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/posts/:id/tags/:tagId
// Chủ bài gỡ thẻ bất kỳ; người bị gắn thẻ được tự gỡ thẻ của mình
async function removePhotoTag(req, res, next) {
  try {
    var tag = await PhotoTag.findOne({ _id: req.params.tagId, postId: req.params.id });
    if (!tag) {
      return res.status(404).json({ message: 'Không tìm thấy thẻ' });
    }

    var post = await Post.findById(req.params.id).select('userId').lean();
    var isPostOwner = post && post.userId.toString() === req.user.id;
    var isTaggedUser = tag.userId.toString() === req.user.id;

    if (!isPostOwner && !isTaggedUser) {
      return res.status(403).json({ message: 'Không có quyền gỡ thẻ này' });
    }

    await tag.deleteOne();
    return res.json({ message: 'Đã gỡ thẻ' });
  } catch (error) {
    return next(error);
  }
}

// GET /api/posts/tagged/me?page=&limit=
// Bài viết có gắn thẻ mình trên ảnh
async function getPostsTaggingMe(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 12);

    var total = await PhotoTag.countDocuments({ userId: req.user.id });
    var totalPages = Math.ceil(total / limit);

    var tags = await PhotoTag.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('postId')
      .lean();

    var postIds = tags.map(function (t) { return t.postId; });
    var posts = await Post.find({ _id: { $in: postIds }, isDeleted: false, isArchived: { $ne: true } })
      .populate('userId', 'username fullName avatarUrl isTrusted');

    var normalizedPosts = await attachMedia(posts);
    var finalPosts = await attachLikeAndSave(normalizedPosts, req.user.id);

    return res.json({ posts: finalPosts, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

// Cắt bớt nội dung dài để danh sách lời nhắc không bị vỡ layout
function buildPreview(text) {
  var content = text || '';
  return content.length > 120 ? content.slice(0, 120) + '…' : content;
}

// Gắn nội dung nguồn vào từng lời nhắc: preview để người xem nhận ra ngữ cảnh,
// postId để bấm vào mở đúng bài (lời nhắc trong bình luận chỉ có commentId).
//
// Ba loại nguồn gom thành 3 query $in chạy song song — số round-trip cố định là 3
// dù danh sách có bao nhiêu lời nhắc, tránh N+1. Tra ngược bằng Map nên map lại là O(n).
async function attachMentionSources(mentions) {
  var postIds = [];
  var reelIds = [];
  var commentIds = [];

  mentions.forEach(function (mention) {
    var id = mention.sourceId;
    if (mention.sourceType === 'post') postIds.push(id);
    else if (mention.sourceType === 'reel') reelIds.push(id);
    else if (mention.sourceType === 'comment') commentIds.push(id);
  });

  var [posts, reels, comments] = await Promise.all([
    Post.find({ _id: { $in: postIds }, isDeleted: false }).select('caption').lean(),
    Reel.find({ _id: { $in: reelIds }, isDeleted: false }).select('caption').lean(),
    Comment.find({ _id: { $in: commentIds }, isDeleted: false }).select('content postId').lean(),
  ]);

  var postById = new Map(posts.map(function (p) { return [p._id.toString(), p]; }));
  var reelById = new Map(reels.map(function (r) { return [r._id.toString(), r]; }));
  var commentById = new Map(comments.map(function (c) { return [c._id.toString(), c]; }));

  return mentions.map(function (mention) {
    var sourceId = mention.sourceId.toString();

    if (mention.sourceType === 'post') {
      var post = postById.get(sourceId);
      mention.preview = buildPreview(post?.caption);
      // Nguồn đã bị xoá thì không có gì để mở — client dựa vào postId=null để tắt link
      mention.postId = post ? sourceId : null;
    } else if (mention.sourceType === 'reel') {
      var reel = reelById.get(sourceId);
      mention.preview = buildPreview(reel?.caption);
      mention.reelId = reel ? sourceId : null;
    } else {
      var comment = commentById.get(sourceId);
      mention.preview = buildPreview(comment?.content);
      // Lời nhắc trong bình luận: mở bài chứa bình luận đó
      mention.postId = comment ? comment.postId.toString() : null;
    }

    return mention;
  });
}

// GET /api/posts/mentions/me?page=&limit=
// Nội dung có nhắc tên mình bằng @username
async function getMentionsOfMe(req, res, next) {
  try {
    var { page, limit, skip } = getPagination(req, 20);

    var total = await Mention.countDocuments({ mentionedUserId: req.user.id });
    var totalPages = Math.ceil(total / limit);

    var mentions = await Mention.find({ mentionedUserId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username fullName avatarUrl isTrusted')
      .lean();

    var normalized = mentions.map(function (m) {
      m.author = m.authorId || null;
      return m;
    });

    var enriched = await attachMentionSources(normalized);

    return res.json({ mentions: enriched, page, limit, total, totalPages });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPost, getFeed, getExplore, getPost, updatePost, deletePost, getUserPosts,
  getPostsByHashtag, searchPosts, searchTags,
  archivePost, unarchivePost, getArchivedPosts, recordPostView,
  addPhotoTag, getPhotoTags, removePhotoTag, getPostsTaggingMe, getMentionsOfMe,
};
