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
const { extractHashtags } = require('../utils/hashtags');

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
    postId: { $in: postIds },
  }).lean();

  var likedSet = new Set(likes.map(function (l) { return l.targetId.toString(); }));
  var savedSet = new Set(saves.map(function (s) { return s.postId.toString(); }));
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

    var feedFilter = { userId: { $in: feedUserIds, $nin: bannedIds }, isDeleted: false };
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
      var mySave = await SavedPost.findOne({ userId: viewerId, postId: post._id }).lean();
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

    if (req.body.caption !== undefined) {
      post.caption = req.body.caption;
      post.hashtags = extractHashtags(req.body.caption);   // tách lại hashtag theo caption mới
    }
    if (req.body.location !== undefined) post.location = req.body.location;
    await post.save();

    res.json({ message: 'Cập nhật bài viết thành công', post });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/posts/:id
// Xóa mềm: set isDeleted = true, giảm postsCount, bài vẫn còn trong DB
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

    await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: -1 } });

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

    var userPostFilter = { userId: targetUserId, isDeleted: false };
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

// POST /api/posts/reel
// fields: media (video), audio (optional), caption, filter, trimStart, trimEnd, duration, isPrivate
async function createReel(req, res, next) {
  try {
    const videoFile = req.files?.media?.[0]
    const audioFile = req.files?.audio?.[0]

    if (!videoFile) {
      return res.status(400).json({ message: 'Chưa chọn video' })
    }

    const { caption, filter, trimStart, trimEnd, duration, audioName } = req.body

    // Upload video
    const videoResult = await uploadToCloudinary(videoFile.buffer, 'reels', videoFile.mimetype)

    // Upload audio nếu có, hoặc dùng URL preset
    let audioUrl = ''
    if (audioFile) {
      const audioResult = await uploadToCloudinary(audioFile.buffer, 'reels/audio', audioFile.mimetype)
      audioUrl = audioResult.secure_url
    } else if (req.body.presetAudioUrl) {
      audioUrl = req.body.presetAudioUrl
    }

    const post = await Post.create({
      userId: req.user.id,
      caption: caption || '',
      type: 'video',
      reelAudioUrl: audioUrl,
      reelAudioName: audioName || '',
      reelFilter: filter || '',
      reelTrimStart: parseFloat(trimStart) || 0,
      reelTrimEnd: trimEnd ? parseFloat(trimEnd) : null,
      reelDuration: duration ? parseFloat(duration) : null,
    })

    const mediaDoc = await PostMedia.create({
      postId: post._id,
      mediaType: 'video',
      url: videoResult.secure_url,
      thumbnailUrl: '',
      displayOrder: 0,
    })

    await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: 1 } })

    const creator = await User.findById(req.user.id).select('username fullName avatarUrl')
    const postObj = post.toObject()
    postObj.user = creator.toObject()
    postObj.media = [mediaDoc]
    postObj.mediaUrl = mediaDoc.url

    res.status(201).json({ message: 'Đăng reel thành công', post: postObj })
  } catch (error) {
    next(error)
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
    var filter = { hashtags: tag, isDeleted: false };
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
async function searchTags(req, res, next) {
  try {
    var q = (req.query.q || '').replace(/^#/, '').trim().toLowerCase();
    var limit = Math.min(parseInt(req.query.limit, 10) || 15, 30);
    if (!q) return res.json({ tags: [] });

    var safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var hiddenUsers = await User.find({ $or: [{ isPrivate: true }, { isBanned: true }] }, '_id').lean();
    var hiddenIds = hiddenUsers.map(function (u) { return u._id; });
    var rows = await Post.aggregate([
      { $match: { isDeleted: false, userId: { $nin: hiddenIds }, hashtags: { $regex: safe } } },
      { $unwind: '$hashtags' },
      { $match: { hashtags: { $regex: safe } } },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    var tags = rows.map(function (r) { return { tag: r._id, count: r.count }; });
    res.json({ tags: tags });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPost, createReel, getFeed, getExplore, getPost, updatePost, deletePost, getUserPosts,
  getPostsByHashtag, searchPosts, searchTags,
};
