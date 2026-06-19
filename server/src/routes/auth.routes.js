import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import RefreshToken from '../models/RefreshToken.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { auth } from '../middleware/auth.js';
import { sendOTPEmail, sendPasswordChangedEmail } from '../utils/emailService.js';
import notificationService from '../services/notification.service.js';

const router = express.Router();

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, phone, organizationName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    let organization = await Organization.create({
      name: organizationName || `${name}'s Center`,
      plan: 'basic'
    });

    const user = await User.create({
      organizationId: organization._id,
      email,
      password,
      name,
      phone,
      role: 'admin'
    });

    // Gửi thông báo chào mừng cho admin mới
    await notificationService.notifyWelcome(user._id, organization.name);

    const { accessToken, refreshToken } = generateTokens(user._id);

    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Thông báo cho superadmin về trung tâm mới
    await notificationService.notifyNewOrganization(organization);

    res.status(201).json({
      message: 'Đăng ký thành công',
      user: user.toJSON(),
      organization,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// Login: hỗ trợ email, phone (cho family - phụ huynh), studentCode (cho family - học sinh)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, studentCode } = req.body;

    if (!email && !studentCode) {
      return res.status(400).json({ error: 'Email hoặc mã học sinh là bắt buộc' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Mật khẩu là bắt buộc' });
    }

    let user;

    // Tìm theo studentCode (cho family - học sinh)
    if (studentCode) {
      const Student = mongoose.model('Student');
      const student = await Student.findOne({ studentCode });
      if (student) {
        user = await User.findOne({ studentId: student._id }).select('+password');
      }
    }

    // Tìm theo email (cho admin, family)
    if (!user && email) {
      user = await User.findOne({ email }).select('+password');
    }

    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mã học sinh không đúng' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mật khẩu không đúng' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
    }

    const organization = await Organization.findById(user.organizationId);

    // Đồng bộ email và phone từ user vào organization nếu chưa có
    if (organization) {
      let needsSave = false;
      if (user.email && !organization.email) {
        organization.email = user.email;
        needsSave = true;
      }
      if (user.phone && !organization.phone) {
        organization.phone = user.phone;
        needsSave = true;
      }
      if (needsSave) {
        await organization.save();
      }
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    user.lastLogin = new Date();
    await user.save();

    // Populate thêm thông tin liên quan theo role
    let extraData = {};
    if (user.role === 'family') {
      // Lấy thông tin student nếu có
      if (user.studentId) {
        const Student = mongoose.model('Student');
        const student = await Student.findById(user.studentId);
        extraData.student = student;
      }
      // Lấy thông tin children nếu có
      if (user.childIds?.length > 0) {
        const Student = mongoose.model('Student');
        const children = await Student.find({ _id: { $in: user.childIds } });
        extraData.children = children;
      }
    }

    res.json({
      user: user.toJSON(),
      organization,
      accessToken,
      refreshToken,
      ...extraData
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth login
router.post('/google', async (req, res, next) => {
  try {
    const { googleToken, access_token, role = 'admin' } = req.body;

    let payload;
    let googleId;

    // Case 1: ID token (from GoogleLogin component / credential response)
    if (googleToken) {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      try {
        const ticket = await client.verifyIdToken({
          idToken: googleToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
        googleId = payload.sub;
      } catch (err) {
        return res.status(401).json({ error: 'Token Google không hợp lệ' });
      }
    }
    // Case 2: Access token (from useGoogleLogin hook)
    else if (googleAccessToken) {
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user info');
        payload = await response.json();
        googleId = payload.sub;
      } catch (err) {
        return res.status(401).json({ error: 'Không lấy được thông tin từ Google' });
      }
    } else {
      return res.status(400).json({ error: 'Token Google là bắt buộc' });
    }

    const { email, name, picture: avatar } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Không lấy được email từ Google' });
    }

    // Check if user exists by googleId or email
    let user = await User.findOne({ googleId });
    let isNewUser = false;
    let organization;

    if (!user) {
      // Check if user exists with same email (link Google account)
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // Link Google to existing account
        user.googleId = googleId;
        if (avatar && !user.avatar) user.avatar = avatar;
        await user.save();
      } else {
        // Create new user with Google
        isNewUser = true;

        // Get or create default organization
        const orgId = req.headers['x-organization-id'];
        let org = orgId ? await Organization.findById(orgId) : null;
        if (!org) {
          // Use the first organization or create one
          org = await Organization.findOne();
          if (!org) {
            org = await Organization.create({
              name: 'SmartFee Organization',
              plan: 'basic'
            });
          }
        }
        organization = org;

        user = await User.create({
          organizationId: org._id,
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          googleId,
          avatar,
          role,
          isActive: true
        });
      }
    } else {
      organization = await Organization.findById(user.organizationId);
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    user.lastLogin = new Date();
    await user.save();

    // Populate extra data for family role
    let extraData = {};
    if (user.role === 'family') {
      if (user.studentId) {
        const Student = mongoose.model('Student');
        const student = await Student.findById(user.studentId);
        extraData.student = student;
      }
      if (user.childIds?.length > 0) {
        const Student = mongoose.model('Student');
        const children = await Student.find({ _id: { $in: user.childIds } });
        extraData.children = children;
      }
    }

    res.json({
      user: user.toJSON(),
      organization,
      accessToken,
      refreshToken,
      isNewUser,
      ...extraData
    });
  } catch (error) {
    next(error);
  }
});

// Tạo tài khoản family tự động (admin/staff gọi khi thêm student)
router.post('/create-user-accounts', auth, async (req, res, next) => {
  try {
    const mongoose = await import('mongoose');
    const { studentId, parentEmail, parentPhone, parentName } = req.body;

    // Cho phép cả admin và staff tạo tài khoản
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Không có quyền tạo tài khoản' });
    }

    const Student = mongoose.model('Student');
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Học sinh không tồn tại' });
    }

    // Kiểm tra student có thuộc trung tâm của user không
    if (student.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ error: 'Học sinh không thuộc trung tâm của bạn' });
    }

    const results = { familyAccount: null, studentAccount: null };
    const generatedPassword = generateRandomPassword(8);

    // 1. Tạo tài khoản Family cho Phụ huynh (nếu có thông tin)
    // Logic: Tìm phụ huynh theo email VÀ phone (nếu có) để đảm bảo chính xác
    if (parentEmail || parentPhone) {
      // Xây dựng query tìm kiếm phụ huynh
      const parentQuery = {
        organizationId: req.organizationId,
        role: 'family',
        familyType: 'parent'
      };

      // Thêm điều kiện tìm kiếm - ưu tiên cả email VÀ phone nếu có
      if (parentEmail && parentPhone) {
        // Nếu có cả 2, tìm phụ huynh có email HOẶC phone (để gom các tài khoản cùng phụ huynh)
        parentQuery.$or = [
          { email: parentEmail.toLowerCase() },
          { phone: parentPhone }
        ];
      } else if (parentEmail) {
        parentQuery.email = parentEmail.toLowerCase();
      } else if (parentPhone) {
        parentQuery.phone = parentPhone;
      }

      const existingParent = await User.findOne(parentQuery);

      if (existingParent) {
        // Cập nhật familyType nếu chưa có (cho dữ liệu cũ)
        if (!existingParent.familyType) {
          existingParent.familyType = 'parent';
        }

        // Kiểm tra student đã có trong danh sách childIds chưa
        const studentIdStr = student._id.toString();
        const hasStudent = existingParent.childIds.some(
          childId => childId.toString() === studentIdStr
        );

        if (!hasStudent) {
          existingParent.childIds.push(student._id);
          // Cập nhật thông tin phụ huynh nếu có thông tin mới
          if (parentName && !existingParent.name.includes(parentName)) {
            existingParent.name = parentName;
          }
          if (parentPhone && !existingParent.phone) {
            existingParent.phone = parentPhone;
          }
          if (parentEmail && !existingParent.email) {
            existingParent.email = parentEmail.toLowerCase();
          }
          await existingParent.save();
        }

        // Lấy danh sách tất cả con của phụ huynh này
        const allChildren = await Student.find({ _id: { $in: existingParent.childIds } });

        results.familyAccount = {
          id: existingParent._id,
          existed: true,
          message: `Phụ huynh đã có tài khoản. Đã thêm học sinh vào danh sách.`,
          totalChildren: existingParent.childIds.length,
          childrenNames: allChildren.map(c => c.name)
        };
      } else {
        // Tạo tài khoản phụ huynh mới
        const parentUser = await User.create({
          organizationId: req.organizationId,
          email: (parentEmail || `parent_${student._id}@smartfee.local`).toLowerCase(),
          password: generatedPassword,
          name: parentName || 'Phụ huynh ' + student.name,
          phone: parentPhone,
          role: 'family',
          familyType: 'parent',
          childIds: [student._id]
        });

        // Gửi thông báo cho phụ huynh
        const orgName = (await Organization.findById(req.organizationId))?.name || 'Trung tâm';
        await notificationService.notifyAccountCreated(parentUser._id, 'family', orgName, generatedPassword);
        await notificationService.notifyWelcome(parentUser._id, orgName);

        results.familyAccount = {
          id: parentUser._id,
          email: (parentEmail || `parent_${student._id}@smartfee.local`).toLowerCase(),
          password: generatedPassword,
          existed: false,
          message: 'Đã tạo tài khoản phụ huynh mới'
        };
      }
    }

    // 2. Tạo tài khoản Family cho Học sinh
    const existingStudentAccount = await User.findOne({
      role: 'family',
      studentId: student._id
    });

    if (!existingStudentAccount) {
      const studentEmail = student.parentEmail || `student_${student._id}@smartfee.local`;

      const studentUser = await User.create({
        organizationId: req.organizationId,
        email: studentEmail.toLowerCase(),
        password: generatedPassword,
        name: student.name,
        phone: student.parentPhone,
        role: 'family',
        familyType: 'student',
        studentId: student._id
      });

      // Gửi thông báo cho học sinh
      const orgName = (await Organization.findById(req.organizationId))?.name || 'Trung tâm';
      await notificationService.notifyAccountCreated(studentUser._id, 'student', orgName, generatedPassword);

      results.studentAccount = {
        id: studentUser._id,
        studentCode: student.studentCode,
        email: studentEmail.toLowerCase(),
        password: generatedPassword
      };

      // Thông báo cho học sinh về tài khoản mới
      const org = await Organization.findById(req.organizationId);
      notificationService.createForUser(studentUser._id,
        'Tài khoản SmartFee đã được tạo',
        `Tài khoản của bạn tại ${org?.name || 'Trung tâm'} đã được tạo. Mã học sinh: ${student.studentCode}. Vui lòng đổi mật khẩu sau khi đăng nhập.`,
        'account_created',
        { studentCode: student.studentCode }
      ).catch(err => console.error('Lỗi thông báo:', err));
    } else {
      // Cập nhật familyType nếu chưa có (cho dữ liệu cũ)
      if (!existingStudentAccount.familyType) {
        existingStudentAccount.familyType = 'student';
        await existingStudentAccount.save();
      }

      results.studentAccount = {
        id: existingStudentAccount._id,
        studentCode: student.studentCode,
        existed: true,
        message: 'Học sinh đã có tài khoản'
      };
    }

    // Thông báo cho tài khoản phụ huynh mới
    if (!results.familyAccount?.existed && results.familyAccount) {
      const org = await Organization.findById(req.organizationId);
      notificationService.createForUser(results.familyAccount.id,
        'Tài khoản SmartFee đã được tạo',
        `Tài khoản phụ huynh của bạn tại ${org?.name || 'Trung tâm'} đã được tạo. Bạn có thể theo dõi học phí và thanh toán cho con.`,
        'account_created',
        { childName: student.name, childCode: student.studentCode }
      ).catch(err => console.error('Lỗi thông báo:', err));
    }

    res.json({
      message: 'Tạo tài khoản thành công',
      ...results
    });
  } catch (error) {
    next(error);
  }
});

// Lấy thông tin children của family
router.get('/my-children', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'family') {
      return res.status(403).json({ error: 'Chỉ tài khoản gia đình mới có quyền xem' });
    }

    const mongoose = await import('mongoose');
    const Student = mongoose.model('Student');
    const Fee = mongoose.model('Fee');
    const Payment = mongoose.model('Payment');

    const children = await Student.find({ _id: { $in: req.user.childIds || [] } });

    // Lấy thêm phí và thanh toán của từng con
    const childrenWithFees = await Promise.all(
      children.map(async (child) => {
        const fees = await Fee.find({ studentId: child._id })
          .populate('classId', 'name')
          .populate('feePeriodId', 'name');
        const payments = await Payment.find({ studentId: child._id })
          .sort({ createdAt: -1 })
          .limit(10);
        return {
          ...child.toObject(),
          fees,
          recentPayments: payments
        };
      })
    );

    res.json({ children: childrenWithFees });
  } catch (error) {
    next(error);
  }
});

// Lấy thông tin phí của family (phụ huynh xem con, học sinh xem bản thân)
router.get('/my-fees', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'family') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const mongoose = await import('mongoose');
    const Fee = mongoose.model('Fee');
    const Payment = mongoose.model('Payment');

    let studentIds = [];

    // Nếu là học sinh (có studentId) - xem bản thân
    if (req.user.studentId) {
      studentIds = [req.user.studentId];
    }
    // Nếu là phụ huynh (có childIds) - xem con
    else if (req.user.childIds?.length > 0) {
      studentIds = req.user.childIds;
    }

    const fees = await Fee.find({ studentId: { $in: studentIds } })
      .populate('classId', 'name')
      .populate('feePeriodId', 'name');

    const payments = await Payment.find({ studentId: { $in: studentIds } })
      .sort({ createdAt: -1 });

    res.json({ fees, payments });
  } catch (error) {
    next(error);
  }
});

// GET /family-accounts - Danh sách tài khoản family (chỉ admin)
router.get('/family-accounts', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền xem' });
    }

    const { search, page = 1, limit = 20 } = req.query;
    const mongoose = await import('mongoose');

    const query = {
      organizationId: req.organizationId,
      role: 'family',
      familyType: 'parent'
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [accounts, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // Lấy thông tin children cho mỗi tài khoản
    const Student = mongoose.model('Student');
    const accountsWithChildren = await Promise.all(
      accounts.map(async (account) => {
        const children = await Student.find({ _id: { $in: account.childIds } })
          .select('name studentCode status');
        return {
          ...account.toObject(),
          children
        };
      })
    );

    res.json({
      accounts: accountsWithChildren,
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

// GET /family-accounts/:id/children - Chi tiết con của một tài khoản family
router.get('/family-accounts/:id/children', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền xem' });
    }

    const mongoose = await import('mongoose');
    const Student = mongoose.model('Student');
    const Fee = mongoose.model('Fee');

    const account = await User.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
      role: 'family'
    });

    if (!account) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    const children = await Student.find({ _id: { $in: account.childIds } });

    // Lấy thông tin học phí của từng con
    const childrenWithFees = await Promise.all(
      children.map(async (child) => {
        const fees = await Fee.find({ studentId: child._id });
        const totalDebt = fees
          .filter(f => f.status !== 'paid')
          .reduce((sum, f) => sum + (f.amount - (f.paidAmount || 0)), 0);
        return {
          ...child.toObject(),
          totalFees: fees.length,
          totalDebt
        };
      })
    );

    res.json({
      account: {
        _id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone
      },
      children: childrenWithFees
    });
  } catch (error) {
    next(error);
  }
});

// POST /family-accounts/link-student - Liên kết học sinh với tài khoản family
router.post('/family-accounts/link-student', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện' });
    }

    const mongoose = await import('mongoose');
    const { parentId, studentId } = req.body;

    if (!parentId || !studentId) {
      return res.status(400).json({ error: 'Thiếu thông tin parentId hoặc studentId' });
    }

    const Student = mongoose.model('Student');
    const [parent, student] = await Promise.all([
      User.findOne({ _id: parentId, organizationId: req.organizationId, role: 'family' }),
      Student.findOne({ _id: studentId, organizationId: req.organizationId })
    ]);

    if (!parent) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản phụ huynh' });
    }

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    // Kiểm tra học sinh đã có trong danh sách chưa
    const studentIdStr = student._id.toString();
    const hasStudent = parent.childIds.some(
      childId => childId.toString() === studentIdStr
    );

    if (hasStudent) {
      return res.status(400).json({ error: 'Học sinh đã được liên kết với tài khoản này' });
    }

    parent.childIds.push(student._id);
    await parent.save();

    // Thông báo cho phụ huynh về việc liên kết
    notificationService.notifyAccountLinked(parent, student).catch(err => {
      console.error('Lỗi thông báo:', err);
    });

    res.json({
      message: 'Liên kết học sinh thành công',
      parent: {
        _id: parent._id,
        name: parent.name,
        childCount: parent.childIds.length
      },
      student: {
        _id: student._id,
        name: student.name
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /family-accounts/unlink-student - Hủy liên kết học sinh
router.post('/family-accounts/unlink-student', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện' });
    }

    const mongoose = await import('mongoose');
    const { parentId, studentId } = req.body;

    if (!parentId || !studentId) {
      return res.status(400).json({ error: 'Thiếu thông tin parentId hoặc studentId' });
    }

    const parent = await User.findOne({
      _id: parentId,
      organizationId: req.organizationId,
      role: 'family'
    });

    if (!parent) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản phụ huynh' });
    }

    const studentIdStr = studentId.toString();
    const index = parent.childIds.findIndex(
      childId => childId.toString() === studentIdStr
    );

    if (index === -1) {
      return res.status(400).json({ error: 'Học sinh không có trong danh sách của phụ huynh' });
    }

    parent.childIds.splice(index, 1);
    await parent.save();

    res.json({
      message: 'Hủy liên kết học sinh thành công',
      parent: {
        _id: parent._id,
        name: parent.name,
        childCount: parent.childIds.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function: sinh password ngẫu nhiên
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token là bắt buộc' });
    }

    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      isRevoked: false
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Người dùng không hợp lệ' });
    }

    storedToken.isRevoked = true;
    await storedToken.save();

    const tokens = generateTokens(user._id);

    await RefreshToken.create({
      userId: user._id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const organization = await Organization.findById(user.organizationId);

    res.json({
      user,
      organization,
      ...tokens
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', auth, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isRevoked: true }
      );
    }

    res.json({ message: 'Đăng xuất thành công' });
  } catch (error) {
    next(error);
  }
});

// Gửi yêu cầu quên mật khẩu - gửi OTP qua email
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email là bắt buộc' });
    }

    // Tìm user theo email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Luôn trả về thành công để tránh email enumeration attack
    if (!user) {
      return res.json({
        message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mã OTP đến email của bạn.',
        success: true
      });
    }

    // Kiểm tra rate limit - không gửi quá 5 lần trong 1 giờ
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await PasswordResetToken.countDocuments({
      email: email.toLowerCase(),
      createdAt: { $gte: oneHourAgo }
    });

    if (recentRequests >= 5) {
      return res.status(429).json({
        error: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 1 giờ.'
      });
    }

    // Tạo OTP 6 số
    const otp = PasswordResetToken.generateOTP(6);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút

    // Lưu OTP vào database
    await PasswordResetToken.create({
      userId: user._id,
      email: email.toLowerCase().trim(),
      otp,
      otpExpires
    });

    // Gửi email thực tế
    try {
      await sendOTPEmail(email, otp);
    } catch (emailError) {
      console.error('Lỗi gửi email:', emailError.message);
      // Vẫn tiếp tục để user có thể xem OTP trong console nếu email thất bại
      console.log('='.repeat(50));
      console.log('🔐 MÃ OTP ĐẶT LẠI MẬT KHẨU (Email gửi thất bại)');
      console.log('='.repeat(50));
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log(`Hết hạn: ${otpExpires.toLocaleString('vi-VN')}`);
      console.log('='.repeat(50));
    }

    res.json({
      message: 'Mã OTP đã được gửi đến email của bạn.',
      success: true
    });
  } catch (error) {
    next(error);
  }
});

// Xác thực OTP
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email và mã OTP là bắt buộc' });
    }

    // Tìm token chưa sử dụng và còn hạn
    const resetToken = await PasswordResetToken.findOne({
      email: email.toLowerCase().trim(),
      isUsed: false,
      otpExpires: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!resetToken) {
      return res.status(400).json({
        error: 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.'
      });
    }

    // Kiểm tra số lần thử
    if (resetToken.attemptCount >= 5) {
      return res.status(400).json({
        error: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.'
      });
    }

    // Kiểm tra OTP
    if (resetToken.otp !== otp) {
      resetToken.attemptCount += 1;
      resetToken.lastAttempt = new Date();
      await resetToken.save();

      const remainingAttempts = 5 - resetToken.attemptCount;
      return res.status(400).json({
        error: `Mã OTP không đúng. Bạn còn ${remainingAttempts} lần thử.`,
        remainingAttempts
      });
    }

    // Tạo reset token mới (dùng để đặt lại mật khẩu)
    const newResetToken = PasswordResetToken.generateResetToken();
    resetToken.resetToken = newResetToken;
    resetToken.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    await resetToken.save();

    res.json({
      message: 'Xác thực OTP thành công.',
      success: true,
      resetToken: newResetToken
    });
  } catch (error) {
    next(error);
  }
});

// Đặt lại mật khẩu mới
router.post('/reset-password', async (req, res, next) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Tìm token hợp lệ
    const tokenData = await PasswordResetToken.findOne({
      resetToken,
      isUsed: false,
      resetTokenExpires: { $gt: new Date() }
    });

    if (!tokenData) {
      return res.status(400).json({
        error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.'
      });
    }

    // Tìm user
    const user = await User.findById(tokenData.userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra mật khẩu mới không trùng với mật khẩu cũ
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ error: 'Mật khẩu mới không được trùng với mật khẩu cũ' });
    }

    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save();

    // Đánh dấu token đã sử dụng
    tokenData.isUsed = true;
    await tokenData.save();

    // Revoke tất cả refresh token cũ của user (đăng xuất tất cả thiết bị)
    await RefreshToken.updateMany(
      { userId: user._id, isRevoked: false },
      { isRevoked: true }
    );

    // Gửi email thông báo
    try {
      await sendPasswordChangedEmail(user.email);
    } catch (emailError) {
      console.error('Lỗi gửi email thông báo:', emailError.message);
    }

    res.json({
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.',
      success: true
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    res.json({ user: req.user, organization });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', auth, async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true, runValidators: true }
    );

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.put('/password', auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    next(error);
  }
});

router.post('/set-superadmin', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const organization = await Organization.findOne();
    if (!organization) {
      return res.status(400).json({ error: 'Chưa có trung tâm nào' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email đã tồn tại' });
    }

    const user = await User.create({
      organizationId: organization._id,
      email,
      password,
      name,
      role: 'superadmin',
      isActive: true
    });

    res.status(201).json({
      message: 'Tạo superadmin thành công',
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
