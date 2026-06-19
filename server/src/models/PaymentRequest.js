import mongoose from 'mongoose';

const paymentRequestSchema = new mongoose.Schema({
  orderCode: {
    type: Number,
    required: true,
    unique: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  targetPlan: {
    type: String,
    required: true,
    enum: ['basic', 'gold', 'premium']
  },
  months: {
    type: Number,
    required: true,
    default: 1
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING'
  },
  paymentUrl: {
    type: String
  },
  paidAt: {
    type: Date
  }
}, {
  timestamps: true
});

const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);

export default PaymentRequest;
