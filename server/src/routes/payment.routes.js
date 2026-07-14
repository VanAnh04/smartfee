import express from 'express';
import Payment from '../models/Payment.js';
import Fee from '../models/Fee.js';
import Student from '../models/Student.js';
import Organization from '../models/Organization.js';
import QRConfig from '../models/QRConfig.js';
import { auth, requireCanProcessPayments, requireAdminOrStaff } from '../middleware/auth.js';
import paymentService from '../services/payment.service.js';
import payosService from '../services/payos.service.js';
import notificationService from '../services/notification.service.js';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

router.use(auth);

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizePaymentMethod(method) {
  const value = (method || 'cash').toLowerCase();
  return ['cash', 'banking', 'vnpay', 'wallet', 'momo', 'payos'].includes(value) ? value : 'cash';
}

router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      studentId,
      status,
      paymentMethod,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { organizationId: req.organizationId };

    if (studentId) query.studentId = studentId;
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) query.paidAt.$gte = new Date(startDate);
      if (endDate) query.paidAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('studentId', 'name studentCode parentName')
        .populate('feeId', 'finalAmount amount description')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(query)
    ]);

    res.json({
      payments,
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
    const payment = await Payment.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    })
      .populate('studentId', 'name studentCode parentName parentPhone')
      .populate('feeId', 'finalAmount amount description status');

    if (!payment) {
      return res.status(404).json({ error: 'Không tìm thấy thanh toán' });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireCanProcessPayments, async (req, res, next) => {
  try {
    const { studentId, feeId, amount, paymentMethod, notes } = req.body;

    const student = await Student.findOne({ _id: studentId, organizationId: req.organizationId });
    const organization = await Organization.findById(req.organizationId);
    const orgName = organization?.name || 'Trung tâm';

    const payment = await Payment.create({
      organizationId: req.organizationId,
      studentId,
      feeId,
      amount: toNumber(amount),
      paymentMethod: normalizePaymentMethod(paymentMethod),
      status: 'success',
      paidAt: new Date(),
      notes
    });

    if (feeId) {
      await paymentService.applyPaymentToFee(feeId, payment.amount);
    } else {
      await paymentService.autoApplyPaymentToStudentFees(studentId, payment.amount);
    }

    const populated = await Payment.findById(payment._id)
      .populate('studentId', 'name studentCode parentName');

    // Thông báo thanh toán thành công
    notificationService.notifyPaymentSuccess(studentId, populated, orgName).catch(err => {
      console.error('Lỗi gửi thông báo thanh toán:', err);
    });

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

router.post('/qr-code', async (req, res, next) => {
  try {
    const { studentId, amount, description, paymentMethod = 'banking' } = req.body;

    const student = await Student.findOne({
      _id: studentId,
      organizationId: req.organizationId
    });

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    const organization = await Organization.findById(req.organizationId);
    const plan = organization?.plan || 'basic';
    const numericAmount = toNumber(amount);

    if (['gold', 'premium'].includes(plan) && organization?.payosConfig?.clientId) {
      const orderCode = Date.now();
      const payment = await Payment.create({
        organizationId: req.organizationId,
        studentId,
        amount: numericAmount,
        paymentMethod: 'vnpay',
        status: 'pending',
        transactionId: String(orderCode),
        notes: description || 'Thanh toán học phí'
      });

      const paymentLink = await payosService.createPaymentLink({
        organization,
        amount: numericAmount,
        orderCode,
        description: description || 'Thanh toán học phí',
        buyerName: student.name,
        buyerPhone: student.parentPhone || ''
      });

      payment.paymentUrl = paymentLink.paymentUrl;
      await payment.save();

      return res.json({
        type: 'dynamic',
        paymentUrl: paymentLink.paymentUrl,
        orderCode,
        amount: numericAmount,
        paymentId: payment._id
      });
    }

    const qrConfig = await paymentService.getQRConfig(req.organizationId);
    let qrImageUrl = qrConfig.qrImageUrl || '';
    let qrData = qrConfig.qrData || '';

    if (paymentMethod === 'banking') {
      const bankInfo = {
        bank: qrConfig.bankName,
        account: qrConfig.accountNumber,
        name: qrConfig.accountName,
        amount: numericAmount,
        content: `HP ${student.studentCode} ${student.name}`
      };

      if (!qrImageUrl || !qrData) {
        qrData = JSON.stringify(bankInfo);
        qrImageUrl = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: { dark: '#1E293B', light: '#FFFFFF' }
        });
      }
    } else if (paymentMethod === 'momo') {
      qrData = qrConfig.momoQrUrl || `momo://qr?phone=${qrConfig.momoNumber}&amount=${numericAmount}`;
      qrImageUrl = qrImageUrl || qrConfig.momoQrUrl || '';
    }

    res.json({
      type: 'static',
      qrImageUrl,
      qrData,
      qrConfig,
      amount: numericAmount,
      student,
      paymentMethod
    });
  } catch (error) {
    next(error);
  }
});

router.post('/wallet/topup', requireCanProcessPayments, async (req, res, next) => {
  try {
    const { studentId, amount } = req.body;

    const student = await Student.findOne({
      _id: studentId,
      organizationId: req.organizationId
    });

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    const organization = await Organization.findById(req.organizationId);
    const orgName = organization?.name || 'Trung tâm';

    student.walletBalance += toNumber(amount);
    await student.save();

    const payment = await Payment.create({
      organizationId: req.organizationId,
      studentId,
      amount: toNumber(amount),
      paymentMethod: 'wallet',
      status: 'success',
      paidAt: new Date(),
      notes: 'Nạp tiền vào ví'
    });

    // Thông báo nạp tiền ví thành công
    notificationService.notifyPaymentSuccess(studentId, {
      ...payment.toObject(),
      studentId: { name: student.name, studentCode: student.studentCode }
    }, orgName).catch(err => console.error('Lỗi thông báo:', err));

    res.json({
      message: 'Nạp tiền thành công',
      walletBalance: student.walletBalance
    });
  } catch (error) {
    next(error);
  }
});

router.post('/wallet/pay', requireCanProcessPayments, async (req, res, next) => {
  try {
    const { studentId, feeId, amount } = req.body;

    const student = await Student.findOne({
      _id: studentId,
      organizationId: req.organizationId
    });

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    const organization = await Organization.findById(req.organizationId);
    const orgName = organization?.name || 'Trung tâm';

    const numericAmount = toNumber(amount);
    if (student.walletBalance < numericAmount) {
      return res.status(400).json({ error: 'Số dư ví không đủ' });
    }

    student.walletBalance -= numericAmount;
    await student.save();

    const payment = await Payment.create({
      organizationId: req.organizationId,
      studentId,
      feeId,
      amount: numericAmount,
      paymentMethod: 'wallet',
      status: 'success',
      paidAt: new Date(),
      notes: 'Thanh toán qua ví'
    });

    if (feeId) {
      await paymentService.applyPaymentToFee(feeId, numericAmount);
    }

    // Thông báo thanh toán thành công
    notificationService.notifyPaymentSuccess(studentId, {
      ...payment.toObject(),
      studentId: { name: student.name, studentCode: student.studentCode }
    }, orgName).catch(err => console.error('Lỗi thông báo:', err));

    res.status(201).json({
      message: 'Thanh toán thành công',
      payment,
      walletBalance: student.walletBalance
    });
  } catch (error) {
    next(error);
  }
});

router.post('/webhook/vnpay', async (req, res, next) => {
  try {
    const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount } = req.body;

    const payment = await Payment.findOne({
      organizationId: req.organizationId,
      transactionId: String(vnp_TxnRef)
    });

    if (!payment) {
      return res.status(404).json({ error: 'Không tìm thấy thanh toán' });
    }

    const organization = await Organization.findById(payment.organizationId);
    const orgName = organization?.name || 'Trung tâm';

    if (vnp_ResponseCode === '00') {
      payment.status = 'success';
      payment.paidAt = new Date();
      await payment.save();

      if (payment.feeId) {
        const fee = await Fee.findOne({
          _id: payment.feeId,
          organizationId: payment.organizationId
        });

        if (fee) {
          fee.paidAmount = (fee.paidAmount || 0) + payment.amount;
          if (fee.paidAmount >= fee.finalAmount) {
            fee.status = 'paid';
            fee.paidAt = new Date();
          } else {
            fee.status = 'partial';
          }
          await fee.save();
        }
      }

      // Thông báo thanh toán thành công
      notificationService.notifyPaymentSuccess(payment.studentId, payment, orgName).catch(err => {
        console.error('Lỗi gửi thông báo thanh toán:', err);
      });
    } else {
      payment.status = 'failed';
      payment.paymentDetails = { responseCode: vnp_ResponseCode };
      await payment.save();

      // Thông báo thanh toán thất bại
      notificationService.notifyPaymentFailed(payment.studentId, payment, 'Thanh toán qua VNPay không thành công').catch(err => {
        console.error('Lỗi gửi thông báo:', err);
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/confirm-manual', async (req, res, next) => {
  try {
    const { studentId, feeId, amount, notes, paymentMethod = 'banking', receiptUrl } = req.body;

    if (req.user.role === 'family') {
      const isMyChild = req.user.childIds?.some(id => id.toString() === studentId) || req.user.studentId?.toString() === studentId;
      if (!isMyChild) {
        return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này cho học sinh này' });
      }
    } else if (!req.user.canProcessPayments()) {
      return res.status(403).json({ error: 'Bạn không có quyền thu tiền hoặc ghi nhận thanh toán' });
    }

    const organization = await Organization.findById(req.organizationId);
    const orgName = organization?.name || 'Trung tâm';

    const isFamily = req.user.role === 'family';
    const payment = await Payment.create({
      organizationId: req.organizationId,
      studentId,
      feeId,
      amount: toNumber(amount),
      paymentMethod,
      status: isFamily ? 'pending' : 'success',
      paidAt: isFamily ? null : new Date(),
      receiptUrl: receiptUrl || null,
      notes: notes || (isFamily ? 'Phụ huynh gửi biên lai chuyển khoản' : 'Xác nhận thanh toán thủ công')
    });

    if (!isFamily) {
      if (feeId) {
        await paymentService.applyPaymentToFee(feeId, payment.amount);
      } else {
        await paymentService.autoApplyPaymentToStudentFees(studentId, payment.amount);
      }
    }

    const populated = await Payment.findById(payment._id)
      .populate('studentId', 'name studentCode parentName');

    if (isFamily) {
      // Thông báo cho admin là có yêu cầu duyệt thanh toán mới
      notificationService.createForOrganizationAdmins(
        req.organizationId,
        'Yêu cầu duyệt chuyển khoản',
        `Phụ huynh học sinh ${populated.studentId?.name} đã gửi ảnh biên lai đối soát học phí số tiền ${Number(amount).toLocaleString('vi-VN')}đ.`,
        'payment',
        { paymentId: payment._id }
      ).catch(err => console.error('Lỗi gửi thông báo cho admin:', err));
    } else {
      // Thông báo thanh toán thành công cho phụ huynh
      notificationService.createForParent(
        studentId,
        'Thanh toán thành công',
        `Học phí của học sinh ${populated.studentId?.name} số tiền ${Number(amount).toLocaleString('vi-VN')}đ đã được xác nhận thành công.`,
        'payment'
      ).catch(err => console.error('Lỗi gửi thông báo cho phụ huynh:', err));
    }

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/invoice', async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    })
      .populate('studentId', 'name studentCode parentName')
      .populate('feeId', 'finalAmount amount description');

    if (!payment) {
      return res.status(404).json({ error: 'Không tìm thấy thanh toán' });
    }

    const organization = await Organization.findById(req.organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin trung tâm' });
    }

    const invoiceNumber = `INV-${payment.transactionId || payment._id}`;
    const paymentDate = payment.paidAt
      ? new Date(payment.paidAt).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';

    let imageSrc = payment.receiptUrl;
    if (imageSrc && imageSrc.includes('/uploads/')) {
      const idx = imageSrc.indexOf('/uploads/');
      imageSrc = imageSrc.substring(idx);
    }

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Hóa đơn thanh toán - ${invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 14px; color: #1F2937; padding: 24px; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; }
          .header h1 { font-size: 22px; color: #111827; }
          .header p { color: #6B7280; margin-top: 4px; }
          .section { margin-bottom: 16px; }
          .section-title { font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px; }
          .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #E5E7EB; }
          .row:last-child { border-bottom: none; }
          .label { color: #6B7280; font-size: 13px; }
          .value { font-weight: 500; text-align: right; }
          .amount-box { margin-top: 16px; padding: 12px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; }
          .amount-box .total { font-size: 20px; font-weight: 700; color: #059669; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 12px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; background: #D1FAE5; color: #065F46; }
          .qr-placeholder { margin-top: 12px; width: 140px; height: 140px; border: 1px solid #E5E7EB; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9CA3AF; font-size: 12px; background: #F9FAFB; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>HÓA ĐƠN THANH TOÁN</h1>
            <p>${organization.name}</p>
            <p>${organization.address || ''} ${organization.phone || ''}</p>
          </div>

          <div class="section">
            <div class="section-title">Thông tin hóa đơn</div>
            <div class="row">
              <span class="label">Số hóa đơn</span>
              <span class="value">${invoiceNumber}</span>
            </div>
            <div class="row">
              <span class="label">Ngày thanh toán</span>
              <span class="value">${paymentDate}</span>
            </div>
            <div class="row">
              <span class="label">Phương thức</span>
              <span class="value">${paymentMethodLabel(payment.paymentMethod)}</span>
            </div>
            <div class="row">
              <span class="label">Trạng thái</span>
              <span class="value"><span class="badge">Đã thanh toán</span></span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Thông tin học sinh</div>
            <div class="row">
              <span class="label">Họ và tên</span>
              <span class="value">${payment.studentId?.name || '-'}</span>
            </div>
            <div class="row">
              <span class="label">Mã học sinh</span>
              <span class="value">${payment.studentId?.studentCode || '-'}</span>
            </div>
            <div class="row">
              <span class="label">Phụ huynh</span>
              <span class="value">${payment.studentId?.parentName || '-'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Chi tiết khoản phí</div>
            <div class="row">
              <span class="label">Nội dung</span>
              <span class="value">${payment.feeId?.description || payment.notes || 'Thanh toán học phí'}</span>
            </div>
            <div class="row">
              <span class="label">Số tiền</span>
              <span class="value">${formatNumber(payment.amount)} VNĐ</span>
            </div>
          </div>

          <div class="amount-box">
            <div class="row">
              <span class="label" style="font-size: 15px; font-weight: 600;">Tổng thanh toán</span>
              <span class="value total">${formatNumber(payment.amount)} VNĐ</span>
            </div>
          </div>

          ${payment.receiptUrl ? `
          <div class="section">
            <div class="section-title">Biên lai chuyển khoản</div>
            <img src="${imageSrc}" style="max-width: 320px; border: 1px solid #E5E7EB; border-radius: 8px;" />
          </div>` : ''}

          <div class="footer">
            <p>Cảm ơn quý khách đã thanh toán. Đây là hóa đơn được tạo tự động bởi hệ thống SmartFee.</p>
            <p style="margin-top: 4px;">Mã tra cứu: ${invoiceNumber}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(invoiceHtml);
  } catch (error) {
    next(error);
  }
});

function paymentMethodLabel(method) {
  const map = {
    cash: 'Tiền mặt',
    banking: 'Chuyển khoản ngân hàng',
    vnpay: 'VNPay',
    momo: 'Ví MoMo',
    payos: 'PayOS',
    wallet: 'Ví điện tử'
  };
  return map[method] || method;
}

function formatNumber(value) {
  return Number(value).toLocaleString('vi-VN');
}

router.get('/stats/summary', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const match = { organizationId: req.organizationId, status: 'success' };
    if (startDate || endDate) {
      match.paidAt = {};
      if (startDate) match.paidAt.$gte = new Date(startDate);
      if (endDate) match.paidAt.$lte = new Date(endDate);
    }

    const stats = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    const summary = {
      totalAmount: 0,
      totalCount: 0,
      byMethod: {}
    };

    stats.forEach(s => {
      summary.totalAmount += s.total;
      summary.totalCount += s.count;
      summary.byMethod[s._id] = { count: s.count, amount: s.total };
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Phê duyệt giao dịch chuyển khoản thủ công đang chờ duyệt
router.post('/:id/approve', requireCanProcessPayments, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
      status: 'pending'
    });

    if (!payment) {
      return res.status(404).json({ error: 'Không tìm thấy giao dịch đang chờ duyệt' });
    }

    payment.status = 'success';
    payment.paidAt = new Date();
    payment.confirmedBy = req.user._id;
    payment.confirmedAt = new Date();
    await payment.save();

    if (payment.feeId) {
      await paymentService.applyPaymentToFee(payment.feeId, payment.amount);
    } else {
      await paymentService.autoApplyPaymentToStudentFees(payment.studentId, payment.amount);
    }

    const populated = await Payment.findById(payment._id)
      .populate('studentId', 'name studentCode parentName');

    // Thông báo cho cả phụ huynh và học sinh là đã duyệt thành công
    notificationService.createForParent(
      payment.studentId,
      'Thanh toán thành công',
      `Ảnh biên lai chuyển khoản học phí số tiền ${payment.amount.toLocaleString('vi-VN')}đ đã được xác nhận thành công.`,
      'payment'
    ).catch(err => console.error('Lỗi gửi thông báo cho phụ huynh:', err));

    notificationService.createForStudent(
      payment.studentId,
      'Thanh toán thành công',
      `Biên lai chuyển khoản học phí số tiền ${payment.amount.toLocaleString('vi-VN')}đ đã được xác nhận thành công.`,
      'payment'
    ).catch(err => console.error('Lỗi gửi thông báo cho học sinh:', err));

    res.json({ message: 'Phê duyệt giao dịch thành công', payment: populated });
  } catch (error) {
    next(error);
  }
});

// Từ chối giao dịch chuyển khoản thủ công
router.post('/:id/reject', requireCanProcessPayments, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
      status: 'pending'
    });

    if (!payment) {
      return res.status(404).json({ error: 'Không tìm thấy giao dịch đang chờ duyệt' });
    }

    payment.status = 'failed';
    payment.confirmedBy = req.user._id;
    payment.confirmedAt = new Date();
    await payment.save();

    const populated = await Payment.findById(payment._id)
      .populate('studentId', 'name studentCode parentName');

    // Thông báo cho cả phụ huynh và học sinh là giao dịch bị từ chối
    notificationService.createForParent(
      payment.studentId,
      'Giao dịch bị từ chối',
      `Ảnh biên lai chuyển khoản học phí số tiền ${payment.amount.toLocaleString('vi-VN')}đ đã bị từ chối xác nhận. Vui lòng kiểm tra lại.`,
      'payment'
    ).catch(err => console.error('Lỗi gửi thông báo cho phụ huynh:', err));

    notificationService.createForStudent(
      payment.studentId,
      'Giao dịch bị từ chối',
      `Biên lai chuyển khoản học phí số tiền ${payment.amount.toLocaleString('vi-VN')}đ đã bị từ chối xác nhận.`,
      'payment'
    ).catch(err => console.error('Lỗi gửi thông báo cho học sinh:', err));

    res.json({ message: 'Từ chối giao dịch thành công', payment: populated });
  } catch (error) {
    next(error);
  }
});

// Xóa giao dịch (để admin dọn dẹp các giao dịch ảo/trùng lặp/chưa thanh toán)
router.delete('/:id', requireCanProcessPayments, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!payment) {
      return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
    }

    // Nếu giao dịch đã thành công, khi xóa cần trừ lại số tiền đã đóng của học phí
    if (payment.status === 'success') {
      if (payment.feeId) {
        const fee = await Fee.findOne({ _id: payment.feeId, organizationId: req.organizationId });
        if (fee) {
          fee.paidAmount = Math.max(0, (fee.paidAmount || 0) - payment.amount);
          if (fee.paidAmount <= 0) {
            fee.status = 'unpaid';
            fee.paidAt = null;
          } else if (fee.paidAmount < fee.finalAmount) {
            fee.status = 'partial';
            fee.paidAt = null;
          }
          await fee.save();
        }
      } else {
        await paymentService.revertAutoAppliedPayment(payment.studentId, payment.amount);
      }
    }

    await Payment.deleteOne({ _id: payment._id });

    res.json({ message: 'Xóa giao dịch thành công', paymentId: payment._id });
  } catch (error) {
    next(error);
  }
});

export default router;
