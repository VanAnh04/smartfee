import express from 'express';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Fee from '../models/Fee.js';
import Payment from '../models/Payment.js';
import FeePeriod from '../models/FeePeriod.js';
import Organization from '../models/Organization.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

router.get('/stats', async (req, res, next) => {
  try {
    const orgId = req.organizationId;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      studentStats,
      classStats,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      yearRevenue,
      pendingFees,
      overdueFees
    ] = await Promise.all([
      Student.aggregate([
        { $match: { organizationId: orgId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Class.aggregate([
        { $match: { organizationId: orgId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            organizationId: orgId, 
            status: 'success',
            paidAt: { $gte: startOfToday, $lt: endOfToday }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            organizationId: orgId, 
            status: 'success',
            paidAt: { $gte: startOfWeek, $lt: endOfToday }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            organizationId: orgId, 
            status: 'success',
            paidAt: { $gte: startOfMonth, $lt: endOfToday }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            organizationId: orgId, 
            status: 'success',
            paidAt: { $gte: startOfYear, $lt: endOfToday }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Fee.countDocuments({ organizationId: orgId, status: 'unpaid' }),
      Fee.countDocuments({ organizationId: orgId, status: 'overdue' })
    ]);

    const totalStudents = studentStats.reduce((sum, s) => sum + s.count, 0);
    const activeStudents = studentStats.find(s => s._id === 'active')?.count || 0;
    const totalClasses = classStats.reduce((sum, c) => sum + c.count, 0);
    const activeClasses = classStats.find(c => c._id === 'active')?.count || 0;

    res.json({
      students: {
        total: totalStudents,
        active: activeStudents
      },
      classes: {
        total: totalClasses,
        active: activeClasses
      },
      revenue: {
        today: todayRevenue[0]?.total || 0,
        todayCount: todayRevenue[0]?.count || 0,
        week: weekRevenue[0]?.total || 0,
        weekCount: weekRevenue[0]?.count || 0,
        month: monthRevenue[0]?.total || 0,
        monthCount: monthRevenue[0]?.count || 0,
        year: yearRevenue[0]?.total || 0,
        yearCount: yearRevenue[0]?.count || 0
      },
      fees: {
        pending: pendingFees,
        overdue: overdueFees
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/recent-payments', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const payments = await Payment.find({
      organizationId: req.organizationId,
      status: 'success'
    })
      .populate('studentId', 'name studentCode avatar')
      .sort({ paidAt: -1 })
      .limit(parseInt(limit));

    res.json(payments);
  } catch (error) {
    next(error);
  }
});

router.get('/top-debtors', async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    const debtors = await Fee.aggregate([
      { 
        $match: { 
          organizationId: req.organizationId,
          status: { $in: ['unpaid', 'partial', 'overdue'] }
        }
      },
      {
        $group: {
          _id: '$studentId',
          totalDebt: { $sum: { $subtract: ['$finalAmount', '$paidAmount'] } },
          feeCount: { $sum: 1 }
        }
      },
      { $sort: { totalDebt: -1 } },
      { $limit: parseInt(limit) },
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
          avatar: '$student.avatar',
          parentName: '$student.parentName',
          parentPhone: '$student.parentPhone',
          totalDebt: 1,
          feeCount: 1
        }
      }
    ]);

    res.json(debtors);
  } catch (error) {
    next(error);
  }
});

router.get('/revenue-chart', async (req, res, next) => {
  try {
    const { months = 12 } = req.query;

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - parseInt(months) + 1, 1);

    const revenue = await Payment.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          status: 'success',
          paidAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const chartData = [];
    for (let i = 0; i < parseInt(months); i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - parseInt(months) + 1 + i, 1);
      const monthData = revenue.find(
        r => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1
      );
      chartData.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: `${d.getMonth() + 1}/${d.getFullYear()}`,
        total: monthData?.total || 0,
        count: monthData?.count || 0
      });
    }

    res.json(chartData);
  } catch (error) {
    next(error);
  }
});

router.get('/fee-distribution', async (req, res, next) => {
  try {
    const distribution = await Fee.aggregate([
      { $match: { organizationId: req.organizationId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$finalAmount' },
          paid: { $sum: '$paidAmount' }
        }
      }
    ]);

    res.json(distribution);
  } catch (error) {
    next(error);
  }
});

export default router;
