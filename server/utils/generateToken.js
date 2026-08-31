// utils/generateToken.js
// Tạo JWT dùng cho xác thực đăng nhập (Bearer token)
//
// Payload thường dùng: { id: user._id }
// Thời hạn lấy từ JWT_EXPIRES_IN trong .env, mặc định '7d' nếu không có
//
// Lưu ý: token này khác với emailVerifyToken và resetPasswordToken
//   → emailVerifyToken / resetPasswordToken: chuỗi random (crypto), lưu DB, hết hạn 60 phút
//   → JWT login token: ký bằng secret, stateless, hết hạn theo JWT_EXPIRES_IN
//
// jti (JWT ID) — chuỗi ngẫu nhiên gắn vào mỗi token:
//   JWT chỉ có { id } cộng với iat/exp tính theo GIÂY. Nếu cùng một user đăng nhập
//   2 lần trong cùng một giây (mở 2 tab, hoặc đăng nhập trên 2 thiết bị gần như
//   cùng lúc) thì payload y hệt nhau → sinh ra 2 token GIỐNG HỆT.
//   Hậu quả: 2 phiên đăng nhập không phân biệt được, thu hồi thiết bị này thì
//   thiết bị kia cũng mất, và LoginSession báo lỗi trùng khoá tokenHash.
//   Thêm jti ngẫu nhiên bảo đảm mỗi lần đăng nhập luôn ra một token khác nhau.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Tạo JWT token từ payload, thường dùng: { id: user._id, isAdmin: false }
function generateToken(payload) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const tokenPayload = Object.assign({}, payload, {
    jti: crypto.randomBytes(16).toString('hex'),
  });
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn });
  return token;
}

module.exports = generateToken;
