import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true,
    min: 2,
    max: 8
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
});

const classSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Tên lớp là bắt buộc'],
    trim: true
  },
  code: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  teacherName: {
    type: String,
    trim: true
  },
  schedule: [scheduleSchema],
  maxStudents: {
    type: Number,
    default: 30,
    min: 1
  },
  currentStudents: {
    type: Number,
    default: 0,
    min: 0
  },
  feeAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  }
}, {
  timestamps: true
});

classSchema.index({ organizationId: 1, code: 1 });
classSchema.index({ organizationId: 1, status: 1 });

const Class = mongoose.model('Class', classSchema);

export default Class;
