import express from 'express';
import Notification from '../models/Notification.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

// GET / - Lấy danh sách thông báo
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate
    } = req.query;

    const query = {};

    // Super admin xem tất cả thông báo
    if (req.user.role === 'superadmin') {
      // Super admin có thể lọc theo organizationId nếu muốn
      if (req.query.organizationId) {
        query.organizationId = req.query.organizationId;
      }
    } else {
      // User thường chỉ xem notifications của tổ chức mình
      query.organizationId = req.organizationId;
    }

    // Filter theo user hoặc student (cho phụ huynh)
    if (req.user.role === 'family') {
      query.$or = [
        { userId: req.user._id },
        { studentId: { $in: req.user.childIds || [] } }
      ];
    } else {
      // Admin/staff/superadmin xem tất cả hoặc theo filter
      if (req.query.userId) query.userId = req.query.userId;
      if (req.query.studentId) query.studentId = req.query.studentId;
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('studentId', 'name studentCode')
        .populate('userId', 'name email')
        .populate('organizationId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query)
    ]);

    res.json({
      notifications,
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

// GET /unread-count - Số thông báo chưa đọc
router.get('/unread-count', async (req, res, next) => {
  try {
    const query = { status: 'pending' };

    // Super admin xem tất cả thông báo chưa đọc
    if (req.user.role === 'superadmin') {
      // Super admin chỉ xem thông báo của mình
      query.userId = req.user._id;
    } else {
      query.organizationId = req.organizationId;

      // Phụ huynh chỉ xem thông báo của mình
      if (req.user.role === 'family') {
        query.$or = [
          { userId: req.user._id },
          { studentId: { $in: req.user.childIds || [] } }
        ];
      }
    }

    const count = await Notification.countDocuments(query);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// GET /:id - Chi tiết thông báo
router.get('/:id', async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    
    // Super admin có thể xem mọi thông báo
    if (req.user.role !== 'superadmin') {
      query.organizationId = req.organizationId;
    }

    const notification = await Notification.findOne(query)
      .populate('studentId', 'name studentCode')
      .populate('userId', 'name email')
      .populate('organizationId', 'name');

    if (!notification) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    }

    res.json(notification);
  } catch (error) {
    next(error);
  }
});

// PUT /:id/read - Đánh dấu đã đọc
router.put('/:id/read', async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    
    // Super admin có thể đánh dấu mọi thông báo
    if (req.user.role !== 'superadmin') {
      query.organizationId = req.organizationId;
    }

    const notification = await Notification.findOneAndUpdate(
      query,
      { 
        status: 'read',
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    }

    res.json(notification);
  } catch (error) {
    next(error);
  }
});

// PUT /read-all - Đánh dấu tất cả đã đọc
router.put('/read-all', async (req, res, next) => {
  try {
    const query = { status: 'pending' };

    if (req.user.role === 'superadmin') {
      // Super admin đánh dấu tất cả thông báo của mình
      query.userId = req.user._id;
    } else {
      query.organizationId = req.organizationId;

      if (req.user.role === 'family') {
        query.$or = [
          { userId: req.user._id },
          { studentId: { $in: req.user.childIds || [] } }
        ];
      }
    }

    await Notification.updateMany(
      query,
      { status: 'read', isRead: true, readAt: new Date() }
    );

    res.json({ message: 'Đã đánh dấu tất cả là đã đọc' });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - Xóa thông báo
router.delete('/:id', async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    
    // Super admin có thể xóa mọi thông báo
    if (req.user.role !== 'superadmin') {
      query.organizationId = req.organizationId;
    }

    const notification = await Notification.findOneAndDelete(query);

    if (!notification) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    }

    res.json({ message: 'Đã xóa thông báo' });
  } catch (error) {
    next(error);
  }
});

export default router;