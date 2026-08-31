// utils/loginSession.js
// Ghi nhận và gỡ phiên đăng nhập (models/LoginSession.js)
//
// Tách ra file riêng vì có 2 nơi đăng nhập: login thường và Google OAuth,
// cả hai đều cần tạo phiên giống nhau.
//
// Chỉ lưu BẢN BĂM của token, không bao giờ lưu token gốc vào DB.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const LoginSession = require('../models/LoginSession');

// Băm token bằng SHA-256 — dùng chung cho lúc tạo và lúc gỡ phiên
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Đoán tên trình duyệt và hệ điều hành từ chuỗi User-Agent để hiện cho user dễ hiểu.
// Chỉ nhận diện các trình duyệt phổ biến — không cần thư viện ngoài.
function describeDevice(userAgent) {
  var ua = userAgent || '';

  var browser = 'Trình duyệt khác';
  // Thứ tự kiểm tra quan trọng: Edge và Chrome đều chứa chuỗi 'Chrome'
  if (ua.indexOf('Edg/') !== -1) browser = 'Edge';
  else if (ua.indexOf('OPR/') !== -1) browser = 'Opera';
  else if (ua.indexOf('Chrome/') !== -1) browser = 'Chrome';
  else if (ua.indexOf('Firefox/') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Safari/') !== -1) browser = 'Safari';

  var os = 'thiết bị khác';
  if (ua.indexOf('iPhone') !== -1) os = 'iPhone';
  else if (ua.indexOf('iPad') !== -1) os = 'iPad';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('Mac OS X') !== -1) os = 'macOS';
  else if (ua.indexOf('Windows') !== -1) os = 'Windows';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';

  return browser + ' trên ' + os;
}

// Tạo phiên đăng nhập mới. Lỗi ở đây không được chặn việc đăng nhập —
// user vẫn phải vào được app kể cả khi ghi phiên thất bại.
async function createSession(userId, token, req) {
  try {
    var decoded = jwt.decode(token);
    var expiresAt = decoded && decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    var userAgent = req.headers['user-agent'] || '';

    await LoginSession.create({
      userId: userId,
      tokenHash: hashToken(token),
      device: describeDevice(userAgent),
      userAgent: userAgent,
      // req.ip có thể là IPv6 dạng ::ffff:127.0.0.1 — giữ nguyên, chỉ để tham khảo
      ipAddress: req.ip || '',
      expiresAt: expiresAt,
    });
  } catch (error) {
    console.warn('Không ghi được phiên đăng nhập:', error.message);
  }
}

// Xoá phiên khi user đăng xuất
async function removeSession(token) {
  try {
    await LoginSession.deleteOne({ tokenHash: hashToken(token) });
  } catch (error) {
    console.warn('Không xoá được phiên đăng nhập:', error.message);
  }
}

module.exports = { hashToken, describeDevice, createSession, removeSession };
