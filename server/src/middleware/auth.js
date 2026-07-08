import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
    }

    req.user = user;
    req.organizationId = user.organizationId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn' });
    }
    return res.status(401).json({ error: 'Xác thực thất bại' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này' });
    }
    next();
  };
};

// Middleware kiểm tra quyền cụ thể
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({ 
        error: 'Bạn không có quyền thực hiện hành động này',
        required: permission 
      });
    }
    next();
  };
};

// Middleware chỉ cho phép admin quản lý người dùng
export const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin()) {
    return res.status(403).json({ 
      error: 'Chỉ quản trị viên mới có quyền thực hiện hành động này' 
    });
  }
  next();
};

// Middleware cho phép admin hoặc nhân viên (staff/employee)
export const requireAdminOrStaff = (req, res, next) => {
  if (!req.user.isAdmin() && req.user.role !== 'staff') {
    return res.status(403).json({ 
      error: 'Bạn không có quyền thực hiện hành động này' 
    });
  }
  next();
};

// Middleware cho phép người có thể thu tiền (admin, staff, cashier)
export const requireCanProcessPayments = (req, res, next) => {
  if (!req.user.canProcessPayments()) {
    return res.status(403).json({ 
      error: 'Bạn không có quyền thu tiền hoặc ghi nhận thanh toán' 
    });
  }
  next();
};

// Middleware cho phép xem báo cáo (admin, staff, cashier, viewer)
export const requireCanViewReports = (req, res, next) => {
  if (!req.user.hasPermission('canViewReports')) {
    return res.status(403).json({ 
      error: 'Bạn không có quyền xem báo cáo' 
    });
  }
  next();
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      error: 'Chỉ quản trị hệ thống mới có quyền thực hiện hành động này' 
    });
  }
  next();
};
