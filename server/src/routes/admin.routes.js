import express from 'express';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { auth, requireSuperAdmin } from '../middleware/auth.js';
import notificationService from '../services/notification.service.js';

const router = express.Router();

router.use(auth);
router.use(requireSuperAdmin);

const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  STAFF: 'staff',
  CASHIER: 'cashier',
  VIEWER: 'viewer',
  FAMILY: 'family'
};

// ==================== STATS ====================
router.get('/stats', async (req, res, next) => {
  try {
    const totalOrgs = await Organization.countDocuments();
    const activeOrgs = await Organization.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments();
    const totalStudents = await mongoose.model('Student').countDocuments();

    const planStats = await Organization.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);

    const revenueAgg = await mongoose.model('Payment').aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);

    res.json({
      organizations: {
        total: totalOrgs,
        active: activeOrgs,
        inactive: totalOrgs - activeOrgs
      },
      users: { total: totalUsers },
      students: { total: totalStudents },
      plans: planStats,
      revenue: revenueAgg[0]?.totalRevenue || 0
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ORGANIZATIONS ====================
// POST /organizations - Create new organization (must be before GET /organizations)
router.post('/organizations', async (req, res, next) => {
  try {
    const { name, email, phone, address, plan = 'basic' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tên trung tâm là bắt buộc' });
    }

    const existing = await Organization.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: 'Tên trung tâm đã tồn tại' });
    }

    const organization = await Organization.create({
      name, email, phone, address, plan, isActive: true
    });

    res.status(201).json({
      message: 'Tạo trung tâm thành công',
      organization
    });
  } catch (error) {
    next(error);
  }
});

// GET /organizations - List all organizations
router.get('/organizations', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const [organizations, total] = await Promise.all([
      Organization.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Organization.countDocuments(query)
    ]);

    res.json({
      organizations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /organizations/:id - Get single organization
router.get('/organizations/:id', async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy trung tâm' });
    }

    const usage = await organization.getUsageSummary();
    res.json({ organization, usage });
  } catch (error) {
    next(error);
  }
});

// PUT /organizations/:id - Update organization
router.put('/organizations/:id', async (req, res, next) => {
  try {
    const { name, address, phone, email, isActive, plan } = req.body;

    const oldOrg = await Organization.findById(req.params.id);
    if (!oldOrg) {
      return res.status(404).json({ error: 'Không tìm thấy trung tâm' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (plan !== undefined) updateData.plan = plan;

    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Thông báo khi thay đổi gói
    if (plan !== undefined && plan !== oldOrg.plan) {
      const planOrder = { basic: 1, gold: 2, premium: 3 };
      if (planOrder[plan] > planOrder[oldOrg.plan]) {
        await notificationService.notifyPlanUpgraded(organization._id, oldOrg.plan, plan);
      } else {
        await notificationService.notifyPlanDowngraded(organization._id, oldOrg.plan, plan);
      }
    }

    res.json(organization);
  } catch (error) {
    next(error);
  }
});

// DELETE /organizations/:id - Delete organization
router.delete('/organizations/:id', async (req, res, next) => {
  try {
    const organization = await Organization.findByIdAndDelete(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy trung tâm' });
    }
    res.json({ message: 'Xóa trung tâm thành công' });
  } catch (error) {
    next(error);
  }
});

// GET /organizations/:id/users - Get users in organization
router.get('/organizations/:id/users', async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy trung tâm' });
    }

    const users = await User.find({ organizationId: organization._id })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// POST /organizations/:id/users - Create user in organization
router.post('/organizations/:id/users', async (req, res, next) => {
  try {
    const { name, email, password, phone, role = 'staff' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy trung tâm' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      organizationId: organization._id,
      name, email, password: hashedPassword, phone, role, isActive: true
    });

    res.status(201).json({
      message: 'Tạo người dùng thành công',
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// ==================== SUPERADMINS ====================
// GET /superadmins - List all superadmins
router.get('/superadmins', async (req, res, next) => {
  try {
    const superadmins = await User.find({ role: ROLES.SUPERADMIN })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ superadmins });
  } catch (error) {
    next(error);
  }
});

// POST /superadmins - Create superadmin
router.post('/superadmins', async (req, res, next) => {
  try {
    const { email, password, name, phone, isActive = true } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    let organization = await Organization.findOne();
    if (!organization) {
      organization = await Organization.create({
        name: 'Trung tâm mặc định',
        plan: 'basic',
        isActive: true
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email đã tồn tại trong hệ thống' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      organizationId: organization._id,
      email, password: hashedPassword, name, phone,
      role: ROLES.SUPERADMIN, isActive
    });

    res.status(201).json({
      message: 'Tạo quản trị hệ thống thành công',
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// PUT /superadmins/:id - Update superadmin
router.put('/superadmins/:id', async (req, res, next) => {
  try {
    const { name, email, phone, isActive, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy quản trị hệ thống' });
    }

    if (user.role !== ROLES.SUPERADMIN) {
      return res.status(400).json({ error: 'Người dùng này không phải là quản trị hệ thống' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ error: 'Email đã được sử dụng' });
      }
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) {
      user.password = await bcrypt.hash(password, 12);
    }

    await user.save();

    res.json({
      message: 'Cập nhật thành công',
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /superadmins/:id - Delete superadmin
router.delete('/superadmins/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy quản trị hệ thống' });
    }

    if (user.role !== ROLES.SUPERADMIN) {
      return res.status(400).json({ error: 'Người dùng này không phải là quản trị hệ thống' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa quản trị hệ thống thành công' });
  } catch (error) {
    next(error);
  }
});

export default router;
