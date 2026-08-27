// seedBulkUsers.js
// Tạo 200 user mới + follow graph + posts để phục vụ TOÀN BỘ chức năng,
// và dựng sẵn các tài khoản test cho tính năng tích xanh (OTP) mới.
//
// Chạy: node server/seedBulkUsers.js   (chạy SAU seedAll.js)
//
// Tạo ra (cộng dồn, KHÔNG xoá data cũ):
//   - 200 user: 195 user pool + 5 tài khoản đặc biệt
//       • 2 tài khoản ĐÃ có tích xanh (isTrusted = true)
//       • 3 tài khoản ĐỦ ĐIỀU KIỆN nhưng chưa verify → để test luồng OTP trực tiếp
//   - Follow graph: mỗi tài khoản đặc biệt có 120 follower (vượt mốc 100)
//   - Posts + media: tài khoản đặc biệt 22 bài/người (vượt mốc 20), pool rải rác
//   - Likes + comments nhẹ trên bài của tài khoản đặc biệt cho sinh động
//
// ĐIỀU KIỆN xin tích xanh (xem verificationController.js): có fullName + avatar + bio,
//   ≥ 20 bài viết, ≥ 100 follower, không bị ban, tài khoản ≥ 1 tháng tuổi.
//   → 5 tài khoản đặc biệt được set createdAt lùi 70 ngày để vượt mốc tuổi.
//
// LƯU Ý OTP: 3 tài khoản demo dùng email alias của DEMO_EMAIL_BASE (dấu '+').
//   Gmail giao tất cả alias '+xxx' về cùng hộp thư → bạn nhận được OTP thật để test.
//   Đổi DEMO_EMAIL_BASE bên dưới thành email của bạn nếu cần.

require('dotenv').config({ path: __dirname + '/.env' });
var mongoose = require('mongoose');
var bcrypt   = require('bcryptjs');

var User      = require('./models/User');
var Follow    = require('./models/Follow');
var Post      = require('./models/Post');
var PostMedia = require('./models/PostMedia');
var Like      = require('./models/Like');
var Comment   = require('./models/Comment');
var { extractHashtags } = require('./utils/hashtags');

var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/instagrams';

// Email gốc nhận OTP của 3 tài khoản demo (dùng alias '+' của Gmail)
var DEMO_EMAIL_BASE = 'minhkirito1803@gmail.com';
var COMMON_PASSWORD = 'User@123';

var POOL_COUNT       = 195;  // user thường
var FOLLOWERS_TARGET = 120;  // số follower gán cho mỗi tài khoản đặc biệt (>100)
var SPECIAL_POSTS    = 22;   // số bài cho mỗi tài khoản đặc biệt (>20)

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

// Lấy n phần tử KHÁC NHAU từ mảng (không trùng)
function sample(arr, n) {
  var copy = arr.slice();
  var out = [];
  for (var i = 0; i < n && copy.length > 0; i++) {
    var idx = randInt(0, copy.length - 1);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

// Bỏ dấu tiếng Việt để tạo username dạng ascii
function removeDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// createdAt lùi về quá khứ daysAgo ngày
function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ─────────────────────────────────────────────
// Data pool
// ─────────────────────────────────────────────
var HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ',
          'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];

var TEN = ['Anh', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hạnh',
           'Hiếu', 'Hoa', 'Hùng', 'Hương', 'Khoa', 'Lan', 'Linh', 'Long',
           'Mai', 'Minh', 'Nam', 'Nga', 'Ngọc', 'Như', 'Phong', 'Phúc',
           'Quân', 'Quỳnh', 'Sơn', 'Tâm', 'Thảo', 'Thành', 'Thu', 'Trang',
           'Trung', 'Tú', 'Tuấn', 'Vy', 'Yến'];

var BIOS = ['Sống chậm, yêu đời 🌸', 'Cà phê & sách 📚☕', 'Du lịch khắp Việt Nam ✈️',
            'Yêu nhiếp ảnh 📷', 'Foodie chính hiệu 🍜', 'Gym mỗi ngày 💪',
            'Mê cây cối 🌿', 'Designer tập sự 🎨', 'Một người bình thường 🙂',
            'Học hỏi mỗi ngày 📈', 'Mèo là chân ái 🐱', 'Âm nhạc là cuộc sống 🎵',
            'Tối giản & an yên ☁️', 'Thích nấu ăn 🍳', 'Chạy bộ buổi sáng 🏃'];

var CAPTIONS = [
  'Hoàng hôn hôm nay đẹp quá 🌅 #sunset #vietnam',
  'Cuối tuần thư giãn nhẹ nhàng ☕ #weekend #coffee',
  'Một góc thành phố về đêm 🌃 #citylife #nightview',
  'Món ăn tự nấu hôm nay 🍳 #food #homecooking',
  'Chuyến đi đáng nhớ ✈️ #travel #wanderlust',
  'Tập luyện mỗi ngày không bỏ buổi 💪 #fitness #gym',
  'Tác phẩm mới của mình đây 🎨 #art #design',
  'Cảnh thiên nhiên tuyệt đẹp 🌿 #nature #hiking',
  'Outfit hôm nay thế nào mọi người 👗 #fashion #ootd',
  'Đọc sách cuối ngày thật bình yên 📚 #books #reading',
  'Bình minh trên biển 🌊 #beach #sunrise',
  'Ngày mới năng lượng tích cực ✨ #goodvibes #morning',
  'Sài Gòn cà phê sáng ☕ #saigon #coffeelover',
  'Một ngày đáng nhớ bên bạn bè 🥰 #friends #happy',
  'Khoảnh khắc bình dị đời thường 🍃 #lifestyle #slowliving',
];

var COMMENT_TEXTS = ['Đẹp quá! 😍', 'Xịn ghê 👏', 'Quá tuyệt vời 🔥',
                     'Mê luôn ❤️', 'Ảnh chất lượng thật sự 📷', 'Cho mình xin vía 🙌',
                     'Tuyệt vời ông mặt trời ☀️', 'Like mạnh tay 💯'];

var REACTIONS = ['love', 'like', 'love', 'haha', 'wow', 'love'];

// 5 tài khoản đặc biệt
function buildSpecialUsers() {
  return [
    // 2 tài khoản ĐÃ có tích xanh
    { username: 'maitravel', fullName: 'Mai Khánh Linh', email: 'maitravel@test.com',
      bio: 'Travel blogger ✈️ | Khám phá Việt Nam', gender: 'female',
      isTrusted: true,  kind: 'verified' },
    { username: 'huyfood',   fullName: 'Nguyễn Quang Huy', email: 'huyfood@test.com',
      bio: 'Food reviewer 🍜 | Sài Gòn ăn gì?', gender: 'male',
      isTrusted: true,  kind: 'verified' },
    // 3 tài khoản ĐỦ ĐIỀU KIỆN → test luồng OTP
    { username: 'ngocphoto', fullName: 'Trần Bảo Ngọc', email: aliasEmail('ngocphoto'),
      bio: 'Nhiếp ảnh gia tự do 📸 | Chụp chân dung', gender: 'female',
      isTrusted: false, kind: 'eligible' },
    { username: 'tuanfit',   fullName: 'Lê Anh Tuấn', email: aliasEmail('tuanfit'),
      bio: 'Personal trainer 💪 | Sống khoẻ mỗi ngày', gender: 'male',
      isTrusted: false, kind: 'eligible' },
    { username: 'vyart',     fullName: 'Phạm Khánh Vy', email: aliasEmail('vyart'),
      bio: 'Họa sĩ minh hoạ 🎨 | Yêu màu sắc', gender: 'female',
      isTrusted: false, kind: 'eligible' },
  ];
}

// Tạo email alias '+' từ DEMO_EMAIL_BASE để nhận OTP về cùng hộp thư
function aliasEmail(tag) {
  var at = DEMO_EMAIL_BASE.indexOf('@');
  return DEMO_EMAIL_BASE.slice(0, at) + '+' + tag + DEMO_EMAIL_BASE.slice(at);
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối MongoDB:', MONGO_URI);

  var passwordHash = await bcrypt.hash(COMMON_PASSWORD, 10);

  // ── 1. Dựng danh sách user docs ──
  var specialDefs = buildSpecialUsers();
  var userDocs = [];

  // 5 tài khoản đặc biệt — lùi 70 ngày để vượt mốc "≥ 1 tháng tuổi"
  for (var s = 0; s < specialDefs.length; s++) {
    var sp = specialDefs[s];
    var spCreated = daysAgo(70);
    userDocs.push({
      username:       sp.username,
      email:          sp.email,
      passwordHash:   passwordHash,
      fullName:       sp.fullName,
      avatarUrl:      'https://i.pravatar.cc/200?u=' + sp.username,
      bio:            sp.bio,
      gender:         sp.gender,
      role:           'user',
      isActive:       true,
      isTrusted:      sp.isTrusted,
      createdAt:      spCreated,
      updatedAt:      spCreated,
    });
  }

  // 195 user pool — username unique nhờ hậu tố số thứ tự
  for (var i = 1; i <= POOL_COUNT; i++) {
    var ho  = pick(HO);
    var t1  = pick(TEN);
    var t2  = pick(TEN);
    var fullName = ho + ' ' + t1 + ' ' + t2;
    var base = removeDiacritics(t1 + t2).toLowerCase().replace(/[^a-z0-9]/g, '');
    var username = base + i;  // ví dụ: minhanh37
    var created = daysAgo(randInt(2, 120)); // rải tuổi account trong ~4 tháng

    userDocs.push({
      username:     username,
      email:        username + '@seed.local',
      passwordHash: passwordHash,
      fullName:     fullName,
      avatarUrl:    'https://i.pravatar.cc/200?u=' + username,
      bio:          pick(BIOS),
      gender:       Math.random() < 0.5 ? 'male' : 'female',
      role:         'user',
      isActive:     true,
      isPrivate:    Math.random() < 0.1,  // ~10% tài khoản riêng tư
      createdAt:    created,
      updatedAt:    created,
    });
  }

  // insertMany với timestamps:false để giữ nguyên createdAt đã set (backdate)
  var created = await User.insertMany(userDocs, { timestamps: false, ordered: false });
  console.log('\n✓ Tạo ' + created.length + ' user (5 đặc biệt + ' + POOL_COUNT + ' pool)');

  // Map username → user
  var byName = {};
  created.forEach(function (u) { byName[u.username] = u; });

  var specials = specialDefs.map(function (d) { return byName[d.username]; });
  var pool = created.filter(function (u) {
    return specialDefs.every(function (d) { return d.username !== u.username; });
  });

  // ── 2. Follow graph ──
  var followDocs = [];
  var followersCount = {}; // username → số follower
  var followingCount = {}; // username → số đang theo dõi
  created.forEach(function (u) { followersCount[u.username] = 0; followingCount[u.username] = 0; });

  // 2a. Mỗi tài khoản đặc biệt nhận FOLLOWERS_TARGET follower từ pool
  for (var sp2 = 0; sp2 < specials.length; sp2++) {
    var target = specials[sp2];
    var followers = sample(pool, FOLLOWERS_TARGET);
    for (var f = 0; f < followers.length; f++) {
      followDocs.push({
        followerId:  followers[f]._id,
        followingId: target._id,
        status:      'accepted',
      });
      followersCount[target.username] += 1;
      followingCount[followers[f].username] += 1;
    }
  }

  // 2b. Follow ngẫu nhiên pool ↔ pool cho feed/suggested phong phú
  for (var p = 0; p < pool.length; p++) {
    var me = pool[p];
    var others = sample(pool, randInt(4, 10)).filter(function (o) {
      return o.username !== me.username;
    });
    for (var o2 = 0; o2 < others.length; o2++) {
      followDocs.push({
        followerId:  me._id,
        followingId: others[o2]._id,
        status:      'accepted',
      });
      followersCount[others[o2].username] += 1;
      followingCount[me.username] += 1;
    }
  }

  // insertMany Follow — ordered:false để bỏ qua bản trùng (nếu lỡ sinh trùng)
  try {
    await Follow.insertMany(followDocs, { ordered: false });
  } catch (err) {
    if (err.code !== 11000 && !(err.writeErrors)) throw err; // chỉ bỏ qua duplicate key
  }

  // Cập nhật counter follower/following bằng bulkWrite
  var followOps = created.map(function (u) {
    return {
      updateOne: {
        filter: { _id: u._id },
        update: { $set: {
          followersCount: followersCount[u.username],
          followingCount: followingCount[u.username],
        } },
      },
    };
  });
  await User.bulkWrite(followOps);
  console.log('✓ Tạo ' + followDocs.length + ' follow + cập nhật counter');

  // ── 3. Posts + media ──
  var postDocs = [];
  var mediaPlan = []; // { postKey, url } — ghép với post sau khi insert

  // 3a. Tài khoản đặc biệt: SPECIAL_POSTS bài/người (vượt mốc 20)
  for (var sp3 = 0; sp3 < specials.length; sp3++) {
    var au = specials[sp3];
    for (var k = 0; k < SPECIAL_POSTS; k++) {
      var capS = pick(CAPTIONS);
      postDocs.push({
        userId:   au._id,
        caption:  capS,
        hashtags: extractHashtags(capS),
        type:     'image',
        createdAt: daysAgo(randInt(1, 60)),
        _seedUrl: 'https://picsum.photos/seed/' + au.username + k + '/800/800',
      });
    }
  }

  // 3b. Pool: ~100 user đầu mỗi người 1-3 bài để feed có nội dung
  for (var pp = 0; pp < pool.length && pp < 100; pp++) {
    var pu = pool[pp];
    var nPosts = randInt(1, 3);
    for (var kk = 0; kk < nPosts; kk++) {
      var capP = pick(CAPTIONS);
      postDocs.push({
        userId:   pu._id,
        caption:  capP,
        hashtags: extractHashtags(capP),
        type:     'image',
        createdAt: daysAgo(randInt(1, 100)),
        _seedUrl: 'https://picsum.photos/seed/' + pu.username + kk + '/800/800',
      });
    }
  }

  // Tách _seedUrl ra trước khi insert (không phải field của schema)
  var cleanPosts = postDocs.map(function (d) {
    return {
      userId: d.userId, caption: d.caption, hashtags: d.hashtags,
      type: d.type, createdAt: d.createdAt, updatedAt: d.createdAt,
    };
  });
  var insertedPosts = await Post.insertMany(cleanPosts, { timestamps: false, ordered: false });

  // Tạo media tương ứng theo đúng thứ tự
  var mediaDocs = insertedPosts.map(function (post, idx) {
    return {
      postId:       post._id,
      mediaType:    'image',
      url:          postDocs[idx]._seedUrl,
      width:        800,
      height:       800,
      displayOrder: 0,
    };
  });
  await PostMedia.insertMany(mediaDocs, { ordered: false });

  // Cập nhật postsCount cho từng user
  var postCountByUser = {};
  insertedPosts.forEach(function (post) {
    var uid = post.userId.toString();
    postCountByUser[uid] = (postCountByUser[uid] || 0) + 1;
  });
  var postOps = Object.keys(postCountByUser).map(function (uid) {
    return { updateOne: { filter: { _id: uid }, update: { $set: { postsCount: postCountByUser[uid] } } } };
  });
  await User.bulkWrite(postOps);
  console.log('✓ Tạo ' + insertedPosts.length + ' post + media + cập nhật postsCount');

  // ── 4. Likes + comments nhẹ trên bài của tài khoản đặc biệt ──
  var specialIds = {};
  specials.forEach(function (u) { specialIds[u._id.toString()] = true; });
  var specialPosts = insertedPosts.filter(function (post) {
    return specialIds[post.userId.toString()];
  });

  var likeDocs = [];
  var commentDocs = [];
  var likeCountByPost = {};
  var commentCountByPost = {};

  for (var spp = 0; spp < specialPosts.length; spp++) {
    var post = specialPosts[spp];
    var likers = sample(pool, randInt(3, 9));
    for (var l = 0; l < likers.length; l++) {
      likeDocs.push({
        userId:       likers[l]._id,
        targetType:   'post',
        targetId:     post._id,
        reactionType: pick(REACTIONS),
      });
    }
    likeCountByPost[post._id.toString()] = likers.length;

    // 0-2 comment mỗi bài
    var commenters = sample(pool, randInt(0, 2));
    for (var c = 0; c < commenters.length; c++) {
      commentDocs.push({
        postId:  post._id,
        userId:  commenters[c]._id,
        content: pick(COMMENT_TEXTS),
      });
    }
    if (commenters.length > 0) commentCountByPost[post._id.toString()] = commenters.length;
  }

  if (likeDocs.length > 0) {
    try { await Like.insertMany(likeDocs, { ordered: false }); }
    catch (err) { if (err.code !== 11000 && !(err.writeErrors)) throw err; }
  }
  if (commentDocs.length > 0) await Comment.insertMany(commentDocs, { ordered: false });

  // Cập nhật likesCount/commentsCount cho post đặc biệt
  var postStatOps = specialPosts.map(function (post) {
    return {
      updateOne: {
        filter: { _id: post._id },
        update: { $set: {
          likesCount:    likeCountByPost[post._id.toString()] || 0,
          commentsCount: commentCountByPost[post._id.toString()] || 0,
        } },
      },
    };
  });
  await Post.bulkWrite(postStatOps);
  console.log('✓ Tạo ' + likeDocs.length + ' like + ' + commentDocs.length + ' comment trên bài tài khoản đặc biệt');

  // ── 5. Tóm tắt ──
  console.log('\n' + '='.repeat(58));
  console.log('  TÀI KHOẢN TÍCH XANH (đăng nhập mật khẩu: ' + COMMON_PASSWORD + ')');
  console.log('='.repeat(58));
  console.log('  ĐÃ có tích xanh:');
  console.log('    @maitravel   — ' + byName['maitravel'].email);
  console.log('    @huyfood     — ' + byName['huyfood'].email);
  console.log('\n  ĐỦ ĐIỀU KIỆN (đăng nhập → xin tích → nhận OTP qua email):');
  for (var e = 0; e < specialDefs.length; e++) {
    if (specialDefs[e].kind !== 'eligible') continue;
    var eu = byName[specialDefs[e].username];
    console.log('    @' + eu.username + '  — follower:' + followersCount[eu.username] +
                ' bài:' + (postCountByUser[eu._id.toString()] || 0) +
                ' — OTP gửi tới: ' + eu.email);
  }
  console.log('='.repeat(58));

  await mongoose.disconnect();
  console.log('\nHoàn tất.\n');
}

run().catch(function (err) {
  console.error('\nSeed thất bại:', err.message);
  console.error(err);
  process.exit(1);
});
