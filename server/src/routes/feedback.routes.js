import express from 'express';
import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Create feedback
router.post('/', auth, async (req, res, next) => {
  try {
    const { type, rating, title, content } = req.body;

    if (!rating || !title || !content) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin đánh giá' });
    }

    const feedback = await Feedback.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      userRole: req.user.role,
      type: type || 'other',
      rating,
      title,
      content
    });

    res.status(201).json(feedback);
  } catch (error) {
    next(error);
  }
});

// Get my feedbacks
router.get('/my', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [feedbacks, total] = await Promise.all([
      Feedback.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Feedback.countDocuments({ userId: req.user._id })
    ]);

    res.json({
      feedbacks,
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

// Get organization feedbacks (admin/staff only)
router.get('/organization', auth, async (req, res, next) => {
  try {
    if (!['admin', 'staff', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền xem đánh giá này' });
    }

    const { page = 1, limit = 20, status, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    
    if (req.user.role !== 'superadmin') {
      query.organizationId = req.organizationId;
    }
    
    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    const [feedbacks, total] = await Promise.all([
      Feedback.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Feedback.countDocuments(query)
    ]);

    res.json({
      feedbacks,
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

// Get all feedbacks (superadmin only)
router.get('/all', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Chỉ quản trị hệ thống mới có quyền xem' });
    }

    const { page = 1, limit = 20, status, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const [feedbacks, total] = await Promise.all([
      Feedback.find(query)
        .populate('userId', 'name email')
        .populate('organizationId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Feedback.countDocuments(query)
    ]);

    res.json({
      feedbacks,
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

// Update feedback status (admin only)
router.put('/:id/status', auth, async (req, res, next) => {
  try {
    if (!['admin', 'staff', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật đánh giá' });
    }

    const { status, adminResponse } = req.body;

    if (!['reviewed', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
    }

    if (req.user.role !== 'superadmin' && feedback.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật đánh giá này' });
    }

    feedback.status = status;
    if (adminResponse) {
      feedback.adminResponse = adminResponse;
      feedback.respondedBy = req.user._id;
      feedback.respondedAt = new Date();
    }

    await feedback.save();

    res.json(feedback);
  } catch (error) {
    next(error);
  }
});

// Delete feedback (admin only)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa đánh giá' });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
    }

    if (req.user.role !== 'superadmin' && feedback.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa đánh giá này' });
    }

    await feedback.deleteOne();

    res.json({ message: 'Xóa đánh giá thành công' });
  } catch (error) {
    next(error);
  }
});

// Get feedback stats
router.get('/stats/summary', auth, async (req, res, next) => {
  try {
    if (!['admin', 'staff', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền xem thống kê' });
    }

    const matchQuery = req.user.role === 'superadmin' ? {} : { organizationId: req.organizationId };

    const stats = await Feedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalFeedbacks: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      }
    ]);

    const typeStats = await Feedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      summary: stats[0] || { totalFeedbacks: 0, avgRating: 0, pendingCount: 0, resolvedCount: 0 },
      byType: typeStats
    });
  } catch (error) {
    next(error);
  }
});

export default router;
