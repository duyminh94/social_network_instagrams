// seedAptechChat.js
// Tạo các cuộc trò chuyện tuyển sinh giữa sinh viên và aptech_vietnam
//
// Chạy: node server/seedAptechChat.js
//
// Yêu cầu: đã chạy seedAll.js và seedAptech.js trước (cần users + tài khoản aptech)
// Script này xóa chat cũ của aptech rồi tạo lại mới — an toàn khi chạy nhiều lần

require('dotenv').config({ path: __dirname + '/.env' });
var mongoose = require('mongoose');

var User             = require('./models/User');
var Conversation     = require('./models/Conversation');
var ConversationMember = require('./models/ConversationMember');
var Message          = require('./models/Message');

var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/instagrams';

// ─────────────────────────────────────────────────────────
// Nội dung hội thoại tuyển sinh — mỗi mảng là 1 cuộc chat
// Format: { sender: 'student' | 'aptech', text: '...' }
// ─────────────────────────────────────────────────────────
var conversations = [
  // ── Cuộc 1: minh_tv hỏi học phí + lịch học ──
  {
    student: 'minh_tv',
    messages: [
      { sender: 'student', text: 'Chào Aptech, mình muốn hỏi về chương trình học lập trình web ạ' },
      { sender: 'aptech',  text: 'Chào bạn Minh! Aptech có chương trình Web Development chuyên sâu, thời gian học 18 tháng. Bạn muốn biết thêm thông tin gì ạ?' },
      { sender: 'student', text: 'Học phí chương trình này là bao nhiêu vậy ạ?' },
      { sender: 'aptech',  text: 'Học phí là 35.000.000 VNĐ cho toàn khoá. Aptech có hỗ trợ trả góp 0% lãi suất trong 12 tháng để giảm áp lực tài chính cho bạn 😊' },
      { sender: 'student', text: 'Lịch học thế nào ạ? Mình vẫn đang đi làm part-time' },
      { sender: 'aptech',  text: 'Bạn có thể chọn ca học linh hoạt: sáng (8h–11h30), chiều (13h–16h30), hoặc tối (18h–21h) từ Thứ 2 đến Thứ 6. Phù hợp để vừa học vừa làm nhé!' },
      { sender: 'student', text: 'Vậy khi nào có thể đến tham quan cơ sở được ạ?' },
      { sender: 'aptech',  text: 'Bạn có thể đến tham quan bất kỳ ngày nào trong tuần từ 8h–20h. Aptech ở 391A Nam Kỳ Khởi Nghĩa, Q.3, TP.HCM. Mình có thể đặt lịch tư vấn riêng cho bạn nếu muốn được tư vấn kỹ hơn 🎓' },
      { sender: 'student', text: 'Cảm ơn Aptech nhiều ạ! Mình sẽ ghé vào cuối tuần này' },
      { sender: 'aptech',  text: 'Aptech rất vui được đón bạn! Nếu cần thêm thông tin gì cứ nhắn mình nhé 😊' },
    ],
  },

  // ── Cuộc 2: linh_nt hỏi đầu vào + học bổng ──
  {
    student: 'linh_nt',
    messages: [
      { sender: 'student', text: 'Hello Aptech! Mình đang học năm cuối phổ thông, chưa biết gì về lập trình. Aptech có nhận không ạ?' },
      { sender: 'aptech',  text: 'Chào Linh! Aptech hoàn toàn nhận học viên chưa có kiến thức nền về lập trình. Chương trình được thiết kế từ căn bản đến nâng cao, bạn không cần lo nhé 😊' },
      { sender: 'student', text: 'Aptech có học bổng không ạ? Nhà mình điều kiện chưa dư dả lắm' },
      { sender: 'aptech',  text: 'Aptech có các loại học bổng sau:\n• Học bổng tài năng: 50% học phí (dành cho HS/SV xuất sắc)\n• Học bổng khuyến học: 20–30% (điều kiện học lực Khá)\n• Hỗ trợ trả góp 0% lãi suất 12 tháng\n\nBạn có thể nộp hồ sơ xét học bổng khi đăng ký nhé!' },
      { sender: 'student', text: 'Hồ sơ xét học bổng cần những gì ạ?' },
      { sender: 'aptech',  text: 'Hồ sơ gồm:\n1. Học bạ THPT (scan)\n2. Giấy khen hoặc bằng khen nếu có\n3. Đơn đăng ký học bổng (mẫu do Aptech cung cấp)\n\nBạn nộp trực tiếp hoặc gửi qua email tuyensinh@aptechvietnam.com.vn đều được nhé!' },
      { sender: 'student', text: 'Thời hạn nộp hồ sơ là khi nào ạ?' },
      { sender: 'aptech',  text: 'Khoá tháng 7 sắp tới có hạn nộp hồ sơ học bổng là 30/06. Bạn còn kịp nhé! Aptech sẽ thông báo kết quả trong vòng 5 ngày làm việc 🎉' },
      { sender: 'student', text: 'Cảm ơn Aptech ạ! Mình sẽ chuẩn bị hồ sơ ngay' },
    ],
  },

  // ── Cuộc 3: tuan_bq hỏi chứng chỉ quốc tế ──
  {
    student: 'tuan_bq',
    messages: [
      { sender: 'student', text: 'Mình nghe nói Aptech có chứng chỉ quốc tế, thông tin cụ thể như thế nào ạ?' },
      { sender: 'aptech',  text: 'Đúng rồi bạn! Sau khi hoàn thành chương trình, học viên nhận được:\n• Chứng chỉ ACCP (Aptech Certified Computer Professional) — được công nhận ở 40+ quốc gia\n• Chứng chỉ từ các đối tác như Microsoft, Oracle (tùy chuyên ngành)' },
      { sender: 'student', text: 'Chứng chỉ ACCP có được nhà tuyển dụng ở Việt Nam công nhận không ạ?' },
      { sender: 'aptech',  text: 'Rất được công nhận bạn nhé! Aptech hợp tác với 500+ doanh nghiệp CNTT tại Việt Nam như TMA Solutions, FPT Software, Bosch, Siemens... Tỷ lệ có việc làm sau tốt nghiệp đạt 92% 💼' },
      { sender: 'student', text: 'Sau khi học xong mức lương thường bao nhiêu ạ?' },
      { sender: 'aptech',  text: 'Mức lương trung bình của sinh viên Aptech sau khi ra trường:\n• Fresher (0–1 năm): 8–15 triệu/tháng\n• Junior (1–2 năm): 15–25 triệu/tháng\n• Mid-level (2–3 năm): 25–40 triệu/tháng\n\nMức lương phụ thuộc năng lực và nỗ lực của từng bạn nhé 🚀' },
      { sender: 'student', text: 'Mình muốn đăng ký tư vấn trực tiếp, Aptech có thể sắp xếp không ạ?' },
      { sender: 'aptech',  text: 'Được chứ! Bạn cho Aptech xin số điện thoại, mình sẽ có tư vấn viên liên hệ lại trong ngày hôm nay để đặt lịch phù hợp nhé 😊' },
      { sender: 'student', text: 'Số mình là 0901234567 ạ. Cảm ơn Aptech!' },
      { sender: 'aptech',  text: 'Aptech đã ghi nhận! Tư vấn viên sẽ gọi cho bạn trước 17h hôm nay. Hẹn gặp bạn sớm nhé Tuấn! 🎓' },
    ],
  },

  // ── Cuộc 4: thu_nk hỏi thủ tục nhập học ──
  {
    student: 'thu_nk',
    messages: [
      { sender: 'student', text: 'Chào Aptech! Mình đã quyết định đăng ký học rồi, thủ tục nhập học như thế nào ạ?' },
      { sender: 'aptech',  text: 'Chào Thu! Aptech rất vui khi bạn đã quyết định 🎉 Thủ tục nhập học gồm 3 bước:\n1. Điền phiếu đăng ký (online hoặc trực tiếp)\n2. Đóng lệ phí giữ chỗ 2.000.000đ\n3. Nộp hồ sơ đầy đủ trước khai giảng 1 tuần' },
      { sender: 'student', text: 'Hồ sơ cần những gì ạ?' },
      { sender: 'aptech',  text: 'Hồ sơ nhập học gồm:\n• 2 ảnh 3x4 (nền trắng)\n• CMND/CCCD bản photo công chứng\n• Bằng tốt nghiệp THPT hoặc bản sao có công chứng\n• Phiếu đăng ký học (Aptech cung cấp mẫu)' },
      { sender: 'student', text: 'Mình chưa nhận bằng tốt nghiệp, chỉ có giấy chứng nhận tốt nghiệp tạm thời, có được không ạ?' },
      { sender: 'aptech',  text: 'Được bạn nhé! Giấy chứng nhận tốt nghiệp tạm thời hoàn toàn hợp lệ. Khi nào nhận bằng chính thức thì bổ sung sau cũng được 😊' },
      { sender: 'student', text: 'Lệ phí giữ chỗ có được tính vào học phí không ạ?' },
      { sender: 'aptech',  text: 'Có bạn ơi! 2.000.000đ lệ phí giữ chỗ sẽ được khấu trừ vào học phí đợt 1. Bạn không mất thêm khoản nào cả nhé!' },
      { sender: 'student', text: 'Tuyệt quá! Mình sẽ ra nộp hồ sơ vào thứ 7 này ạ' },
      { sender: 'aptech',  text: 'Thứ 7 Aptech mở cửa từ 8h–17h. Aptech sẽ chờ bạn! Nếu có thắc mắc gì thêm cứ nhắn mình nhé Thu 😊' },
    ],
  },

  // ── Cuộc 5: duc_ht hỏi chuyển ngành ──
  {
    student: 'duc_ht',
    messages: [
      { sender: 'student', text: 'Mình đang làm kế toán 3 năm, muốn chuyển sang IT. Aptech có phù hợp không ạ?' },
      { sender: 'aptech',  text: 'Chào bạn Đức! Aptech rất phù hợp cho người chuyển ngành. Nhiều học viên của Aptech xuất phát từ các ngành khác nhau và đều thành công sau khi tốt nghiệp 💪' },
      { sender: 'student', text: 'Chương trình nào phù hợp nhất cho người chuyển ngành từ đầu ạ?' },
      { sender: 'aptech',  text: 'Aptech gợi ý 2 lựa chọn:\n\n1. ACCP (18 tháng) — toàn diện từ cơ bản đến chuyên sâu, phù hợp để xây nền vững\n2. Web Development nhanh (9 tháng) — tập trung vào Front-end/Back-end, ra trường việc làm nhanh hơn\n\nVới 3 năm kinh nghiệm đi làm, bạn sẽ có lợi thế về tư duy logic đấy!' },
      { sender: 'student', text: 'Học 18 tháng thì mình sợ không có thu nhập. Trong quá trình học có thể đi làm thêm không ạ?' },
      { sender: 'aptech',  text: 'Hoàn toàn được! Aptech có chương trình kết nối việc làm part-time cho học viên từ tháng thứ 6 trở đi. Nhiều bạn đã có thu nhập 5–8 triệu/tháng ngay khi đang học 🎯' },
      { sender: 'student', text: 'Nghe hay đó! Aptech có thể cho mình xem lịch học cụ thể không ạ?' },
      { sender: 'aptech',  text: 'Aptech sẽ gửi bạn file lịch học và đề cương chi tiết. Cho mình xin email để gửi nhé?' },
      { sender: 'student', text: 'Email mình là duc.vo@gmail.com ạ' },
      { sender: 'aptech',  text: 'Aptech đã ghi nhận và sẽ gửi tài liệu trong vòng 30 phút. Bạn kiểm tra cả thư mục Spam nhé! Chúc bạn đưa ra quyết định đúng đắn 😊' },
    ],
  },
];

// ─────────────────────────────────────────────
// Tạo thời gian tin nhắn tăng dần thực tế
// ─────────────────────────────────────────────
function generateMessageTimes(count, daysAgo) {
  var baseTime = new Date();
  baseTime.setDate(baseTime.getDate() - daysAgo);
  baseTime.setHours(8 + Math.floor(Math.random() * 4), 0, 0, 0); // 8h–12h buổi sáng

  var times = [];
  var current = new Date(baseTime);
  for (var i = 0; i < count; i++) {
    // Mỗi tin cách nhau 1–5 phút
    var gapMs = (60 + Math.floor(Math.random() * 240)) * 1000;
    current = new Date(current.getTime() + gapMs);
    times.push(new Date(current));
  }
  return times;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối MongoDB:', MONGO_URI);

  // Tìm tài khoản aptech_vietnam
  var aptech = await User.findOne({ username: 'aptech_vietnam' });
  if (!aptech) {
    console.error('\n❌ Không tìm thấy tài khoản aptech_vietnam!');
    console.error('   Chạy seedAptech.js trước rồi mới chạy file này.\n');
    process.exit(1);
  }
  console.log('✓ Tìm thấy aptech_vietnam (id: ' + aptech._id + ')');

  // Xóa chat cũ của aptech để tránh trùng khi chạy lại
  var oldConvIds = await ConversationMember
    .find({ userId: aptech._id })
    .distinct('conversationId');

  if (oldConvIds.length > 0) {
    await Message.deleteMany({ conversationId: { $in: oldConvIds } });
    await ConversationMember.deleteMany({ conversationId: { $in: oldConvIds } });
    await Conversation.deleteMany({ _id: { $in: oldConvIds } });
    console.log('  → Đã xóa ' + oldConvIds.length + ' cuộc chat cũ của Aptech');
  }

  var totalMessages = 0;
  var createdConvs  = 0;

  for (var ci = 0; ci < conversations.length; ci++) {
    var conv = conversations[ci];

    // Tìm user sinh viên
    var student = await User.findOne({ username: conv.student });
    if (!student) {
      console.log('  ⚠ Bỏ qua — không tìm thấy user: ' + conv.student);
      continue;
    }

    // Tạo conversation direct
    var conversation = await Conversation.create({
      type:           'direct',
      createdBy:      student._id,
      lastActivityAt: new Date(),
    });

    // Thêm 2 thành viên
    await ConversationMember.create([
      { conversationId: conversation._id, userId: student._id,  role: 'member', status: 'accepted' },
      { conversationId: conversation._id, userId: aptech._id,   role: 'member', status: 'accepted' },
    ]);

    // Tạo tin nhắn với thời gian tăng dần
    var msgTimes = generateMessageTimes(conv.messages.length, 10 - ci * 2);

    for (var mi = 0; mi < conv.messages.length; mi++) {
      var msg = conv.messages[mi];
      var senderId = msg.sender === 'student' ? student._id : aptech._id;

      await Message.create({
        conversationId: conversation._id,
        senderId:       senderId,
        content:        msg.text,
        messageType:    'text',
        createdAt:      msgTimes[mi],
        updatedAt:      msgTimes[mi],
      });
    }

    // Cập nhật lastActivityAt = thời gian tin nhắn cuối
    var lastTime = msgTimes[msgTimes.length - 1];
    await Conversation.findByIdAndUpdate(conversation._id, { lastActivityAt: lastTime });

    totalMessages += conv.messages.length;
    createdConvs++;
    console.log('  ✓ Chat với ' + conv.student + ' — ' + conv.messages.length + ' tin nhắn');
  }

  console.log('\n' + '='.repeat(55));
  console.log('SEED CHAT APTECH HOÀN TẤT');
  console.log('='.repeat(55));
  console.log('  Tài khoản Aptech : aptech_vietnam');
  console.log('  Cuộc trò chuyện  : ' + createdConvs);
  console.log('  Tổng tin nhắn    : ' + totalMessages);
  console.log('  Chủ đề           : Tư vấn tuyển sinh CNTT');
  console.log('='.repeat(55));

  await mongoose.disconnect();
  console.log('\nHoàn tất.\n');
}

main().catch(function (err) {
  console.error('\nSeed chat Aptech thất bại:', err.message);
  process.exit(1);
});
