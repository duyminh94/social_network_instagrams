// routes/block.js
// Chặn/bỏ chặn người dùng, xem danh sách đã chặn
//
// Khi block: tự động xóa Follow 2 chiều (nếu có)
// Tất cả route cần đăng nhập — router.use(authMiddleware)

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { blockUser, unblockUser, getBlockList } = require('../controllers/blockController');

// Tất cả route block đều cần đăng nhập
router.use(authMiddleware);

router.get('/', getBlockList);
router.post('/:userId', blockUser);
router.delete('/:userId', unblockUser);

module.exports = router;
