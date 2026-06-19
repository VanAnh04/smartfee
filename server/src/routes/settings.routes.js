import express from 'express';
import Organization, { PLANS, PLAN_FEATURES, PLAN_ORDER } from '../models/Organization.js';
import User, { ROLES } from '../models/User.js';
import QRConfig from '../models/QRConfig.js';
import { auth, requireAdmin, requirePermission } from '../middleware/auth.js';
import { checkStaffLimit, getUsageInfo } from '../middleware/planLimits.js';

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    res.json(organization);
  } catch (error) {
    next(error);
  }
});

router.put('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, logo, address, phone, email, settings } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      req.organizationId,
      { name, logo, address, phone, email, settings },
      { new: true, runValidators: true }
    );

    res.json(organization);
  } catch (error) {
    next(error);
  }
});

router.get('/usage', async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    const usage = await organization.getUsageSummary();
    res.json(usage);
  } catch (error) {
    next(error);
  }
});

router.get('/plans', async (req, res, next) => {
  try {
    res.json({
      plans: PLAN_FEATURES,
      order: PLAN_ORDER
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upgrade', requireAdmin, async (req, res, next) => {
  try {
    const { targetPlan, months = 1 } = req.body;

    if (!targetPlan || !Object.values(PLANS).includes(targetPlan)) {
      return res.status(400).json({ error: 'Gói dịch vụ không hợp lệ' });
    }

    const organization = await Organization.findById(req.organizationId);

    if (!organization.canUpgradeTo(targetPlan)) {
      return res.status(400).json({
        error: 'Không thể hạ cấp gói dịch vụ',
        currentPlan: organization.plan,
        targetPlan: targetPlan
      });
    }

    const planInfo = PLAN_FEATURES[targetPlan];
    if (!planInfo || planInfo.price === 0) {
      return res.status(400).json({
        error: 'Gói Basic là miễn phí, không cần thanh toán'
      });
    }

    const payosService = (await import('../services/payos.service.js')).default;

    if (!organization.payosConfig?.clientId) {
      return res.status(400).json({
        error: 'Chưa cấu hình PayOS cho trung tâm. Vui lòng nhập Client ID, API Key và Checksum Key trong phần Cài đặt.'
      });
    }

    const paymentResult = await payosService.createPaymentLink({
      organization,
      amount: planInfo.price * months,
      orderCode: Math.floor(Date.now() / 1000),
      description: `SmartFee ${planInfo.name} ${months}th`,
      buyerName: organization.name,
      buyerEmail: organization.email || '',
      buyerPhone: organization.phone || ''
    });

    res.json({
      success: true,
      paymentUrl: paymentResult.paymentUrl,
      paymentData: paymentResult
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upgrade/payos', requireAdmin, async (req, res, next) => {
  try {
    const { targetPlan, months = 1 } = req.body;

    if (!targetPlan || !Object.values(PLANS).includes(targetPlan)) {
      return res.status(400).json({ error: 'Gói dịch vụ không hợp lệ' });
    }

    const organization = await Organization.findById(req.organizationId);

    if (!organization.canUpgradeTo(targetPlan)) {
      return res.status(400).json({
        error: 'Không thể hạ cấp gói dịch vụ',
        currentPlan: organization.plan,
        targetPlan: targetPlan
      });
    }

    const planInfo = PLAN_FEATURES[targetPlan];
    if (!planInfo || planInfo.price === 0) {
      return res.status(400).json({
        error: 'Gói Basic là miễn phí, không cần thanh toán'
      });
    }

    const payosService = (await import('../services/payos.service.js')).default;

    if (!organization.payosConfig?.clientId) {
      return res.status(400).json({
        error: 'Chưa cấu hình PayOS cho trung tâm'
      });
    }

    const paymentResult = await payosService.createPaymentLink({
      organization,
      amount: planInfo.price * months,
      orderCode: Math.floor(Date.now() / 1000),
      description: `SmartFee ${planInfo.name} ${months}th`,
      buyerName: organization.name,
      buyerEmail: organization.email || '',
      buyerPhone: organization.phone || ''
    });

    res.json({
      success: true,
      paymentUrl: paymentResult.paymentUrl,
      paymentData: paymentResult
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upgrade/confirm', requireAdmin, async (req, res, next) => {
  try {
    const { orderCode } = req.body;
    console.log('Confirm upgrade request:', { orderCode, organizationId: req.organizationId });

    const payosService = (await import('../services/payos.service.js')).default;

    if (!payosService.config) {
      return res.status(400).json({ error: 'PayOS chưa được cấu hình cho trung tâm' });
    }

    const paymentDetail = await payosService.getPaymentStatus(parseInt(orderCode));
    console.log('Payment detail from PayOS:', paymentDetail);

    if (paymentDetail.status !== 'PAID') {
      return res.status(400).json({
        error: 'Thanh toán chưa hoàn tất',
        status: paymentDetail.status
      });
    }

    const organization = await Organization.findById(req.organizationId);
    console.log('Organization before upgrade:', { name: organization.name, plan: organization.plan });

    const targetPlan = req.body.targetPlan;
    if (!targetPlan || !Object.values(PLANS).includes(targetPlan)) {
      return res.status(400).json({ error: 'Gói dịch vụ không hợp lệ' });
    }

    if (!organization.canUpgradeTo(targetPlan)) {
      return res.status(400).json({ error: 'Không thể hạ cấp gói dịch vụ' });
    }

    await organization.upgradePlan(targetPlan, req.body.months || 1);
    console.log('Organization after upgrade:', { plan: organization.plan, targetPlan });

    res.json({
      success: true,
      message: 'Nâng cấp gói dịch vụ thành công',
      organization: {
        _id: organization._id,
        name: organization.name,
        plan: organization.plan,
        planExpiresAt: organization.planExpiresAt
      },
      planInfo: organization.getPlanInfo()
    });
  } catch (error) {
    console.error('Confirm upgrade error:', error);
    next(error);
  }
});

router.post('/cancel', requireAdmin, async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);

    if (organization.plan === PLANS.BASIC) {
      return res.status(400).json({ error: 'Gói Basic không thể hủy' });
    }

    await organization.cancelSubscription();

    res.json({
      message: 'Đã hủy gia hạn gói dịch vụ. Gói hiện tại sẽ được duy trì đến khi hết hạn.',
      planExpiresAt: organization.planExpiresAt
    });
  } catch (error) {
    next(error);
  }
});

router.get('/staff', async (req, res, next) => {
  try {
    const selectFields = req.user.isAdmin() || req.user.role === 'staff'
      ? '-password'
      : 'name email role isActive';

    const staff = await User.find({ organizationId: req.organizationId })
      .select(selectFields)
      .sort({ createdAt: -1 });

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

router.post('/staff', requireAdmin, checkStaffLimit, async (req, res, next) => {
  try {
    const { email, password, name, phone, role, permissions } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    const user = await User.create({
      organizationId: req.organizationId,
      email,
      password,
      name,
      phone,
      role: role || ROLES.STAFF,
      permissions: permissions || []
    });

    const response = {
      ...user.toJSON(),
      warnings: []
    };

    if (req.planStatus?.staffLimitWarning) {
      response.warnings.push(req.planStatus.staffLimitWarning);
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.put('/staff/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, phone, role, permissions, isActive } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { name, phone, role, permissions, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete('/staff/:id', requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Bạn không thể xóa chính mình' });
    }

    const user = await User.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    res.json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    next(error);
  }
});

router.get('/qr-config', requireAdmin, async (req, res, next) => {
  try {
    const [qrConfig, organization] = await Promise.all([
      QRConfig.findOne({ organizationId: req.organizationId }),
      Organization.findById(req.organizationId).select('payosConfig')
    ]);

    res.json({
      qrConfig: qrConfig || {},
      payosConfig: organization?.payosConfig || {}
    });
  } catch (error) {
    next(error);
  }
});

router.post('/qr-config', requireAdmin, async (req, res, next) => {
  try {
    const { bankName, accountNumber, accountName, qrImageUrl, qrData, momoNumber, momoQrUrl, vnpayQrUrl, instructions, isActive, payosClientId, payosApiKey, payosChecksumKey } = req.body;

    const [qrConfig] = await Promise.all([
      QRConfig.findOneAndUpdate(
        { organizationId: req.organizationId },
        { bankName, accountNumber, accountName, qrImageUrl, qrData, momoNumber, momoQrUrl, vnpayQrUrl, instructions, isActive },
        { new: true, runValidators: true, upsert: true }
      ),
      Organization.findByIdAndUpdate(
        req.organizationId,
        {
          payosConfig: {
            clientId: payosClientId || '',
            apiKey: payosApiKey || '',
            checksumKey: payosChecksumKey || ''
          }
        },
        { new: true }
      )
    ]);

    const updatedOrg = await Organization.findById(req.organizationId).select('payosConfig');

    res.json({
      qrConfig,
      payosConfig: updatedOrg?.payosConfig || {}
    });
  } catch (error) {
    next(error);
  }
});

// GET /settings/support - Lấy cấu hình hỗ trợ
router.get('/support', async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId)
      .select('supportSettings');
    
    res.json({
      supportSettings: organization?.supportSettings || {
        hotline: '',
        email: '',
        zalo: '',
        website: '',
        address: '',
        workingHours: '8:00 - 17:00 (Thứ 2 - Thứ 6)',
        chatEnabled: true,
        faqs: []
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /settings/support - Cập nhật cấu hình hỗ trợ
router.post('/support', requireAdmin, async (req, res, next) => {
  try {
    const { hotline, email, zalo, website, address, workingHours, chatEnabled, faqs } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      req.organizationId,
      {
        supportSettings: {
          hotline: hotline || '',
          email: email || '',
          zalo: zalo || '',
          website: website || '',
          address: address || '',
          workingHours: workingHours || '8:00 - 17:00 (Thứ 2 - Thứ 6)',
          chatEnabled: chatEnabled ?? true,
          faqs: faqs || []
        }
      },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Cập nhật cấu hình hỗ trợ thành công',
      supportSettings: organization.supportSettings
    });
  } catch (error) {
    next(error);
  }
});

export default router;
