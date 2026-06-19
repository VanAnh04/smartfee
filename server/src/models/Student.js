import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const studentSchema = new mongoose.Schema({
  // ID toàn cục để nhận diện học sinh duy nhất (dùng được ở nhiều trung tâm)
  globalStudentId: {
    type: String,
    unique: true,
    sparse: true
  },
  // Trung tâm hiện tại - dùng để xác định học sinh thuộc trung tâm nào trong context hiện tại
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  studentCode: {
    type: String,
    sparse: true // Không unique nữa vì cùng học sinh có thể có ở nhiều trung tâm
  },
  name: {
    type: String,
    required: [true, 'Tên học sinh là bắt buộc'],
    trim: true
  },
  dob: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  avatar: {
    type: String,
    default: null
  },
  // Thông tin phụ huynh - có thể dùng chung cho tất cả các trung tâm
  parentName: {
    type: String,
    trim: true
  },
  parentPhone: {
    type: String,
    trim: true
  },
  parentEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  classIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'transferred'],
    default: 'active'
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  // Các trung tâm khác mà học sinh đã ghi danh
  otherEnrollments: [{
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    studentCode: String,
    status: {
      type: String,
      enum: ['active', 'inactive', 'graduated', 'transferred'],
      default: 'active'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
studentSchema.index({ organizationId: 1, studentCode: 1 });
studentSchema.index({ organizationId: 1, name: 'text' });
studentSchema.index({ organizationId: 1, status: 1 });
studentSchema.index({ organizationId: 1, classIds: 1 });
studentSchema.index({ globalStudentId: 1 });
studentSchema.index({ parentPhone: 1 }); // Tìm học sinh theo SĐT phụ huynh để nhận diện trùng

// Pre-save: tạo globalStudentId nếu chưa có, và mã học sinh theo trung tâm
studentSchema.pre('save', async function(next) {
  // Tạo globalStudentId nếu chưa có
  if (!this.globalStudentId) {
    this.globalStudentId = `GHS${uuidv4().split('-')[0].toUpperCase()}`;
  }

  // Tạo mã học sinh theo trung tâm nếu chưa có
  if (!this.studentCode) {
    const Organization = mongoose.model('Organization');
    const org = await Organization.findByIdAndUpdate(
      this.organizationId,
      { $inc: { studentCounter: 1 } },
      { new: true }
    );
    if (!org) {
      return next(new Error('Không tìm thấy trung tâm để sinh mã học sinh'));
    }
    this.studentCode = `HS${String(org.studentCounter).padStart(6, '0')}`;
  }
  next();
});

// Static method: tìm học sinh theo thông tin nhận diện
studentSchema.statics.findByIdentifier = async function(identifier) {
  // Tìm theo globalStudentId
  let student = await this.findOne({ globalStudentId: identifier });
  if (student) return student;

  // Tìm theo SĐT phụ huynh
  if (identifier.match(/^[0-9]{9,11}$/)) {
    student = await this.findOne({ parentPhone: identifier });
    if (student) return student;
  }

  // Tìm theo tên + ngày sinh
  // Có thể thêm logic tìm kiếm khác nếu cần

  return null;
};

// Static method: tìm học sinh có sẵn ở trung tâm khác
studentSchema.statics.findExistingForTransfer = async function(identifier, excludeOrgId) {
  // Tìm theo globalStudentId
  let student = await this.findOne({ 
    globalStudentId: identifier,
    organizationId: { $ne: excludeOrgId }
  });
  if (student) return student;

  // Tìm theo SĐT phụ huynh
  if (identifier && identifier.match(/^[0-9]{9,11}$/)) {
    const students = await this.find({ 
      parentPhone: identifier,
      organizationId: { $ne: excludeOrgId }
    }).limit(5);
    if (students.length > 0) return students;
  }

  return null;
};

// Method: kiểm tra học sinh có đang học ở trung tâm nào khác không
studentSchema.methods.hasOtherEnrollments = function() {
  return this.otherEnrollments && this.otherEnrollments.length > 0;
};

// Method: lấy thông tin ghi danh ở các trung tâm khác
studentSchema.methods.getOtherEnrollments = async function() {
  if (!this.otherEnrollments || this.otherEnrollments.length === 0) return [];
  
  const Organization = mongoose.model('Organization');
  const orgIds = this.otherEnrollments.map(e => e.organizationId);
  const orgs = await Organization.find({ _id: { $in: orgIds } }).select('name');
  
  return this.otherEnrollments.map(e => ({
    ...e.toObject(),
    organizationName: orgs.find(o => o._id.equals(e.organizationId))?.name || 'Trung tâm đã xóa'
  }));
};

const Student = mongoose.model('Student', studentSchema);

export default Student;