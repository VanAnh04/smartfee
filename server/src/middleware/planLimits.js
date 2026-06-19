import Organization from '../models/Organization.js';

/**
 * Middleware kiểm tra giới hạn của gói dịch vụ
 * Gắn vào các route cần kiểm tra giới hạn (students, classes, staff)
 */

// Middleware kiểm tra giới hạn học sinh
export const checkStudentLimit = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chức' });
    }

    const status = await org.checkStudentLimit();
    
    // Gắn thông tin vào request để controller có thể sử dụng
    req.planStatus = req.planStatus || {};
    req.planStatus.studentLimit = status;

    // Nếu đã đạt giới hạn, cho phép đi tiếp nhưng cảnh báo
    if (status.isFull) {
      return res.status(403).json({
        error: 'Bạn đã đạt giới hạn học sinh của gói Basic',
        code: 'STUDENT_LIMIT_REACHED',
        current: status.current,
        max: status.max,
        upgradeRequired: true,
        currentPlan: org.plan,
        suggestion: 'Nâng cấp lên Gold hoặc Premium để thêm học sinh'
      });
    }

    // Nếu sắp đạt giới hạn (>80%), cảnh báo
    if (status.percentage >= 80 && !status.unlimited) {
      req.planStatus.studentLimitWarning = {
        message: `Bạn đã sử dụng ${Math.round(status.percentage)}% dung lượng học sinh`,
        percentage: status.percentage
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware kiểm tra giới hạn lớp học
export const checkClassLimit = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chức' });
    }

    const status = await org.checkClassLimit();
    
    req.planStatus = req.planStatus || {};
    req.planStatus.classLimit = status;

    if (status.isFull) {
      return res.status(403).json({
        error: 'Bạn đã đạt giới hạn lớp học của gói Basic',
        code: 'CLASS_LIMIT_REACHED',
        current: status.current,
        max: status.max,
        upgradeRequired: true,
        currentPlan: org.plan,
        suggestion: 'Nâng cấp lên Gold hoặc Premium để thêm lớp học'
      });
    }

    if (status.percentage >= 80 && !status.unlimited) {
      req.planStatus.classLimitWarning = {
        message: `Bạn đã sử dụng ${Math.round(status.percentage)}% dung lượng lớp học`,
        percentage: status.percentage
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware kiểm tra giới hạn người dùng (staff)
export const checkStaffLimit = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chức' });
    }

    const status = await org.checkStaffLimit();
    
    req.planStatus = req.planStatus || {};
    req.planStatus.staffLimit = status;

    if (status.isFull) {
      return res.status(403).json({
        error: 'Bạn đã đạt giới hạn người dùng của gói Basic',
        code: 'STAFF_LIMIT_REACHED',
        current: status.current,
        max: status.max,
        upgradeRequired: true,
        currentPlan: org.plan,
        suggestion: 'Nâng cấp lên Gold hoặc Premium để thêm người dùng'
      });
    }

    if (status.percentage >= 80 && !status.unlimited) {
      req.planStatus.staffLimitWarning = {
        message: `Bạn đã sử dụng ${Math.round(status.percentage)}% dung lượng người dùng`,
        percentage: status.percentage
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware lấy thông tin usage tổng hợp
export const getUsageInfo = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chức' });
    }

    const usage = await org.getUsageSummary();
    req.planUsage = usage;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware kiểm tra tính năng theo gói
export const requireFeature = (featureName) => {
  return (req, res, next) => {
    const org = req.planUsage?.plan || req.organization?.plan || 'basic';
    
    const featureMap = {
      'sms_reminder': ['gold', 'premium'],
      'email_reminder': ['gold', 'premium'],
      'qr_static': ['gold', 'premium'],
      'qr_dynamic': ['premium'],
      'wallet': ['premium'],
      'analytics': ['premium'],
      'unlimited_history': ['premium']
    };

    const requiredPlans = featureMap[featureName] || [];
    
    if (!requiredPlans.includes(org)) {
      return res.status(403).json({
        error: `Tính năng này yêu cầu gói ${requiredPlans.join(' hoặc ')}`,
        code: 'FEATURE_NOT_INCLUDED',
        requiredPlan: requiredPlans,
        currentPlan: org
      });
    }

    next();
  };
};
