import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  feeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fee'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'banking', 'vnpay', 'wallet', 'momo', 'payos'],
    default: 'cash'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  payosOrderCode: {
    type: String,
    sparse: true
  },
  paymentUrl: {
    type: String
  },
  vnpayTxnRef: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  qrData: {
    type: String
  },
  paymentDetails: {
    bankCode: String,
    cardType: String,
    txnRef: String,
    responseCode: String
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  confirmedAt: {
    type: Date
  }
}, {
  timestamps: true
});

paymentSchema.index({ organizationId: 1, studentId: 1 });
paymentSchema.index({ organizationId: 1, transactionId: 1 });
paymentSchema.index({ organizationId: 1, status: 1 });
paymentSchema.index({ paidAt: 1 });

paymentSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.transactionId = `PAY-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
