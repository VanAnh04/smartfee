import express from 'express';
import Fee from '../models/Fee.js';
import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import FeePeriod from '../models/FeePeriod.js';
import { auth, requireCanViewReports } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

// Tất cả routes báo cáo yêu cầu quyền xem báo cáo
router.use(requireCanViewReports);

router.get('/revenue', async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const match = {
      organizationId: req.organizationId,
      status: 'success'
    };

    if (startDate || endDate) {
      match.paidAt = {};
      if (startDate) match.paidAt.$gte = new Date(startDate);
      if (endDate) match.paidAt.$lte = new Date(endDate);
    }

    let groupId;
    if (groupBy === 'day') {
      groupId = {
        $dateToString: { format: '%Y-%m-%d', date: '$paidAt' }
      };
    } else if (groupBy === 'month') {
      groupId = {
        $dateToString: { format: '%Y-%m', date: '$paidAt' }
      };
    } else if (groupBy === 'year') {
      groupId = { $year: '$paidAt' };
    }

    const report = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupId,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const total = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      report,
      summary: total[0] || { total: 0, count: 0 }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/debt', async (req, res, next) => {
  try {
    const { periodId, classId, status } = req.query;

    const match = { organizationId: req.organizationId };
    if (periodId) match.feePeriodId = periodId;
    if (classId) match.classId = classId;
    if (status) match.status = status;

    const debts = await Fee.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$studentId',
          totalDebt: { $sum: { $subtract: ['$finalAmount', '$paidAmount'] } },
          totalAmount: { $sum: '$finalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          feeCount: { $sum: 1 }
        }
      },
      { $sort: { totalDebt: -1 } },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $project: {
          studentId: '$_id',
          name: '$student.name',
          studentCode: '$student.studentCode',
          parentName: '$student.parentName',
          parentPhone: '$student.parentPhone',
          parentEmail: '$student.parentEmail',
          totalDebt: 1,
          totalAmount: 1,
          totalPaid: 1,
          feeCount: 1
        }
      }
    ]);

    const summary = await Fee.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: { $subtract: ['$finalAmount', '$paidAmount'] } },
          totalAmount: { $sum: '$finalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      debts,
      summary: summary[0] || { totalDebt: 0, totalAmount: 0, totalPaid: 0, count: 0 }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/class', async (req, res, next) => {
  try {
    const { periodId } = req.query;

    const classMatch = { organizationId: req.organizationId };
    const classes = await Class.find(classMatch);

    const feeMatch = { organizationId: req.organizationId };
    if (periodId) feeMatch.feePeriodId = periodId;

    const classReport = await Fee.aggregate([
      { $match: feeMatch },
      {
        $group: {
          _id: '$classId',
          totalAmount: { $sum: '$finalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          },
          unpaidCount: {
            $sum: { $cond: [{ $in: ['$status', ['unpaid', 'overdue']] }, 1, 0] }
          },
          studentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id',
          foreignField: '_id',
          as: 'class'
        }
      },
      { $unwind: '$class' },
      {
        $project: {
          classId: '$_id',
          className: '$class.name',
          classCode: '$class.code',
          totalAmount: 1,
          totalPaid: 1,
          paidCount: 1,
          unpaidCount: 1,
          studentCount: 1,
          debt: { $subtract: ['$totalAmount', '$totalPaid'] },
          collectionRate: {
            $cond: {
              if: { $gt: ['$totalAmount', 0] },
              then: {
                $multiply: [
                  { $divide: ['$totalPaid', '$totalAmount'] },
                  100
                ]
              },
              else: 0
            }
          }
        }
      },
      { $sort: { debt: -1 } }
    ]);

    res.json(classReport);
  } catch (error) {
    next(error);
  }
});

router.get('/student/:id', async (req, res, next) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    const [fees, payments] = await Promise.all([
      Fee.find({
        organizationId: req.organizationId,
        studentId: student._id
      })
        .populate('feePeriodId', 'name')
        .populate('classId', 'name code')
        .sort({ createdAt: -1 }),
      Payment.find({
        organizationId: req.organizationId,
        studentId: student._id,
        status: 'success'
      }).sort({ paidAt: -1 })
    ]);

    const totalAmount = fees.reduce((sum, f) => sum + f.finalAmount, 0);
    const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);
    const totalDebt = totalAmount - totalPaid;

    res.json({
      student,
      fees,
      payments,
      summary: { totalAmount, totalPaid, totalDebt }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
