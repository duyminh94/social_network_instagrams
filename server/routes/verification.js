// routes/verification.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  checkEligibility,
  requestVerifyOtp,
  confirmVerifyOtp,
  getMyVerificationRequest,
} = require('../controllers/verificationController');

router.use(authMiddleware);

router.get('/me', getMyVerificationRequest);
router.get('/check', checkEligibility);
router.post('/request-otp', requestVerifyOtp);
router.post('/confirm-otp', confirmVerifyOtp);

module.exports = router;
