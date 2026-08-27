// seedExtraUsers.js
// Thêm 20 users mới + 25 posts (3 video) + follows + likes + comments + 2 group chats
//
// Chạy: node server/seedExtraUsers.js
//
// Yêu cầu: đã chạy seedAll.js + seedReels.js + seedAptech.js trước
// Script KHÔNG xóa dữ liệu cũ — chỉ thêm mới

require('dotenv').config({ path: __dirname + '/.env' });
var mongoose = require('mongoose');

var User               = require('./models/User');
var Follow             = require('./models/Follow');
var Post               = require('./models/Post');
var PostMedia          = require('./models/PostMedia');
var Comment            = require('./models/Comment');
var Like               = require('./models/Like');
var Conversation       = require('./models/Conversation');
var ConversationMember = require('./models/ConversationMember');
var Notification       = require('./models/Notification');
var { extractHashtags } = require('./utils/hashtags');

var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/instagrams';

var CLOUD_NAME = 'dclmpp1pt';

// 3 video từ reels dùng làm post video (không dùng video Aptech)
var VIDEO_POSTS = [
  { publicId: '13940556-uhd_3840_2160_24fps_yeionf', thumb: '' }, // Hội An
  { publicId: '8479667-hd_1080_1920_25fps_padz5c',   thumb: '' }, // Street food
  { publicId: '12133134_2560_1440_60fps_l8tr8e',     thumb: '' }, // Biển Vũng Tàu
];

function videoUrl(publicId) {
  return 'https://res.cloudinary.com/' + CLOUD_NAME + '/video/upload/' + publicId + '.mp4';
}

function picsumUrl(id) {
  return 'https://picsum.photos/id/' + id + '/800/800';
}

// Helper: safe like
async function safeLike(userId, targetType, targetId, Model, countField) {
  try {
    await Like.create({ userId: userId, targetType: targetType, targetId: targetId });
    var inc = {};
    inc[countField] = 1;
    await Model.findByIdAndUpdate(targetId, { $inc: inc });
    return true;
  } catch (err) {
    if (err.code === 11000) return false;
    throw err;
  }
}

// Helper: safe follow
async function safeFollow(followerId, followingId, status) {
  status = status || 'accepted';
  try {
    await Follow.create({ followerId: followerId, followingId: followingId, status: status });
    if (status === 'accepted') {
      await User.findByIdAndUpdate(followerId,  { $inc: { followingCount: 1 } });
      await User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } });
    }
    return true;
  } catch (err) {
    if (err.code === 11000) return false;
    throw err;
  }
}

// ─────────────────────────────────────────────
// 1. TẠO 20 USERS MỚI
// ─────────────────────────────────────────────
async function seedExtraUsers() {
  var userData = [
    { username: 'linh_nt',   fullName: 'Nguyễn Thị Linh',   bio: 'Yêu bếp núc và ẩm thực 🍳',              gender: 'female' },
    { username: 'minh_tv',   fullName: 'Trần Văn Minh',      bio: 'Dev by day, gamer by night 🎮',           gender: 'male'   },
    { username: 'tuyen_hm',  fullName: 'Hoàng Minh Tuyến',   bio: 'Dancer & content creator 💃',             gender: 'female' },
    { username: 'khoa_nd',   fullName: 'Nguyễn Đức Khoa',    bio: 'Photographer 📷 | Sài Gòn',               gender: 'male'   },
    { username: 'ngan_pt',   fullName: 'Phạm Thị Ngân',      bio: 'Fashion & lifestyle ✨',                   gender: 'female' },
    { username: 'dung_lv',   fullName: 'Lê Văn Dũng',        bio: 'Đam mê bóng đá ⚽ | HCMC',               gender: 'male'   },
    { username: 'phuong_dt', fullName: 'Đặng Thị Phương',    bio: 'Skincare & beauty 💄',                    gender: 'female' },
    { username: 'tuan_bq',   fullName: 'Bùi Quốc Tuấn',      bio: 'Barista ☕ | Coffee lover',               gender: 'male'   },
    { username: 'lan_vh',    fullName: 'Vũ Hoài Lan',         bio: 'Book worm 📚 | Intro đặc biệt',           gender: 'female' },
    { username: 'hung_tm',   fullName: 'Tống Minh Hùng',      bio: 'Fitness & nutrition 💪',                  gender: 'male'   },
    { username: 'mai_ln',    fullName: 'Lương Ngọc Mai',      bio: 'Travel addict | 15 tỉnh thành 🗺️',       gender: 'female' },
    { username: 'quang_hv',  fullName: 'Huỳnh Văn Quang',    bio: 'Music producer 🎵 | TP.HCM',             gender: 'male'   },
    { username: 'thu_nk',    fullName: 'Nguyễn Kim Thu',      bio: 'Giáo viên tiếng Anh 🇬🇧 | Coffee addict', gender: 'female' },
    { username: 'nam_vd',    fullName: 'Võ Đình Nam',         bio: 'Street food hunter 🍜 Sài Gòn',          gender: 'male'   },
    { username: 'nga_tl',    fullName: 'Trịnh Lan Nga',       bio: 'Florist 🌸 | Handmade lover',             gender: 'female' },
    { username: 'thinh_pb',  fullName: 'Phan Bảo Thịnh',     bio: 'Startup founder | Tech enthusiast 🚀',    gender: 'male'   },
    { username: 'trang_ch',  fullName: 'Cao Hoàng Trang',    bio: 'Vlogger | Du lịch bụi 🎒',               gender: 'female' },
    { username: 'long_nq',   fullName: 'Nguyễn Quốc Long',   bio: 'Đầu bếp chuyên nghiệp 🧑‍🍳',            gender: 'male'   },
    { username: 'huyen_bm',  fullName: 'Bùi Minh Huyền',     bio: 'Nhiếp ảnh cưới 📸 | Hà Nội',             gender: 'female' },
    { username: 'duc_ht',    fullName: 'Hồ Thanh Đức',       bio: 'Gym rat & personal trainer 💪',           gender: 'male'   },
  ];

  var created = [];
  for (var i = 0; i < userData.length; i++) {
    var d = userData[i];
    var existing = await User.findOne({ username: d.username });
    if (existing) { created.push(existing); continue; }
    var user = await User.create({
      username:     d.username,
      email:        d.username + '@test.com',
      fullName:     d.fullName,
      passwordHash: 'User@123',
      role:         'user',
      isActive:     true,
      bio:          d.bio,
      gender:       d.gender,
    });
    created.push(user);
    process.stdout.write('.');
  }

  console.log('\n\n✓ Tạo / tìm ' + created.length + ' extra users');
  return created;
}

// ─────────────────────────────────────────────
// 2. FOLLOW — CÁC HƯỚNG
// ─────────────────────────────────────────────
async function seedExtraFollows(allMap, extra) {
  var added = 0;

  // Extra users follow nhau (vòng tròn + chéo)
  var extraNames = extra.map(function (u) { return u.username; });

  // Follow vòng tròn liên tiếp (i → i+1, i+1 → i)
  for (var i = 0; i < extra.length; i++) {
    var next = extra[(i + 1) % extra.length];
    var ok1 = await safeFollow(extra[i]._id, next._id, 'accepted');
    var ok2 = await safeFollow(next._id, extra[i]._id, 'accepted');
    if (ok1) added++;
    if (ok2) added++;
  }

  // Một số extra follow thêm user cũ
  var followOld = [
    ['linh_nt',   'alice'],
    ['linh_nt',   'diana'],
    ['minh_tv',   'bob'],
    ['minh_tv',   'ethan'],
    ['tuyen_hm',  'alice'],
    ['tuyen_hm',  'fiona'],
    ['khoa_nd',   'alice'],
    ['khoa_nd',   'charlie'],
    ['ngan_pt',   'fiona'],
    ['ngan_pt',   'hana'],
    ['dung_lv',   'ethan'],
    ['dung_lv',   'george'],
    ['phuong_dt', 'alice'],
    ['phuong_dt', 'hana'],
    ['tuan_bq',   'bob'],
    ['tuan_bq',   'alice'],
    ['lan_vh',    'fiona'],
    ['hung_tm',   'ethan'],
    ['hung_tm',   'alice'],
    ['mai_ln',    'charlie'],
    ['mai_ln',    'hana'],
    ['quang_hv',  'alice'],
    ['quang_hv',  'bob'],
    ['thu_nk',    'aptech_vietnam'],
    ['nam_vd',    'diana'],
    ['nam_vd',    'hana'],
    ['nga_tl',    'fiona'],
    ['thinh_pb',  'aptech_vietnam'],
    ['thinh_pb',  'ethan'],
    ['trang_ch',  'charlie'],
    ['trang_ch',  'alice'],
    ['long_nq',   'diana'],
    ['huyen_bm',  'alice'],
    ['huyen_bm',  'charlie'],
    ['duc_ht',    'ethan'],
    ['duc_ht',    'alice'],
  ];

  for (var j = 0; j < followOld.length; j++) {
    var f = allMap[followOld[j][0]];
    var t = allMap[followOld[j][1]];
    if (!f || !t) continue;
    var ok = await safeFollow(f._id, t._id, 'accepted');
    if (ok) added++;
  }

  // User cũ follow lại một số extra
  var followBack = [
    ['alice',   'khoa_nd'],
    ['alice',   'tuyen_hm'],
    ['alice',   'huyen_bm'],
    ['bob',     'minh_tv'],
    ['bob',     'tuan_bq'],
    ['charlie', 'trang_ch'],
    ['charlie', 'mai_ln'],
    ['ethan',   'hung_tm'],
    ['ethan',   'duc_ht'],
    ['fiona',   'nga_tl'],
    ['fiona',   'ngan_pt'],
    ['hana',    'linh_nt'],
    ['hana',    'mai_ln'],
    ['diana',   'nam_vd'],
    ['diana',   'linh_nt'],
    ['aptech_vietnam', 'thinh_pb'],
    ['aptech_vietnam', 'minh_tv'],
    ['aptech_vietnam', 'thu_nk'],
  ];

  for (var k = 0; k < followBack.length; k++) {
    var fb = allMap[followBack[k][0]];
    var tb = allMap[followBack[k][1]];
    if (!fb || !tb) continue;
    var okb = await safeFollow(fb._id, tb._id, 'accepted');
    if (okb) added++;
  }

  // Pending follows — gửi nhưng chưa accept (diana isPrivate + một số tài khoản private khác)
  var pendingPairs = [
    ['linh_nt',   'diana'],
    ['minh_tv',   'diana'],
    ['khoa_nd',   'diana'],
    ['trang_ch',  'diana'],
    ['long_nq',   'diana'],
    ['nam_vd',    'diana'],
  ];

  var pendingAdded = 0;
  for (var p = 0; p < pendingPairs.length; p++) {
    var pf = allMap[pendingPairs[p][0]];
    var pt = allMap[pendingPairs[p][1]];
    if (!pf || !pt) continue;
    var okp = await safeFollow(pf._id, pt._id, 'pending');
    if (okp) pendingAdded++;
  }

  console.log('✓ Follows: thêm ' + added + ' accepted + ' + pendingAdded + ' pending');
}

// ─────────────────────────────────────────────
// 3. TẠO 25 POSTS (22 ảnh + 3 video)
// ─────────────────────────────────────────────
async function seedExtraPosts(extra, allMap) {
  var postData = [
    // linh_nt — ẩm thực
    { username: 'linh_nt',   type: 'image', caption: 'Mâm cơm cuối tuần tự nấu 🍳 ngon hơn ngoài hàng nhiều!', picsumId: 292 },
    { username: 'linh_nt',   type: 'image', caption: 'Bánh flan homemade thành công rồi 🎉 #baking #homemade', picsumId: 431 },
    // minh_tv — dev/tech
    { username: 'minh_tv',   type: 'image', caption: 'Setup góc làm việc mới ✨ Dual monitor chill hơn hẳn 💻', picsumId: 160 },
    { username: 'minh_tv',   type: 'image', caption: '3 tháng học React từ zero 🚀 Giờ đã làm được project thật rồi!', picsumId: 42  },
    // tuyen_hm — dance
    { username: 'tuyen_hm',  type: 'image', caption: 'Sau 6 tháng tập dance, cuối cùng đã lên sân khấu được 💃🎉', picsumId: 447 },
    // khoa_nd — photography
    { username: 'khoa_nd',   type: 'image', caption: 'Golden hour ở Mũi Né 🌅 Đợi 2 tiếng mới chụp được khoảnh khắc này', picsumId: 10  },
    { username: 'khoa_nd',   type: 'image', caption: 'Portrait session sáng nay — ánh sáng tự nhiên đẹp nhất 📷', picsumId: 190 },
    // ngan_pt — fashion
    { username: 'ngan_pt',   type: 'image', caption: 'OOTD hôm nay 🌸 Simple nhưng vẫn chill #fashion #style', picsumId: 152 },
    // dung_lv — football
    { username: 'dung_lv',   type: 'image', caption: 'Xem trận khuya nay cùng bạn bè 🔥⚽ Việt Nam phải thắng!', picsumId: 375 },
    // phuong_dt — skincare/beauty
    { username: 'phuong_dt', type: 'image', caption: 'Skincare routine buổi tối của mình 🌙 Consistent 3 tháng da khác hẳn!', picsumId: 167 },
    // tuan_bq — coffee
    { username: 'tuan_bq',   type: 'image', caption: 'Latte art của mình hôm nay ☕ Lần đầu làm được hình trái tim!', picsumId: 225 },
    { username: 'tuan_bq',   type: 'image', caption: 'Blend thử công thức cold brew mới — kết quả ngon bất ngờ 🥤', picsumId: 76  },
    // lan_vh — books
    { username: 'lan_vh',    type: 'image', caption: 'Góc đọc sách cuối tuần ☀️ Đang đọc "Atomic Habits" lần 2 📚', picsumId: 338 },
    // hung_tm — fitness
    { username: 'hung_tm',   type: 'image', caption: 'PR mới hôm nay: Squat 120kg 💪 Năm ngoái mình còn không dám nghĩ tới', picsumId: 396 },
    // mai_ln — travel
    { username: 'mai_ln',    type: 'image', caption: 'Tỉnh thành thứ 15: Hà Giang 🗺️✨ Đẹp đến không muốn về', picsumId: 28  },
    { username: 'mai_ln',    type: 'image', caption: 'Đỉnh Mã Pì Lèng nhìn xuống — khoảnh khắc không thể quên 🏔️', picsumId: 119 },
    // quang_hv — music
    { username: 'quang_hv',  type: 'image', caption: 'Bản beat mới vừa hoàn thành lúc 2 giờ sáng 🎵 Sắp release rồi!', picsumId: 48  },
    // thu_nk — education
    { username: 'thu_nk',    type: 'image', caption: 'Lớp học hôm nay nhiều năng lượng quá 🇬🇧 Yêu nghề giáo lắm luôn!', picsumId: 15  },
    // nam_vd — street food
    { username: 'nam_vd',    type: 'image', caption: 'Bánh canh ghẹ Phan Rang — tìm mãi mới ra quán này 🦀🍜', picsumId: 48  },
    // trang_ch — vlog/travel
    { username: 'trang_ch',  type: 'image', caption: 'Solo trip Phú Yên 3 ngày 2 đêm ✈️🌊 Recap clip sắp lên!', picsumId: 119 },
    // huyen_bm — wedding photo
    { username: 'huyen_bm',  type: 'image', caption: 'Hậu trường chụp ảnh cưới hôm qua 📸 Cặp đôi dễ thương quá!', picsumId: 190 },
    // duc_ht — gym
    { username: 'duc_ht',    type: 'image', caption: 'Client của mình tháng thứ 3 — giảm 8kg mà vẫn giữ cơ 💪🔥', picsumId: 447 },
    // 3 posts video — dùng video từ reels (không phải Aptech)
    { username: 'trang_ch',  type: 'video', caption: 'Hội An về đêm — clip từ chuyến đi tháng trước 🏮✨ #travel #hoian', videoIdx: 0 },
    { username: 'nam_vd',    type: 'video', caption: 'Cô chú này làm đồ ăn đường phố siêu khéo tay! 🍜 #streetfood #saigon', videoIdx: 1 },
    { username: 'mai_ln',    type: 'video', caption: 'Biển Vũng Tàu sáng sớm — bình yên đến lạ 🌊☀️ #vungtau #morning', videoIdx: 2 },
  ];

  var posts = [];

  for (var i = 0; i < postData.length; i++) {
    var pd = postData[i];
    var user = allMap[pd.username];
    if (!user) continue;

    var post = await Post.create({
      userId:   user._id,
      caption:  pd.caption,
      hashtags: extractHashtags(pd.caption),
      type:     pd.type,
    });

    if (pd.type === 'video') {
      var vd = VIDEO_POSTS[pd.videoIdx];
      await PostMedia.create({
        postId:    post._id,
        mediaType: 'video',
        url:       videoUrl(vd.publicId),
        displayOrder: 0,
      });
    } else {
      await PostMedia.create({
        postId:    post._id,
        mediaType: 'image',
        url:       picsumUrl(pd.picsumId),
        width:     800,
        height:    800,
        displayOrder: 0,
      });
    }

    await User.findByIdAndUpdate(user._id, { $inc: { postsCount: 1 } });
    posts.push(post);
    process.stdout.write('.');
  }

  console.log('\n\n✓ Tạo ' + posts.length + ' posts (22 ảnh + 3 video)');
  return posts;
}

// ─────────────────────────────────────────────
// 4. LIKES + COMMENTS CHÉO GIỮA TẤT CẢ USERS
// ─────────────────────────────────────────────
async function seedExtraInteractions(allMap, extra, posts, oldPosts) {
  var allPosts = oldPosts.concat(posts);
  var liked  = 0;
  var commented = 0;

  // Extra users like posts cũ
  var extraPostLikes = [
    ['linh_nt',   0], ['linh_nt',   3], ['linh_nt',   9],
    ['minh_tv',   4], ['minh_tv',   11],['minh_tv',   0],
    ['tuyen_hm',  0], ['tuyen_hm',  14],['tuyen_hm',  2],
    ['khoa_nd',   0], ['khoa_nd',   1], ['khoa_nd',   7],
    ['ngan_pt',   0], ['ngan_pt',   14],['ngan_pt',   15],
    ['dung_lv',   11],['dung_lv',   12],['dung_lv',   13],
    ['phuong_dt', 0], ['phuong_dt', 15],['phuong_dt', 1],
    ['tuan_bq',   3], ['tuan_bq',   4], ['tuan_bq',   5],
    ['lan_vh',    14],['lan_vh',    15],
    ['hung_tm',   11],['hung_tm',   12],['hung_tm',   13],
    ['mai_ln',    6], ['mai_ln',    7], ['mai_ln',    8],
    ['quang_hv',  0], ['quang_hv',  1], ['quang_hv',  3],
    ['thu_nk',    0], ['thu_nk',    2], ['thu_nk',    16],
    ['nam_vd',    9], ['nam_vd',    10],['nam_vd',    3],
    ['nga_tl',    14],['nga_tl',    0], ['nga_tl',    15],
    ['thinh_pb',  4], ['thinh_pb',  11],
    ['trang_ch',  6], ['trang_ch',  7], ['trang_ch',  8],
    ['long_nq',   9], ['long_nq',   10],
    ['huyen_bm',  0], ['huyen_bm',  1], ['huyen_bm',  2],
    ['duc_ht',    11],['duc_ht',    12],['duc_ht',    13],
  ];

  for (var i = 0; i < extraPostLikes.length; i++) {
    var u = allMap[extraPostLikes[i][0]];
    var p = allPosts[extraPostLikes[i][1]];
    if (!u || !p) continue;
    var ok = await safeLike(u._id, 'post', p._id, Post, 'likesCount');
    if (ok) liked++;
  }

  // Old users like posts mới của extra users
  var oldLikeNew = [
    ['alice',   posts[0]._id], ['alice',   posts[5]._id], ['alice',  posts[12]._id],
    ['bob',     posts[2]._id], ['bob',     posts[10]._id],['bob',    posts[22]._id],
    ['charlie', posts[14]._id],['charlie', posts[15]._id],['charlie',posts[23]._id],
    ['ethan',   posts[13]._id],['ethan',   posts[21]._id],
    ['fiona',   posts[7]._id], ['fiona',   posts[9]._id],
    ['hana',    posts[0]._id], ['hana',    posts[1]._id], ['hana',   posts[11]._id],
    ['diana',   posts[0]._id], ['diana',   posts[17]._id],['diana',  posts[18]._id],
    ['aptech_vietnam', posts[3]._id], ['aptech_vietnam', posts[16]._id],
  ];

  for (var j = 0; j < oldLikeNew.length; j++) {
    var ou = allMap[oldLikeNew[j][0]];
    var op = oldLikeNew[j][1];
    if (!ou || !op) continue;
    var ok2 = await safeLike(ou._id, 'post', op, Post, 'likesCount');
    if (ok2) liked++;
  }

  console.log('✓ Post likes: thêm ' + liked);

  // Comments của extra users lên posts cũ
  var commentData = [
    { postIdx: 0,  username: 'linh_nt',   content: 'Ảnh đẹp quá chị ơi! Chụp máy gì vậy?' },
    { postIdx: 0,  username: 'khoa_nd',   content: 'Ánh sáng chuẩn lắm, giờ vàng rõ nét 👏' },
    { postIdx: 0,  username: 'huyen_bm',  content: 'Nhiếp ảnh gia ẩn danh đây rồi 😍' },
    { postIdx: 1,  username: 'tuyen_hm',  content: 'Ảnh đẹp, vibe chill lắm 🌟' },
    { postIdx: 1,  username: 'ngan_pt',   content: 'Background này ở đâu vậy bạn? Đẹp ghê!' },
    { postIdx: 3,  username: 'minh_tv',   content: 'Coffee sáng = năng suất cả ngày ☕ đồng ý 100%' },
    { postIdx: 3,  username: 'tuan_bq',   content: 'Cà phê ở đâu bạn? Nhìn ngon quá 🤤' },
    { postIdx: 4,  username: 'minh_tv',   content: 'Dev life chill thật sự! Setup ngầu lắm 💻' },
    { postIdx: 4,  username: 'thinh_pb',  content: 'Dùng màn nào vậy bạn? Mình đang tìm mua' },
    { postIdx: 6,  username: 'trang_ch',  content: 'Hà Nội sáng sớm yên bình lắm nhỉ 💫' },
    { postIdx: 6,  username: 'mai_ln',    content: 'Next trip rủ mình với nha!' },
    { postIdx: 7,  username: 'mai_ln',    content: 'Mỗi chuyến đi là một câu chuyện 🌍' },
    { postIdx: 9,  username: 'nam_vd',    content: 'Phở ngon nhìn ảnh thôi đã thèm 🍜' },
    { postIdx: 9,  username: 'linh_nt',   content: 'Nước dùng nhìn trong vắt, chắc ngọt lắm!' },
    { postIdx: 11, username: 'hung_tm',   content: 'Consistency là chìa khóa! Keep going 💪' },
    { postIdx: 11, username: 'duc_ht',    content: 'Form tập đẹp lắm! Lưng thẳng perfect' },
    { postIdx: 12, username: 'duc_ht',    content: 'Transformation sau 6 tháng đỉnh thật! 🔥' },
    { postIdx: 12, username: 'hung_tm',   content: 'Kiên trì mới ra quả ngọt bạn ơi! 🙌' },
    { postIdx: 14, username: 'nga_tl',    content: 'Tranh đẹp quá! Vẽ mất bao lâu vậy?' },
    { postIdx: 14, username: 'tuyen_hm',  content: 'Tài năng thật sự, mình mà có 1/10 tài của bạn 😭' },
    { postIdx: 16, username: 'trang_ch',  content: 'Sapa mình cũng trekking rồi! Đáng đến lắm 🌿' },
    { postIdx: 16, username: 'mai_ln',    content: 'Phải đi ít nhất 1 lần trong đời!' },
    { postIdx: 17, username: 'huyen_bm',  content: 'Ninh Bình nhìn từ trên xuống đẹp mê hồn 🏔️' },
    { postIdx: 17, username: 'khoa_nd',   content: 'Góc flycam này chuẩn thật sự! Chụp bằng gì vậy?' },
  ];

  var comments = [];
  for (var c = 0; c < commentData.length; c++) {
    var cd = commentData[c];
    var cu = allMap[cd.username];
    var cp = allPosts[cd.postIdx];
    if (!cu || !cp) continue;
    var comment = await Comment.create({
      postId:  cp._id,
      userId:  cu._id,
      content: cd.content,
    });
    await Post.findByIdAndUpdate(cp._id, { $inc: { commentsCount: 1 } });
    comments.push(comment);
    commented++;
  }

  // Comments của extra users lên posts mới của extra users
  var newPostComments = [
    { post: posts[0],  username: 'alice',   content: 'Mâm cơm nhà làm đẹp và ngon quá Linh ơi! 🍳' },
    { post: posts[0],  username: 'diana',   content: 'Đồng nghiệp ẩm thực đây rồi 😍 Nấu chia sẻ công thức không?' },
    { post: posts[1],  username: 'hana',    content: 'Bánh flan nhìn mịn và đẹp lắm! Share recipe với 🎉' },
    { post: posts[2],  username: 'bob',     content: 'Setup xịn lắm Minh! Dual monitor năng suất hơn thật 💻' },
    { post: posts[2],  username: 'minh_tv', content: 'Màn Dell U2723D, mua ở Di Động Việt, giá oke lắm bạn!' },
    { post: posts[3],  username: 'aptech_vietnam', content: 'React là nền tảng quan trọng! Chúc mừng bạn đã chinh phục 🚀' },
    { post: posts[3],  username: 'thinh_pb', content: 'React xong học Next.js luôn đi, cơ hội việc làm nhiều hơn!' },
    { post: posts[5],  username: 'alice',   content: 'Khoa chụp đẹp lắm! Học nhiếp ảnh ở đâu vậy?' },
    { post: posts[5],  username: 'huyen_bm', content: 'Tông màu hoàng hôn xử lý rất đẹp 🌅' },
    { post: posts[7],  username: 'fiona',   content: 'OOTD simple mà chic lắm Ngân ơi ✨' },
    { post: posts[7],  username: 'alice',   content: 'Màu outfit hôm nay hợp với da bạn lắm 🌸' },
    { post: posts[10], username: 'bob',     content: 'Latte art lần đầu mà đẹp vậy Tuấn ơi! 😲☕' },
    { post: posts[10], username: 'alice',   content: 'Nhìn ngon quá, cho mình order 1 ly được không 😄' },
    { post: posts[13], username: 'ethan',   content: '120kg squat là đỉnh rồi! PR tiếp tục nha 💪' },
    { post: posts[13], username: 'alice',   content: 'Ngưỡng mộ lắm Hùng ơi, mình không dám nghĩ tới 😂' },
    { post: posts[14], username: 'charlie', content: 'Hà Giang đẹp không? Mình đang plan đi tháng 10' },
    { post: posts[14], username: 'hana',    content: 'Tỉnh thành 15 rồi, target tiếp theo là gì vậy Mai? 🗺️' },
    { post: posts[16], username: 'bob',     content: 'Trai tài! Beat này nghe chill lắm Quang ơi 🎵' },
    { post: posts[20], username: 'alice',   content: 'Ảnh cưới đẹp quá Huyền ơi! Cặp đôi dễ thương thật 📸' },
    { post: posts[21], username: 'ethan',   content: 'Client transformation đỉnh lắm! Chứng minh PT worth it 💪' },
    // Video posts
    { post: posts[22], username: 'alice',   content: 'Hội An ơi mình nhớ quá 😭 Trang quay đẹp lắm!' },
    { post: posts[22], username: 'charlie', content: 'Clip này nhìn là nhớ Hội An liền 🏮' },
    { post: posts[23], username: 'diana',   content: 'Đồ ăn nhìn ngon mà cách làm gọn lắm, pro thật!' },
    { post: posts[23], username: 'hana',    content: 'Clip này mình xem mà thèm ghê, đang ăn kiêng mà 😭' },
    { post: posts[24], username: 'hana',    content: 'Biển sáng sớm bình yên quá Mai ơi 🌊' },
    { post: posts[24], username: 'charlie', content: 'Vũng Tàu gần mà đẹp, cuối tuần này đi thôi!' },
  ];

  for (var n = 0; n < newPostComments.length; n++) {
    var nc = newPostComments[n];
    var nu = allMap[nc.username];
    if (!nu || !nc.post) continue;
    await Comment.create({ postId: nc.post._id, userId: nu._id, content: nc.content });
    await Post.findByIdAndUpdate(nc.post._id, { $inc: { commentsCount: 1 } });
    commented++;
  }

  console.log('✓ Comments: thêm ' + commented);
}

// ─────────────────────────────────────────────
// 5. TẠO 2 GROUP CONVERSATIONS
// ─────────────────────────────────────────────
async function seedExtraGroups(allMap) {
  // Group 1: food lovers — linh, nam, diana, hana, long
  var group1 = await Conversation.create({
    type:           'group',
    name:           'Hội mê ẩm thực 🍜',
    createdBy:      allMap['diana']._id,
    lastActivityAt: new Date(),
  });
  await ConversationMember.create([
    { conversationId: group1._id, userId: allMap['diana']._id,    role: 'admin',  status: 'accepted' },
    { conversationId: group1._id, userId: allMap['linh_nt']._id,  role: 'member', status: 'accepted' },
    { conversationId: group1._id, userId: allMap['nam_vd']._id,   role: 'member', status: 'accepted' },
    { conversationId: group1._id, userId: allMap['hana']._id,     role: 'member', status: 'accepted' },
    { conversationId: group1._id, userId: allMap['long_nq']._id,  role: 'member', status: 'accepted' },
  ]);

  // Group 2: travel crew — charlie, trang, mai, alice, khoa
  var group2 = await Conversation.create({
    type:           'group',
    name:           'Travel crew 2025 ✈️',
    createdBy:      allMap['charlie']._id,
    lastActivityAt: new Date(),
  });
  await ConversationMember.create([
    { conversationId: group2._id, userId: allMap['charlie']._id,  role: 'admin',  status: 'accepted' },
    { conversationId: group2._id, userId: allMap['trang_ch']._id, role: 'member', status: 'accepted' },
    { conversationId: group2._id, userId: allMap['mai_ln']._id,   role: 'member', status: 'accepted' },
    { conversationId: group2._id, userId: allMap['alice']._id,    role: 'member', status: 'accepted' },
    { conversationId: group2._id, userId: allMap['khoa_nd']._id,  role: 'member', status: 'accepted' },
  ]);

  console.log('✓ Tạo 2 group conversations (Hội ẩm thực + Travel crew)');
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối MongoDB:', MONGO_URI);

  var allUsers = await User.find({}).lean();
  if (allUsers.length === 0) {
    console.error('\n❌ Không có user. Chạy seedAll.js trước!');
    process.exit(1);
  }

  var allMap = {};
  allUsers.forEach(function (u) { allMap[u.username] = u; });

  var oldPosts = await Post.find({}).lean();
  console.log('Hiện có ' + allUsers.length + ' users, ' + oldPosts.length + ' posts\n');

  console.log('--- Tạo 20 users mới ---');
  var extra = await seedExtraUsers();

  // Cập nhật allMap với users mới
  extra.forEach(function (u) { allMap[u.username] = u; });

  console.log('\n--- Follows ---');
  await seedExtraFollows(allMap, extra);

  console.log('\n--- Posts ---');
  var newPosts = await seedExtraPosts(extra, allMap);

  console.log('\n--- Likes + Comments ---');
  await seedExtraInteractions(allMap, extra, newPosts, oldPosts);

  console.log('\n--- Group chats ---');
  await seedExtraGroups(allMap);

  console.log('\n' + '='.repeat(55));
  console.log('SEED EXTRA USERS HOÀN TẤT');
  console.log('='.repeat(55));
  console.log('  Users mới : 20 (password: User@123)');
  console.log('  Posts mới : 25 (22 ảnh + 3 video)');
  console.log('  Follows   : accepted + pending (diana)');
  console.log('  Groups    : Hội ẩm thực 🍜 + Travel crew ✈️');
  console.log('='.repeat(55));

  await mongoose.disconnect();
  console.log('\nHoàn tất.\n');
}

main().catch(function (err) {
  console.error('\nSeed thất bại:', err.message);
  process.exit(1);
});
