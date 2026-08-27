// utils/generateToken.js
// Tạo JWT dùng cho xác thực đăng nhập (Bearer token)
//
// Payload thường dùng: { id: user._id }
// Thời hạn lấy từ JWT_EXPIRES_IN trong .env, mặc định '7d' nếu không có
//
// Lưu ý: token này khác với emailVerifyToken và resetPasswordToken
//   → emailVerifyToken / resetPasswordToken: chuỗi random (crypto), lưu DB, hết hạn 60 phút
//   → JWT login token: ký bằng secret, stateless, hết hạn theo JWT_EXPIRES_IN

const jwt = require('jsonwebtoken');

// Tạo JWT token từ payload, thường dùng: { id: user._id, isAdmin: false }
function generateToken(payload) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  return token;
}

module.exports = generateToken;
