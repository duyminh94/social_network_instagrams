// seedAptech.js
// Tạo tài khoản Aptech + 2 reels quảng cáo
//
// Chạy: node server/seedAptech.js
//
// Yêu cầu: đã chạy seedAll.js trước
// Script này KHÔNG xóa dữ liệu cũ — chỉ thêm mới hoặc cập nhật tài khoản Aptech
//
// Trước khi chạy:
//   1. Upload logo Aptech lên Cloudinary
//   2. Điền URL vào biến APTECH_AVATAR_URL bên dưới

require('dotenv').config({ path: __dirname + '/.env' });
var mongoose = require('mongoose');

var User = require('./models/User');
var Reel = require('./models/Reel');
var ReelComment = require('./models/ReelComment');
var Like = require('./models/Like');
var Report = require('./models/Report');
var AdminLog = require('./models/AdminLog');
var { extractHashtags } = require('./utils/hashtags');

var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/instagrams';

// ─────────────────────────────────────────────────────────
// CẤU HÌNH — điền URL logo Aptech từ Cloudinary
// ─────────────────────────────────────────────────────────
var CLOUD_NAME = 'dclmpp1pt';

// Upload logo Aptech lên Cloudinary → copy URL → paste vào đây
var APTECH_AVATAR_URL = 'DIEN_URL_LOGO_APTECH_VAO_DAY';

// 2 video Aptech đã có trong Cloudinary
var APTECH_VIDEO_1 = '1781837808278_eqvnh5';  // Aptech tuyển dụng (video 2)
var APTECH_VIDEO_2 = '1781837967242_og30cv';  // Aptech 2 (video 9)
var APTECH_VIDEO_3 = '1781844405177_sthlhw';  // Aptech 3

function cloudinaryUrl(publicId) {
  return 'https://res.cloudinary.com/' + CLOUD_NAME + '/video/upload/' + publicId + '.mp4';
}

// ─────────────────────────────────────────────
// 1. TẠO / CẬP NHẬT TÀI KHOẢN APTECH
// ─────────────────────────────────────────────
async function seedAptechUser() {
  // Kiểm tra đã tồn tại chưa
  var existing = await User.findOne({ username: 'aptech_vietnam' });

  if (existing) {
    // Cập nhật avatar nếu đã tồn tại
    await User.findByIdAndUpdate(existing._id, {
      avatarUrl: APTECH_AVATAR_URL,
      bio: 'Aptech Computer Education Vietnam 🎓 | Đào tạo CNTT chuyên nghiệp | aptechvietnam.com.vn',
      fullName: 'Aptech Vietnam',
      isTrusted: true,
    });
    console.log('\n✓ Cập nhật tài khoản Aptech đã tồn tại (id: ' + existing._id + ')');
    return await User.findOne({ username: 'aptech_vietnam' });
  }

  var user = await User.create({
    username:     'aptech_vietnam',
    email:        'aptech@aptechvietnam.com.vn',
    fullName:     'Aptech Vietnam',
    passwordHash: 'Aptech@123',
    role:         'user',
    isActive:     true,
    isTrusted:    true,  // tick xanh
    avatarUrl:    APTECH_AVATAR_URL,
    bio:          'Aptech Computer Education Vietnam 🎓 | Đào tạo CNTT chuyên nghiệp | aptechvietnam.com.vn',
  });

  console.log('\n✓ Tạo tài khoản: aptech_vietnam / Aptech@123 (tick xanh)');
  return user;
}

// ─────────────────────────────────────────────
// 2. XÓA REELS CŨ CỦA APTECH (nếu có) + TẠO MỚI
// ─────────────────────────────────────────────
async function seedAptechReels(user) {
  // Xóa reels cũ cùng dữ liệu phụ thuộc để không tạo document mồ côi khi chạy lại.
  var oldReels = await Reel.find({ userId: user._id }).select('_id').lean();
  var oldReelIds = oldReels.map(function (reel) { return reel._id; });
  var oldReports = await Report.find({ targetType: 'reel', targetId: { $in: oldReelIds } }).select('_id').lean();
  await Promise.all([
    ReelComment.deleteMany({ reelId: { $in: oldReelIds } }),
    Like.deleteMany({ targetType: 'reel', targetId: { $in: oldReelIds } }),
    Report.deleteMany({ targetType: 'reel', targetId: { $in: oldReelIds } }),
    AdminLog.deleteMany({ targetType: 'report', targetId: { $in: oldReports.map(function (report) { return report._id; }) } }),
  ]);
  var deleted = await Reel.deleteMany({ userId: user._id });
  if (deleted.deletedCount > 0) {
    console.log('  → Đã xóa ' + deleted.deletedCount + ' reels cũ của Aptech');
  }

  var reelData = [
    {
      videoUrl:  cloudinaryUrl(APTECH_VIDEO_1),
      caption:   '100% hỗ trợ giới thiệu việc làm cho sinh viên sau khi tốt nghiệp 💼🎓 #aptech #it #career #education',
      duration:  15,
    },
    {
      videoUrl:  cloudinaryUrl(APTECH_VIDEO_2),
      caption:   'Aptech Computer Education — nơi bắt đầu hành trình CNTT của bạn 🚀 #aptech #coding #vietnam #student',
      duration:  30,
    },
    {
      videoUrl:  cloudinaryUrl(APTECH_VIDEO_3),
      caption:   'Môi trường học tập hiện đại, giảng viên tận tâm tại Aptech 👨‍🏫💻 #aptech #it #education #vietnam',
      duration:  20,
    },
  ];

  var reels = [];

  for (var i = 0; i < reelData.length; i++) {
    var rd = reelData[i];
    var reel = await Reel.create({
      userId:   user._id,
      videoUrl: rd.videoUrl,
      caption:  rd.caption,
      hashtags: extractHashtags(rd.caption),
      duration: rd.duration,
    });
    reels.push(reel);
    console.log('  ✓ Reel ' + (i + 1) + ': ' + rd.caption.substring(0, 55) + '...');
  }

  // Cập nhật postsCount (optional, nếu muốn hiển thị đúng trên profile)
  await User.findByIdAndUpdate(user._id, { $inc: { postsCount: reels.length } });

  console.log('\n✓ Tạo ' + reels.length + ' reels cho Aptech');
  return reels;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối MongoDB:', MONGO_URI);

  if (APTECH_AVATAR_URL === 'DIEN_URL_LOGO_APTECH_VAO_DAY') {
    console.log('\n⚠  APTECH_AVATAR_URL chưa được điền!');
    console.log('   Upload logo lên Cloudinary rồi paste URL vào biến APTECH_AVATAR_URL trong file này.');
    console.log('   Sẽ seed không có avatar — tiếp tục...\n');
  }

  var user  = await seedAptechUser();
  await seedAptechReels(user);

  console.log('\n' + '='.repeat(55));
  console.log('SEED APTECH HOÀN TẤT');
  console.log('='.repeat(55));
  console.log('  Username : aptech_vietnam');
  console.log('  Password : Aptech@123');
  console.log('  Tick xanh: có');
  console.log('  Avatar   : ' + (APTECH_AVATAR_URL === 'DIEN_URL_LOGO_APTECH_VAO_DAY' ? '❌ chưa có — cần điền URL' : '✓ ' + APTECH_AVATAR_URL));
  console.log('  Reels    : 2 video Aptech');
  console.log('='.repeat(55));

  await mongoose.disconnect();
  console.log('\nHoàn tất.\n');
}

main().catch(function (err) {
  console.error('\nSeed Aptech thất bại:', err.message);
  process.exit(1);
});
