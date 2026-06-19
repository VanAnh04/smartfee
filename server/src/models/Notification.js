import mongoose from 'mongoose';

const NOTIFICATION_TYPES = [
  // Thanh toán
  'payment_success',
  'payment_failed',
  'payment_reminder',
  'payment_pending',

  // Học phí
  'fee_created',
  'fee_updated',
  'fee_deleted',
  'fee_overdue',

  // Tài khoản
  'account_created',
  'account_linked',
  'account_unlinked',
  'password_changed',
  'password_reset_request',
  'login_alert',

  // Học sinh
  'student_added',
  'student_updated',
  'student_deleted',
  'student_class_added',
  'student_class_removed',

  // Lớp học
  'class_created',
  'class_updated',
  'class_deleted',
  'class_full',

  // Nhân viên
  'staff_added',
  'staff_updated',
  'staff_deleted',
  'staff_role_changed',

  // Gói dịch vụ
  'plan_upgraded',
  'plan_downgraded',
  'plan_expiring',
  'plan_expired',
  'upgrade_requested',

  // Hệ thống
  'system_alert',
  'maintenance',
  'welcome',

  // Super Admin
  'org_registered',
  'org_approved',
  'org_suspended'
];

const NOTIFICATION_CHANNEL = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms',
  ALL: 'all'
};

const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

const notificationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    default: 'system'
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'in_app', 'all'],
    default: 'in_app'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'read'],
    default: 'pending'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  scheduledAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

notificationSchema.index({ organizationId: 1, status: 1 });
notificationSchema.index({ organizationId: 1, userId: 1, status: 1 });
notificationSchema.index({ organizationId: 1, studentId: 1 });
notificationSchema.index({ scheduledAt: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export { NOTIFICATION_TYPES, NOTIFICATION_CHANNEL, NOTIFICATION_PRIORITY };
export default Notification;
