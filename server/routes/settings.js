// routes/settings.js
// Cài đặt cá nhân, phiên đăng nhập, lịch sử tìm kiếm, tắt tiếng, hạn chế, kháng cáo
//
// Tất cả route cần đăng nhập — router.use(authMiddleware)
// Route xoá cả danh sách (DELETE /sessions, DELETE /search-history) đặt TRƯỚC
// route có :id để Express không hiểu nhầm

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getSettings,
  updateSettings,
  getSessions,
  revokeSession,
  revokeOtherSessions,
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory,
  getMutes,
  muteUser,
  unmuteUser,
  getRestricts,
  restrictUser,
  unrestrictUser,
  createAppeal,
  getMyAppeals,
} = require('../controllers/settingsController');

router.use(authMiddleware);

// --- Cài đặt cá nhân ---
router.get('/', getSettings);
router.patch('/', updateSettings);

// --- Phiên đăng nhập (quản lý thiết bị) ---
router.get('/sessions', getSessions);
router.delete('/sessions', revokeOtherSessions);     // đặt trước /sessions/:id
router.delete('/sessions/:id', revokeSession);

// --- Lịch sử tìm kiếm ---
router.get('/search-history', getSearchHistory);
router.post('/search-history', addSearchHistory);
router.delete('/search-history', clearSearchHistory); // đặt trước /search-history/:id
router.delete('/search-history/:id', deleteSearchHistoryItem);

// --- Tắt tiếng ---
router.get('/mutes', getMutes);
router.post('/mutes/:userId', muteUser);
router.delete('/mutes/:userId', unmuteUser);

// --- Hạn chế ---
router.get('/restricts', getRestricts);
router.post('/restricts/:userId', restrictUser);
router.delete('/restricts/:userId', unrestrictUser);

// --- Kháng cáo ---
router.get('/appeals', getMyAppeals);
router.post('/appeals', createAppeal);

module.exports = router;
