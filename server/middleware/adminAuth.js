// middleware/adminAuth.js
// Xác thực admin — giống auth.js nhưng thêm kiểm tra role
//
// Luồng kiểm tra (theo thứ tự):
//   1. Header Authorization phải có dạng "Bearer <token>"
//   2. jwt.verify() giải mã và kiểm tra chữ ký + thời hạn token
//   3. Kiểm tra token có trong TokenBlacklist không (đã logout chưa)
//   4. Tra DB để chắc user còn tồn tại, chưa bị ban, đã kích hoạt email
//   5. Kiểm tra role phải là 'super_admin' hoặc 'moderator'
//   6. Gắn req.user = decoded payload để controller dùng
//
// FIX: thêm TokenBlacklist check — token admin đã logout trước đây vẫn dùng được
// Role hợp lệ: 'super_admin' hoặc 'moderator'

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');

async function adminAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không có token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Bước 1: Kiểm tra chữ ký và thời hạn token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Bước 2: Kiểm tra token đã bị logout chưa (blacklist)
    // FIX: thiếu bước này khiến token admin đã logout vẫn dùng được route admin
    var isBlacklisted = await TokenBlacklist.findOne({ token: token });
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token đã hết hiệu lực, vui lòng đăng nhập lại' });
    }

    // Bước 3: Kiểm tra user còn tồn tại và không bị ban/chưa kích hoạt
    const user = await User.findById(decoded.id).select('role isActive isBanned');
    if (!user) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: 'Tài khoản chưa được kích hoạt' });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    // Bước 4: Kiểm tra role admin
    var adminRoles = ['super_admin', 'moderator'];
    if (!adminRoles.includes(user.role)) {
      return res.status(403).json({ message: 'Không có quyền admin' });
    }

    req.user = decoded;
    req.user.role = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

module.exports = adminAuthMiddleware;
