// models/Follow.js
// Quan hệ theo dõi giữa 2 user
//
// status='pending': tài khoản riêng tư, chờ người được follow chấp nhận
// status='accepted': đã follow thành công
//
// followersCount và followingCount trong User chỉ tăng khi status='accepted'
// Khi unfollow hoặc reject: chỉ giảm counter nếu status hiện tại là 'accepted'

const mongoose = require('mongoose');

const followSchema = new mongoose.Schema(
  {
    followerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // pending: chờ chấp nhận (tài khoản riêng tư)
    // accepted: đã được chấp nhận follow
    status: { type: String, enum: ['pending', 'accepted'], default: 'accepted' },
  },
  { timestamps: true }
);

// Không cho follow 1 người 2 lần
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
// Tăng tốc query người follow mình (getFollowers) và lọc status
followSchema.index({ followingId: 1, status: 1 });

module.exports = mongoose.model('Follow', followSchema);
