// authController.js
// Xử lý toàn bộ luồng xác thực: đăng ký, đăng nhập, kích hoạt email, quên mật khẩu
//
// Luồng đăng ký:
//   1. Kiểm tra username/email chưa tồn tại
//   2. Tạo token kích hoạt (random hex 32 bytes), hết hạn 60 phút
//   3. Lưu user với isActive = false
//   4. Gửi email chứa link kích hoạt
//   5. Nếu gửi email thất bại → xóa user vừa tạo (tránh tài khoản bị kẹt)
//
// Luồng kích hoạt email:
//   GET /verify-email?token=... → tìm user theo token + kiểm tra chưa hết hạn
//   → set isActive = true, xóa token
//
// Luồng gửi lại email:
//   POST /resend-verification { email }
//   → rate limit 2 lần/giờ/IP (chặn tại routes/auth.js)
//   → tạo token mới, gửi lại email
//
// Luồng quên mật khẩu:
//   POST /forgot-password { email } → gửi link reset (hết hạn 60 phút)
//   POST /reset-password { token, newPassword } → xác thực token, đổi mật khẩu

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const generateToken = require('../utils/generateToken');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../utils/mailer');
const { createSession, removeSession } = require('../utils/loginSession');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { username, email, password, fullName, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email và password là bắt buộc' });
    }

    var emailLower = email.toLowerCase();

    // Kiểm tra username và email riêng để trả về lỗi chính xác cho từng field
    var existingUsername = await User.findOne({ username: username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username này đã được sử dụng', field: 'username' });
    }

    var existingEmail = await User.findOne({ email: emailLower });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email này đã được đăng ký', field: 'email' });
    }

    // Token kích hoạt: 64 ký tự hex ngẫu nhiên, hết hạn sau 5 phút
    var verifyToken = crypto.randomBytes(32).toString('hex');
    var verifyExpires = new Date(Date.now() + 30 * 60 * 1000);

    // Trong môi trường dev: kích hoạt ngay, không cần gửi email
    var isDev = process.env.NODE_ENV !== 'production';

    var newUser = new User({
      username: username,
      email: emailLower,
      phone: phone || '',
      passwordHash: password,
      fullName: fullName || '',
      isActive: isDev ? true : false,
      emailVerifyToken: isDev ? null : verifyToken,
      emailVerifyExpires: isDev ? null : verifyExpires,
    });
    await newUser.save();

    if (isDev) {
      return res.status(201).json({
        message: 'Đăng ký thành công! Tài khoản đã được kích hoạt (chế độ dev).',
      });
    }

    // Nếu gửi email thất bại thì xóa user luôn để người dùng có thể đăng ký lại
    try {
      await sendVerificationEmail(emailLower, username, verifyToken);
    } catch (mailError) {
      await User.findByIdAndDelete(newUser._id);
      return res.status(500).json({ message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.' });
    }

    res.status(201).json({
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.',
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/verify-email?token=...
async function verifyEmail(req, res, next) {
  try {
    var token = req.query.token;
    if (!token) {
      return res.status(400).json({ message: 'Token không hợp lệ' });
    }

    // Tìm user có token khớp và chưa hết hạn
    var user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (!user) {
      // Phân biệt: token tồn tại nhưng hết hạn, hay đã dùng rồi (token bị xóa sau khi active)
      var expiredUser = await User.findOne({ emailVerifyToken: token });
      if (expiredUser) {
        return res.status(400).json({ message: 'Token đã hết hạn. Vui lòng gửi lại email kích hoạt.', reason: 'expired' });
      }
      // Token không còn trong DB → đã dùng rồi (tài khoản đã active) hoặc token sai
      return res.status(400).json({ message: 'Tài khoản đã được kích hoạt. Bạn có thể đăng nhập ngay.', reason: 'already_active' });
    }

    user.isActive = true;
    user.emailVerifyToken = null;
    user.emailVerifyExpires = null;
    user.lastLogin = new Date();
    await user.save();

    // Trả về JWT để frontend tự đăng nhập và redirect home
    var jwtToken = generateToken({ id: user._id });

    // Kích hoạt email xong là đăng nhập luôn → cũng ghi phiên
    await createSession(user._id, jwtToken, req);

    res.json({
      message: 'Kích hoạt tài khoản thành công!',
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/resend-verification
// Rate limit 2 lần/giờ/IP được áp dụng tại routes/auth.js
async function resendVerification(req, res, next) {
  try {
    var { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }

    var user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });
    }

    if (user.isActive) {
      return res.status(400).json({ message: 'Tài khoản đã được kích hoạt rồi' });
    }

    // Tạo token mới, token cũ sẽ bị ghi đè
    var newToken = crypto.randomBytes(32).toString('hex');
    user.emailVerifyToken = newToken;
    user.emailVerifyExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationEmail(email.toLowerCase(), user.username, newToken);
    } catch (mailError) {
      return res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại sau.' });
    }

    res.json({ message: 'Email kích hoạt đã được gửi lại. Vui lòng kiểm tra hộp thư.' });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/login
// Hỗ trợ đăng nhập bằng cả email lẫn username
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email/username và password là bắt buộc' });
    }

    // Tìm theo email (lowercase) hoặc username (giữ nguyên hoa thường)
    const user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: email }] });
    if (!user) {
      return res.status(401).json({ message: 'Email/username hoặc mật khẩu không đúng' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email hoặc yêu cầu gửi lại.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({ id: user._id });

    // Ghi nhận phiên để user quản lý được các thiết bị đang đăng nhập
    await createSession(user._id, token, req);

    res.json({
      message: 'Đăng nhập thành công',
      token: token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    // Không trả về passwordHash
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/logout
// Lưu token vào TokenBlacklist để vô hiệu hoá — dù token còn hạn vẫn không dùng được
// expiresAt = thời điểm token thật sự hết hạn (lấy từ payload JWT) để TTL xóa đúng lúc
async function logout(req, res, next) {
  try {
    var authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      var token = authHeader.split(' ')[1];

      // Giải mã để lấy thời điểm hết hạn thật của token (field exp là Unix timestamp giây)
      var decoded = jwt.decode(token);
      var expiresAt = decoded && decoded.exp
        ? new Date(decoded.exp * 1000)   // chuyển từ giây sang millisecond
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback: 7 ngày từ bây giờ

      // Lưu vào blacklist — MongoDB TTL tự xóa khi đến expiresAt
      await TokenBlacklist.create({ token: token, expiresAt: expiresAt });
      // Gỡ phiên khỏi danh sách thiết bị đang đăng nhập
      await removeSession(token);
    }

    res.json({ message: 'Đăng xuất thành công' });
  } catch (error) {
    // Nếu lưu blacklist lỗi (ví dụ trùng token), vẫn cho logout thành công
    res.json({ message: 'Đăng xuất thành công' });
  }
}

// PATCH /api/auth/change-password
async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Mật khẩu cũ và mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    // So sánh mật khẩu cũ với hash trong DB
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới không được trùng với mật khẩu cũ' });
    }

    // Gán plaintext → pre-save hook tự hash lại
    user.passwordHash = newPassword;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    var { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }

    var user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Luôn trả về cùng 1 message dù email có tồn tại hay không
      // → tránh kẻ xấu dò xem email nào đã đăng ký (user enumeration)
      return res.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu.' });
    }

    var resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    await sendResetPasswordEmail(email.toLowerCase(), user.username, resetToken);

    res.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu.' });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    var { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token và mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    // Tìm user có token khớp và chưa hết hạn
    var user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    // Gán plaintext → pre-save hook tự hash lại, xóa token sau khi dùng
    user.passwordHash = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.' });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/google
// Nhận credential (ID token) từ Google Sign-In trên frontend
// → verify token → tìm/tạo user → trả JWT như login thường
async function googleAuth(req, res, next) {
  try {
    var { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential là bắt buộc' });
    }

    // Xác thực ID token với Google
    var ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    var payload = ticket.getPayload();
    var googleId = payload.sub;
    var emailLower = payload.email.toLowerCase();
    var fullName = payload.name || '';
    var picture = payload.picture || '';

    // Tìm theo googleId trước, sau đó theo email (để link tài khoản cũ)
    var user = await User.findOne({ googleId: googleId });

    if (!user) {
      user = await User.findOne({ email: emailLower });

      if (user) {
        // Tài khoản email đã tồn tại → link googleId vào
        user.googleId = googleId;
        if (!user.avatarUrl && picture) user.avatarUrl = picture;
        user.isActive = true;
      } else {
        // Tạo user mới — sinh username từ phần trước @ của email
        var baseUsername = emailLower.split('@')[0].replace(/[^a-z0-9_.]/g, '_').slice(0, 20);
        var username = baseUsername;
        var counter = 1;
        while (await User.findOne({ username: username })) {
          username = baseUsername + counter;
          counter++;
        }

        user = new User({
          username: username,
          email: emailLower,
          fullName: fullName,
          avatarUrl: picture,
          googleId: googleId,
          passwordHash: '',
          isActive: true,
        });
      }
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    user.lastLogin = new Date();
    await user.save();

    var token = generateToken({ id: user._id });

    // Đăng nhập bằng Google cũng ghi phiên như đăng nhập thường
    await createSession(user._id, token, req);

    res.json({
      message: 'Đăng nhập thành công',
      token: token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.message && error.message.includes('Token used too late')) {
      return res.status(400).json({ message: 'Google token đã hết hạn. Vui lòng thử lại.' });
    }
    next(error);
  }
}

module.exports = { register, login, getMe, logout, changePassword, verifyEmail, resendVerification, forgotPassword, resetPassword, googleAuth };
