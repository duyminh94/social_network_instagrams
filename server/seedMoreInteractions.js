// seedMoreInteractions.js
// Thêm tương tác phong phú giữa các users — likes, comments, follows, replies
//
// Chạy: node server/seedMoreInteractions.js
//
// Yêu cầu: đã chạy seedAll.js + seedReels.js + seedAptech.js trước
// Script KHÔNG xóa dữ liệu cũ — chỉ thêm mới
// Nếu chạy lại có thể bị lỗi duplicate index → bình thường, script bỏ qua

require('dotenv').config({ path: __dirname + '/.env' });
var mongoose = require('mongoose');

var User        = require('./models/User');
var Reel        = require('./models/Reel');
var ReelComment = require('./models/ReelComment');
var Like        = require('./models/Like');
var Follow      = require('./models/Follow');
var Post        = require('./models/Post');
var Comment     = require('./models/Comment');
var Notification = require('./models/Notification');

var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/instagrams';

// Helper: thêm like an toàn — bỏ qua nếu đã tồn tại (duplicate)
async function safeLike(userId, targetType, targetId, Model, countField) {
  try {
    await Like.create({ userId: userId, targetType: targetType, targetId: targetId });
    var inc = {};
    inc[countField] = 1;
    await Model.findByIdAndUpdate(targetId, { $inc: inc });
    return true;
  } catch (err) {
    if (err.code === 11000) return false; // duplicate — bỏ qua
    throw err;
  }
}

// Helper: thêm follow an toàn — bỏ qua nếu đã tồn tại
async function safeFollow(followerId, followingId) {
  try {
    await Follow.create({ followerId: followerId, followingId: followingId, status: 'accepted' });
    await User.findByIdAndUpdate(followerId,  { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } });
    return true;
  } catch (err) {
    if (err.code === 11000) return false;
    throw err;
  }
}

// ─────────────────────────────────────────────
// 1. FOLLOW APTECH + THÊM FOLLOW CHÉO
// ─────────────────────────────────────────────
async function seedMoreFollows(map) {
  var pairs = [
    // Tất cả follow Aptech
    ['alice',   'aptech_vietnam'],
    ['bob',     'aptech_vietnam'],
    ['charlie', 'aptech_vietnam'],
    ['diana',   'aptech_vietnam'],
    ['ethan',   'aptech_vietnam'],
    ['fiona',   'aptech_vietnam'],
    ['hana',    'aptech_vietnam'],
    // Aptech follow một số user nổi bật
    ['aptech_vietnam', 'alice'],
    ['aptech_vietnam', 'ethan'],
    ['aptech_vietnam', 'charlie'],
    // Thêm follow chéo giữa users chưa follow nhau
    ['diana',   'alice'],
    ['diana',   'bob'],
    ['diana',   'charlie'],
    ['fiona',   'bob'],
    ['fiona',   'charlie'],
    ['fiona',   'ethan'],
    ['ethan',   'fiona'],
    ['ethan',   'hana'],
    ['ethan',   'charlie'],
    ['hana',    'bob'],
    ['hana',    'charlie'],
    ['hana',    'ethan'],
    ['bob',     'fiona'],
    ['bob',     'hana'],
    ['charlie', 'diana'],
    ['charlie', 'ethan'],
    ['charlie', 'hana'],
    ['alice',   'diana'],
    ['alice',   'hana'],
    ['alice',   'charlie'],
  ];

  var added = 0;
  var skipped = 0;

  for (var i = 0; i < pairs.length; i++) {
    var follower  = map[pairs[i][0]];
    var following = map[pairs[i][1]];
    if (!follower || !following) { skipped++; continue; }
    var ok = await safeFollow(follower._id, following._id);
    if (ok) { added++; } else { skipped++; }
  }

  console.log('\n✓ Follows: thêm ' + added + ', bỏ qua ' + skipped + ' (đã tồn tại / user không có)');
}

// ─────────────────────────────────────────────
// 2. THÊM LIKES CHO REELS (kể cả reels của Aptech)
// ─────────────────────────────────────────────
async function seedMoreReelLikes(map, reels) {
  // Map reels theo userId để dễ tham chiếu
  var userReels = {};
  reels.forEach(function (r) {
    var uid = String(r.userId);
    if (!userReels[uid]) userReels[uid] = [];
    userReels[uid].push(r);
  });

  function getReelsByUser(username) {
    var u = map[username];
    if (!u) return [];
    return userReels[String(u._id)] || [];
  }

  var aptechReels = getReelsByUser('aptech_vietnam');
  var charlieReels = getReelsByUser('charlie');
  var aliceReels = getReelsByUser('alice');
  var bobReels = getReelsByUser('bob');
  var ethanReels = getReelsByUser('ethan');
  var dianaReels = getReelsByUser('diana');
  var hanaReels = getReelsByUser('hana');
  var fionaReels = getReelsByUser('fiona');
  var georgeReels = getReelsByUser('george');

  // [user, reel] pairs — like thêm
  var pairs = [];

  // Mọi người like reels của Aptech
  var likers = ['alice', 'bob', 'charlie', 'diana', 'ethan', 'fiona', 'hana'];
  aptechReels.forEach(function (reel) {
    likers.forEach(function (username) {
      pairs.push([username, reel]);
    });
  });

  // Thêm likes chéo cho các reels khác
  function addLikes(targetReels, usernames) {
    targetReels.forEach(function (reel) {
      usernames.forEach(function (username) {
        pairs.push([username, reel]);
      });
    });
  }

  addLikes(charlieReels,  ['diana', 'fiona', 'ethan', 'aptech_vietnam']);
  addLikes(aliceReels,    ['diana', 'bob', 'charlie', 'aptech_vietnam']);
  addLikes(bobReels,      ['fiona', 'hana', 'alice', 'ethan']);
  addLikes(ethanReels,    ['alice', 'diana', 'charlie', 'hana']);
  addLikes(dianaReels,    ['alice', 'charlie', 'bob', 'fiona']);
  addLikes(hanaReels,     ['alice', 'fiona', 'bob', 'charlie']);
  addLikes(fionaReels,    ['alice', 'charlie', 'ethan', 'hana']);
  addLikes(georgeReels,   ['ethan', 'charlie', 'bob']);

  var added = 0;
  var skipped = 0;

  for (var i = 0; i < pairs.length; i++) {
    var user = map[pairs[i][0]];
    var reel = pairs[i][1];
    if (!user || !reel) { skipped++; continue; }
    var ok = await safeLike(user._id, 'reel', reel._id, Reel, 'likesCount');
    if (ok) { added++; } else { skipped++; }
  }

  console.log('✓ Reel likes: thêm ' + added + ', bỏ qua ' + skipped);
}

// ─────────────────────────────────────────────
// 3. THÊM COMMENTS + REPLIES CHO REELS
// ─────────────────────────────────────────────
async function seedMoreReelComments(map, reels) {
  // Map reels theo index trong kết quả truy vấn (sắp theo createdAt)
  var reelByCaption = {};
  reels.forEach(function (r) {
    reelByCaption[r.caption.substring(0, 20)] = r;
  });

  // Tìm reel của từng user
  function findReel(username) {
    var u = map[username];
    if (!u) return null;
    return reels.find(function (r) { return String(r.userId) === String(u._id); }) || null;
  }

  function findReelAt(username, idx) {
    var u = map[username];
    if (!u) return null;
    var userReels = reels.filter(function (r) { return String(r.userId) === String(u._id); });
    return userReels[idx] || null;
  }

  var aptechReel1 = findReelAt('aptech_vietnam', 0);
  var aptechReel2 = findReelAt('aptech_vietnam', 1);
  var charlieReel1 = findReelAt('charlie', 0);
  var charlieReel2 = findReelAt('charlie', 1);
  var aliceReel1  = findReelAt('alice', 0);
  var aliceReel2  = findReelAt('alice', 1);
  var bobReel     = findReel('bob');
  var ethanReel   = findReel('ethan');
  var dianaReel   = findReel('diana');
  var hanaReel    = findReel('hana');
  var fionaReel   = findReel('fiona');
  var georgeReel  = findReel('george');

  var allComments = [];

  async function addComment(reel, username, content, parentComment) {
    if (!reel || !map[username]) return null;
    var data = {
      reelId:  reel._id,
      userId:  map[username]._id,
      content: content,
    };
    if (parentComment) data.parentId = parentComment._id;
    var comment = await ReelComment.create(data);
    await Reel.findByIdAndUpdate(reel._id, { $inc: { commentsCount: 1 } });
    allComments.push(comment);
    return comment;
  }

  // --- Aptech reel 1 (tuyển dụng) ---
  var c1 = await addComment(aptechReel1, 'alice',   'Trường này có cơ sở ở đâu vậy ạ? 🎓');
  var c2 = await addComment(aptechReel1, 'ethan',   'Mình đang học ở đây, recommend lắm! 👍');
  var c3 = await addComment(aptechReel1, 'bob',     'Học phí như thế nào bạn ơi?');
  var c4 = await addComment(aptechReel1, 'charlie', 'Cơ hội việc làm sau khi ra trường cao không ạ?');
  var c5 = await addComment(aptechReel1, 'diana',   'Bạn bè mình học ở đây nhiều lắm, rất tốt!');
  await addComment(aptechReel1, 'aptech_vietnam', 'Aptech có cơ sở tại TP.HCM và Hà Nội bạn nhé 🙌', c1);
  await addComment(aptechReel1, 'aptech_vietnam', 'Liên hệ hotline 1800 để được tư vấn học phí miễn phí nha!', c3);
  await addComment(aptechReel1, 'ethan',          'Mình ra trường 3 tháng là xin được việc rồi đó Charlie 💪', c4);

  // --- Aptech reel 2 ---
  var c6 = await addComment(aptechReel2, 'fiona',   'Môi trường học nhìn chuyên nghiệp quá! 😍');
  var c7 = await addComment(aptechReel2, 'hana',    'Aptech có dạy UI/UX Design không ạ?');
  var c8 = await addComment(aptechReel2, 'charlie', 'Clip quay đẹp quá, ai làm vậy? 🎬');
  await addComment(aptechReel2, 'aptech_vietnam', 'Có bạn ơi! Chương trình Multimedia & Design đang tuyển sinh 🎨', c7);
  await addComment(aptechReel2, 'alice',          'Fiona học thử đi, chắc hợp với bạn lắm 😄', c6);

  // --- Charlie reel 1 (Hội An) ---
  var c9  = await addComment(charlieReel1, 'fiona',   'Quay bằng máy gì vậy Charlie? Ảnh đẹp muốn xỉu 😍');
  var c10 = await addComment(charlieReel1, 'diana',   'Hội An mùa này còn đông không? Mình muốn đi quá');
  var c11 = await addComment(charlieReel1, 'ethan',   'Next trip rủ mình với! 🏍️');
  await addComment(charlieReel1, 'charlie', 'iPhone 15 Pro thôi Fiona ơi, ống wide 🙈', c9);
  await addComment(charlieReel1, 'charlie', 'Tháng 10 trở đi đẹp nhất Diana, ít mưa lắm!', c10);

  // --- Charlie reel 2 (làng quê) ---
  var c12 = await addComment(charlieReel2, 'alice', 'Bình yên quá Charlie ơi 😭 muốn thoát khỏi thành phố rồi');
  var c13 = await addComment(charlieReel2, 'hana',  'Đây ở đâu vậy? Miền Tây hay miền Trung?');
  await addComment(charlieReel2, 'charlie', 'Bình Định đó Hana, về quê nội mình 🌿', c13);
  await addComment(charlieReel2, 'alice',   'Alice cùng về quê với mình lần sau nha 😄', c12);

  // --- Alice reel 1 (Ninh Bình) ---
  var c14 = await addComment(aliceReel1, 'bob',     'Flycam không? Góc này đỉnh thật sự 🤩');
  var c15 = await addComment(aliceReel1, 'fiona',   'Màu sắc tự nhiên đẹp hơn bất kỳ filter nào 🎨');
  var c16 = await addComment(aliceReel1, 'hana',    'Trekking Ninh Bình có khó không Alice? Mình muốn thử');
  await addComment(aliceReel1, 'alice',   'Không có flycam, leo lên điểm cao nhất mà chụp Bob ơi 😂', c14);
  await addComment(aliceReel1, 'charlie', 'Hana đi thôi! Mình biết đường dẫn 🏔️', c16);

  // --- Alice reel 2 (Vũng Tàu) ---
  var c17 = await addComment(aliceReel2, 'ethan',   'Sáng sớm chạy bộ ở bãi biển đỉnh lắm Alice ơi 🏃');
  var c18 = await addComment(aliceReel2, 'diana',   'Biển Vũng Tàu buổi sáng sạch và vắng, thích lắm 🌊');
  await addComment(aliceReel2, 'alice',   'Đúng rồi Ethan! Sáng 5h30 ra chạy, không khí trong lành lắm 🌅', c17);

  // --- Bob reel ---
  var c19 = await addComment(bobReel, 'charlie', 'Bob ơi clip này xem xong muốn nộp hồ sơ ngay 😂');
  var c20 = await addComment(bobReel, 'alice',   'Thông tin hữu ích quá Bob! Save lại rồi share cho bạn bè');
  await addComment(bobReel, 'bob', 'Haha mình cũng đang cân nhắc Charlie ơi 😆', c19);

  // --- Ethan reel ---
  var c21 = await addComment(ethanReel, 'alice',   'Ethan ơi cái này là anime gì vậy? 👀');
  var c22 = await addComment(ethanReel, 'fiona',   'Xem rồi! Hay lắm, cốt truyện đỉnh 🔥');
  var c23 = await addComment(ethanReel, 'diana',   'Mình không xem anime nhưng clip này trông hay đó 😮');
  await addComment(ethanReel, 'ethan', 'Bí mật, tự đi tìm xem Alice nha 😏', c21);
  await addComment(ethanReel, 'charlie', 'Spoiler coi chừng Fiona ơi 😂', c22);

  // --- Diana reel (street food) ---
  var c24 = await addComment(dianaReel, 'bob',     'Diana ơi mình muốn order mang về được không? 😋');
  var c25 = await addComment(dianaReel, 'ethan',   'Nhìn healthy mà ngon, đúng kiểu ăn của mình 💪');
  var c26 = await addComment(dianaReel, 'fiona',   'Màu sắc của đồ ăn đẹp không kém tranh vẽ nha Diana 🎨');
  await addComment(dianaReel, 'diana', 'Haha không ship được Bob ơi, ghé quán trực tiếp nha 😄', c24);
  await addComment(dianaReel, 'hana',  'Fiona nói quá đúng!! Ăn mà như tranh 🥹', c26);

  // --- Hana reel (mukbang) ---
  var c27 = await addComment(hanaReel, 'alice',   'Hana ăn ngon quá mình đang ăn kiêng mà phải bỏ rồi 😭');
  var c28 = await addComment(hanaReel, 'charlie', 'Sound ăn ASMR quá trời Hana ơi 🤤');
  var c29 = await addComment(hanaReel, 'diana',   'Đồng nghiệp ẩm thực đây rồi! Hana biết nhiều quán không?');
  await addComment(hanaReel, 'hana',   'Hihi xin lỗi Alice! 🙈 Mình ăn để review thôi', c27);
  await addComment(hanaReel, 'hana',   'Biết nhiều lắm Diana! Nhắn mình để mình recommend nha 🍜', c29);

  // --- Fiona reel (Aptech 2 / art) ---
  var c30 = await addComment(fionaReel, 'alice',   'Fiona học ở Aptech không? Clip quảng cáo đẹp ghê 😍');
  var c31 = await addComment(fionaReel, 'hana',    'Môi trường học tập mơ ước của mình luôn 🎓');
  await addComment(fionaReel, 'fiona', 'Có Alice ơi! Ngành Multimedia, rất thích 🎨', c30);
  await addComment(fionaReel, 'aptech_vietnam', 'Cảm ơn Fiona đã chia sẻ! Tụi mình tự hào về sinh viên 💙', c30);

  // --- George reel (bóng đá) ---
  var c32 = await addComment(georgeReel, 'charlie', 'VIỆT NAM VÔ ĐỊCH!!! 🇻🇳🔥');
  var c33 = await addComment(georgeReel, 'ethan',   'Cả xóm mình đốt pháo hoa hôm đó luôn 🎆');
  var c34 = await addComment(georgeReel, 'bob',     'Xúc động thật sự, nước mắt rơi không kịp cầm 😭');
  await addComment(georgeReel, 'alice',   'Mình đang xem ở nước ngoài mà hét to tới mức hàng xóm gõ cửa 😂', c32);

  console.log('✓ Reel comments: thêm ' + allComments.length + ' comments + replies');
}

// ─────────────────────────────────────────────
// 4. THÊM LIKES CHO COMMENTS CỦA POST (tương tác thêm)
// ─────────────────────────────────────────────
async function seedMorePostInteractions(map) {
  var posts = await Post.find({}).lean();
  if (posts.length === 0) {
    console.log('⚠ Không có posts — bỏ qua post interactions');
    return;
  }

  // Like thêm một số posts của Aptech-related users
  var aptech = map['aptech_vietnam'];
  if (aptech) {
    var added = 0;
    for (var i = 0; i < Math.min(posts.length, 6); i++) {
      var ok = await safeLike(aptech._id, 'post', posts[i]._id, Post, 'likesCount');
      if (ok) added++;
    }
    if (added > 0) console.log('✓ Aptech like ' + added + ' posts của users');
  }
}

// ─────────────────────────────────────────────
// 5. THÊM NOTIFICATIONS CHO APTECH INTERACTIONS
// ─────────────────────────────────────────────
async function seedAptechNotifications(map, reels) {
  var aptech = map['aptech_vietnam'];
  if (!aptech) return;

  var aptechReels = reels.filter(function (r) {
    return String(r.userId) === String(aptech._id);
  });

  if (aptechReels.length === 0) return;

  var notifData = [];

  // Thông báo follow Aptech
  var followers = ['alice', 'bob', 'charlie', 'ethan', 'fiona', 'hana'];
  followers.forEach(function (username) {
    var u = map[username];
    if (!u) return;
    notifData.push({
      recipientId:   aptech._id,
      senderId:      u._id,
      type:          'follow',
      referenceId:   u._id,
      referenceType: 'user',
      isRead:        false,
    });
  });

  // Thông báo like reel đầu tiên của Aptech
  if (aptechReels[0]) {
    var likers = ['alice', 'bob', 'charlie', 'diana'];
    likers.forEach(function (username) {
      var u = map[username];
      if (!u) return;
      notifData.push({
        recipientId:   aptech._id,
        senderId:      u._id,
        type:          'like',
        referenceId:   aptechReels[0]._id,
        referenceType: 'reel',
        isRead:        false,
      });
    });
  }

  await Notification.insertMany(notifData, { ordered: false });
  console.log('✓ Notifications: thêm ' + notifData.length + ' thông báo cho Aptech');
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối MongoDB:', MONGO_URI);

  var users = await User.find({}).lean();
  if (users.length === 0) {
    console.error('\n❌ Không có user trong DB. Chạy seedAll.js trước!');
    process.exit(1);
  }

  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var reels = await Reel.find({ isDeleted: false }).lean();
  console.log('Tìm thấy ' + users.length + ' users, ' + reels.length + ' reels');

  console.log('\n--- Thêm follows ---');
  await seedMoreFollows(map);

  console.log('\n--- Thêm reel likes ---');
  await seedMoreReelLikes(map, reels);

  console.log('\n--- Thêm reel comments ---');
  await seedMoreReelComments(map, reels);

  console.log('\n--- Thêm post interactions ---');
  await seedMorePostInteractions(map);

  console.log('\n--- Thêm notifications ---');
  await seedAptechNotifications(map, reels);

  console.log('\n' + '='.repeat(55));
  console.log('SEED TƯƠNG TÁC HOÀN TẤT');
  console.log('='.repeat(55));

  await mongoose.disconnect();
  console.log('\nHoàn tất.\n');
}

main().catch(function (err) {
  console.error('\nSeed thất bại:', err.message);
  process.exit(1);
});
