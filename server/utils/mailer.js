// mailer.js
// Gửi email qua Gmail bằng Nodemailer
//
// Yêu cầu cấu hình trong .env:
//   MAIL_USER = địa chỉ Gmail của bạn
//   MAIL_PASS = App Password 16 ký tự (không phải mật khẩu Gmail thường)
//              Tạo tại: Google Account → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng
//
// Hai loại email được gửi:
//   1. Kích hoạt tài khoản: link hết hạn sau 30 phút
//   2. Đặt lại mật khẩu: link hết hạn sau 30 phút

const nodemailer = require('nodemailer');

var APP_NAME = 'FPT Aptech';
var BRAND_COLOR = '#e1306c';
var BRAND_SECONDARY = '#f56040';

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

// Wrapper HTML chung cho cả 2 loại email
// footerNote: ghi chú nhỏ cuối email, khác nhau giữa verification và reset password
function buildEmailHtml(username, bodyContent, footerNote) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_SECONDARY});padding:36px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
                📸 ${APP_NAME}
              </div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">
                Social Network
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">
                Xin chào, ${username}! 👋
              </p>
              <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                Chào mừng bạn đến với <strong>${APP_NAME} Social Network</strong> — nơi kết nối và chia sẻ những khoảnh khắc đáng nhớ.
              </p>

              ${bodyContent}

              <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
              <p style="font-size:13px;color:#aaa;margin:0;line-height:1.6;">
                ${footerNote}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="font-size:12px;color:#bbb;margin:0;">
                © 2025 ${APP_NAME} Social Network · FPT Aptech
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Gửi email kích hoạt tài khoản sau khi đăng ký
async function sendVerificationEmail(toEmail, username, token) {
  var transporter = createTransporter();
  var verifyUrl = process.env.CLIENT_URL + '/verify-email?token=' + token;

  var body = `
    <p style="font-size:15px;color:#333;margin:0 0 20px;line-height:1.6;">
      Cảm ơn bạn đã đăng ký! Nhấn nút bên dưới để kích hoạt tài khoản và bắt đầu khám phá:
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${verifyUrl}"
        style="display:inline-block;padding:14px 36px;
               background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_SECONDARY});
               color:#fff;border-radius:50px;text-decoration:none;
               font-size:16px;font-weight:700;letter-spacing:0.3px;
               box-shadow:0 4px 14px rgba(225,48,108,0.4);">
        ✅ Kích hoạt tài khoản
      </a>
    </div>
    <p style="font-size:13px;color:#aaa;text-align:center;margin:0;">
      Link có hiệu lực trong <strong>30 phút</strong>.
    </p>
  `;

  var mailOptions = {
    from: '"' + APP_NAME + '" <' + process.env.MAIL_USER + '>',
    to: toEmail,
    subject: '✅ Kích hoạt tài khoản ' + APP_NAME,
    html: buildEmailHtml(username, body, 'Nếu bạn không kích hoạt tài khoản này và bỏ qua email, tài khoản của bạn sẽ không đăng nhập được nếu chưa kích hoạt.'),
  };

  await transporter.sendMail(mailOptions);
}

// Gửi email đặt lại mật khẩu
async function sendResetPasswordEmail(toEmail, username, token) {
  var transporter = createTransporter();
  var resetUrl = process.env.CLIENT_URL + '/reset-password?token=' + token;

  var body = `
    <p style="font-size:15px;color:#333;margin:0 0 20px;line-height:1.6;">
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tiếp tục:
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}"
        style="display:inline-block;padding:14px 36px;
               background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_SECONDARY});
               color:#fff;border-radius:50px;text-decoration:none;
               font-size:16px;font-weight:700;letter-spacing:0.3px;
               box-shadow:0 4px 14px rgba(225,48,108,0.4);">
        🔑 Đặt lại mật khẩu
      </a>
    </div>
    <p style="font-size:13px;color:#aaa;text-align:center;margin:0;">
      Link có hiệu lực trong <strong>30 phút</strong>. Mật khẩu sẽ không thay đổi cho đến khi bạn đặt lại.
    </p>
  `;

  var mailOptions = {
    from: '"' + APP_NAME + '" <' + process.env.MAIL_USER + '>',
    to: toEmail,
    subject: '🔑 Đặt lại mật khẩu ' + APP_NAME,
    html: buildEmailHtml(username, body, 'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email. Mật khẩu sẽ không thay đổi.'),
  };

  await transporter.sendMail(mailOptions);
}

// Gửi mã OTP xác minh tích xanh
async function sendVerifyOtpEmail(toEmail, username, otp) {
  var transporter = createTransporter();

  var body = `
    <p style="font-size:15px;color:#333;margin:0 0 20px;line-height:1.6;">
      Bạn đã yêu cầu cấp tích xanh xác minh cho tài khoản. Đây là mã OTP của bạn:
    </p>
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;padding:18px 48px;
             background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_SECONDARY});
             border-radius:16px;
             font-size:36px;font-weight:800;letter-spacing:10px;color:#fff;
             box-shadow:0 4px 14px rgba(225,48,108,0.4);">
        ${otp}
      </div>
    </div>
    <p style="font-size:13px;color:#aaa;text-align:center;margin:0;">
      Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với bất kỳ ai.
    </p>
  `;

  var mailOptions = {
    from: '"' + APP_NAME + '" <' + process.env.MAIL_USER + '>',
    to: toEmail,
    subject: '✅ Mã OTP xác minh tích xanh ' + APP_NAME,
    html: buildEmailHtml(username, body, 'Nếu bạn không yêu cầu cấp tích xanh, hãy bỏ qua email này.'),
  };

  await transporter.sendMail(mailOptions);
}

// Gửi email thông báo tài khoản bị khóa + hướng dẫn kháng cáo
// reason: lý do khóa (admin nhập hoặc resolutionNote khi xử lý báo cáo)
// replyTo = MAIL_USER: user bấm "Trả lời" sẽ gửi thẳng về hộp thư admin để kháng cáo
async function sendBanNotificationEmail(toEmail, username, reason) {
  var transporter = createTransporter();
  var safeReason = (reason && String(reason).trim()) ? String(reason).trim() : 'Vi phạm tiêu chuẩn cộng đồng.';

  var body = `
    <p style="font-size:15px;color:#333;margin:0 0 16px;line-height:1.6;">
      Rất tiếc, tài khoản của bạn đã bị <strong style="color:${BRAND_COLOR};">khóa</strong> và tạm thời không thể đăng nhập.
    </p>
    <div style="background:#fff5f7;border:1px solid #ffd9e2;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
      <p style="font-size:13px;color:#999;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;">Lý do</p>
      <p style="font-size:15px;color:#1a1a1a;margin:0;line-height:1.6;font-weight:600;">${safeReason}</p>
    </div>
    <p style="font-size:14px;color:#555;margin:0;line-height:1.6;">
      Nếu bạn cho rằng đây là nhầm lẫn, vui lòng <strong>trả lời (Reply) email này</strong> để gửi kháng cáo.
      Đội ngũ quản trị sẽ xem xét và phản hồi bạn sớm nhất.
    </p>
  `;

  var mailOptions = {
    from: '"' + APP_NAME + '" <' + process.env.MAIL_USER + '>',
    to: toEmail,
    replyTo: process.env.MAIL_USER,
    subject: '⚠️ Tài khoản ' + APP_NAME + ' của bạn đã bị khóa',
    html: buildEmailHtml(username, body, 'Email này được gửi tự động khi tài khoản bị khóa. Trả lời email để kháng cáo.'),
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationEmail, sendResetPasswordEmail, sendVerifyOtpEmail, sendBanNotificationEmail };
