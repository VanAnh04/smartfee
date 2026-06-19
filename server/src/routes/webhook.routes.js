import express from 'express';
import Organization from '../models/Organization.js';
import Payment from '../models/Payment.js';
import Fee from '../models/Fee.js';
import payosService from '../services/payos.service.js';
import notificationService from '../services/notification.service.js';

const router = express.Router();

router.post('/payos', async (req, res) => {
  try {
    const body = req.body;
    const signature = req.headers['x-payos-signature'] || req.headers['x-signature'];

    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({ error: 'Empty body' });
    }

    const { orderCode, status, amount, description, organizationId } = body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organizationId' });
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const config = organization.payosConfig || {};
    if (!config.clientId || !config.apiKey || !config.checksumKey) {
      return res.status(400).json({ error: 'PayOS not configured for this organization' });
    }

    payosService.initialize({
      clientId: config.clientId,
      apiKey: config.apiKey,
      checksumKey: config.checksumKey
    });

    if (signature) {
      const isValid = await payosService.verifyWebhook(body, signature);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const numericOrderCode = Number(orderCode);

    if (status === 'PAID') {
      console.log('Processing PAID payment for orderCode:', numericOrderCode);

      const payment = await Payment.findOne({
        organizationId: organization._id,
        transactionId: String(numericOrderCode)
      });

      if (payment && payment.status !== 'success') {
        payment.status = 'success';
        payment.paymentDetails = {
          ...(payment.paymentDetails || {}),
          responseCode: '00',
          orderCode: numericOrderCode
        };
        await payment.save();

        // Gửi thông báo thanh toán thành công
        await notificationService.notifyPaymentSuccess(payment.studentId, payment, organization.name);

        if (payment.feeId) {
          const fee = await Fee.findOne({
            _id: payment.feeId,
            organizationId: organization._id
          });

          if (fee && fee.status !== 'paid') {
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
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('PayOS webhook error:', error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

export default router;
