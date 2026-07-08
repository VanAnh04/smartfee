import express from 'express';
import Fee from '../models/Fee.js';
import FeePeriod from '../models/FeePeriod.js';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import Class from '../models/Class.js';
import Organization from '../models/Organization.js';
import Attendance from '../models/Attendance.js';
import { auth, requireAdminOrStaff } from '../middleware/auth.js';
import notificationService from '../services/notification.service.js';
import { sendFeeReminderEmail } from '../utils/emailService.js';

const router = express.Router();

// POST /cron/check-overdue - Public endpoint with CRON_SECRET verification
router.post('/cron/check-overdue', async (req, res, next) => {
  try {
    const secret = req.headers['x-cron-secret'] || req.query.secret;
    const cronSecret = process.env.CRON_SECRET || 'smartfee_cron_default_secret';
    
    if (secret !== cronSecret) {
      return res.status(401).json({ error: 'Không có quyền truy cập tác vụ cron' });
    }

    const today = new Date();
    
    // Find all fees that are unpaid or partial AND whose dueDate has passed (dueDate < today)
    const overdueFees = await Fee.find({
      dueDate: { $lt: today },
      status: { $in: ['unpaid', 'partial'] }
    });

    let updatedCount = 0;
    for (const fee of overdueFees) {
      fee.status = 'overdue';
      await fee.save();
      updatedCount++;
    }

    res.json({
      success: true,
      message: `Đã quét và cập nhật ${updatedCount} phiếu học phí quá hạn`,
      updatedCount
    });
  } catch (error) {
    next(error);
  }
});

router.use(auth);

// GET /fees/periods - Danh sách kỳ thu (ai cũng xem được)
router.get('/periods', async (req, res, next) => {
  try {
    const periods = await FeePeriod.find({ organizationId: req.organizationId })
      .sort({ startDate: -1 });

    res.json(periods);
  } catch (error) {
    next(error);
  }
});

// POST /fees/periods - Tạo kỳ thu mới (chỉ admin/staff)
router.post('/periods', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { name, periodType, startDate, endDate, dueDate, description } = req.body;

    const period = await FeePeriod.create({
      organizationId: req.organizationId,
      name,
      periodType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      description,
      status: 'draft'
    });

    res.status(201).json(period);
  } catch (error) {
    next(error);
  }
});

// PUT /fees/periods/:id - Cập nhật kỳ thu (chỉ admin/staff)
router.put('/periods/:id', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { name, periodType, startDate, endDate, dueDate, status, description } = req.body;

    const period = await FeePeriod.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { name, periodType, startDate, endDate, dueDate, status, description },
      { new: true }
    );

    if (!period) {
      return res.status(404).json({ error: 'Không tìm thấy kỳ thu' });
    }

    res.json(period);
  } catch (error) {
    next(error);
  }
});

// DELETE /fees/periods/:id - Xóa kỳ thu (chỉ admin/staff)
router.delete('/periods/:id', requireAdminOrStaff, async (req, res, next) => {
  try {
    const period = await FeePeriod.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!period) {
      return res.status(404).json({ error: 'Không tìm thấy kỳ thu' });
    }

    res.json({ message: 'Xóa kỳ thu thành công' });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      studentId, 
      classId,
      periodId,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { organizationId: req.organizationId };

    if (studentId) query.studentId = studentId;
    if (classId) query.classId = classId;
    if (periodId) query.feePeriodId = periodId;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [fees, total] = await Promise.all([
      Fee.find(query)
        .populate('studentId', 'name studentCode parentName parentPhone avatar')
        .populate('classId', 'name code')
        .populate('feePeriodId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Fee.countDocuments(query)
    ]);

    res.json({
      fees,
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

router.get('/:id', async (req, res, next) => {
  try {
    const fee = await Fee.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    })
      .populate('studentId', 'name studentCode parentName parentPhone avatar')
      .populate('classId', 'name code feeAmount')
      .populate('feePeriodId', 'name');

    if (!fee) {
      return res.status(404).json({ error: 'Không tìm thấy học phí' });
    }

    const payments = await Payment.find({
      organizationId: req.organizationId,
      feeId: fee._id
    }).sort({ createdAt: -1 });

    res.json({ ...fee.toObject(), payments });
  } catch (error) {
    next(error);
  }
});

// POST /fees/generate - Tạo học phí hàng loạt (chỉ admin/staff)
router.post('/generate', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { periodId, classId, customAmount, noDueDate } = req.body;

    const organization = await Organization.findById(req.organizationId);
    const orgName = organization?.name || 'Trung tâm';

    const period = await FeePeriod.findOne({
      _id: periodId,
      organizationId: req.organizationId
    });

    if (!period) {
      return res.status(404).json({ error: 'Không tìm thấy kỳ thu' });
    }

    // Lấy danh sách class để lấy feeAmount và billingType
    let classMap = {};
    if (classId) {
      const cls = await Class.findById(classId);
      if (cls) classMap[classId] = cls;
    } else {
      const classes = await Class.find({ organizationId: req.organizationId, status: 'active' });
      classes.forEach(c => { classMap[c._id.toString()] = c; });
    }

    // Tìm tất cả điểm danh trong kỳ thu
    const attendanceRecords = await Attendance.find({
      organizationId: req.organizationId,
      date: { $gte: period.startDate, $lte: period.endDate }
    });

    // Map đếm số buổi có mặt cho từng student theo từng class
    // studentPresentCount[studentId][classId] = count
    const studentPresentCount = {};
    attendanceRecords.forEach(record => {
      const cid = record.classId.toString();
      record.students.forEach(s => {
        const sid = s.studentId.toString();
        if (s.status === 'present') {
          if (!studentPresentCount[sid]) studentPresentCount[sid] = {};
          if (!studentPresentCount[sid][cid]) studentPresentCount[sid][cid] = 0;
          studentPresentCount[sid][cid]++;
        }
      });
    });

    const query = { organizationId: req.organizationId, status: 'active' };
    if (classId) {
      query.classIds = classId;
    }

    const students = await Student.find(query);

    const feesToCreate = students.map(student => {
      const studentClasses = student.classIds.filter(
        cid => !classId || cid.toString() === classId
      );
      
      const studentFees = [];
      studentClasses.forEach(c => {
        const classObj = classMap[c.toString()];
        if (!classObj) return;

        const isSession = classObj.billingType === 'session';
        const rate = customAmount !== undefined && customAmount !== null && customAmount !== ''
          ? parseInt(customAmount)
          : (classObj.feeAmount || 0);

        if (isSession) {
          const presentCount = studentPresentCount[student._id.toString()]?.[c.toString()] || 0;
          if (presentCount === 0) return; // Không đi học buổi nào thì không tạo học phí

          studentFees.push({
            organizationId: req.organizationId,
            studentId: student._id,
            classId: c,
            feePeriodId: periodId,
            billingType: 'session',
            sessionCount: presentCount,
            ratePerSession: rate,
            amount: presentCount * rate,
            finalAmount: presentCount * rate,
            description: `Học phí lớp ${classObj.name} - ${period.name} (${presentCount} buổi x ${new Intl.NumberFormat('vi-VN').format(rate)}đ)`,
            status: 'unpaid',
            dueDate: noDueDate ? null : (period.dueDate || null)
          });
        } else {
          studentFees.push({
            organizationId: req.organizationId,
            studentId: student._id,
            classId: c,
            feePeriodId: periodId,
            billingType: 'monthly',
            amount: rate,
            finalAmount: rate,
            description: `Học phí lớp ${classObj.name} - ${period.name} (Thu theo tháng)`,
            status: 'unpaid',
            dueDate: noDueDate ? null : (period.dueDate || null)
          });
        }
      });
      return studentFees;
    }).flat();

    if (feesToCreate.length > 0) {
      await Fee.insertMany(feesToCreate);

      // Gửi thông báo cho phụ huynh
      const createdFees = await Fee.find({
        organizationId: req.organizationId,
        feePeriodId: periodId
      }).populate('studentId', 'name');

      const studentFeeMap = {};
      createdFees.forEach(fee => {
        const sid = fee.studentId._id.toString();
        if (!studentFeeMap[sid]) {
          studentFeeMap[sid] = { name: fee.studentId.name, fees: [] };
        }
        studentFeeMap[sid].fees.push(fee);
      });

      for (const sid of Object.keys(studentFeeMap)) {
        const { name, fees } = studentFeeMap[sid];
        const totalAmount = fees.reduce((sum, f) => sum + f.finalAmount, 0);
        
        // Thông báo cho phụ huynh
        notificationService.createForParent(
          sid,
          'Học phí mới được tạo',
          `Kỳ thu "${period.name}" đã tạo ${fees.length} phiếu thu với tổng số tiền ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}. Vui lòng kiểm tra và thanh toán.`,
          'fee_created',
          { periodId, periodName: period.name, feeCount: fees.length, totalAmount }
        ).catch(err => console.error('Lỗi thông báo:', err));
        
        // Thông báo cho học sinh
        notificationService.createForStudent(
          sid,
          'Học phí mới được tạo',
          `Kỳ thu "${period.name}" đã tạo ${fees.length} phiếu thu với tổng số tiền ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}.`,
          'fee_created',
          { periodId, periodName: period.name, totalAmount }
        ).catch(err => console.error('Lỗi thông báo:', err));
      }
    }

    res.status(201).json({
      message: `Đã tạo ${feesToCreate.length} phiếu thu học phí`,
      count: feesToCreate.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /fees/bulk-update - Cập nhật học phí hàng loạt (chỉ admin/staff)
router.post('/bulk-update', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { fees } = req.body;

    const updates = fees.map(f => ({
      updateOne: {
        filter: { _id: f.id, organizationId: req.organizationId },
        update: { $set: { amount: f.amount, finalAmount: f.finalAmount, discount: f.discount || 0 } }
      }
    }));

    await Fee.bulkWrite(updates);

    res.json({ message: 'Cập nhật học phí thành công' });
  } catch (error) {
    next(error);
  }
});

// POST /fees/:id/discount - Giảm giá (chỉ admin/staff)
router.post('/:id/discount', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { discount, discountType, notes } = req.body;

    const organization = await Organization.findById(req.organizationId);
    const orgName = organization?.name || 'Trung tâm';

    const fee = await Fee.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    }).populate('studentId', 'name');

    if (!fee) {
      return res.status(404).json({ error: 'Không tìm thấy học phí' });
    }

    const oldAmount = fee.finalAmount;
    fee.discount = discount;
    fee.discountType = discountType || 'fixed';
    if (notes) fee.notes = notes;
    await fee.save();

    // Thông báo giảm giá cho phụ huynh
    const discountAmount = discountType === 'percent' 
      ? oldAmount * (discount / 100)
      : discount;
    const newAmount = oldAmount - discountAmount;

    notificationService.createForParent(
      fee.studentId._id,
      'Học phí được giảm giá',
      `Khoản phí "${fee.description}" đã được giảm giá. Số tiền mới: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(newAmount)} (đã giảm ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)}).`,
      'fee_updated',
      { feeId: fee._id, oldAmount, newAmount, discountAmount, discountType: discountType || 'fixed' }
    ).catch(err => console.error('Lỗi thông báo:', err));

    res.json(fee);
  } catch (error) {
    next(error);
  }
});

router.get('/stats/summary', async (req, res, next) => {
  try {
    const { periodId } = req.query;

    const match = { organizationId: req.organizationId };
    if (periodId) match.feePeriodId = periodId;

    const stats = await Fee.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$finalAmount' },
          paid: { $sum: '$paidAmount' }
        }
      }
    ]);

    const summary = {
      unpaid: { count: 0, amount: 0, paid: 0 },
      partial: { count: 0, amount: 0, paid: 0 },
      paid: { count: 0, amount: 0, paid: 0 },
      overdue: { count: 0, amount: 0, paid: 0 },
      total: { count: 0, amount: 0, paid: 0 }
    };

    stats.forEach(s => {
      if (s._id && summary[s._id]) {
        summary[s._id] = { count: s.count, amount: s.total, paid: s.paid };
      }
      summary.total.count += s.count;
      summary.total.amount += s.total;
      summary.total.paid += s.paid;
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// POST /fees/:id/remind - Gửi nhắc nhở đóng học phí thủ công cho 1 học sinh (chỉ admin/staff)
router.post('/:id/remind', requireAdminOrStaff, async (req, res, next) => {
  try {
    const fee = await Fee.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    })
      .populate('studentId', 'name parentEmail parentPhone parentName')
      .populate('feePeriodId', 'name')
      .populate('classId', 'name');

    if (!fee) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu học phí' });
    }

    if (fee.status === 'paid') {
      return res.status(400).json({ error: 'Học phí này đã được hoàn thành thanh toán' });
    }

    const organization = await Organization.findById(req.organizationId);
    const orgName = organization?.name || 'Trung tâm';

    // Tính số ngày quá hạn nếu có dueDate
    let daysOverdue = 0;
    if (fee.dueDate && new Date(fee.dueDate) < new Date()) {
      const diffTime = Math.abs(new Date() - new Date(fee.dueDate));
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // 1. Gửi thông báo in-app (cho phụ huynh và học sinh)
    await notificationService.notifyPaymentReminder(fee.studentId._id, fee, daysOverdue);

    // 2. Gửi email cho phụ huynh nếu có thông tin email (chạy background tránh nghẽn/timeout)
    let emailSent = false;
    const parentEmail = fee.studentId.parentEmail;
    if (parentEmail && !parentEmail.endsWith('@smartfee.local')) {
      sendFeeReminderEmail(
        parentEmail,
        fee.studentId.parentName,
        fee.studentId.name,
        fee,
        daysOverdue,
        orgName
      ).catch(err => console.error('❌ Lỗi gửi email nhắc nợ:', err.message));
      emailSent = true;
    }

    res.json({
      success: true,
      message: emailSent 
        ? `Đang gửi thông báo nhắc nhở qua email đến ${parentEmail} và ứng dụng`
        : 'Đã gửi thông báo nhắc nhở qua ứng dụng',
      emailSent
    });
  } catch (error) {
    next(error);
  }
});

// POST /fees/periods/:periodId/remind-all - Gửi nhắc nhở đóng học phí hàng loạt cho toàn bộ học sinh chưa đóng trong kỳ thu (chỉ admin/staff)
router.post('/periods/:periodId/remind-all', requireAdminOrStaff, async (req, res, next) => {
  try {
    const period = await FeePeriod.findOne({
      _id: req.params.periodId,
      organizationId: req.organizationId
    });

    if (!period) {
      return res.status(404).json({ error: 'Không tìm thấy kỳ thu học phí' });
    }

    // Tìm tất cả các phiếu học phí chưa hoàn thành thanh toán trong kỳ thu này
    const unpaidFees = await Fee.find({
      feePeriodId: period._id,
      organizationId: req.organizationId,
      status: { $in: ['unpaid', 'partial', 'overdue'] }
    })
      .populate('studentId', 'name parentEmail parentPhone parentName')
      .populate('classId', 'name')
      .populate('feePeriodId', 'name');

    if (unpaidFees.length === 0) {
      return res.json({
        success: true,
        message: 'Tất cả học sinh trong kỳ thu này đã hoàn thành đóng học phí',
        count: 0
      });
    }

    const organization = await Organization.findById(req.organizationId);
    const orgName = organization?.name || 'Trung tâm';

    let notificationCount = 0;
    let emailCount = 0;

    // Gửi bất đồng bộ/tuần tự cho từng học sinh để tránh nghẽn SMTP
    for (const fee of unpaidFees) {
      try {
        let daysOverdue = 0;
        if (fee.dueDate && new Date(fee.dueDate) < new Date()) {
          const diffTime = Math.abs(new Date() - new Date(fee.dueDate));
          daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // 1. Gửi thông báo in-app
        await notificationService.notifyPaymentReminder(fee.studentId._id, fee, daysOverdue);
        notificationCount++;

        // 2. Gửi email (chạy background tránh nghẽn/timeout)
        const parentEmail = fee.studentId.parentEmail;
        if (parentEmail && !parentEmail.endsWith('@smartfee.local')) {
          sendFeeReminderEmail(
            parentEmail,
            fee.studentId.parentName,
            fee.studentId.name,
            fee,
            daysOverdue,
            orgName
          ).catch(err => console.error(`❌ Lỗi gửi email nhắc nợ hàng loạt cho ${parentEmail}:`, err.message));
          emailCount++;
        }
      } catch (err) {
        console.error(`Lỗi khi nhắc nợ cho phiếu học phí ${fee._id}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Đã gửi ${notificationCount} thông báo ứng dụng và ${emailCount} email nhắc nợ`,
      notificationCount,
      emailCount
    });
  } catch (error) {
    next(error);
  }
});

export default router;
