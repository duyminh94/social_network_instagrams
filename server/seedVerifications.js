// seedVerifications.js
// Tạo LỊCH SỬ xác minh tích xanh khớp với luồng OTP mới (verificationController.js).
//
// Chạy: node server/seedVerifications.js   (chạy SAU seedAll.js + seedBulkUsers.js)
// Script XÓA hết VerificationRequest cũ rồi tạo lại → chạy nhiều lần vẫn sạch.
//
// Luồng tích xanh hiện tại KHÔNG còn admin duyệt thủ công nữa:
//   user đủ điều kiện → bấm xin tích → nhận OTP qua email → tự xác minh (isTrusted=true)
//   → hệ thống tự ghi 1 VerificationRequest status='approved' làm lịch sử.
//
// Vì vậy seed này chỉ tạo:
//   - VerificationRequest 'approved' cho MỌI user đang có tích xanh (isTrusted=true)
//     để trang quản lý xác minh của admin có dữ liệu lịch sử "đã cấp".
//   - KHÔNG tạo 'pending'/'rejected' (luồng cũ admin-duyệt đã bỏ).
//
// Các tài khoản ĐỦ ĐIỀU KIỆN nhưng chưa verify (tạo bởi seedBulkUsers.js) được để
//   nguyên — không tạo request — để bạn tự test luồng OTP trực tiếp.

require('dotenv').config({ path: __dirname + '/.env' });
var mongoose = require('mongoose');

var User                = require('./models/User');
var VerificationRequest = require('./models/VerificationRequest');

var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/instagrams';

// Ngưỡng điều kiện xin tích (đồng bộ với verificationController.js)
var MIN_POSTS     = 20;
var MIN_FOLLOWERS = 100;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối MongoDB:', MONGO_URI);

  // Xóa lịch sử cũ để seed lại sạch
  await VerificationRequest.deleteMany({});
  console.log('Đã xóa VerificationRequest cũ.');

  // ── 1. Tạo lịch sử 'approved' cho mọi user đang có tích xanh ──
  var verified = await User.find({ role: 'user', isTrusted: true })
    .select('username').sort({ createdAt: 1 }).lean();

  var created = 0;
  for (var i = 0; i < verified.length; i++) {
    await VerificationRequest.create({
      userId:     verified[i]._id,
      reason:     'Tự động xác minh qua OTP',
      status:     'approved',
      reviewNote: 'Hệ thống tự cấp sau khi xác minh OTP thành công',
      reviewedAt: new Date(),
    });
    created++;
    console.log('  + approved (lịch sử OTP): @' + verified[i].username);
  }

  // ── 2. Liệt kê tài khoản ĐỦ ĐIỀU KIỆN nhưng chưa verify (để test OTP) ──
  var eligible = await User.find({
    role: 'user',
    isTrusted: { $ne: true },
    isBanned: { $ne: true },
    postsCount: { $gte: MIN_POSTS },
    followersCount: { $gte: MIN_FOLLOWERS },
    fullName: { $ne: '' },
    avatarUrl: { $ne: '' },
    bio: { $ne: '' },
  }).select('username postsCount followersCount email').lean();

  console.log('\n' + '='.repeat(58));
  console.log('  LỊCH SỬ TÍCH XANH: tạo ' + created + ' bản ghi "approved"');
  console.log('='.repeat(58));
  console.log('  Tài khoản ĐỦ ĐIỀU KIỆN — sẵn sàng test luồng OTP:');
  if (eligible.length === 0) {
    console.log('    (chưa có — hãy chạy seedBulkUsers.js trước)');
  } else {
    eligible.forEach(function (u) {
      console.log('    @' + u.username + '  (bài:' + u.postsCount +
                  ' follower:' + u.followersCount + ') → OTP gửi tới: ' + u.email);
    });
  }
  console.log('='.repeat(58));

  await mongoose.disconnect();
  console.log('\nHoàn tất.\n');
}

main().catch(function (err) {
  console.error('\nSeed thất bại:', err.message);
  process.exit(1);
});
