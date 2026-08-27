// controllers/adminAiController.js
// Trợ lý AI cho trang admin — chat hỏi đáp + tìm kiếm dữ liệu quản trị.
//
// Cách hoạt động (2 bước, nhẹ — không cần vòng lặp function-calling):
//   Bước 1: Gemini đọc câu hỏi → trả JSON "kế hoạch": cần data gì + từ khoá tìm.
//   Bước 2: Backend query DB theo kế hoạch → gom dữ liệu.
//   Bước 3: Gemini đọc dữ liệu → viết câu trả lời tiếng Việt.
//
// Chỉ admin gọi được (route bọc adminAuth). Dữ liệu tóm tắt được gửi sang Gemini
// bằng API key của user (xem utils/apiKeys.js).

const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Report = require('../models/Report');
const { generateText, isConfigured } = require('../utils/gemini');

// Escape ký tự đặc biệt để dùng an toàn trong $regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Gom dữ liệu admin theo "kế hoạch" mà Gemini đề ra
async function gatherContext(plan) {
  var ctx = {};

  if (plan.wantStats) {
    ctx.stats = {
      totalUsers:     await User.countDocuments(),
      bannedUsers:    await User.countDocuments({ isBanned: true }),
      trustedUsers:   await User.countDocuments({ isTrusted: true }),
      totalPosts:     await Post.countDocuments({ isDeleted: false }),
      totalReels:     await Reel.countDocuments({ isDeleted: false }),
      pendingReports: await Report.countDocuments({ status: 'pending' }),
      totalReports:   await Report.countDocuments(),
    };
  }

  if (plan.wantReports) {
    var reports = await Report.find({ status: 'pending' })
      .sort({ createdAt: -1 }).limit(10).lean();
    ctx.pendingReports = reports.map(function (r) {
      return {
        targetType: r.targetType,
        reason: r.reason,
        isAuto: r.isAuto,
        description: (r.description || '').slice(0, 120),
        createdAt: r.createdAt,
      };
    });
  }

  if (plan.wantTopReported) {
    var top = await Report.aggregate([
      { $group: { _id: { targetType: '$targetType', targetId: '$targetId' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    ctx.topReported = top.map(function (t) {
      return { targetType: t._id.targetType, reportCount: t.count };
    });
  }

  if (plan.search && plan.search.trim()) {
    var term = plan.search.trim();
    var safe = escapeRegex(term);

    var users = await User.find({
      $or: [
        { username: { $regex: safe, $options: 'i' } },
        { fullName: { $regex: safe, $options: 'i' } },
      ],
    }).select('username fullName isBanned isTrusted isPrivate role followersCount postsCount').limit(8).lean();
    ctx.userResults = users;

    var posts = await Post.find({
      isDeleted: false,
      $or: [
        { caption: { $regex: safe, $options: 'i' } },
        { hashtags: term.toLowerCase() },
      ],
    }).select('caption hashtags likesCount commentsCount createdAt').limit(8).lean();
    ctx.postResults = posts.map(function (p) {
      return {
        caption: (p.caption || '').slice(0, 120),
        hashtags: p.hashtags,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        createdAt: p.createdAt,
      };
    });
  }

  return ctx;
}

// POST /api/admin/ai/ask  { question }
async function askAdminAi(req, res, next) {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ message: 'Trợ lý AI chưa được cấu hình (thiếu GEMINI_API_KEY)' });
    }

    var question = (req.body.question || '').trim();
    if (!question) {
      return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
    }
    if (question.length > 500) question = question.slice(0, 500);

    // ── Bước 1: lập kế hoạch lấy dữ liệu ──
    var planPrompt =
      'Bạn là trợ lý quản trị của một app giống Instagram. ' +
      'Đọc câu hỏi của admin và quyết định cần dữ liệu gì. ' +
      'Chỉ trả về JSON đúng dạng: ' +
      '{"search": "<từ khoá tìm user/bài cụ thể, để rỗng nếu không cần>", ' +
      '"wantStats": <true/false>, "wantReports": <true/false>, "wantTopReported": <true/false>}. ' +
      'wantStats=true khi hỏi về số liệu tổng quan (số user, post, report...). ' +
      'wantReports=true khi hỏi về báo cáo đang chờ xử lý. ' +
      'wantTopReported=true khi hỏi nội dung/user bị báo cáo nhiều nhất. ' +
      'search chỉ điền khi admin muốn tìm một user hoặc bài cụ thể (lấy đúng tên/từ khoá, bỏ các từ thừa). ' +
      'CÂU HỎI: ' + question;

    var plan;
    try {
      var planText = await generateText(planPrompt, true);
      plan = JSON.parse(planText);
    } catch (e) {
      // Không lập được kế hoạch → mặc định lấy tổng quan + report
      plan = { search: '', wantStats: true, wantReports: true, wantTopReported: false };
    }

    var ctx = await gatherContext(plan);

    // ── Bước 2: trả lời dựa trên dữ liệu đã gom ──
    var answerPrompt =
      'Bạn là trợ lý quản trị thân thiện của app giống Instagram. ' +
      'Trả lời câu hỏi của admin bằng TIẾNG VIỆT, ngắn gọn, rõ ràng, đi thẳng vào trọng tâm. ' +
      'CHỈ dựa vào DỮ LIỆU JSON bên dưới — không bịa số liệu. ' +
      'Nếu dữ liệu rỗng hoặc không đủ để trả lời, hãy nói rõ là chưa tìm thấy/không có dữ liệu. ' +
      'Khi liệt kê user hay bài viết, trình bày gọn dạng gạch đầu dòng.\n\n' +
      'CÂU HỎI: ' + question + '\n\n' +
      'DỮ LIỆU (JSON): ' + JSON.stringify(ctx);

    var answer = await generateText(answerPrompt, false);

    res.json({ answer: answer, used: Object.keys(ctx) });
  } catch (error) {
    // Lỗi gọi Gemini → 502 message gọn cho frontend
    if (error.message && error.message.indexOf('Gemini') !== -1) {
      return res.status(502).json({ message: 'Trợ lý AI tạm thời không phản hồi. Thử lại sau.' });
    }
    next(error);
  }
}

module.exports = { askAdminAi };
