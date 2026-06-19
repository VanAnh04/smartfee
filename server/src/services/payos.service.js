import { PayOS } from '@payos/node';

class PayOSService {
  constructor() {
    this.payos = null;
    this.config = null;
  }

  initialize(config = {}) {
    const { clientId, apiKey, checksumKey } = config;

    if (!clientId || !apiKey || !checksumKey) {
      throw new Error('Thiếu cấu hình PayOS: clientId, apiKey hoặc checksumKey');
    }

    this.payos = new PayOS({ clientId, apiKey, checksumKey });
    this.config = { clientId, apiKey, checksumKey };
    return true;
  }

  getClient(organization) {
    const config = organization?.payosConfig || {};
    this.initialize({
      clientId: config.clientId || process.env.PAYOS_CLIENT_ID,
      apiKey: config.apiKey || process.env.PAYOS_API_KEY,
      checksumKey: config.checksumKey || process.env.PAYOS_CHECKSUM_KEY
    });
    return this.payos;
  }

  async createPaymentLink({
    organization,
    amount,
    orderCode,
    description,
    returnUrl,
    cancelUrl,
    buyerName,
    buyerEmail,
    buyerPhone
  }) {
    const payos = this.getClient(organization);

    const paymentData = {
      orderCode: Number(orderCode),
      amount: Number(amount),
      description: description || `Thanh toan hoc phi - ${orderCode}`,
      returnUrl: returnUrl || `${process.env.FRONTEND_URL}/payment/result?orderCode=${orderCode}`,
      cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel?orderCode=${orderCode}`,
      buyerName: buyerName || '',
      buyerEmail: buyerEmail || '',
      buyerPhone: buyerPhone || ''
    };

    try {
      const paymentLink = await payos.paymentRequests.create(paymentData);
      return {
        success: true,
        paymentUrl: paymentLink.checkoutUrl,
        orderCode: Number(orderCode),
        amount: Number(amount)
      };
    } catch (error) {
      console.error('PayOS create payment error:', error);
      throw new Error('Không thể tạo liên kết thanh toán: ' + error.message);
    }
  }

  async verifyWebhook(webhookBody, webhookSignature) {
    if (!this.payos || !this.config) {
      throw new Error('PayOS chưa được cấu hình');
    }

    try {
      const isValid = this.payos.paymentRequests.verifyWebhook({
        ...webhookBody,
        signature: webhookSignature
      });
      return isValid;
    } catch (error) {
      console.error('PayOS webhook verification error:', error);
      return false;
    }
  }

  async getPaymentStatus(orderCode) {
    if (!this.payos || !this.config) {
      throw new Error('PayOS chưa được cấu hình');
    }

    try {
      const paymentDetail = await this.payos.paymentRequests.get(orderCode);
      return paymentDetail;
    } catch (error) {
      throw new Error('Không thể lấy thông tin thanh toán: ' + error.message);
    }
  }
}

const payosService = new PayOSService();

export default payosService;
export { PayOSService };
