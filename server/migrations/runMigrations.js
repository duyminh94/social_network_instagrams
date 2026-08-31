// migrations/runMigrations.js
// Các bước cập nhật dữ liệu cũ cho khớp schema mới — chạy tự động khi server khởi động.
//
// Nguyên tắc của mọi migration ở đây:
//   1. Chỉ đụng vào document THIẾU dữ liệu mới (dùng $exists / $eq null làm điều kiện lọc)
//      → chạy lại nhiều lần vẫn ra cùng kết quả, không nhân đôi dữ liệu (idempotent)
//   2. Lỗi của 1 bước không được làm sập server → mỗi bước bọc try/catch riêng
//   3. Chỉ log khi thực sự có record được cập nhật, tránh làm rối console mỗi lần restart
//
// Thêm migration mới: viết thêm 1 hàm rồi gọi trong runMigrations() ở cuối file.

const ConversationMember = require('../models/ConversationMember');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Post = require('../models/Post');
const Story = require('../models/Story');
const StoryLike = require('../models/StoryLike');
const StoryComment = require('../models/StoryComment');
const SavedPost = require('../models/SavedPost');
const Collection = require('../models/Collection');

// Đặt status='accepted' cho thành viên chat tạo từ trước khi có tính năng "tin nhắn đang chờ"
async function migrateConversationMemberStatus() {
  const result = await ConversationMember.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'accepted' } }
  );
  if (result.modifiedCount > 0) {
    console.log('[migration] ConversationMember.status: cập nhật', result.modifiedCount, 'record');
  }
}

// Xóa hẳn các field reel cũ còn sót trong collection posts.
// Reel đã có collection riêng (models/Reel.js) nên các field này là dữ liệu chết.
//
// QUAN TRỌNG — phải truyền { strict: false }:
//   Mặc định Mongoose chạy strict mode, tự loại khỏi lệnh update mọi field không có
//   trong schema. 6 field này vừa bị gỡ khỏi Post schema, nên $unset sẽ bị lọc sạch
//   và lệnh update thành rỗng — chạy không báo lỗi nhưng cũng không xóa được gì.
//   strict: false cho phép thao tác trên field đã gỡ khỏi schema.
async function migrateRemoveLegacyReelFields() {
  const legacyFields = {
    reelAudioUrl: '',
    reelAudioName: '',
    reelFilter: '',
    reelTrimStart: '',
    reelTrimEnd: '',
    reelDuration: '',
  };

  const result = await Post.updateMany(
    // Chỉ những bài còn ít nhất 1 field cũ mới cần xử lý
    { $or: Object.keys(legacyFields).map((field) => ({ [field]: { $exists: true } })) },
    { $unset: legacyFields },
    { strict: false }
  );
  if (result.modifiedCount > 0) {
    console.log('[migration] Post: xóa field reel cũ trên', result.modifiedCount, 'bài viết');
  }
}

// Điền lastMessageId cho các conversation tạo trước khi có field này.
// Duyệt từng conversation vì mỗi cái cần tin nhắn cuối riêng — số conversation cũ có hạn.
async function migrateConversationLastMessage() {
  const conversations = await Conversation.find({ lastMessageId: { $in: [null, undefined] } })
    .select('_id')
    .lean();

  let updated = 0;
  for (const conv of conversations) {
    const lastMessage = await Message.findOne({ conversationId: conv._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .select('_id')
      .lean();

    // Conversation chưa có tin nhắn nào thì để null, không cần update
    if (!lastMessage) {
      continue;
    }

    await Conversation.updateOne({ _id: conv._id }, { $set: { lastMessageId: lastMessage._id } });
    updated += 1;
  }

  if (updated > 0) {
    console.log('[migration] Conversation.lastMessageId: điền cho', updated, 'cuộc trò chuyện');
  }
}

// Điền likesCount/commentsCount cho story cũ — trước đây đếm bằng countDocuments mỗi lần đọc.
// Story sống 24h nên số lượng cần backfill luôn nhỏ.
async function migrateStoryCounters() {
  const stories = await Story.find({
    $or: [
      { likesCount: { $exists: false } },
      { commentsCount: { $exists: false } },
    ],
  })
    .select('_id')
    .lean();

  let updated = 0;
  for (const story of stories) {
    const likesCount = await StoryLike.countDocuments({ storyId: story._id });
    const commentsCount = await StoryComment.countDocuments({ storyId: story._id, isDeleted: false });

    await Story.updateOne(
      { _id: story._id },
      { $set: { likesCount: likesCount, commentsCount: commentsCount } }
    );
    updated += 1;
  }

  if (updated > 0) {
    console.log('[migration] Story: điền likesCount/commentsCount cho', updated, 'story');
  }
}

// Chuyển bài đã lưu từ collectionName (chuỗi lặp trong từng SavedPost)
// sang model Collection riêng + targetType/targetId.
//
// Các bước cho mỗi user có bài đã lưu:
//   1. Gom các collectionName của user → tạo document Collection tương ứng
//   2. Trỏ từng SavedPost sang collectionId + đặt targetType='post', targetId=postId
//   3. Tính lại itemsCount cho từng bộ sưu tập
// Cuối cùng gỡ index cũ (userId, postId) và xoá 2 field không còn dùng.
//
// Dùng .collection (driver gốc) khi đọc/ghi field cũ vì chúng đã bị gỡ khỏi schema,
// Mongoose strict mode sẽ lọc mất — cùng lý do với migration bỏ field reel ở trên.
async function migrateSavedPostToCollection() {
  const rawSaved = SavedPost.collection;

  // Chỉ những bản ghi chưa chuyển mới cần xử lý
  const pendingItems = await rawSaved.find({ collectionId: { $exists: false } }).toArray();
  if (pendingItems.length === 0) {
    // Vẫn dọn index/field thừa phòng trường hợp lần chạy trước dừng giữa chừng
    await cleanupLegacySavedPostFields();
    return;
  }

  // Gom theo user để mỗi user chỉ tạo bộ sưu tập một lần
  const itemsByUser = new Map();
  for (const item of pendingItems) {
    const key = item.userId.toString();
    if (!itemsByUser.has(key)) {
      itemsByUser.set(key, []);
    }
    itemsByUser.get(key).push(item);
  }

  let movedItems = 0;
  let createdCollections = 0;

  for (const [userId, items] of itemsByUser) {
    // Map tên bộ sưu tập → document Collection, tạo nếu chưa có
    const collectionByName = new Map();

    for (const item of items) {
      const name = (item.collectionName || Collection.DEFAULT_COLLECTION_NAME).trim()
        || Collection.DEFAULT_COLLECTION_NAME;

      if (!collectionByName.has(name)) {
        let collection = await Collection.findOne({ userId: userId, name: name });
        if (!collection) {
          collection = await Collection.create({
            userId: userId,
            name: name,
            isDefault: name === Collection.DEFAULT_COLLECTION_NAME,
          });
          createdCollections += 1;
        }
        collectionByName.set(name, collection);
      }

      const collection = collectionByName.get(name);
      await rawSaved.updateOne(
        { _id: item._id },
        {
          $set: {
            targetType: 'post',
            targetId: item.postId,
            collectionId: collection._id,
          },
        }
      );
      movedItems += 1;
    }

    // Đếm lại số mục thực tế của từng bộ sưu tập vừa xử lý
    for (const collection of collectionByName.values()) {
      const itemsCount = await rawSaved.countDocuments({ collectionId: collection._id });
      await Collection.updateOne({ _id: collection._id }, { $set: { itemsCount: itemsCount } });
    }
  }

  await cleanupLegacySavedPostFields();

  console.log(
    '[migration] SavedPost → Collection: tạo', createdCollections,
    'bộ sưu tập, chuyển', movedItems, 'mục đã lưu'
  );
}

// Gỡ index cũ (userId, postId) và xoá field postId/collectionName không còn dùng.
// Tách riêng để migration chính gọi được ở cả 2 nhánh (có và không có dữ liệu cần chuyển).
async function cleanupLegacySavedPostFields() {
  const rawSaved = SavedPost.collection;

  // Index cũ chặn việc có nhiều bản ghi thiếu postId → phải gỡ trước khi $unset
  try {
    await rawSaved.dropIndex('userId_1_postId_1');
    console.log('[migration] SavedPost: đã gỡ index cũ userId_1_postId_1');
  } catch (error) {
    // IndexNotFound (27) = đã gỡ ở lần chạy trước, không phải lỗi
    if (error.code !== 27 && !/index not found/i.test(error.message)) {
      throw error;
    }
  }

  const result = await rawSaved.updateMany(
    { $or: [{ postId: { $exists: true } }, { collectionName: { $exists: true } }] },
    { $unset: { postId: '', collectionName: '' } }
  );
  if (result.modifiedCount > 0) {
    console.log('[migration] SavedPost: xoá field cũ trên', result.modifiedCount, 'bản ghi');
  }
}

// Dựng collection hashtags từ mảng hashtags đang nằm trong Post và Reel.
//
// Chỉ chạy khi collection hashtags còn rỗng — sau lần đầu, counter được duy trì
// bởi syncHashtagCounts() ở postController/reelController, không dựng lại nữa
// (dựng lại sẽ ghi đè followersCount mà user đã tạo).
async function migrateBuildHashtags() {
  const Hashtag = require('../models/Hashtag');
  const Reel = require('../models/Reel');

  const existing = await Hashtag.estimatedDocumentCount();
  if (existing > 0) {
    return;
  }

  // Đếm số bài / số reel cho từng tag bằng aggregate — chỉ chạy đúng 1 lần
  const postRows = await Post.aggregate([
    { $match: { isDeleted: false, hashtags: { $exists: true, $ne: [] } } },
    { $unwind: '$hashtags' },
    { $group: { _id: '$hashtags', count: { $sum: 1 }, lastUsedAt: { $max: '$createdAt' } } },
  ]);

  const reelRows = await Reel.aggregate([
    { $match: { isDeleted: false, hashtags: { $exists: true, $ne: [] } } },
    { $unwind: '$hashtags' },
    { $group: { _id: '$hashtags', count: { $sum: 1 }, lastUsedAt: { $max: '$createdAt' } } },
  ]);

  // Gộp kết quả 2 nguồn vào một map theo tên tag
  const tagMap = new Map();

  function collect(rows, field) {
    for (const row of rows) {
      const name = row._id;
      if (!tagMap.has(name)) {
        tagMap.set(name, { name: name, postsCount: 0, reelsCount: 0, lastUsedAt: row.lastUsedAt });
      }
      const entry = tagMap.get(name);
      entry[field] = row.count;
      // Giữ mốc thời gian mới nhất giữa post và reel
      if (row.lastUsedAt && (!entry.lastUsedAt || row.lastUsedAt > entry.lastUsedAt)) {
        entry.lastUsedAt = row.lastUsedAt;
      }
    }
  }

  collect(postRows, 'postsCount');
  collect(reelRows, 'reelsCount');

  if (tagMap.size === 0) {
    return;
  }

  await Hashtag.insertMany(Array.from(tagMap.values()));
  console.log('[migration] Hashtag: dựng', tagMap.size, 'tag từ bài viết và reel hiện có');
}

// Chạy lần lượt tất cả migration. Một bước lỗi thì log rồi chạy tiếp bước sau,
// server vẫn khởi động bình thường.
async function runMigrations() {
  const steps = [
    ['ConversationMember.status', migrateConversationMemberStatus],
    ['Post - bỏ field reel cũ', migrateRemoveLegacyReelFields],
    ['Conversation.lastMessageId', migrateConversationLastMessage],
    ['Story - counter like/comment', migrateStoryCounters],
    ['SavedPost → Collection', migrateSavedPostToCollection],
    ['Hashtag - dựng từ bài viết/reel', migrateBuildHashtags],
  ];

  for (const [name, step] of steps) {
    try {
      await step();
    } catch (error) {
      console.error('[migration] "' + name + '" thất bại:', error.message);
    }
  }
}

module.exports = { runMigrations };
