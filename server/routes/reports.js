// routes/reports.js
// Gửi báo cáo vi phạm và xem báo cáo cá nhân
//
// Admin xử lý báo cáo qua routes/admin.js (PATCH /api/admin/reports/:id)
// /my phải đứng trước / để tránh nhầm thứ tự — không có /:id ở đây nên thực ra không ảnh hưởng

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createReport, getMyReports } = require('../controllers/reportController');

// POST /api/reports     — gửi báo cáo vi phạm
// GET  /api/reports/my  — xem báo cáo mình đã gửi

router.get('/my', auth, getMyReports);
router.post('/', auth, createReport);

module.exports = router;
