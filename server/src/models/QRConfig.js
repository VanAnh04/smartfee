import mongoose from 'mongoose';

const qrConfigSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  bankName: {
    type: String,
    trim: true,
    default: ''
  },
  accountNumber: {
    type: String,
    trim: true,
    default: ''
  },
  accountName: {
    type: String,
    trim: true,
    default: ''
  },
  qrImageUrl: {
    type: String,
    trim: true,
    default: ''
  },
  qrData: {
    type: String,
    trim: true,
    default: ''
  },
  momoNumber: {
    type: String,
    trim: true,
    default: ''
  },
  momoQrUrl: {
    type: String,
    trim: true,
    default: ''
  },
  vnpayQrUrl: {
    type: String,
    trim: true,
    default: ''
  },
  instructions: {
    type: String,
    trim: true,
    default: 'Vui lòng chuyển khoản theo thông tin bên trên và giữ lại biên lai để đối chiếu.'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

qrConfigSchema.index({ organizationId: 1 }, { unique: true });

const QRConfig = mongoose.model('QRConfig', qrConfigSchema);

export default QRConfig;
