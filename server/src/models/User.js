import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  STAFF: 'staff',      // Nhân viên - có quyền quản lý học sinh, lớp học, xem báo cáo
  CASHIER: 'cashier',  // Thu ngân - chỉ thu tiền, ghi nhận thanh toán
  VIEWER: 'viewer',    // Người xem - chỉ xem, không có quyền chỉnh sửa
  FAMILY: 'family'     // Phụ huynh/Học sinh - tài khoản gia đình
};

// Loại tài khoản family
const FAMILY_TYPES = {
  PARENT: 'parent',    // Phụ huynh
  STUDENT: 'student'   // Học sinh
};

// Định nghĩa quyền hạn cho từng vai trò
const ROLE_PERMISSIONS = {
  [ROLES.SUPERADMIN]: {
    label: 'Quản trị hệ thống',
    description: 'Toàn quyền quản lý hệ thống',
    canManageUsers: true,
    canManageStudents: true,
    canManageClasses: true,
    canManageFees: true,
    canProcessPayments: true,
    canViewReports: true,
    canManageSettings: true,
    canUpgradePlan: true,
    canManageOrganizations: true
  },
  [ROLES.ADMIN]: {
    label: 'Quản trị viên',
    description: 'Toàn quyền quản lý hệ thống',
    canManageUsers: true,      // Thêm/sửa/xóa người dùng
    canManageStudents: true,    // Thêm/sửa/xóa học sinh
    canManageClasses: true,     // Thêm/sửa/xóa lớp học
    canManageFees: true,        // Thêm/sửa/xóa học phí
    canProcessPayments: true,   // Thu tiền, ghi nhận thanh toán
    canViewReports: true,       // Xem báo cáo
    canManageSettings: true,    // Cài đặt trung tâm
    canUpgradePlan: true        // Nâng cấp gói dịch vụ
  },
  [ROLES.STAFF]: {
    label: 'Nhân viên',
    description: 'Quản lý học sinh, lớp học và xem báo cáo',
    canManageUsers: false,     // Không thể quản lý người dùng
    canManageStudents: true,
    canManageClasses: true,
    canManageFees: true,
    canProcessPayments: true,
    canViewReports: true,
    canManageSettings: false,  // Không thể cài đặt trung tâm
    canUpgradePlan: false
  },
  [ROLES.CASHIER]: {
    label: 'Thu ngân',
    description: 'Chỉ thu tiền và ghi nhận thanh toán',
    canManageUsers: false,
    canManageStudents: false,   // Không thể quản lý học sinh
    canManageClasses: false,
    canManageFees: false,
    canProcessPayments: true,   // Chỉ có quyền thu tiền
    canViewReports: true,       // Chỉ xem báo cáo thanh toán
    canManageSettings: false,
    canUpgradePlan: false
  },
  [ROLES.VIEWER]: {
    label: 'Người xem',
    description: 'Chỉ xem thông tin, không có quyền chỉnh sửa',
    canManageUsers: false,
    canManageStudents: false,
    canManageClasses: false,
    canManageFees: false,
    canProcessPayments: false,
    canViewReports: true,
    canManageSettings: false,
    canUpgradePlan: false
  }
};

const userSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
  },
  password: {
    type: String,
    required: function() { return !this.googleId; },
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
  },
  name: {
    type: String,
    required: [true, 'Tên là bắt buộc'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.STAFF
  },
  familyType: {
    type: String,
    enum: ['student', 'parent'],
    default: null
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  childIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String
  },
  permissions: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Index cho việc tìm kiếm nhanh
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ studentId: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getPermissions = function() {
  return ROLE_PERMISSIONS[this.role] || ROLE_PERMISSIONS[ROLES.VIEWER];
};

userSchema.methods.hasPermission = function(permission) {
  const perms = this.getPermissions();
  return perms[permission] === true;
};

userSchema.methods.isAdmin = function() {
  return this.role === ROLES.ADMIN;
};

userSchema.methods.canManageUsers = function() {
  return this.hasPermission('canManageUsers');
};

userSchema.methods.canProcessPayments = function() {
  return this.hasPermission('canProcessPayments');
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  obj.permissions = this.getPermissions();
  return obj;
};

const User = mongoose.model('User', userSchema);

export { User, ROLES, ROLE_PERMISSIONS };
export default User;
