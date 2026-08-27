// seedAll.js
// Tạo toàn bộ dữ liệu mẫu cho tất cả chức năng của ứng dụng
//
// Chạy: node server/seedAll.js
// Lưu ý: XÓA SẠCH toàn bộ dữ liệu cũ rồi mới tạo mới
//
// Dữ liệu tạo ra:
//   10 users (1 super_admin, 1 moderator, 8 user thường)
//   17 follow relationships + blocks
//   18 posts + media (dùng picsum.photos URL, không download)
//   12 comments + 3 replies
//   15 likes (post + comment)
//   6 saved posts
//   6 stories + viewers + likes + comments
//   5 conversations (3 direct + 1 pending + 1 group)
//   14 messages + message reads
//   8 notifications
//   5 reports Post/Story/User theo workflow xử lý mới
//   6 admin logs + 3 user change logs

require('dotenv').config({ path: __dirname + '/.env' });
var mongoose = require('mongoose');

var User               = require('./models/User');
var Follow             = require('./models/Follow');
var Block              = require('./models/Block');
var Post               = require('./models/Post');
var PostMedia          = require('./models/PostMedia');
var Comment            = require('./models/Comment');
var Like               = require('./models/Like');
var SavedPost          = require('./models/SavedPost');
var Story              = require('./models/Story');
var StoryViewer        = require('./models/StoryViewer');
var StoryLike          = require('./models/StoryLike');
var StoryComment       = require('./models/StoryComment');
var Reel               = require('./models/Reel');
var ReelComment        = require('./models/ReelComment');
var Conversation       = require('./models/Conversation');
var ConversationMember = require('./models/ConversationMember');
var Message            = require('./models/Message');
var MessageRead        = require('./models/MessageRead');
var Notification       = require('./models/Notification');
var Report             = require('./models/Report');
var AdminLog           = require('./models/AdminLog');
var UserChangeLog      = require('./models/UserChangeLog');
var { extractHashtags } = require('./utils/hashtags');

var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/instagrams';

// Helper: trả về URL ảnh mẫu từ picsum.photos (không cần download)
function picsumUrl(id) {
  return 'https://picsum.photos/id/' + id + '/800/800';
}

// ─────────────────────────────────────────────
// 1. XÓA DỮ LIỆU CŨ
// ─────────────────────────────────────────────
async function clearAll() {
  console.log('\nXóa dữ liệu cũ...');
  await AdminLog.deleteMany({});
  await UserChangeLog.deleteMany({});
  await Report.deleteMany({});
  await Notification.deleteMany({});
  await MessageRead.deleteMany({});
  await Message.deleteMany({});
  await ConversationMember.deleteMany({});
  await Conversation.deleteMany({});
  await StoryViewer.deleteMany({});
  await StoryLike.deleteMany({});
  await StoryComment.deleteMany({});
  await Story.deleteMany({});
  await ReelComment.deleteMany({});
  await Reel.deleteMany({});
  await SavedPost.deleteMany({});
  await Like.deleteMany({});
  await Comment.deleteMany({});
  await PostMedia.deleteMany({});
  await Post.deleteMany({});
  await Block.deleteMany({});
  await Follow.deleteMany({});
  await User.deleteMany({});
  console.log('  ✓ Đã xóa xong toàn bộ collections');
}

// ─────────────────────────────────────────────
// 2. TẠO USERS
// ─────────────────────────────────────────────
async function seedUsers() {
  var userData = [
    {
      username: 'admin',
      email: 'admin@test.com',
      fullName: 'Super Admin',
      passwordHash: 'Admin@123',
      role: 'super_admin',
      isActive: true,
      isTrusted: true,
      bio: 'Quản trị viên hệ thống',
    },
    {
      username: 'mod',
      email: 'mod@test.com',
      fullName: 'Moderator Phạm',
      passwordHash: 'Mod@123',
      role: 'moderator',
      isActive: true,
      bio: 'Kiểm duyệt viên nội dung',
    },
    {
      username: 'alice',
      email: 'alice@test.com',
      fullName: 'Alice Nguyễn',
      passwordHash: 'User@123',
      role: 'user',
      isActive: true,
      bio: 'Photography lover 📷',
      gender: 'female',
    },
    {
      username: 'bob',
      email: 'bob@test.com',
      fullName: 'Bob Trần',
      passwordHash: 'User@123',
      role: 'user',
      isActive: true,
      bio: 'Coffee & code ☕',
      gender: 'male',
    },
    {
      username: 'charlie',
      email: 'charlie@test.com',
      fullName: 'Charlie Lê',
      passwordHash: 'User@123',
      role: 'user',
      isActive: true,
      bio: 'Travel addict ✈️',
      gender: 'male',
    },
    {
      username: 'diana',
      email: 'diana@test.com',
      fullName: 'Diana Phạm',
      passwordHash: 'User@123',
      role: 'user',
      isActive: true,
      isPrivate: true,  // tài khoản riêng tư — test follow_request
      bio: 'Foodie 🍜',
      gender: 'female',
    },
    {
      username: 'ethan',
      email: 'ethan@test.com',
      fullName: 'Ethan Võ',
      passwordHash: 'User@123',
      role: 'user',
      isActive: true,
      bio: 'Gym & fitness 💪',
      gender: 'male',
    },
    {
      username: 'fiona',
      email: 'fiona@test.com',
      fullName: 'Fiona Đặng',
      passwordHash: 'User@123',
      role: 'user',
      isActive: true,
      bio: 'Art & design 🎨',
      gender: 'female',
    },
    {
      username: 'george',
      email: 'george@test.com',
      fullName: 'George Bùi',
      passwordHash: 'User@123',
      role: 'user',
      isActive: true,
      isBanned: true,   // bị ban — test admin unban
      bio: 'Music is life 🎵',
      gender: 'male',
    },
    {
      username: 'hana',
      email: 'hana@test.com',
      fullName: 'Hana Hồ',
      passwordHash: 'User@123',
      role: 'user',
      isActive: true,
      bio: 'Nature & hiking 🌿',
      gender: 'female',
    },
  ];

  var created = await User.create(userData);

  console.log('\n✓ Tạo ' + created.length + ' users:');
  created.forEach(function (u) {
    var tag = u.role !== 'user' ? '[' + u.role.toUpperCase() + '] ' : '';
    var extra = u.isBanned ? ' (BỊ BAN)' : u.isPrivate ? ' (riêng tư)' : '';
    console.log('  ' + tag + u.username + extra + ' — ' + u.email);
  });

  return created;
}

// ─────────────────────────────────────────────
// 3. TẠO FOLLOW RELATIONSHIPS
// ─────────────────────────────────────────────
async function seedFollows(users) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  // Cặp follow đã accepted
  var acceptedPairs = [
    ['alice', 'bob'],
    ['bob', 'alice'],
    ['alice', 'charlie'],
    ['charlie', 'alice'],
    ['bob', 'charlie'],
    ['charlie', 'bob'],
    ['ethan', 'alice'],
    ['ethan', 'bob'],
    ['alice', 'ethan'],
    ['fiona', 'alice'],
    ['fiona', 'hana'],
    ['hana', 'fiona'],
    ['hana', 'alice'],
    ['george', 'ethan'],
    ['alice', 'fiona'],
  ];

  var followDocs = acceptedPairs.map(function (pair) {
    return {
      followerId: map[pair[0]]._id,
      followingId: map[pair[1]]._id,
      status: 'accepted',
    };
  });

  // Pending (diana isPrivate — bob và charlie gửi follow request)
  followDocs.push({ followerId: map['bob']._id,     followingId: map['diana']._id, status: 'pending' });
  followDocs.push({ followerId: map['charlie']._id, followingId: map['diana']._id, status: 'pending' });

  await Follow.create(followDocs);

  // Cập nhật counter cho accepted pairs
  for (var i = 0; i < acceptedPairs.length; i++) {
    await User.findByIdAndUpdate(map[acceptedPairs[i][0]]._id, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(map[acceptedPairs[i][1]]._id, { $inc: { followersCount: 1 } });
  }

  console.log('\n✓ Tạo ' + followDocs.length + ' follows (' + acceptedPairs.length + ' accepted, 2 pending)');
}

// ─────────────────────────────────────────────
// 4. TẠO BLOCK
// ─────────────────────────────────────────────
async function seedBlocks(users) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var blocks = [
    { blockerId: map['george']._id, blockedId: map['fiona']._id },
    { blockerId: map['bob']._id,    blockedId: map['hana']._id  },
  ];

  await Block.create(blocks);
  console.log('\n✓ Tạo ' + blocks.length + ' blocks (george→fiona, bob→hana)');
}

// ─────────────────────────────────────────────
// 5. TẠO POSTS + MEDIA
// ─────────────────────────────────────────────
async function seedPosts(users) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var postData = [
    // alice — photography
    { username: 'alice', caption: 'Khoảnh khắc vàng trong ngày 📷✨ #photography #golden_hour', picsumId: 10 },
    { username: 'alice', caption: 'Ánh sáng tự nhiên — người bạn tốt nhất của máy ảnh 🌅', picsumId: 76 },
    { username: 'alice', caption: 'Mỗi bức ảnh là một kỷ niệm không thể quên 🎞️ #portrait', picsumId: 190 },
    // bob — coffee & code
    { username: 'bob', caption: 'Sáng nào cũng bắt đầu bằng một ly cà phê ☕ #morning', picsumId: 42 },
    { username: 'bob', caption: 'Code + coffee = perfect combo 💻☕ #devlife', picsumId: 160 },
    { username: 'bob', caption: 'Remote work từ quán yêu thích ✨ #remotework', picsumId: 225 },
    // charlie — travel
    { username: 'charlie', caption: 'Hà Nội buổi sáng sớm — bình yên đến lạ ✈️ #travel #hanoi', picsumId: 28 },
    { username: 'charlie', caption: 'Mỗi chuyến đi là một câu chuyện mới 🌍 #wanderlust', picsumId: 48 },
    { username: 'charlie', caption: 'Hội An về đêm đẹp không kém gì ban ngày 🏮 #hoian', picsumId: 119 },
    // diana — food
    { username: 'diana', caption: 'Phở bò sáng nay ngon không thể tả 🍜 #food #pho', picsumId: 292 },
    { username: 'diana', caption: 'Bánh mì giòn rụm — bữa sáng hoàn hảo 🥖', picsumId: 431 },
    // ethan — fitness
    { username: 'ethan', caption: 'Ngày nào cũng tập, không bỏ buổi nào 💪 #gym', picsumId: 447 },
    { username: 'ethan', caption: 'Kết quả sau 6 tháng kiên trì không bỏ cuộc 🔥 #fitness', picsumId: 396 },
    { username: 'ethan', caption: 'Sáng sớm chạy bộ — bắt đầu ngày đúng cách 🏃 #running', picsumId: 375 },
    // fiona — art
    { username: 'fiona', caption: 'Tác phẩm mới hoàn thành sau 2 tuần vẽ 🎨 #art #painting', picsumId: 152 },
    { username: 'fiona', caption: 'Màu sắc nói lên những điều ngôn từ không diễn đạt được 🌈', picsumId: 167 },
    // hana — nature
    { username: 'hana', caption: 'Trekking Sapa — mệt nhưng xứng đáng từng bước 🌿 #nature', picsumId: 15 },
    { username: 'hana', caption: 'Bình minh trên đỉnh núi — khoảnh khắc đáng trân trọng 🌄', picsumId: 338 },
  ];

  var posts = [];

  for (var i = 0; i < postData.length; i++) {
    var pd = postData[i];
    var user = map[pd.username];

    var post = await Post.create({
      userId: user._id,
      caption: pd.caption,
      hashtags: extractHashtags(pd.caption),
      type: 'image',
    });

    await PostMedia.create({
      postId: post._id,
      mediaType: 'image',
      url: picsumUrl(pd.picsumId),
      width: 800,
      height: 800,
      displayOrder: 0,
    });

    await User.findByIdAndUpdate(user._id, { $inc: { postsCount: 1 } });
    posts.push(post);
    process.stdout.write('.');
  }

  console.log('\n\n✓ Tạo ' + posts.length + ' posts + media');
  return posts;
}

// ─────────────────────────────────────────────
// 6. TẠO COMMENTS + REPLIES
// ─────────────────────────────────────────────
// posts layout:
//   [0-2]  alice (photography)
//   [3-5]  bob   (coffee & code)
//   [6-8]  charlie (travel)
//   [9-10] diana (food)
//   [11-13] ethan (fitness)
//   [14-15] fiona (art)
//   [16-17] hana  (nature)
async function seedComments(users, posts) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var alice   = map['alice'];
  var bob     = map['bob'];
  var charlie = map['charlie'];
  var diana   = map['diana'];
  var ethan   = map['ethan'];
  var fiona   = map['fiona'];
  var hana    = map['hana'];

  var comments = [];

  // rootData: mỗi post nhận comment từ nhiều user khác nhau
  var rootData = [
    // --- posts[0]: alice post 1 ---
    { postIdx: 0, user: bob,     content: 'Đẹp quá bạn ơi! 😍' },
    { postIdx: 0, user: charlie, content: 'Ảnh chất lượng cao thật sự 👏' },
    { postIdx: 0, user: ethan,   content: 'Follow để xem thêm nha!' },
    { postIdx: 0, user: hana,    content: 'Màu sắc chuẩn lắm Alice ơi 🌿' },
    // --- posts[1]: alice post 2 ---
    { postIdx: 1, user: fiona,   content: 'Góc chụp này quá xịn 📷' },
    { postIdx: 1, user: charlie, content: 'Mình cũng muốn học chụp ảnh như bạn!' },
    // --- posts[2]: alice post 3 ---
    { postIdx: 2, user: bob,     content: 'Bức chân dung này cảm xúc thật 🎞️' },
    { postIdx: 2, user: ethan,   content: 'Xuất sắc! Lưu lại để học hỏi 🙌' },
    // --- posts[3]: bob post 1 ---
    { postIdx: 3, user: alice,   content: 'Cà phê ở đâu vậy? Trông ngon ghê!' },
    { postIdx: 3, user: charlie, content: 'Mình cũng team cà phê ☕ +1' },
    { postIdx: 3, user: ethan,   content: 'Buổi sáng không có cà phê là không ổn 😂' },
    // --- posts[4]: bob post 2 ---
    { postIdx: 4, user: alice,   content: 'Dev life chill thật sự! 💻' },
    { postIdx: 4, user: charlie, content: 'Setup remote work của bạn đỉnh vãi 😮' },
    // --- posts[5]: bob post 3 ---
    { postIdx: 5, user: ethan,   content: 'Làm remote mà vẫn năng suất — ngưỡng mộ!' },
    { postIdx: 5, user: hana,    content: 'Quán này view đẹp nhỉ? Địa chỉ đâu bạn?' },
    // --- posts[6]: charlie post 1 ---
    { postIdx: 6, user: alice,   content: 'Hà Nội lần nào cũng thích! 😍' },
    { postIdx: 6, user: bob,     content: 'Cho mình đi cùng next trip với!' },
    { postIdx: 6, user: hana,    content: 'Buổi sáng Hà Nội có một cái gì đó rất riêng 🌸' },
    // --- posts[7]: charlie post 2 ---
    { postIdx: 7, user: alice,   content: 'Đi nhiều thế! Mình ghen tị lắm 😭✈️' },
    { postIdx: 7, user: fiona,   content: 'Mỗi chuyến đi đều để lại dấu ấn nhỉ!' },
    // --- posts[8]: charlie post 3 ---
    { postIdx: 8, user: bob,     content: 'Hội An ban đêm là phải đến một lần!' },
    { postIdx: 8, user: ethan,   content: 'Lần sau rủ mình đi với nha Charlie!' },
    // --- posts[9]: diana post 1 ---
    { postIdx: 9, user: alice,   content: 'Trông ngon muốn chạy ra ăn liền 🤤' },
    { postIdx: 9, user: charlie, content: 'Phở buổi sáng — không gì bằng! 🍜' },
    // --- posts[10]: diana post 2 ---
    { postIdx: 10, user: bob,    content: 'Bánh mì Việt Nam số 1 thế giới 🥖' },
    { postIdx: 10, user: hana,   content: 'Nhìn ảnh thôi đã thèm rồi nè!' },
    // --- posts[11]: ethan post 1 ---
    { postIdx: 11, user: alice,  content: 'Gym bao lâu rồi mà đỉnh vậy anh!' },
    { postIdx: 11, user: bob,    content: 'Motivated quá! Mình cũng phải tập lại thôi 💪' },
    { postIdx: 11, user: charlie, content: 'Consistency is key! Respect 🔥' },
    // --- posts[12]: ethan post 2 ---
    { postIdx: 12, user: alice,  content: 'Transformation thật sự ấn tượng! 🙌' },
    { postIdx: 12, user: hana,   content: 'Kiên trì 6 tháng quả ngọt rồi đây!' },
    // --- posts[13]: ethan post 3 ---
    { postIdx: 13, user: bob,    content: 'Sáng sớm chạy bộ, tinh thần cả ngày 🏃' },
    { postIdx: 13, user: charlie, content: 'Running club có cần thêm người không? 😆' },
    // --- posts[14]: fiona post 1 ---
    { postIdx: 14, user: alice,  content: 'Tác phẩm này đẹp mê hồn! 🎨' },
    { postIdx: 14, user: charlie, content: '2 tuần mà xong — tài năng thật sự!' },
    { postIdx: 14, user: hana,   content: 'Màu sắc hài hòa lắm Fiona ơi 🌈' },
    // --- posts[15]: fiona post 2 ---
    { postIdx: 15, user: alice,  content: 'Triết lý của bạn về màu sắc đúng quá!' },
    { postIdx: 15, user: ethan,  content: 'Mình không biết vẽ nhưng nhìn ảnh này cũng thấy đẹp 😊' },
    // --- posts[16]: hana post 1 ---
    { postIdx: 16, user: alice,  content: 'Sapa đẹp ngây ngất! Mình cũng muốn đi 🌿' },
    { postIdx: 16, user: charlie, content: 'Trekking Sapa — must-do một lần trong đời!' },
    { postIdx: 16, user: fiona,  content: 'Màu xanh tự nhiên đẹp hơn bất kỳ bức tranh nào 🍃' },
    // --- posts[17]: hana post 2 ---
    { postIdx: 17, user: alice,  content: 'Bình minh trên núi là một trong những thứ đẹp nhất 🌄' },
    { postIdx: 17, user: ethan,  content: 'Leo núi xong thấy đời có ý nghĩa hẳn 😂' },
  ];

  for (var i = 0; i < rootData.length; i++) {
    var cd = rootData[i];
    var comment = await Comment.create({
      postId: posts[cd.postIdx]._id,
      userId: cd.user._id,
      content: cd.content,
    });
    await Post.findByIdAndUpdate(posts[cd.postIdx]._id, { $inc: { commentsCount: 1 } });
    comments.push(comment);
  }

  // Reply: chủ post reply lại comment của người khác (tương tác 2 chiều)
  // comments[0]  = bob comment trên posts[0]  (alice's post)
  // comments[8]  = alice comment trên posts[3] (bob's post)
  // comments[15] = alice comment trên posts[6] (charlie's post)
  // comments[22] = alice comment trên posts[9] (diana's post)
  // comments[26] = alice comment trên posts[11] (ethan's post)
  // comments[34] = alice comment trên posts[14] (fiona's post)
  // comments[39] = alice comment trên posts[16] (hana's post)
  var replyData = [
    // alice reply bob trên post của alice
    { postIdx: 0,  user: alice,   content: 'Cảm ơn Bob nhiều nha! 🙏',                   parentIdx: 0  },
    { postIdx: 0,  user: alice,   content: 'Cảm ơn Charlie, mình còn học nhiều lắm 😊',  parentIdx: 1  },
    // bob reply alice trên post của bob
    { postIdx: 3,  user: bob,     content: 'Quán cạnh công viên 23/9 đó Alice, ghé thử!', parentIdx: 8  },
    { postIdx: 3,  user: bob,     content: 'Charlie đồng minh rồi nha ☕☕',              parentIdx: 9  },
    // charlie reply alice và bob trên post của charlie
    { postIdx: 6,  user: charlie, content: 'Next trip Đà Lạt nha Alice, rủ cả Bob luôn!', parentIdx: 15 },
    { postIdx: 6,  user: charlie, content: 'Hana nói đúng, Hà Nội buổi sáng yên bình lắm!', parentIdx: 17 },
    // diana reply alice trên post của diana
    { postIdx: 9,  user: diana,   content: 'Quán Phở Hùng đầu ngõ ấy Alice, ngon lắm!',  parentIdx: 22 },
    // ethan reply alice và bob trên post của ethan
    { postIdx: 11, user: ethan,   content: 'Tập 8 tháng rồi Alice, quan trọng là đều!',   parentIdx: 26 },
    { postIdx: 11, user: ethan,   content: 'Bob cùng tập thì mình kéo dài thêm buổi 😂',  parentIdx: 27 },
    // fiona reply alice trên post của fiona
    { postIdx: 14, user: fiona,   content: 'Cảm ơn Alice! Bạn luôn ủng hộ mình 🎨',      parentIdx: 34 },
    // hana reply alice trên post của hana
    { postIdx: 16, user: hana,    content: 'Đi đi Alice! Mình chỉ đường cho, dễ lắm 🌿', parentIdx: 39 },
    { postIdx: 16, user: hana,    content: 'Charlie nói đúng, ít nhất 1 lần trong đời!',  parentIdx: 40 },
  ];

  for (var j = 0; j < replyData.length; j++) {
    var rd = replyData[j];
    var reply = await Comment.create({
      postId:   posts[rd.postIdx]._id,
      userId:   rd.user._id,
      parentId: comments[rd.parentIdx]._id,
      content:  rd.content,
    });
    comments.push(reply);
  }

  console.log('\n✓ Tạo ' + rootData.length + ' comments + ' + replyData.length + ' replies');
  return comments;
}

// ─────────────────────────────────────────────
// 7. TẠO LIKES (post + comment)
// ─────────────────────────────────────────────
async function seedLikes(users, posts, comments) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var alice   = map['alice'];
  var bob     = map['bob'];
  var charlie = map['charlie'];
  var diana   = map['diana'];
  var ethan   = map['ethan'];
  var fiona   = map['fiona'];
  var hana    = map['hana'];

  // Like posts: [user, postIndex]
  var postLikePairs = [
    [bob,     0],
    [charlie, 0],
    [diana,   0],
    [ethan,   0],
    [alice,   3],
    [charlie, 3],
    [ethan,   3],
    [alice,   6],
    [bob,     6],
    [fiona,   9],
    [alice,   11],
    [bob,     11],
    [charlie, 14],
    [alice,   16],
    [fiona,   16],
  ];

  // Đa dạng cảm xúc cho sinh động (love phổ biến nhất) — xoay vòng theo index
  var REACTION_TYPES = ['love', 'love', 'like', 'haha', 'wow', 'love', 'sad', 'angry'];

  for (var i = 0; i < postLikePairs.length; i++) {
    var user = postLikePairs[i][0];
    var post = posts[postLikePairs[i][1]];
    var reactionType = REACTION_TYPES[i % REACTION_TYPES.length];
    await Like.create({ userId: user._id, targetType: 'post', targetId: post._id, reactionType: reactionType });
    await Post.findByIdAndUpdate(post._id, { $inc: { likesCount: 1 } });
  }

  // Like comments
  // comments[0]  = bob on posts[0]      (alice's photography post 1)
  // comments[1]  = charlie on posts[0]
  // comments[2]  = ethan on posts[0]
  // comments[3]  = hana on posts[0]
  // comments[4]  = fiona on posts[1]
  // comments[8]  = alice on posts[3]    (bob's coffee post 1)
  // comments[9]  = charlie on posts[3]
  // comments[11] = alice on posts[4]    (bob's coffee post 2)
  // comments[15] = alice on posts[6]    (charlie's travel post 1)
  // comments[16] = bob on posts[6]
  // comments[22] = alice on posts[9]    (diana's food post 1)
  // comments[26] = alice on posts[11]   (ethan's fitness post 1)
  // comments[27] = bob on posts[11]
  // comments[33] = alice on posts[14]   (fiona's art post 1)
  // comments[34] = charlie on posts[14]
  // comments[38] = alice on posts[16]   (hana's nature post 1)
  // comments[43] = alice reply trên posts[0]
  // comments[45] = bob reply trên posts[3]
  // comments[47] = charlie reply trên posts[6]
  var commentLikePairs = [
    // comment trên bài alice — nhiều người thả tim
    [alice,   comments[0]],   // alice thích lời khen của bob
    [charlie, comments[0]],   // charlie đồng tình với bob
    [ethan,   comments[0]],   // ethan thích bob comment
    [alice,   comments[1]],   // alice thích charlie khen
    [bob,     comments[1]],   // bob thích charlie khen alice
    [hana,    comments[2]],   // hana thích ethan comment
    [alice,   comments[3]],   // alice thích hana comment
    [bob,     comments[4]],   // bob thích fiona nhận xét ảnh
    // comment trên bài bob — alice và charlie thả tim
    [bob,     comments[8]],   // bob thích alice hỏi quán
    [charlie, comments[8]],   // charlie cũng thả tim alice
    [alice,   comments[9]],   // alice thích charlie đồng đội cà phê
    [ethan,   comments[9]],   // ethan cũng team cà phê
    [alice,   comments[11]],  // alice thích dev life comment
    // comment trên bài charlie — alice và hana thả tim
    [charlie, comments[15]],  // charlie thích alice comment bài mình
    [alice,   comments[16]],  // alice thích bob muốn đi cùng
    [hana,    comments[16]],  // hana cũng thích bob
    [charlie, comments[17]],  // charlie thích hana nhận xét
    // comment trên bài diana
    [diana,   comments[22]],  // diana thích alice khen phở
    [charlie, comments[22]],  // charlie cũng thích alice comment
    [alice,   comments[23]],  // alice thích charlie khen phở
    // comment trên bài ethan
    [ethan,   comments[26]],  // ethan thích alice hỏi
    [alice,   comments[27]],  // alice thích bob motivated
    [charlie, comments[27]],  // charlie cũng thích bob
    [ethan,   comments[28]],  // ethan thích charlie respect
    // comment trên bài fiona
    [fiona,   comments[33]],  // fiona thích alice khen tranh
    [alice,   comments[34]],  // alice thích charlie khen fiona
    [fiona,   comments[35]],  // fiona thích hana nhận xét màu sắc
    // comment trên bài hana
    [hana,    comments[38]],  // hana thích alice muốn đi Sapa
    [alice,   comments[39]],  // alice thích charlie nói must-do
    [hana,    comments[40]],  // hana thích fiona so sánh tranh
    // reply được thả tim
    [bob,     comments[43]],  // bob thích alice cảm ơn mình
    [charlie, comments[44]],  // charlie thích alice reply mình
    [alice,   comments[45]],  // alice thích bob chỉ quán cà phê
    [alice,   comments[47]],  // alice thích charlie rủ đi Đà Lạt
    [bob,     comments[47]],  // bob cũng thích
  ];

  for (var j = 0; j < commentLikePairs.length; j++) {
    var cu = commentLikePairs[j][0];
    var cm = commentLikePairs[j][1];
    if (!cm) continue; // bỏ qua nếu index không tồn tại
    await Like.create({ userId: cu._id, targetType: 'comment', targetId: cm._id });
    await Comment.findByIdAndUpdate(cm._id, { $inc: { likesCount: 1 } });
  }

  console.log('\n✓ Tạo ' + postLikePairs.length + ' post likes + ' + commentLikePairs.length + ' comment likes');
}

// ─────────────────────────────────────────────
// 8. TẠO SAVED POSTS
// ─────────────────────────────────────────────
async function seedSavedPosts(users, posts) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var savedDocs = [
    { userId: map['alice']._id,   postId: posts[3]._id,  collectionName: 'Yêu thích'  },
    { userId: map['alice']._id,   postId: posts[6]._id,  collectionName: 'Du lịch'    },
    { userId: map['alice']._id,   postId: posts[11]._id, collectionName: 'Tất cả'     },
    { userId: map['bob']._id,     postId: posts[0]._id,  collectionName: 'Tất cả'     },
    { userId: map['bob']._id,     postId: posts[14]._id, collectionName: 'Nghệ thuật' },
    { userId: map['charlie']._id, postId: posts[9]._id,  collectionName: 'Ẩm thực'   },
  ];

  await SavedPost.create(savedDocs);
  console.log('\n✓ Tạo ' + savedDocs.length + ' saved posts (3 bộ sưu tập)');
}

// ─────────────────────────────────────────────
// 9. TẠO STORIES + VIEWERS
// ─────────────────────────────────────────────
async function seedStories(users) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var now       = new Date();
  var expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h sau

  var storyDocs = [
    { userId: map['alice']._id,   mediaUrl: picsumUrl(20),  mediaType: 'image', caption: 'Buổi sáng đẹp 🌞',     expiresAt },
    { userId: map['alice']._id,   mediaUrl: picsumUrl(30),  mediaType: 'image', caption: 'Chiều tà 🌆',           expiresAt },
    { userId: map['bob']._id,     mediaUrl: picsumUrl(50),  mediaType: 'image', caption: 'Coffee time ☕',         expiresAt },
    { userId: map['charlie']._id, mediaUrl: picsumUrl(70),  mediaType: 'image', caption: 'On the road ✈️',        expiresAt },
    { userId: map['ethan']._id,   mediaUrl: picsumUrl(90),  mediaType: 'image', caption: 'Gym session 💪',         expiresAt },
    { userId: map['hana']._id,    mediaUrl: picsumUrl(110), mediaType: 'image', caption: 'Rừng xanh 🌿',          expiresAt },
  ];

  var stories = await Story.create(storyDocs);

  // StoryViewers
  var viewerDocs = [
    { storyId: stories[0]._id, viewerId: map['bob']._id     },
    { storyId: stories[0]._id, viewerId: map['charlie']._id },
    { storyId: stories[0]._id, viewerId: map['ethan']._id   },
    { storyId: stories[1]._id, viewerId: map['ethan']._id   },
    { storyId: stories[1]._id, viewerId: map['fiona']._id   },
    { storyId: stories[2]._id, viewerId: map['alice']._id   },
    { storyId: stories[2]._id, viewerId: map['charlie']._id },
    { storyId: stories[3]._id, viewerId: map['alice']._id   },
    { storyId: stories[4]._id, viewerId: map['alice']._id   },
    { storyId: stories[5]._id, viewerId: map['fiona']._id   },
  ];

  await StoryViewer.create(viewerDocs);

  var storyLikeDocs = [
    { storyId: stories[0]._id, userId: map['bob']._id },
    { storyId: stories[0]._id, userId: map['charlie']._id },
    { storyId: stories[2]._id, userId: map['alice']._id },
    { storyId: stories[3]._id, userId: map['fiona']._id },
    { storyId: stories[4]._id, userId: map['hana']._id },
  ];
  var storyCommentDocs = [
    { storyId: stories[0]._id, userId: map['bob']._id, content: 'Buổi sáng đẹp quá Alice ơi!' },
    { storyId: stories[2]._id, userId: map['alice']._id, content: 'Quán này ở đâu vậy Bob?' },
    { storyId: stories[3]._id, userId: map['ethan']._id, content: 'Chuyến đi nhìn tuyệt quá!' },
    { storyId: stories[5]._id, userId: map['fiona']._id, content: 'Màu xanh rất thư giãn 🌿' },
  ];
  await StoryLike.create(storyLikeDocs);
  await StoryComment.create(storyCommentDocs);

  // Cập nhật viewsCount
  for (var i = 0; i < viewerDocs.length; i++) {
    await Story.findByIdAndUpdate(viewerDocs[i].storyId, { $inc: { viewsCount: 1 } });
  }

  console.log('\n✓ Tạo ' + stories.length + ' stories, ' + viewerDocs.length + ' viewers, ' + storyLikeDocs.length + ' likes, ' + storyCommentDocs.length + ' comments');
  return stories;
}

// ─────────────────────────────────────────────
// 10. TẠO CONVERSATIONS + MEMBERS
// ─────────────────────────────────────────────
async function seedConversations(users) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var now = new Date();

  // Direct: alice ↔ bob
  var convAB = await Conversation.create({ type: 'direct', createdBy: map['alice']._id, lastActivityAt: now });
  await ConversationMember.create([
    { conversationId: convAB._id, userId: map['alice']._id, role: 'member', status: 'accepted' },
    { conversationId: convAB._id, userId: map['bob']._id,   role: 'member', status: 'accepted' },
  ]);

  // Direct: alice ↔ charlie
  var convAC = await Conversation.create({ type: 'direct', createdBy: map['alice']._id, lastActivityAt: now });
  await ConversationMember.create([
    { conversationId: convAC._id, userId: map['alice']._id,   role: 'member', status: 'accepted' },
    { conversationId: convAC._id, userId: map['charlie']._id, role: 'member', status: 'accepted' },
  ]);

  // Direct: bob ↔ ethan
  var convBE = await Conversation.create({ type: 'direct', createdBy: map['bob']._id, lastActivityAt: now });
  await ConversationMember.create([
    { conversationId: convBE._id, userId: map['bob']._id,   role: 'member', status: 'accepted' },
    { conversationId: convBE._id, userId: map['ethan']._id, role: 'member', status: 'accepted' },
  ]);

  // Pending: alice → diana (diana isPrivate nên cần chấp nhận)
  var convAD = await Conversation.create({ type: 'direct', createdBy: map['alice']._id, lastActivityAt: now });
  await ConversationMember.create([
    { conversationId: convAD._id, userId: map['alice']._id, role: 'member', status: 'accepted' },
    { conversationId: convAD._id, userId: map['diana']._id, role: 'member', status: 'pending'  },
  ]);

  // Group: alice(admin), bob, charlie, ethan
  var groupConv = await Conversation.create({
    type: 'group',
    name: 'Nhóm bạn thân 🌟',
    createdBy: map['alice']._id,
    lastActivityAt: now,
  });
  await ConversationMember.create([
    { conversationId: groupConv._id, userId: map['alice']._id,   role: 'admin',  status: 'accepted' },
    { conversationId: groupConv._id, userId: map['bob']._id,     role: 'member', status: 'accepted' },
    { conversationId: groupConv._id, userId: map['charlie']._id, role: 'member', status: 'accepted' },
    { conversationId: groupConv._id, userId: map['ethan']._id,   role: 'member', status: 'accepted' },
  ]);

  // Group 2: bob(admin/trưởng nhóm), charlie, ethan — nhóm 3 người
  // Dùng để test rời nhóm + chuyển quyền nhóm trưởng (bob rời → charlie/ethan lên thay)
  var groupConv2 = await Conversation.create({
    type: 'group',
    name: 'Nhóm Aptech 💻',
    createdBy: map['bob']._id,
    lastActivityAt: now,
  });
  await ConversationMember.create([
    { conversationId: groupConv2._id, userId: map['bob']._id,     role: 'admin',  status: 'accepted' },
    { conversationId: groupConv2._id, userId: map['charlie']._id, role: 'member', status: 'accepted' },
    { conversationId: groupConv2._id, userId: map['ethan']._id,   role: 'member', status: 'accepted' },
  ]);
  await Message.create([
    { conversationId: groupConv2._id, senderId: map['bob']._id,     type: 'text', content: 'Mọi người ơi, deadline đồ án tuần sau nhé!' },
    { conversationId: groupConv2._id, senderId: map['charlie']._id, type: 'text', content: 'Ok bob, mình lo phần backend 💪' },
    { conversationId: groupConv2._id, senderId: map['ethan']._id,   type: 'text', content: 'Mình làm phần UI nha' },
  ]);

  console.log('\n✓ Tạo 6 conversations (3 direct, 1 pending, 2 group)');
  return { convAB, convAC, convBE, convAD, groupConv, groupConv2 };
}

// ─────────────────────────────────────────────
// 11. TẠO MESSAGES + MESSAGE READS
// ─────────────────────────────────────────────
async function seedMessages(users, convs) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var alice   = map['alice'];
  var bob     = map['bob'];
  var charlie = map['charlie'];
  var ethan   = map['ethan'];

  var msgs = await Message.create([
    // alice ↔ bob
    { conversationId: convs.convAB._id, senderId: alice._id,   type: 'text', content: 'Chào Bob! Lâu rồi không nói chuyện 😊' },
    { conversationId: convs.convAB._id, senderId: bob._id,     type: 'text', content: 'Chào Alice! Mình vẫn khoẻ, bạn thì sao?' },
    { conversationId: convs.convAB._id, senderId: alice._id,   type: 'text', content: 'Mình cũng ổn! Tuần này có rảnh không, ra cà phê đi?' },
    { conversationId: convs.convAB._id, senderId: bob._id,     type: 'text', content: 'Cuối tuần này được, mình sắp xếp nhé!' },
    // alice ↔ charlie
    { conversationId: convs.convAC._id, senderId: charlie._id, type: 'text', content: 'Alice ơi, ảnh hôm qua đẹp lắm!' },
    { conversationId: convs.convAC._id, senderId: alice._id,   type: 'text', content: 'Cảm ơn bạn, mình mới học chụp thôi 🙈' },
    { conversationId: convs.convAC._id, senderId: charlie._id, type: 'text', content: 'Chụp chuẩn lắm rồi, không cần học thêm nhiều nữa đâu!' },
    // bob ↔ ethan
    { conversationId: convs.convBE._id, senderId: bob._id,     type: 'text', content: 'Ethan, gym hôm nay đi không?' },
    { conversationId: convs.convBE._id, senderId: ethan._id,   type: 'text', content: 'Có chứ! 6h tối nhe, gặp ở đó!' },
    // group
    { conversationId: convs.groupConv._id, senderId: alice._id,   type: 'text', content: 'Chào cả nhóm! Mình lập nhóm để dễ liên lạc nè 👋' },
    { conversationId: convs.groupConv._id, senderId: bob._id,     type: 'text', content: 'Hay đó! Cuối tuần tụ tập không?' },
    { conversationId: convs.groupConv._id, senderId: charlie._id, type: 'text', content: 'Mình in! Thứ 7 hay Chủ nhật?' },
    { conversationId: convs.groupConv._id, senderId: ethan._id,   type: 'text', content: 'Thứ 7 nhe mọi người! 🎉' },
    { conversationId: convs.groupConv._id, senderId: alice._id,   type: 'text', content: 'OK confirmed! Mình book chỗ trước nhé 🙌' },
  ]);

  // MessageRead: alice đã đọc hết tin nhắn trong conv AB
  var abMsgs = msgs.filter(function (m) {
    return String(m.conversationId) === String(convs.convAB._id);
  });

  var readDocs = abMsgs.map(function (m) {
    return { messageId: m._id, userId: alice._id, readAt: new Date() };
  });

  if (readDocs.length > 0) {
    await MessageRead.create(readDocs);
  }

  console.log('\n✓ Tạo ' + msgs.length + ' messages + ' + readDocs.length + ' message reads');
  return msgs;
}

// ─────────────────────────────────────────────
// 12. TẠO NOTIFICATIONS
// ─────────────────────────────────────────────
async function seedNotifications(users, posts) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var notifDocs = [
    // like notification
    { recipientId: map['alice']._id,  senderId: map['bob']._id,     type: 'like',           referenceId: posts[0]._id,         referenceType: 'post', isRead: false },
    { recipientId: map['alice']._id,  senderId: map['charlie']._id, type: 'like',           referenceId: posts[0]._id,         referenceType: 'post', isRead: true  },
    // comment notification
    { recipientId: map['alice']._id,  senderId: map['bob']._id,     type: 'comment',        referenceId: posts[0]._id,         referenceType: 'post', isRead: false },
    { recipientId: map['bob']._id,    senderId: map['alice']._id,   type: 'comment',        referenceId: posts[3]._id,         referenceType: 'post', isRead: false },
    // follow notification
    { recipientId: map['alice']._id,  senderId: map['ethan']._id,   type: 'follow',         referenceId: map['ethan']._id,     referenceType: 'user', isRead: true  },
    { recipientId: map['bob']._id,    senderId: map['alice']._id,   type: 'follow',         referenceId: map['alice']._id,     referenceType: 'user', isRead: false },
    // follow_request (diana isPrivate)
    { recipientId: map['diana']._id,  senderId: map['bob']._id,     type: 'follow_request', referenceId: map['bob']._id,       referenceType: 'user', isRead: false },
    // mention — ai đó nhắc tên trong bình luận
    { recipientId: map['alice']._id,  senderId: map['charlie']._id, type: 'mention',        referenceId: posts[1]._id,         referenceType: 'post', isRead: false },
    // reply — ai đó trả lời bình luận của mình
    { recipientId: map['bob']._id,    senderId: map['ethan']._id,   type: 'reply',          referenceId: posts[2]._id,         referenceType: 'post', isRead: false },
    // verification_approved — admin duyệt tích xanh
    { recipientId: map['bob']._id,    senderId: null,               type: 'verification_approved', referenceId: null,          referenceType: '',     isRead: false },
    // verification_rejected — admin từ chối tích xanh
    { recipientId: map['charlie']._id, senderId: null,              type: 'verification_rejected', referenceId: null,          referenceType: '',     isRead: false },
    // verification_revoked — admin thu hồi tích xanh (kèm lý do trong message)
    { recipientId: map['ethan']._id,  senderId: null,               type: 'verification_revoked',  referenceId: null,          referenceType: '',     isRead: false, message: 'Vi phạm tiêu chuẩn cộng đồng' },
    // post_removed — admin gỡ bài viết vi phạm
    { recipientId: map['diana']._id,  senderId: null,               type: 'post_removed',   referenceId: null,                 referenceType: '',     isRead: false },
    // system notification (admin ban george)
    { recipientId: map['george']._id, senderId: null,               type: 'account_banned', referenceId: null,                 referenceType: '',     isRead: false },
  ];

  await Notification.create(notifDocs);
  console.log('\n✓ Tạo ' + notifDocs.length + ' notifications (like, comment, follow, follow_request, mention, reply, verification_*, post_removed, ban)');
}

// ─────────────────────────────────────────────
// 13. TẠO REPORTS
// ─────────────────────────────────────────────
async function seedReports(users, posts, stories) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var reportDocs = [
    // pending
    {
      reporterId: map['alice']._id,
      targetId:   posts[11]._id,
      targetType: 'post',
      reason:     'inappropriate',
      description: 'Bài viết có nội dung không phù hợp với cộng đồng',
      status:     'pending',
    },
    {
      reporterId: map['bob']._id,
      targetId:   map['george']._id,
      targetType: 'user',
      reason:     'harassment',
      description: 'User này liên tục có hành vi quấy rối người khác',
      status:     'pending',
    },
    {
      reporterId: map['charlie']._id,
      targetId:   stories[4]._id,
      targetType: 'story',
      reason:     'spam',
      description: 'Story đăng nội dung quảng cáo lặp đi lặp lại',
      status:     'pending',
    },
    // resolved
    {
      reporterId:  map['alice']._id,
      targetId:    posts[0]._id,
      targetType:  'post',
      reason:      'fake',
      description: 'Ảnh bị chỉnh sửa quá mức, không trung thực',
      status:      'resolved',
      reviewedBy:  map['admin']._id,
      resolutionAction: 'no_action',
      resolutionNote: 'Đã kiểm tra, nội dung không vi phạm tiêu chuẩn cộng đồng.',
      reviewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      reporterId:  map['bob']._id,
      targetId:    stories[3]._id,
      targetType:  'story',
      reason:      'violence',
      description: 'Hình ảnh có thể gây khó chịu cho người xem',
      status:      'resolved',
      reviewedBy:  map['mod']._id,
      resolutionAction: 'no_action',
      resolutionNote: 'Story không chứa hình ảnh bạo lực sau khi kiểm tra.',
      reviewedAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  ];

  var reports = await Report.create(reportDocs);
  console.log('\n✓ Tạo ' + reportDocs.length + ' reports Post/Story/User (3 pending, 2 processed)');
  return reports;
}

// ─────────────────────────────────────────────
// 14. TẠO ADMIN LOGS
// ─────────────────────────────────────────────
async function seedAdminLogs(users, reports) {
  var map = {};
  users.forEach(function (u) { map[u.username] = u; });

  var logDocs = [
    {
      adminId:    map['admin']._id,
      action:     'ban_user',
      targetId:   map['george']._id,
      targetType: 'user',
      note:       'Vi phạm điều khoản sử dụng nhiều lần — hành vi spam + harassment',
    },
    {
      adminId:    map['admin']._id,
      action:     'trust_user',
      targetId:   map['alice']._id,
      targetType: 'user',
      note:       'Cấp tick xanh cho content creator nổi bật',
    },
    {
      adminId:    map['mod']._id,
      action:     'handle_report',
      targetId:   reports[4]._id,
      targetType: 'report',
      note:       reports[4].resolutionNote,
    },
    {
      adminId:    map['admin']._id,
      action:     'handle_report',
      targetId:   reports[3]._id,
      targetType: 'report',
      note:       reports[3].resolutionNote,
    },
    {
      adminId:    map['admin']._id,
      action:     'delete_post',
      targetId:   null,
      targetType: 'post',
      note:       'Xóa bài có nội dung bạo lực theo báo cáo',
    },
    {
      adminId:    map['admin']._id,
      action:     'update_role',
      targetId:   map['mod']._id,
      targetType: 'user',
      note:       'Nâng lên moderator để hỗ trợ kiểm duyệt',
    },
  ];

  await AdminLog.create(logDocs);
  console.log('\n✓ Tạo ' + logDocs.length + ' admin logs');
}

async function seedUserChangeLogs(users) {
  var map = {};
  users.forEach(function (user) { map[user.username] = user; });
  var logs = [
    { userId: map['alice']._id, changeType: 'verified', oldValue: 'false', newValue: 'true', changedBy: map['admin']._id, source: 'admin' },
    { userId: map['george']._id, changeType: 'banned', oldValue: 'false', newValue: 'true', changedBy: map['admin']._id, source: 'admin' },
    { userId: map['bob']._id, changeType: 'bio_changed', oldValue: '', newValue: map['bob'].bio || '', changedBy: map['bob']._id, source: 'user' },
  ];
  await UserChangeLog.create(logs);
  console.log('\n✓ Tạo ' + logs.length + ' user change logs');
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối MongoDB:', MONGO_URI);

  await clearAll();

  var users    = await seedUsers();
  await seedFollows(users);
  await seedBlocks(users);
  var posts    = await seedPosts(users);
  var comments = await seedComments(users, posts);
  await seedLikes(users, posts, comments);
  await seedSavedPosts(users, posts);
  var stories  = await seedStories(users);
  var convs    = await seedConversations(users);
  await seedMessages(users, convs);
  await seedNotifications(users, posts);
  var reports  = await seedReports(users, posts, stories);
  await seedAdminLogs(users, reports);
  await seedUserChangeLogs(users);

  console.log('\n' + '='.repeat(55));
  console.log('SEED HOÀN TẤT — Tài khoản đăng nhập:');
  console.log('='.repeat(55));
  console.log('  admin   / Admin@123  → super_admin, tick xanh');
  console.log('  mod     / Mod@123    → moderator');
  console.log('  alice   / User@123   → tick xanh, public');
  console.log('  bob     / User@123   → public');
  console.log('  charlie / User@123   → public');
  console.log('  diana   / User@123   → private account');
  console.log('  ethan   / User@123   → public');
  console.log('  fiona   / User@123   → public');
  console.log('  george  / User@123   → BỊ BAN');
  console.log('  hana    / User@123   → public');
  console.log('='.repeat(55));

  await mongoose.disconnect();
  console.log('\nHoàn tất.\n');
}

main().catch(function (err) {
  console.error('\nSeed thất bại:', err.message);
  process.exit(1);
});
