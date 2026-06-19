import mongoose from 'mongoose';
import crypto from 'crypto';

const passwordResetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  otpExpires: {
    type: Date,
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  resetToken: {
    type: String
  },
  resetTokenExpires: {
    type: Date
  },
  attemptCount: {
    type: Number,
    default: 0
  },
  lastAttempt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index cho việc tìm kiếm nhanh
passwordResetSchema.index({ email: 1, createdAt: -1 });
passwordResetSchema.index({ otp: 1 });
passwordResetSchema.index({ resetToken: 1 });
passwordResetSchema.index({ userId: 1 });

// TTL Index - tự động xóa token hết hạn sau 24 giờ
passwordResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

// Static method để tạo OTP
passwordResetSchema.statics.generateOTP = function(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return otp;
};

// Static method để tạo reset token
passwordResetSchema.statics.generateResetToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetSchema);

export default PasswordResetToken;
