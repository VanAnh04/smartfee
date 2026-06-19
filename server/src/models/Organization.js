import mongoose from 'mongoose';

const PLANS = {
  BASIC: 'basic',
  GOLD: 'gold',
  PREMIUM: 'premium'
};

const PLAN_LIMITS = {
  [PLANS.BASIC]: { maxStudents: 100, maxClasses: 4, maxStaff: 2, historyMonths: 3 },
  [PLANS.GOLD]: { maxStudents: 350, maxClasses: Infinity, maxStaff: 5, historyMonths: 12 },
  [PLANS.PREMIUM]: { maxStudents: Infinity, maxClasses: Infinity, maxStaff: Infinity, historyMonths: Infinity }
};

const PLAN_FEATURES = {
  [PLANS.BASIC]: {
    name: 'Basic',
    price: 0,
    priceDisplay: 'Miễn phí',
    color: 'gray',
    description: 'Dành cho các trung tâm nhỏ mới bắt đầu',
    features: [
      { text: '100 học sinh tối đa', included: true },
      { text: '4 lớp học', included: true },
      { text: 'Điểm danh số', included: true },
      { text: 'Theo dõi thanh toán cơ bản', included: true },
      { text: 'Báo cáo hàng tháng', included: true },
      { text: 'Lịch sử 3 tháng', included: true },
      { text: 'Nhắc nhở qua Gmail/SMS', included: false },
      { text: 'QR code thanh toán', included: false },
      { text: 'Ví điện tử', included: false },
      { text: 'Analytics nâng cao', included: false },
    ]
  },
  [PLANS.GOLD]: {
    name: 'Gold',
    price: 299000,
    priceDisplay: '299.000đ',
    period: '/tháng',
    color: 'yellow',
    description: 'Dành cho các trung tâm đang phát triển',
    features: [
      { text: '350 học sinh', included: true },
      { text: 'Không giới hạn lớp học', included: true },
      { text: 'Điểm danh số', included: true },
      { text: 'Theo dõi thanh toán linh hoạt', included: true },
      { text: 'Báo cáo chi tiết', included: true },
      { text: 'Lịch sử 1 năm', included: true },
      { text: 'Nhắc nhở qua Gmail/SMS', included: true },
      { text: 'QR tĩnh cho mỗi học sinh', included: true },
      { text: 'Ví điện tử', included: false },
      { text: 'Analytics nâng cao', included: false },
    ]
  },
  [PLANS.PREMIUM]: {
    name: 'Premium',
    price: 5000,
    priceDisplay: '799.000đ',
    period: '/tháng',
    color: 'purple',
    description: 'Giải pháp toàn diện cho trung tâm lớn',
    features: [
      { text: 'Không giới hạn học sinh', included: true },
      { text: 'Không giới hạn lớp học', included: true },
      { text: 'Điểm danh số', included: true },
      { text: 'Theo dõi thanh toán linh hoạt', included: true },
      { text: 'Báo cáo chi tiết', included: true },
      { text: 'Lịch sử vô thời hạn', included: true },
      { text: 'Nhắc nhở tự động theo lịch', included: true },
      { text: 'QR động (bảo mật cao)', included: true },
      { text: 'Ví điện tử (nạp tiền trước)', included: true },
      { text: 'Analytics nâng cao', included: true },
    ]
  }
};

const PLAN_ORDER = {
  [PLANS.BASIC]: 1,
  [PLANS.GOLD]: 2,
  [PLANS.PREMIUM]: 3
};

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên trung tâm là bắt buộc'],
    trim: true
  },
  logo: {
    type: String,
    default: null
  },
  address: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  plan: {
    type: String,
    enum: Object.values(PLANS),
    default: PLANS.BASIC
  },
  planExpiresAt: {
    type: Date
  },
  settings: {
    currency: { type: String, default: 'VND' },
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    smtp: {
      host: String,
      port: Number,
      secure: Boolean,
      user: String,
      pass: String
    },
    sms: {
      provider: String,
      apiKey: String
    }
  },
  payosConfig: {
    clientId: { type: String, default: '' },
    apiKey: { type: String, default: '' },
    checksumKey: { type: String, default: '' }
  },
  supportSettings: {
    hotline: { type: String, default: '' },
    email: { type: String, default: '' },
    zalo: { type: String, default: '' },
    website: { type: String, default: '' },
    address: { type: String, default: '' },
    workingHours: { type: String, default: '8:00 - 17:00 (Thứ 2 - Thứ 6)' },
    chatEnabled: { type: Boolean, default: true },
    faqs: [{
      question: String,
      answer: String
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  studentCounter: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

organizationSchema.methods.getLimits = function () {
  return PLAN_LIMITS[this.plan] || PLAN_LIMITS[PLANS.BASIC];
};

organizationSchema.methods.getPlanInfo = function () {
  return PLAN_FEATURES[this.plan] || PLAN_FEATURES[PLANS.BASIC];
};

organizationSchema.methods.canUpgradeTo = function (targetPlan) {
  return PLAN_ORDER[targetPlan] > PLAN_ORDER[this.plan];
};

organizationSchema.methods.isPlanActive = function () {
  if (!this.planExpiresAt) return true; // Never expires (free plan)
  return new Date() < new Date(this.planExpiresAt);
};

organizationSchema.methods.getCurrentPeriodDays = function () {
  if (!this.planExpiresAt) return Infinity;
  const now = new Date();
  const expires = new Date(this.planExpiresAt);
  const diffTime = expires - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

organizationSchema.methods.remainingDays = function () {
  return this.getCurrentPeriodDays();
};

organizationSchema.methods.upgradePlan = async function (targetPlan, months = 1) {
  if (!this.canUpgradeTo(targetPlan)) {
    throw new Error('Không thể hạ cấp gói dịch vụ');
  }

  const now = new Date();
  let newExpiresAt;

  if (this.planExpiresAt && new Date(this.planExpiresAt) > now) {
    // Extend from current expiration
    newExpiresAt = new Date(this.planExpiresAt);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + months);
  } else {
    // Start from now
    newExpiresAt = new Date(now);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + months);
  }

  this.plan = targetPlan;
  this.planExpiresAt = newExpiresAt;
  await this.save();

  return this;
};

organizationSchema.methods.cancelSubscription = async function () {
  // Keep current plan until expiration
  // After expiration, downgrade to basic
  this.planWillDowngrade = this.plan !== PLANS.BASIC ? PLANS.BASIC : null;
  await this.save();
  return this;
};

organizationSchema.methods.checkStudentLimit = async function () {
  const Student = mongoose.model('Student');
  const count = await Student.countDocuments({ organizationId: this._id });
  const limits = this.getLimits();
  return {
    current: count,
    max: limits.maxStudents,
    unlimited: limits.maxStudents === Infinity,
    available: limits.maxStudents === Infinity ? Infinity : limits.maxStudents - count,
    isFull: limits.maxStudents !== Infinity && count >= limits.maxStudents,
    percentage: limits.maxStudents !== Infinity ? (count / limits.maxStudents) * 100 : 0
  };
};

organizationSchema.methods.checkClassLimit = async function () {
  const Class = mongoose.model('Class');
  const count = await Class.countDocuments({ organizationId: this._id });
  const limits = this.getLimits();
  return {
    current: count,
    max: limits.maxClasses,
    unlimited: limits.maxClasses === Infinity,
    available: limits.maxClasses === Infinity ? Infinity : limits.maxClasses - count,
    isFull: limits.maxClasses !== Infinity && count >= limits.maxClasses,
    percentage: limits.maxClasses !== Infinity ? (count / limits.maxClasses) * 100 : 0
  };
};

organizationSchema.methods.checkStaffLimit = async function () {
  const User = mongoose.model('User');
  const count = await User.countDocuments({
    organizationId: this._id,
    role: { $in: ['admin', 'staff', 'viewer'] }
  });
  const limits = this.getLimits();
  return {
    current: count,
    max: limits.maxStaff,
    unlimited: limits.maxStaff === Infinity,
    available: limits.maxStaff === Infinity ? Infinity : limits.maxStaff - count,
    isFull: limits.maxStaff !== Infinity && count >= limits.maxStaff,
    percentage: limits.maxStaff !== Infinity ? (count / limits.maxStaff) * 100 : 0
  };
};

organizationSchema.methods.getUsageSummary = async function () {
  const [students, classes, staff] = await Promise.all([
    this.checkStudentLimit(),
    this.checkClassLimit(),
    this.checkStaffLimit()
  ]);

  return {
    students,
    classes,
    staff,
    plan: this.getPlanInfo(),
    isActive: this.isPlanActive(),
    remainingDays: this.remainingDays(),
    planExpiresAt: this.planExpiresAt
  };
};

organizationSchema.methods.canAddStudent = async function () {
  const status = await this.checkStudentLimit();
  return !status.isFull;
};

organizationSchema.methods.canAddClass = async function () {
  const status = await this.checkClassLimit();
  return !status.isFull;
};

organizationSchema.methods.canAddStaff = async function () {
  const status = await this.checkStaffLimit();
  return !status.isFull;
};

const Organization = mongoose.model('Organization', organizationSchema);

export { Organization, PLANS, PLAN_LIMITS, PLAN_FEATURES, PLAN_ORDER };
export default Organization;
