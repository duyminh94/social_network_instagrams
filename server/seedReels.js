// seedReels.js
// Seed dữ liệu mẫu cho tính năng Reels — 10 video từ Cloudinary
//
// Chạy: node server/seedReels.js
//
// Yêu cầu: đã chạy seedAll.js trước (cần có users trong DB)
// Script này CHỈ XÓA Reel + ReelComment + Like(reel/reelComment),
// KHÔNG đụng đến users, posts, hay dữ liệu khác.
//
// Trước khi chạy: điền public_id thật của 10 video vào mảng VIDEO_IDS bên dưới

require('dotenv').config({ path: __dirname + '/.env' });
var mongoose = require('mongoose');

var User        = require('./models/User');
var Reel        = require('./models/Reel');
var ReelComment = require('./models/ReelComment');
var ReelView    = require('./models/ReelView');
var Like        = require('./models/Like');
var Report      = require('./models/Report');
var AdminLog    = require('./models/AdminLog');
var { extractHashtags } = require('./utils/hashtags');

var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/instagrams';

// ─────────────────────────────────────────────────────────
// CẤU HÌNH: điền public_id thật của 10 video Cloudinary
// Cloud name: dclmpp1pt
// URL pattern: https://res.cloudinary.com/dclmpp1pt/video/upload/{id}.mp4
// ─────────────────────────────────────────────────────────
var CLOUD_NAME = 'dclmpp1pt';

var VIDEO_IDS = [
  '13940556-uhd_3840_2160_24fps_yeionf',  // [0] Hội An về đêm
  '1781837808278_eqvnh5',                  // [1] Aptech tuyển dụng
  '1781837649678_ywfdwy',                  // [2] Hoạt hình anime
  '1781837577759_ojy3ez',                  // [3] Bóng đá Việt Nam
  '8479667-hd_1080_1920_25fps_padz5c',    // [4] Chế biến đồ ăn đường phố
  '8479675-hd_1080_1920_25fps_qgqqyl',    // [5] Ăn uống / food vlog
  '13701191_1920_1080_30fps_cqovdi',      // [6] Phong cảnh làng quê
  '18653458-uhd_2560_1440_30fps_d23yjg',  // [7] Ninh Bình núi non
  '1781837967242_og30cv',                  // [8] Aptech 2
  '12133134_2560_1440_60fps_l8tr8e',      // [9] Biển Vũng Tàu
];

function cloudinaryUrl(publicId) {
  return 'https://res.cloudinary.com/' + CLOUD_NAME + '/video/upload/' + publicId + '.mp4';
}

// ─────────────────────────────────────────────
// 1. XÓA DỮ LIỆU REELS CŨ
// ─────────────────────────────────────────────
async function clearReels() {
  console.log('\nXóa dữ liệu reels cũ...');
  var oldReports = await Report.find({ targetType: 'reel' }).select('_id').lean();
  await AdminLog.deleteMany({ targetType: 'report', targetId: { $in: oldReports.map(function (report) { return report._id; }) } });
  await Report.deleteMany({ targetType: 'reel' });
  await Like.deleteMany({ targetType: { $in: ['reel', 'reelComment'] } });
  await ReelComment.deleteMany({});
  await ReelView.deleteMany({});
  await Reel.deleteMany({});
  console.log('  ✓ Đã xóa Reel, ReelComment, ReelView, Like(reel), Report(reel)');
}

// ─────────────────────────────────────────────
// 2. TẠO REELS
// ─────────────────────────────────────────────
async function seedReels(users) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  // 10 reels — mỗi cái gắn với 1 user, caption phù hợp nội dung video
  var reelData = [
    {
      username: 'charlie',
      videoIdx: 0,
      caption: 'Hội An về đêm — ánh đèn lung linh phản chiếu xuống mặt nước 🏮✨ #hoian #vietnam #travel',
      duration: 19,
    },
    {
      username: 'bob',
      videoIdx: 1,
      caption: 'Cơ hội việc làm dành cho sinh viên — 100% hỗ trợ giới thiệu! 💼 #jobs #student #career',
      duration: 15,
    },
    {
      username: 'ethan',
      videoIdx: 2,
      caption: 'Phim hoạt hình này quá hài 😂 ai xem rồi thì biết #anime #funny #entertainment',
      duration: 22,
    },
    {
      username: 'george',
      videoIdx: 3,
      caption: 'Đội tuyển Việt Nam vô địch! Tự hào lắm 🇻🇳⚽ #vietnam #football #sport',
      duration: 17,
    },
    {
      username: 'diana',
      videoIdx: 4,
      caption: 'Món ăn đường phố Việt Nam — đơn giản mà đậm đà 🍜 #streetfood #vietnamesefood #foodie',
      duration: 11,
    },
    {
      username: 'hana',
      videoIdx: 5,
      caption: 'Ăn ngon thì phải thưởng thức đúng cách 😋 #food #mukbang #eating',
      duration: 9,
    },
    {
      username: 'charlie',
      videoIdx: 6,
      caption: 'Đường làng xanh mát — bình yên đến lạ 🌿 #village #countryside #vietnam',
      duration: 21,
    },
    {
      username: 'alice',
      videoIdx: 7,
      caption: 'Ninh Bình nhìn từ trên cao — đẹp như tranh vẽ 🏔️🌊 #ninhbinh #landscape #travel',
      duration: 20,
    },
    {
      username: 'fiona',
      videoIdx: 8,
      caption: 'Aptech mở cửa cơ hội — môi trường học tập chuyên nghiệp 🎓 #aptech #education #career',
      duration: 30,
    },
    {
      username: 'alice',
      videoIdx: 9,
      caption: 'Biển Vũng Tàu buổi sáng — sóng vỗ bình yên quá 🌊☀️ #vungtau #beach #travel',
      duration: 25,
    },
  ];

  var reels = [];

  for (var i = 0; i < reelData.length; i++) {
    var rd = reelData[i];
    var user = map[rd.username];

    if (!user) {
      console.log('  ⚠ Không tìm thấy user: ' + rd.username + ' — bỏ qua');
      continue;
    }

    var reel = await Reel.create({
      userId:   user._id,
      videoUrl: cloudinaryUrl(VIDEO_IDS[rd.videoIdx]),
      caption:  rd.caption,
      hashtags: extractHashtags(rd.caption),
      duration: rd.duration,
    });

    reels.push(reel);
    process.stdout.write('.');
  }

  console.log('\n\n✓ Tạo ' + reels.length + ' reels');
  return reels;
}

// ─────────────────────────────────────────────
// 3. TẠO REEL COMMENTS
// ─────────────────────────────────────────────
async function seedReelComments(users, reels) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  if (reels.length < 10) {
    console.log('\n⚠ Không đủ reels để seed comments');
    return [];
  }

  var commentData = [
    // reel[0]: Hội An — charlie's
    { reelIdx: 0, username: 'alice',   content: 'Hội An đẹp quá! Mình muốn đến đây lắm 😍' },
    { reelIdx: 0, username: 'bob',     content: 'Lần trước đi rồi mà nhìn clip này muốn đi lại 🏮' },
    { reelIdx: 0, username: 'hana',    content: 'Ánh đèn lồng đẹp mê hồn Charlie ơi!' },
    // reel[1]: Job promo — bob's
    { reelIdx: 1, username: 'alice',   content: 'Share cho mấy đứa bạn cần việc làm luôn!' },
    { reelIdx: 1, username: 'ethan',   content: 'Thông tin hữu ích lắm 👍' },
    // reel[2]: Animation — ethan's
    { reelIdx: 2, username: 'bob',     content: 'Clip này hài vãi 😂😂😂' },
    { reelIdx: 2, username: 'charlie', content: 'Xem lần 3 rồi vẫn cười 🤣' },
    { reelIdx: 2, username: 'fiona',   content: 'Ai làm clip này vậy trời 😂' },
    // reel[3]: Football — george's
    { reelIdx: 3, username: 'charlie', content: 'Tự hào Việt Nam quá! 🇻🇳🔥' },
    { reelIdx: 3, username: 'ethan',   content: 'Vô địch!! Cả phòng mình hét lên hôm đó 😭🎉' },
    { reelIdx: 3, username: 'bob',     content: 'Khoảnh khắc lịch sử!' },
    // reel[4]: Street food — diana's
    { reelIdx: 4, username: 'alice',   content: 'Nhìn là thèm rồi 🤤 Diana ở đâu vậy?' },
    { reelIdx: 4, username: 'hana',    content: 'Đồ ăn đường phố VN số 1! 🍜' },
    { reelIdx: 4, username: 'charlie', content: 'Cho mình địa chỉ với 😭' },
    // reel[5]: Mukbang — hana's
    { reelIdx: 5, username: 'fiona',   content: 'Hana ăn ngon quá mình cũng thèm theo 😋' },
    { reelIdx: 5, username: 'alice',   content: 'Sound ASMR nghe chill vãi 🤤' },
    // reel[6]: Countryside — charlie's
    { reelIdx: 6, username: 'hana',    content: 'Đường làng này quá bình yên 🌿' },
    { reelIdx: 6, username: 'alice',   content: 'Không khí trong lành nhìn mà thèm Charlie ơi!' },
    { reelIdx: 6, username: 'ethan',   content: 'Phải đi một chuyến thôi 🏍️' },
    // reel[7]: Ninh Binh — alice's
    { reelIdx: 7, username: 'charlie', content: 'Ninh Bình đẹp thật! Mình đi năm ngoái rồi mà vẫn muốn quay lại' },
    { reelIdx: 7, username: 'hana',    content: 'Góc quay này chuẩn quá Alice 📷' },
    { reelIdx: 7, username: 'fiona',   content: 'Đẹp như tranh sơn dầu luôn 🎨' },
    // reel[8]: Abstract art — fiona's
    { reelIdx: 8, username: 'alice',   content: 'Fiona làm cái này luôn à?! Tài năng thật sự 🎨💜' },
    { reelIdx: 8, username: 'charlie', content: 'Motion graphic đỉnh quá!' },
    // reel[9]: Cyberpunk — alice's
    { reelIdx: 9, username: 'fiona',   content: 'Aesthetic này mình thích lắm! Ở đâu vậy?' },
    { reelIdx: 9, username: 'bob',     content: 'Phố đêm kiểu này có nhiều ở Sài Gòn không?' },
    { reelIdx: 9, username: 'charlie', content: 'Vibe cyberpunk cực chill 🌃' },
  ];

  var comments = [];

  for (var i = 0; i < commentData.length; i++) {
    var cd = commentData[i];
    var user = map[cd.username];

    if (!user || !reels[cd.reelIdx]) continue;

    var comment = await ReelComment.create({
      reelId:  reels[cd.reelIdx]._id,
      userId:  user._id,
      content: cd.content,
    });

    await Reel.findByIdAndUpdate(reels[cd.reelIdx]._id, { $inc: { commentsCount: 1 } });
    comments.push(comment);
  }

  // Thêm vài reply
  // comments[0] = alice comment trên reel[0] (Hội An)
  // comments[11] = alice comment trên reel[4] (street food)
  if (comments.length > 11 && map['charlie'] && map['diana']) {
    var reply1 = await ReelComment.create({
      reelId:   reels[0]._id,
      userId:   map['charlie']._id,
      parentId: comments[0]._id,
      content:  'Đi đi Alice! Mình dẫn đường cho, biết chỗ ngon lắm 🏮',
    });
    await Reel.findByIdAndUpdate(reels[0]._id, { $inc: { commentsCount: 1 } });
    comments.push(reply1);

    var reply2 = await ReelComment.create({
      reelId:   reels[4]._id,
      userId:   map['diana']._id,
      parentId: comments[11]._id,
      content:  'Phố Huỳnh Văn Bánh quận 3 đó Alice, ghé thử đi! 🍜',
    });
    await Reel.findByIdAndUpdate(reels[4]._id, { $inc: { commentsCount: 1 } });
    comments.push(reply2);
  }

  console.log('\n✓ Tạo ' + comments.length + ' reel comments (kể cả replies)');
  return comments;
}

// ─────────────────────────────────────────────
// 4. TẠO LIKES CHO REELS
// ─────────────────────────────────────────────
async function seedReelLikes(users, reels) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  // [username, reelIndex]
  var reelLikePairs = [
    ['alice',   0],
    ['bob',     0],
    ['hana',    0],
    ['alice',   1],
    ['ethan',   1],
    ['bob',     2],
    ['charlie', 2],
    ['alice',   2],
    ['charlie', 3],
    ['ethan',   3],
    ['bob',     3],
    ['alice',   4],
    ['hana',    4],
    ['fiona',   5],
    ['alice',   5],
    ['hana',    6],
    ['alice',   6],
    ['ethan',   6],
    ['charlie', 7],
    ['hana',    7],
    ['fiona',   7],
    ['alice',   8],
    ['charlie', 8],
    ['bob',     8],
    ['fiona',   9],
    ['bob',     9],
    ['charlie', 9],
    ['hana',    9],
  ];

  var count = 0;

  for (var i = 0; i < reelLikePairs.length; i++) {
    var username = reelLikePairs[i][0];
    var reelIdx  = reelLikePairs[i][1];
    var user     = map[username];
    var reel     = reels[reelIdx];

    if (!user || !reel) continue;

    await Like.create({ userId: user._id, targetType: 'reel', targetId: reel._id });
    await Reel.findByIdAndUpdate(reel._id, { $inc: { likesCount: 1 } });
    count++;
  }

  console.log('\n✓ Tạo ' + count + ' reel likes');
}

// ─────────────────────────────────────────────
// 5. TẠO REEL VIEWS — tín hiệu "thích xem" cho gợi ý For-You (getReels)
//    completed=true nghĩa là user xem hết reel → định hình feed cá nhân hoá
// ─────────────────────────────────────────────
async function seedReelViews(users, reels) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  // [username, reelIndex] — coi như đã xem hết. Thiết kế để có 2 tín hiệu:
  //   - affinity: alice & charlie cùng xem hết các reel du lịch/phong cảnh (0,6,7,9)
  //   - collaborative: nhóm xem giống nhau → gợi ý chéo
  var viewPairs = [
    ['alice', 0], ['alice', 6], ['alice', 7], ['alice', 9],
    ['charlie', 0], ['charlie', 7], ['charlie', 9],
    ['bob', 1], ['bob', 3], ['bob', 9],
    ['hana', 4], ['hana', 5], ['hana', 6], ['hana', 0],
    ['ethan', 2], ['ethan', 3],
    ['fiona', 8], ['fiona', 7], ['fiona', 5],
    ['diana', 4], ['diana', 5],
  ];

  var count = 0;
  for (var i = 0; i < viewPairs.length; i++) {
    var user = map[viewPairs[i][0]];
    var reel = reels[viewPairs[i][1]];
    if (!user || !reel) continue;
    // Bỏ reel của chính mình — không định hình gợi ý (giống recordReelView)
    if (reel.userId.toString() === user._id.toString()) continue;

    var durMs = (reel.duration || 15) * 1000;
    await ReelView.create({
      userId:    user._id,
      reelId:    reel._id,
      watchedMs: Math.round(durMs * 0.9),
      completed: true,
    });
    count++;
  }

  console.log('\n✓ Tạo ' + count + ' reel views (tín hiệu "thích xem")');
}

async function seedReelReports(users, reels) {
  var map = {};
  users.forEach(function (user) { map[user.username] = user; });
  var reportDocs = [
    {
      reporterId: map['diana']._id,
      targetId: reels[2]._id,
      targetType: 'reel',
      reason: 'inappropriate',
      description: 'Reel có hình ảnh không phù hợp với người xem nhỏ tuổi.',
      status: 'pending',
    },
    {
      reporterId: map['hana']._id,
      targetId: reels[3]._id,
      targetType: 'reel',
      reason: 'violence',
      description: 'Cần kiểm tra lại cảnh quay trong Reel.',
      status: 'resolved',
      reviewedBy: map['mod']._id,
      resolutionAction: 'no_action',
      resolutionNote: 'Đã xem toàn bộ Reel, nội dung không vi phạm.',
      reviewedAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  ];
  var reports = await Report.create(reportDocs);
  await AdminLog.create({
    adminId: map['mod']._id,
    action: 'handle_report',
    targetId: reports[1]._id,
    targetType: 'report',
    note: reports[1].resolutionNote,
  });
  console.log('\n✓ Tạo ' + reportDocs.length + ' reel reports (1 pending, 1 processed)');
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối MongoDB:', MONGO_URI);

  // Lấy users từ DB (cần đã chạy seedAll trước)
  var users = await User.find({}).lean();
  if (users.length === 0) {
    console.error('\n❌ Không có user trong DB. Chạy seedAll.js trước!');
    process.exit(1);
  }
  console.log('\n✓ Tìm thấy ' + users.length + ' users trong DB');

  await clearReels();

  var reels    = await seedReels(users);
  var comments = await seedReelComments(users, reels);
  await seedReelLikes(users, reels);
  await seedReelViews(users, reels);
  await seedReelReports(users, reels);

  // Tổng kết
  console.log('\n' + '='.repeat(55));
  console.log('SEED REELS HOÀN TẤT');
  console.log('='.repeat(55));
  reels.forEach(function (r, idx) {
    console.log('  Reel ' + (idx + 1) + ': ' + r.caption.substring(0, 50) + '...');
  });
  console.log('\n⚠  Nhớ thay VIDEO_IDS[] bằng public_id thật từ Cloudinary!');
  console.log('   URL pattern: https://res.cloudinary.com/' + CLOUD_NAME + '/video/upload/{id}.mp4');
  console.log('='.repeat(55));

  await mongoose.disconnect();
  console.log('\nHoàn tất.\n');
}

main().catch(function (err) {
  console.error('\nSeed reels thất bại:', err.message);
  process.exit(1);
});
