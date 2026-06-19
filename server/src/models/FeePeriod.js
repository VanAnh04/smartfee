import mongoose from 'mongoose';

const feePeriodSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Tên kỳ thu là bắt buộc'],
    trim: true
  },
  periodType: {
    type: String,
    enum: ['month', 'quarter', 'semester', 'custom'],
    default: 'month'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'closed'],
    default: 'draft'
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

feePeriodSchema.index({ organizationId: 1, status: 1 });

const FeePeriod = mongoose.model('FeePeriod', feePeriodSchema);

export default FeePeriod;
