const mongoose = require('mongoose');

const userChangeLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changeType: {
      type: String,
      required: true,
      enum: [
        'verified',
        'verification_revoked',
        'full_name_changed',
        'username_changed',
        'bio_changed',
        'banned',
        'unbanned',
      ],
    },
    oldValue: { type: String, default: '' },
    newValue: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    source: { type: String, enum: ['user', 'admin'], required: true },
  },
  { timestamps: true }
);

userChangeLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('UserChangeLog', userChangeLogSchema);
