import mongoose from 'mongoose';

const feeSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  feePeriodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeePeriod',
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  billingType: {
    type: String,
    enum: ['monthly', 'session'],
    default: 'monthly'
  },
  sessionCount: {
    type: Number,
    default: 0
  },
  ratePerSession: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['fixed', 'percent'],
    default: 'fixed'
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'overdue'],
    default: 'unpaid'
  },
  dueDate: {
    type: Date
  },
  paidAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

feeSchema.index({ organizationId: 1, studentId: 1 });
feeSchema.index({ organizationId: 1, feePeriodId: 1 });
feeSchema.index({ organizationId: 1, status: 1 });
feeSchema.index({ organizationId: 1, classId: 1 });

feeSchema.pre('save', function(next) {
  if (this.discountType === 'percent') {
    this.finalAmount = this.amount * (1 - this.discount / 100);
  } else {
    this.finalAmount = this.amount - this.discount;
  }
  
  if (this.paidAmount > 0 && this.paidAmount >= this.finalAmount) {
    this.status = 'paid';
    this.paidAt = new Date();
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  }
  
  next();
});

const Fee = mongoose.model('Fee', feeSchema);

export default Fee;
