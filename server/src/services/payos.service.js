import { PayOS } from '@payos/node';

class PayOSService {
  constructor() {
    this.payos = null;
    this.config = null;
  }

  // Khởi tạo PayOS với config cụ thể
  initialize(config = {}) {
    const { clientId, apiKey, checksumKey } = config;

    if (!clientId || !apiKey || !checksumKey) {
      throw new Error('Thiếu cấu hình PayOS: clientId, apiKey hoặc checksumKey');
    }

    this.payos = new PayOS({ clientId, apiKey, checksumKey });
    this.config = { clientId, apiKey, checksumKey };
    return true;
  }

  // Lấy PayOS của SmartFee (từ .env) - Dùng để trung tâm thanh toán phí gói dịch vụ cho SmartFee
  getSmartFeeClient() {
    this.initialize({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY
    });
    return this.payos;
  }

  // Lấy PayOS của Trung tâm (từ organization) - Dùng để phụ huynh thanh toán học phí cho trung tâm
  getOrganizationClient(organization) {
    const config = organization?.payosConfig || {};
    
    if (!config.clientId || !config.apiKey || !config.checksumKey) {
      throw new Error('Trung tâm chưa cấu hình PayOS');
    }
    
    this.initialize({
      clientId: config.clientId,
      apiKey: config.apiKey,
      checksumKey: config.checksumKey
    });
    return this.payos;
  }

  // Tạo payment link - phân biệt theo loại
  async createPaymentLink({
    type = 'organization', // 'smartfee' hoặc 'organization'
    organization,
    amount,
    orderCode,
    description,
    returnUrl,
    cancelUrl,
    buyerName,
    buyerEmail,
    buyerPhone,
    origin
  }) {
    let payos;
    
    if (type === 'smartfee') {
      // PayOS của SmartFee - thanh toán phí gói dịch vụ
      payos = this.getSmartFeeClient();
    } else {
      // PayOS của Trung tâm - thanh toán học phí
      payos = this.getOrganizationClient(organization);
    }

    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (!parsed.hostname.includes('localhost') && !parsed.hostname.includes('127.0.0.1')) {
          frontendUrl = parsed.origin;
        }
      } catch (e) {
        console.error('Lỗi phân tích origin trong PayOS service:', e);
      }
    }

    let returnUrlPath = `/payment/result?orderCode=${orderCode}&type=${type}`;
    let cancelUrlPath = `/payment/cancel?orderCode=${orderCode}`;

    if (type === 'smartfee') {
      returnUrlPath = `/settings?payment=success&orderCode=${orderCode}`;
      cancelUrlPath = `/settings?payment=cancelled`;
    }

    const paymentData = {
      orderCode: Number(orderCode),
      amount: Number(amount),
      description: description || `Thanh toan hoc phi - ${orderCode}`,
      returnUrl: returnUrl || `${frontendUrl}${returnUrlPath}`,
      cancelUrl: cancelUrl || `${frontendUrl}${cancelUrlPath}`,
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
        amount: Number(amount),
        type: type
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

  // Lấy trạng thái thanh toán - cần biết loại để dùng config đúng
  async getPaymentStatus(orderCode, type = 'organization') {
    try {
      let payos;
      
      if (type === 'smartfee') {
        payos = this.getSmartFeeClient();
      } else {
        // Cần truyền organization khi kiểm tra thanh toán của trung tâm
        throw new Error('Cần organization để kiểm tra thanh toán của trung tâm');
      }
      
      const paymentDetail = await payos.paymentRequests.get(parseInt(orderCode));
      return paymentDetail;
    } catch (error) {
      throw new Error('Không thể lấy thông tin thanh toán: ' + error.message);
    }
  }

  // Kiểm tra thanh toán của trung tâm (phụ huynh trả học phí)
  async getOrganizationPaymentStatus(organization, orderCode) {
    try {
      const payos = this.getOrganizationClient(organization);
      const paymentDetail = await payos.paymentRequests.get(parseInt(orderCode));
      return paymentDetail;
    } catch (error) {
      throw new Error('Không thể lấy thông tin thanh toán: ' + error.message);
    }
  }
}

const payosService = new PayOSService();

export default payosService;
export { PayOSService };
