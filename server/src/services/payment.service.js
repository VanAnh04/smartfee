import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Fee from '../models/Fee.js';
import Student from '../models/Student.js';
import QRConfig from '../models/QRConfig.js';

class PaymentService {
  async createPayment({
    organizationId,
    studentId,
    feeId,
    amount,
    paymentMethod,
    status = 'pending',
    paidAt = null,
    notes = '',
    paymentDetails = {}
  }) {
    const payment = await Payment.create({
      organizationId,
      studentId,
      feeId,
      amount,
      paymentMethod,
      status,
      paidAt: status === 'success' ? new Date() : paidAt,
      notes,
      paymentDetails
    });

    if (status === 'success' && feeId) {
      await this.applyPaymentToFee(feeId, amount);
    }

    return payment;
  }

  async applyPaymentToFee(feeId, amount) {
    const fee = await Fee.findOne({
      _id: feeId,
      status: { $in: ['unpaid', 'partial', 'overdue'] }
    });

    if (!fee) return;

    fee.paidAmount = (fee.paidAmount || 0) + amount;

    if (fee.paidAmount >= fee.finalAmount) {
      fee.status = 'paid';
      fee.paidAt = new Date();
    } else {
      fee.status = 'partial';
    }

    await fee.save();
  }

  async getQRConfig(organizationId) {
    let config = await QRConfig.findOne({ organizationId });

    if (!config) {
      config = await QRConfig.create({ organizationId });
    }

    return config;
  }

  async getFamilyPayments({ studentIds, page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find({ studentId: { $in: studentIds }, status: 'success' })
        .populate('studentId', 'name studentCode')
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments({ studentId: { $in: studentIds }, status: 'success' })
    ]);

    return { payments, total, page: Number(page), limit: Number(limit) };
  }

  async getFamilyFees(studentIds) {
    return Fee.find({ studentId: { $in: studentIds } })
      .populate('classId', 'name')
      .populate('feePeriodId', 'name')
      .sort({ createdAt: -1 });
  }
}

const paymentService = new PaymentService();

export default paymentService;
export { PaymentService };
