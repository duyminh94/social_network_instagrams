// middleware/auth.js
// Xác thực người dùng qua JWT — bắt buộc với mọi route cần đăng nhập
//
// Luồng kiểm tra (theo thứ tự):
//   1. Header Authorization phải có dạng "Bearer <token>"
//   2. jwt.verify() giải mã và kiểm tra chữ ký + thời hạn token
//   3. Kiểm tra token có trong TokenBlacklist không (đã logout chưa)
//   4. Tra DB để chắc user còn tồn tại, chưa bị ban, đã kích hoạt email
//   5. Gắn req.user = decoded payload để controller dùng
//
// Tại sao phải tra DB thay vì chỉ tin vào token?
//   → Token stateless không biết user bị ban sau khi đăng nhập
//   → Cần kiểm tra isBanned và isActive mỗi request để ngăn kịp thời
//
// Tại sao cần TokenBlacklist?
//   → Sau khi logout, token cũ vẫn hợp lệ cho đến khi hết hạn (7 ngày)
//   → Nếu bị đánh cắp, kẻ xấu vẫn dùng được — blacklist ngăn điều này

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const LoginSession = require('../models/LoginSession');
const { hashToken } = require('../utils/loginSession');

async function authMiddleware(req, res, next) {
  var authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không có token' });
  }

  var token = authHeader.split(' ')[1];

  try {
    // Bước 1: Kiểm tra chữ ký và thời hạn token
    var decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Bước 2: Kiểm tra token đã bị logout chưa.
    // Tra theo 2 dạng vì blacklist chứa 2 loại bản ghi:
    //   - token gốc: do chính người dùng bấm Đăng xuất trên thiết bị này
    //   - bản băm : do đăng xuất thiết bị đó TỪ XA (trang Cài đặt > Phiên đăng nhập),
    //               lúc đó server chỉ có hash chứ không có token gốc
    var tokenHash = hashToken(token);
    var isBlacklisted = await TokenBlacklist.findOne({ token: { $in: [token, tokenHash] } });
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token đã hết hiệu lực, vui lòng đăng nhập lại' });
    }

    // Bước 3: Kiểm tra user còn tồn tại và không bị khóa
    var user = await User.findById(decoded.id).select('isActive isBanned');
    if (!user) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: 'Tài khoản chưa được kích hoạt' });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    // Cập nhật thời điểm hoạt động gần nhất của phiên — để trang Cài đặt hiện
    // đúng thứ tự thiết bị. Không await: chậm mất một chút cũng không sao,
    // và lỗi ghi phiên không được làm hỏng request chính.
    LoginSession.updateOne({ tokenHash: tokenHash }, { lastActiveAt: new Date() }).catch(function () {});

    // Gắn thông tin user vào request để controller dùng
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

module.exports = authMiddleware;
