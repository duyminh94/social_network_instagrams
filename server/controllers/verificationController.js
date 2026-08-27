// verificationController.js
// Luồng xin cấp tích xanh tự động qua OTP:
//   1. GET  /check        — kiểm tra điều kiện, trả checklist pass/fail
//   2. POST /request-otp  — nếu đủ điều kiện, tạo OTP gửi về email
//   3. POST /confirm-otp  — xác minh OTP, cấp isTrusted = true ngay

const crypto = require('crypto');
const VerificationRequest = require('../models/VerificationRequest');
const User = require('../models/User');
const { sendVerifyOtpEmail } = require('../utils/mailer');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET /api/verification/check
// Trả checklist điều kiện để hiển thị trước khi gửi OTP
async function checkEligibility(req, res, next) {
  try {
    var userId = req.user.id;
    var user = await User.findById(userId).select(
      'fullName avatarUrl bio postsCount followersCount isBanned isTrusted createdAt'
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    if (user.isTrusted) {
      return res.json({ isTrusted: true, allPass: false, checks: {} });
    }

    var oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    var checks = {
      fullName:       { pass: !!(user.fullName && user.fullName.trim()) },
      avatarUrl:      { pass: !!(user.avatarUrl && user.avatarUrl.trim()) },
      bio:            { pass: !!(user.bio && user.bio.trim()) },
      postsCount:     { pass: user.postsCount >= 20, current: user.postsCount },
      followersCount: { pass: user.followersCount >= 100, current: user.followersCount },
      notBanned:      { pass: !user.isBanned },
      accountAge:     { pass: user.createdAt <= oneMonthAgo },
    };

    var allPass = Object.values(checks).every(function (c) { return c.pass; });

    return res.json({ isTrusted: false, allPass: allPass, checks: checks });
  } catch (error) {
    return next(error);
  }
}

// POST /api/verification/request-otp
// Kiểm tra lại điều kiện, tạo OTP 6 chữ số, gửi email, lưu hash vào user
async function requestVerifyOtp(req, res, next) {
  try {
    var userId = req.user.id;
    var user = await User.findById(userId).select(
      'fullName avatarUrl bio postsCount followersCount isBanned isTrusted createdAt email username verifyOtpSentAt'
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
    if (user.isTrusted) return res.status(400).json({ message: 'Tài khoản đã được xác minh' });

    // Rate limit: chờ ít nhất 60 giây giữa các lần gửi OTP
    if (user.verifyOtpSentAt) {
      var secondsSinceLast = (Date.now() - new Date(user.verifyOtpSentAt).getTime()) / 1000;
      if (secondsSinceLast < 60) {
        return res.status(429).json({
          message: 'Vui lòng chờ ' + Math.ceil(60 - secondsSinceLast) + ' giây trước khi gửi lại',
          waitSeconds: Math.ceil(60 - secondsSinceLast),
        });
      }
    }

    // Kiểm tra lại điều kiện
    var oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    var failed = [];
    if (!(user.fullName && user.fullName.trim())) failed.push('Chưa điền họ và tên');
    if (!(user.avatarUrl && user.avatarUrl.trim())) failed.push('Chưa có ảnh đại diện');
    if (!(user.bio && user.bio.trim())) failed.push('Chưa điền tiểu sử');
    if (user.postsCount < 20) failed.push('Chưa đủ 20 bài viết');
    if (user.followersCount < 100) failed.push('Chưa đủ 100 người theo dõi');
    if (user.isBanned) failed.push('Tài khoản đang bị khoá');
    if (user.createdAt > oneMonthAgo) failed.push('Tài khoản chưa đủ 1 tháng');

    if (failed.length > 0) {
      return res.status(400).json({ message: 'Chưa đủ điều kiện: ' + failed.join(', ') });
    }

    var otp = generateOtp();
    var hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    user.verifyOtp = hashedOtp;
    user.verifyOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    user.verifyOtpSentAt = new Date();
    await user.save();

    await sendVerifyOtpEmail(user.email, user.username, otp);

    return res.json({ message: 'Mã OTP đã được gửi đến email của bạn' });
  } catch (error) {
    return next(error);
  }
}

// POST /api/verification/confirm-otp
// Body: { otp } — xác minh OTP, nếu đúng → isTrusted = true
async function confirmVerifyOtp(req, res, next) {
  try {
    var userId = req.user.id;
    var otpInput = String(req.body.otp || '').trim();

    if (!otpInput) return res.status(400).json({ message: 'Vui lòng nhập mã OTP' });

    var user = await User.findById(userId).select(
      'isTrusted verifyOtp verifyOtpExpires username email'
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
    if (user.isTrusted) return res.status(400).json({ message: 'Tài khoản đã được xác minh' });

    if (!user.verifyOtp || !user.verifyOtpExpires) {
      return res.status(400).json({ message: 'Chưa có mã OTP. Vui lòng yêu cầu gửi lại.' });
    }

    if (new Date() > new Date(user.verifyOtpExpires)) {
      return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.' });
    }

    var hashedInput = crypto.createHash('sha256').update(otpInput).digest('hex');
    if (hashedInput !== user.verifyOtp) {
      return res.status(400).json({ message: 'Mã OTP không đúng' });
    }

    // Cấp tích xanh và xoá OTP
    user.isTrusted = true;
    user.verifyOtp = null;
    user.verifyOtpExpires = null;
    user.verifyOtpSentAt = null;
    await user.save();

    // Lưu lịch sử vào VerificationRequest để admin có thể xem
    await VerificationRequest.create({
      userId: userId,
      reason: 'Tự động xác minh qua OTP',
      status: 'approved',
      reviewNote: 'Hệ thống tự cấp sau khi xác minh OTP thành công',
    });

    return res.json({ message: 'Tài khoản của bạn đã được cấp tích xanh!' });
  } catch (error) {
    return next(error);
  }
}

// GET /api/verification/me — trả trạng thái yêu cầu mới nhất (giữ nguyên cho compat)
async function getMyVerificationRequest(req, res, next) {
  try {
    var userId = req.user.id;
    var user = await User.findById(userId).select('isTrusted');
    var request = await VerificationRequest.findOne({ userId: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      isTrusted: !!(user && user.isTrusted),
      request: request || null,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { checkEligibility, requestVerifyOtp, confirmVerifyOtp, getMyVerificationRequest };
