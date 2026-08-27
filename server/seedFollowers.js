// seedFollowers.js
// Tạo 100 followers + 20 bài viết cho user có username chỉ định
// Chạy: node server/seedFollowers.js [username]
//   - Có username: node server/seedFollowers.js doannhi2877
//   - Không có   : dùng mặc định bên dưới (TARGET_USERNAME)

require('dotenv').config({ path: __dirname + '/.env' });
var mongoose = require('mongoose');
var bcrypt   = require('bcryptjs');

var User      = require('./models/User');
var Follow    = require('./models/Follow');
var Post      = require('./models/Post');
var PostMedia = require('./models/PostMedia');

var MONGO_URI   = process.env.MONGO_URI || 'mongodb://localhost:27017/instagrams';
// Username lấy từ tham số dòng lệnh (process.argv[2]); không truyền thì dùng mặc định.
// Nhờ vậy đổi target chỉ cần: node seedFollowers.js <username> — khỏi sửa file.
var TARGET_USERNAME = process.argv[2] || 'minhkirito1803';
var NEED_FOLLOWERS  = 100;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Tìm target user
  var target = await User.findOne({ username: TARGET_USERNAME });
  if (!target) {
    console.error('Không tìm thấy user:', TARGET_USERNAME);
    process.exit(1);
  }
  console.log('Target:', target.username, '(id:', target._id + ')');

  // ── Đặt ngày tạo tài khoản ngẫu nhiên > 1 tháng để đủ điều kiện tích xanh ──
  // Điều kiện accountAge của verification: createdAt <= (hôm nay - 1 tháng).
  // Chọn ngẫu nhiên 45–75 ngày trước:
  //   - vượt qua mốc 1 tháng (an toàn cả khi tháng có 31 ngày)
  //   - cũ hơn bài viết cũ nhất (40 ngày) để tài khoản không "trẻ hơn" bài của chính nó
  // Dùng collection.updateOne để ghi thẳng createdAt, bỏ qua timestamps của Mongoose.
  function randomDateDaysAgo(minDays, maxDays) {
    var days = minDays + Math.floor(Math.random() * (maxDays - minDays + 1));
    var dt = new Date();
    dt.setDate(dt.getDate() - days);
    dt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
    return dt;
  }

  var accountCreatedAt = randomDateDaysAgo(45, 75);
  await User.collection.updateOne(
    { _id: target._id },
    { $set: { createdAt: accountCreatedAt } }
  );
  console.log('Đã đặt ngày tạo tài khoản:', accountCreatedAt.toISOString().slice(0, 10),
    '(' + Math.round((Date.now() - accountCreatedAt.getTime()) / 86400000) + ' ngày trước)');

  // Lấy id các user đã follow rồi để bỏ qua
  var existingFollows = await Follow.find({ followingId: target._id }).select('followerId');
  var alreadyFollowing = new Set(existingFollows.map(function (f) { return f.followerId.toString(); }));

  // Lấy các user hiện có (không kể target)
  var candidates = await User.find({ _id: { $ne: target._id } }).select('_id username').lean();
  var available  = candidates.filter(function (u) { return !alreadyFollowing.has(u._id.toString()); });

  var toCreate = [];

  // Dùng user có sẵn trước
  for (var i = 0; i < available.length && toCreate.length < NEED_FOLLOWERS; i++) {
    toCreate.push(available[i]._id);
  }

  // Nếu không đủ, tạo thêm user mới
  var shortage = NEED_FOLLOWERS - toCreate.length;
  if (shortage > 0) {
    console.log('Cần tạo thêm ' + shortage + ' user mới...');
    var passwordHash = await bcrypt.hash('Seed@123', 10);
    var newUsers = [];
    for (var j = 0; j < shortage; j++) {
      var suffix = Date.now() + '_' + j;
      newUsers.push({
        username:     'seed_follower_' + suffix,
        email:        'seed_follower_' + suffix + '@seed.local',
        passwordHash: passwordHash,
        fullName:     'Seed User ' + (j + 1),
        isActive:     true,
      });
    }
    var created = await User.insertMany(newUsers);
    created.forEach(function (u) { toCreate.push(u._id); });
  }

  // Tạo Follow docs, bỏ qua nếu trùng
  var added = 0;
  for (var k = 0; k < toCreate.length; k++) {
    try {
      await Follow.create({
        followerId:  toCreate[k],
        followingId: target._id,
        status:      'accepted',
      });
      added++;
    } catch (err) {
      if (err.code !== 11000) throw err; // chỉ bỏ qua duplicate key
    }
  }

  // Cập nhật followersCount cho target
  await User.updateOne({ _id: target._id }, { $set: { followersCount: await Follow.countDocuments({ followingId: target._id, status: 'accepted' }) } });

  // Cập nhật followingCount cho từng follower mới
  await User.updateMany(
    { _id: { $in: toCreate } },
    [{ $set: { followingCount: { $add: [{ $ifNull: ['$followingCount', 0] }, 1] } } }]
  );

  var total = await Follow.countDocuments({ followingId: target._id, status: 'accepted' });
  console.log('Đã thêm ' + added + ' follows mới.');
  console.log('Tổng followers của ' + TARGET_USERNAME + ': ' + total);

  // ── Seed 20 bài viết trải đều hơn 1 tháng cho target user ────
  console.log('\nĐang reset bài viết cho ' + TARGET_USERNAME + '...');

  // Xoá toàn bộ bài viết cũ (và media) của user này để tránh trùng
  var oldPosts = await Post.find({ userId: target._id }).select('_id').lean();
  var oldPostIds = oldPosts.map(function (p) { return p._id; });
  if (oldPostIds.length > 0) {
    await PostMedia.collection.deleteMany({ postId: { $in: oldPostIds } });
    await Post.collection.deleteMany({ userId: target._id });
    console.log('Đã xoá ' + oldPostIds.length + ' bài cũ.');
  }

  console.log('Đang tạo 20 bài viết mới...');

  // Hàm tạo ngày trong khoảng [daysAgo, 0] ngày trước hôm nay
  function daysAgo(d) {
    var dt = new Date();
    dt.setDate(dt.getDate() - d);
    return dt;
  }

  // 20 bài, createdAt trải đều từ ~40 ngày trước đến hôm nay (~2 ngày/bài)
  var seedPosts = [
    {
      caption: 'Tháng mới bắt đầu! Đặt mục tiêu và bứt phá nào 🚀 #newmonth #goals #motivation',
      hashtags: ['newmonth', 'goals', 'motivation'],
      mediaUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800',
      likesCount: 98, daysAgo: 40,
    },
    {
      caption: 'Chuyến picnic cuối tuần với gia đình 🧺🌿 Thư giãn là cần thiết! #family #picnic #weekend',
      hashtags: ['family', 'picnic', 'weekend'],
      mediaUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
      likesCount: 174, daysAgo: 38,
    },
    {
      caption: 'Cà phê sáng + playlist lofi = ngày làm việc hiệu quả ☕🎵 #coffee #lofi #morning #productive',
      hashtags: ['coffee', 'lofi', 'morning', 'productive'],
      mediaUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
      likesCount: 142, daysAgo: 36,
    },
    {
      caption: 'Check-in Đà Lạt sau bao lần hẹn 🌺 Thành phố sương mù đẹp hơn tưởng tượng. #dalat #travel #foggy',
      hashtags: ['dalat', 'travel', 'foggy'],
      mediaUrl: 'https://images.unsplash.com/photo-1557456170-0cf4f4d0d362?w=800',
      likesCount: 389, daysAgo: 34,
    },
    {
      caption: 'Tự làm bánh mì bơ tỏi từ đầu 🍞🧄 Mùi thơm cả nhà ai cũng khen! #baking #homemade #food',
      hashtags: ['baking', 'homemade', 'food'],
      mediaUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
      likesCount: 211, daysAgo: 32,
    },
    {
      caption: 'Ngày mưa cuộn chăn đọc sách 📚☔ Không có gì bằng. #books #rainy #cozy #reading',
      hashtags: ['books', 'rainy', 'cozy', 'reading'],
      mediaUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
      likesCount: 134, daysAgo: 30,
    },
    {
      caption: 'Một tháng tập gym đã qua 💪 Kết quả không nói dối! #gym #fitness #onemonth #progress',
      hashtags: ['gym', 'fitness', 'onemonth', 'progress'],
      mediaUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      likesCount: 267, daysAgo: 28,
    },
    {
      caption: 'Cuối tuần chill cùng hội bạn thân 🥳 Những khoảnh khắc bên nhau luôn là best. #friends #weekend #memories',
      hashtags: ['friends', 'weekend', 'memories'],
      mediaUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
      likesCount: 218, daysAgo: 26,
    },
    {
      caption: 'Hoàng hôn trên biển Đà Nẵng 🌅 Đứng đây mãi cũng không chán. #danang #beach #sunset #travel',
      hashtags: ['danang', 'beach', 'sunset', 'travel'],
      mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      likesCount: 412, daysAgo: 24,
    },
    {
      caption: 'Setup góc học tập mới gọn gàng hơn rồi 🖥️✏️ Productive mode on! #studysetup #aesthetic #desk',
      hashtags: ['studysetup', 'aesthetic', 'desk'],
      mediaUrl: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800',
      likesCount: 198, daysAgo: 22,
    },
    {
      caption: 'Vườn hoa trước nhà nở rộ cả tuần nay 🌸 Mùa xuân chạm ngõ rồi! #flowers #spring #nature',
      hashtags: ['flowers', 'spring', 'nature'],
      mediaUrl: 'https://images.unsplash.com/photo-1490750967868-88df5691cc1e?w=800',
      likesCount: 321, daysAgo: 20,
    },
    {
      caption: 'Hà Nội mùa này đẹp quá 🍂 Lá vàng rơi đầy phố, đi bộ thôi không cần đến đâu. #hanoi #autumn #streetlife',
      hashtags: ['hanoi', 'autumn', 'streetlife'],
      mediaUrl: 'https://images.unsplash.com/photo-1599708153386-b08f9e7c9e41?w=800',
      likesCount: 305, daysAgo: 18,
    },
    {
      caption: 'Thử thách nấu ăn ngày 15 🍜 Hôm nay là phở bò tự nấu, chuẩn vị luôn! #cooking #pho #challenge',
      hashtags: ['cooking', 'pho', 'challenge'],
      mediaUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
      likesCount: 176, daysAgo: 16,
    },
    {
      caption: 'Sáng sớm ra công viên chạy bộ, không khí trong lành cực 🏃‍♀️🌳 #running #morning #healthy #park',
      hashtags: ['running', 'morning', 'healthy', 'park'],
      mediaUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800',
      likesCount: 153, daysAgo: 14,
    },
    {
      caption: 'Night out với team 🌃 Sài Gòn về đêm mới thấy hết được sức sống. #saigon #nightlife #hcmc',
      hashtags: ['saigon', 'nightlife', 'hcmc'],
      mediaUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
      likesCount: 489, daysAgo: 12,
    },
    {
      caption: 'Chiều nay pha thử matcha latte tại nhà 🍵 Ngon hơn ngoài tiệm thật sự! #matcha #cafe #homecafe',
      hashtags: ['matcha', 'cafe', 'homecafe'],
      mediaUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800',
      likesCount: 224, daysAgo: 10,
    },
    {
      caption: 'Ghé thăm triển lãm nghệ thuật cuối tuần 🎨 Mỗi bức tranh là một câu chuyện. #art #exhibition #culture',
      hashtags: ['art', 'exhibition', 'culture'],
      mediaUrl: 'https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=800',
      likesCount: 187, daysAgo: 8,
    },
    {
      caption: 'Cắm trại một đêm giữa rừng 🏕️🔥 Offline hoàn toàn, nạp lại năng lượng thật sự. #camping #nature #offline',
      hashtags: ['camping', 'nature', 'offline'],
      mediaUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800',
      likesCount: 356, daysAgo: 6,
    },
    {
      caption: 'Ghé quán mới khai trương gần nhà 🍰 Decor đẹp, đồ uống ngon, sẽ quay lại lần 2. #cafe #foodie #hcmc',
      hashtags: ['cafe', 'foodie', 'hcmc'],
      mediaUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
      likesCount: 241, daysAgo: 3,
    },
    {
      caption: 'Kết thúc tháng với nhiều kỷ niệm đẹp 🥰 Cảm ơn mọi người đã luôn ở đây! #grateful #monthly #reflection',
      hashtags: ['grateful', 'monthly', 'reflection'],
      mediaUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
      likesCount: 532, daysAgo: 1,
    },
  ];

  // Build post docs với _id tự tạo để set createdAt chính xác
  // (dùng collection.insertMany thay vì Post.create để bypass timestamps auto-set của Mongoose)
  var postDocs = seedPosts.map(function (sp) {
    var postDate = daysAgo(sp.daysAgo);
    return {
      _id:              new mongoose.Types.ObjectId(),
      userId:           target._id,
      caption:          sp.caption,
      hashtags:         sp.hashtags,
      type:             'image',
      location:         '',
      commentsDisabled: false,
      isDeleted:        false,
      deletedBy:        null,
      likesCount:       sp.likesCount,
      commentsCount:    Math.floor(sp.likesCount * 0.15),
      sharesCount:      0,
      reelAudioUrl:     '',
      reelAudioName:    '',
      reelFilter:       '',
      reelTrimStart:    0,
      reelTrimEnd:      null,
      reelDuration:     null,
      createdAt:        postDate,
      updatedAt:        postDate,
    };
  });

  await Post.collection.insertMany(postDocs);

  // Tạo PostMedia cho từng bài
  var mediaDocs = seedPosts.map(function (sp, idx) {
    return {
      _id:          new mongoose.Types.ObjectId(),
      postId:       postDocs[idx]._id,
      mediaType:    'image',
      url:          sp.mediaUrl,
      thumbnailUrl: '',
      altText:      '',
      width:        0,
      height:       0,
      displayOrder: 0,
      createdAt:    postDocs[idx].createdAt,
      updatedAt:    postDocs[idx].updatedAt,
    };
  });

  await PostMedia.collection.insertMany(mediaDocs);

  // Cập nhật postsCount trên User
  await User.updateOne({ _id: target._id }, { $set: { postsCount: postDocs.length } });

  console.log('Đã tạo ' + postDocs.length + ' bài viết cho ' + TARGET_USERNAME + '.');
  console.log('postsCount updated to', postDocs.length);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
