// middleware/optionalAuth.js
// Xác thực tuỳ chọn — dùng cho route công khai nhưng cần nhận diện user nếu có token
//
// Khác với authMiddleware (bắt buộc):
//   - Không có token → cho đi tiếp, req.user = undefined
//   - Token không hợp lệ / hết hạn / blacklisted → cho đi tiếp, req.user = undefined
//   - Token hợp lệ → gắn req.user = decoded, cho đi tiếp
//
// Dùng cho: GET /api/posts/:id, GET /api/posts/explore,
//           GET /api/posts/user/:userId, GET /api/users/:username
// Nhờ middleware này, controller không cần phân biệt "route có auth hay không" —
// chỉ cần kiểm tra req.user?.id để biết đã đăng nhập chưa

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');

async function optionalAuth(req, res, next) {
  var authHeader = req.headers.authorization;

  // Không có token → tiếp tục với req.user = undefined
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  var token = authHeader.split(' ')[1];

  try {
    // Kiểm tra chữ ký và thời hạn
    var decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kiểm tra token đã logout chưa
    var isBlacklisted = await TokenBlacklist.findOne({ token: token });
    if (isBlacklisted) {
      // Token bị thu hồi → vẫn cho đi tiếp nhưng không gắn req.user
      return next();
    }

    // Kiểm tra user còn tồn tại và không bị khóa
    var user = await User.findById(decoded.id).select('isActive isBanned');
    if (!user || !user.isActive || user.isBanned) {
      // User không hợp lệ → vẫn cho đi tiếp nhưng không gắn req.user
      return next();
    }

    // Token hợp lệ → gắn req.user để controller dùng
    req.user = decoded;
    return next();
  } catch (error) {
    // Token lỗi (hết hạn, sai chữ ký, ...) → vẫn cho đi tiếp, không block
    return next();
  }
}

module.exports = optionalAuth;
