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

  async autoApplyPaymentToStudentFees(studentId, amount) {
    const fees = await Fee.find({
      studentId,
      status: { $in: ['unpaid', 'partial', 'overdue'] }
    }).sort({ dueDate: 1, createdAt: 1 });

    let remainingPayment = amount;
    for (const fee of fees) {
      if (remainingPayment <= 0) break;
      const needed = fee.finalAmount - fee.paidAmount;
      if (needed <= 0) continue;

      const allocated = Math.min(remainingPayment, needed);
      fee.paidAmount += allocated;
      remainingPayment -= allocated;
      await fee.save();
    }
  }

  async revertAutoAppliedPayment(studentId, amount) {
    const fees = await Fee.find({
      studentId,
      paidAmount: { $gt: 0 }
    }).sort({ dueDate: -1, createdAt: -1 });

    let remainingRevert = amount;
    for (const fee of fees) {
      if (remainingRevert <= 0) break;
      const revertAmount = Math.min(remainingRevert, fee.paidAmount);
      fee.paidAmount -= revertAmount;
      remainingRevert -= revertAmount;
      await fee.save();
    }
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
