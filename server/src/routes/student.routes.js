import express from 'express';
import Student from '../models/Student.js';
import Organization from '../models/Organization.js';
import { auth, requireAdminOrStaff } from '../middleware/auth.js';
import { checkStudentLimit } from '../middleware/planLimits.js';
import notificationService from '../services/notification.service.js';

const router = express.Router();

// Helper tạo mã học sinh duy nhất theo từng organization
const generateStudentCode = async (organizationId) => {
  const org = await Organization.findByIdAndUpdate(
    organizationId,
    { $inc: { studentCounter: 1 } },
    { new: true }
  );
  if (!org) {
    throw new Error('Không tìm thấy trung tâm để sinh mã học sinh');
  }
  return `HS${String(org.studentCounter).padStart(6, '0')}`;
};

// Helper sinh mã an toàn khi trùng
const getUniqueStudentCode = async (organizationId, desiredCode) => {
  let code = desiredCode;
  let suffix = 1;
  while (await Student.exists({ organizationId, studentCode: code })) {
    const base = desiredCode.replace(/-\d+$/, '');
    code = `${base}-${suffix}`;
    suffix += 1;
  }
  return code;
};

router.use(auth);

// GET /students - Danh sách học sinh
router.get('/', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      classId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { organizationId: req.organizationId };

    if (status) query.status = status;
    if (classId) query.classIds = classId;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentCode: { $regex: search, $options: 'i' } },
        { parentPhone: { $regex: search, $options: 'i' } },
        { globalStudentId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [students, total] = await Promise.all([
      Student.find(query)
        .populate('classIds', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Student.countDocuments(query)
    ]);

    // Lấy thông tin các ghi danh khác
    const studentIds = students.map(s => s._id);
    const studentsWithEnrollments = await Student.find({ _id: { $in: studentIds } })
      .select('otherEnrollments globalStudentId');

    const enrollmentMap = {};
    studentsWithEnrollments.forEach(s => {
      enrollmentMap[s._id.toString()] = s.otherEnrollments || [];
    });

    const studentsWithData = students.map(s => ({
      ...s.toObject(),
      otherEnrollments: enrollmentMap[s._id.toString()] || []
    }));

    res.json({
      students: studentsWithData,
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

// GET /students/search-existing - Tìm học sinh đã có ở trung tâm khác
router.get('/search-existing', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ students: [] });
    }

    const students = await Student.find({
      $and: [
        { organizationId: { $ne: req.organizationId } },
        {
          $or: [
            { globalStudentId: { $regex: `^${q}`, $options: 'i' } },
            { name: { $regex: q, $options: 'i' } },
            { studentCode: { $regex: `^${q}`, $options: 'i' } },
            { parentPhone: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .populate('organizationId', 'name')
    .limit(10);

    res.json({ students });
  } catch (error) {
    next(error);
  }
});

// GET /students/check-duplicate - Kiểm tra trùng lặp (gọi khi nhập SĐT)
router.get('/check-duplicate', async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone || phone.length < 9) {
      return res.json({ found: false });
    }

    const existingStudent = await Student.findOne({ 
      parentPhone: phone,
      organizationId: { $ne: req.organizationId }
    }).populate('organizationId', 'name');

    if (existingStudent) {
      res.json({
        found: true,
        student: {
          globalStudentId: existingStudent.globalStudentId,
          name: existingStudent.name,
          studentCode: existingStudent.studentCode,
          organizationName: existingStudent.organizationId?.name,
          dob: existingStudent.dob,
          status: existingStudent.status
        }
      });
    } else {
      res.json({ found: false });
    }
  } catch (error) {
    next(error);
  }
});

// POST /students/create-accounts - Tạo tài khoản cho học sinh
router.post('/create-accounts', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { studentId, parentEmail, parentPhone, parentName } = req.body;

    const student = await Student.findOne({ 
      _id: studentId, 
      organizationId: req.organizationId 
    });

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    // Import auth routes logic here (simplified)
    const User = (await import('../models/User.js')).default;
    const bcrypt = await import('bcryptjs');
    const { v4: uuidv4 } = await import('uuid');

    const result = {};

    // Tạo tài khoản family cho phụ huynh
    if (parentEmail) {
      let familyAccount = await User.findOne({ email: parentEmail, role: 'family' });
      
      if (!familyAccount) {
        const password = `PH${uuidv4().split('-')[0]}`;
        const hashedPassword = await bcrypt.hash(password, 10);

        familyAccount = await User.create({
          email: parentEmail,
          password: hashedPassword,
          name: parentName || student.name,
          phone: parentPhone,
          role: 'family',
          organizationId: req.organizationId,
          childIds: [student._id]
        });

        result.familyAccount = { email: parentEmail, password, existed: false };
      } else {
        // Thêm student vào danh sách con
        if (!familyAccount.childIds.includes(student._id)) {
          familyAccount.childIds.push(student._id);
          await familyAccount.save();
        }
        result.familyAccount = { email: parentEmail, existed: true };
      }
    }

    // Tạo tài khoản student
    const password = `HS${uuidv4().split('-')[0]}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    let studentAccount = await User.findOne({ 
      studentId: student._id, 
      role: 'student' 
    });

    if (!studentAccount) {
      await User.create({
        email: `${student.studentCode}@student.local`,
        password: hashedPassword,
        name: student.name,
        role: 'student',
        organizationId: req.organizationId,
        studentId: student._id
      });

      result.studentAccount = { studentCode: student.studentCode, password, existed: false };
    } else {
      result.studentAccount = { studentCode: student.studentCode, existed: true };
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /students/:id - Chi tiết học sinh
router.get('/:id', async (req, res, next) => {
  try {
    const student = await Student.findOne({
      $or: [
        { _id: req.params.id },
        { globalStudentId: req.params.id }
      ]
    }).populate('classIds', 'name code feeAmount');

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    // Lấy thông tin các ghi danh khác
    const allEnrollments = await Student.find({ globalStudentId: student.globalStudentId })
      .populate('organizationId', 'name')
      .select('organizationId studentCode status otherEnrollments');

    const enrollments = allEnrollments.map(e => ({
      organizationId: e.organizationId,
      organizationName: e.organizationId?.name,
      studentCode: e.studentCode,
      status: e.status,
      isCurrentOrg: e.organizationId?._id.toString() === req.organizationId.toString()
    }));

    res.json({
      ...student.toObject(),
      enrollments
    });
  } catch (error) {
    next(error);
  }
});

// POST /students - Tạo học sinh mới hoặc ghi danh học sinh có sẵn
router.post('/', requireAdminOrStaff, async (req, res, next) => {
  try {
    const {
      name, dob, gender, avatar,
      parentName, parentPhone, parentEmail, address,
      classIds, notes, enrollmentDate,
      existingGlobalStudentId
    } = req.body;

    // === TRƯỜNG HỢP 1: Ghi danh học sinh đã tồn tại ===
    if (existingGlobalStudentId) {
      const existingStudent = await Student.findOne({ globalStudentId: existingGlobalStudentId });
      
      if (!existingStudent) {
        return res.status(404).json({ error: 'Không tìm thấy học sinh' });
      }

      // Kiểm tra đã ghi danh ở trung tâm này chưa
      const alreadyEnrolled = await Student.findOne({
        globalStudentId: existingGlobalStudentId,
        organizationId: req.organizationId
      });

      if (alreadyEnrolled) {
        return res.status(400).json({ 
          error: 'Học sinh đã được ghi danh tại trung tâm này',
          code: 'ALREADY_ENROLLED'
        });
      }

      let studentCode = req.body.studentCode || await generateStudentCode(req.organizationId);

      const newStudent = await Student.create({
        globalStudentId: existingStudent.globalStudentId,
        organizationId: req.organizationId,
        studentCode,
        name: existingStudent.name,
        dob: existingStudent.dob || dob,
        gender: existingStudent.gender || gender,
        parentName: existingStudent.parentName || parentName,
        parentPhone: existingStudent.parentPhone || parentPhone,
        parentEmail: existingStudent.parentEmail || parentEmail,
        address: existingStudent.address || address,
        classIds,
        notes,
        enrollmentDate: enrollmentDate || new Date()
      });

      // Cập nhật thông tin phụ huynh nếu có thêm
      if (parentName || parentPhone || parentEmail || address) {
        await Student.updateOne(
          { _id: existingStudent._id },
          { $set: { ...(parentName && { parentName }), ...(parentPhone && { parentPhone }), ...(parentEmail && { parentEmail }), ...(address && { address }) } }
        );
      }

      const populated = await Student.findById(newStudent._id).populate('classIds', 'name code');

      return res.status(201).json({
        student: populated,
        message: 'Ghi danh học sinh thành công',
        isEnrollment: true
      });
    }

    // === TRƯỜNG HỢP 2: Tạo học sinh mới ===
    const org = await Organization.findById(req.organizationId);
    const limitStatus = await org.checkStudentLimit();
    
    if (limitStatus.available !== Infinity && limitStatus.available <= 0) {
      return res.status(400).json({
        error: `Đã đạt giới hạn ${limitStatus.limit} học sinh. Vui lòng nâng cấp gói dịch vụ.`,
        code: 'STUDENT_LIMIT_EXCEEDED'
      });
    }

    let studentCode = req.body.studentCode || await generateStudentCode(req.organizationId);
    if (req.body.studentCode) {
      studentCode = await getUniqueStudentCode(req.organizationId, studentCode);
    }

    const student = await Student.create({
      organizationId: req.organizationId,
      studentCode,
      name,
      dob,
      gender,
      avatar,
      parentName,
      parentPhone,
      parentEmail,
      address,
      classIds,
      notes,
      enrollmentDate
    });

    const populated = await Student.findById(student._id).populate('classIds', 'name code');
    await notificationService.notifyStudentAdded(populated, req.user.name);

    res.status(201).json({
      student: { ...populated.toObject(), otherEnrollments: [] },
      warnings: limitStatus.available <= 5 ? [`Chỉ còn ${limitStatus.available} slot học sinh`] : []
    });
  } catch (error) {
    next(error);
  }
});

// POST /students/bulk - Tạo nhiều học sinh
router.post('/bulk', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }

    const org = await Organization.findById(req.organizationId);
    const limitStatus = await org.checkStudentLimit();
    const available = limitStatus.available;

    if (available !== Infinity && students.length > available) {
      return res.status(400).json({
        error: `Chỉ có thể thêm tối đa ${available} học sinh.`,
        code: 'STUDENT_LIMIT_EXCEEDED'
      });
    }

    const orgWithCounter = await Organization.findByIdAndUpdate(
      req.organizationId,
      { $inc: { studentCounter: students.length } },
      { new: true }
    );
    const startCounter = orgWithCounter.studentCounter - students.length + 1;

    const studentsToInsert = students.map((s, index) => ({
      organizationId: req.organizationId,
      studentCode: s.studentCode || `HS${String(startCounter + index).padStart(6, '0')}`,
      name: s.name,
      dob: s.dob ? new Date(s.dob) : undefined,
      gender: s.gender,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      parentEmail: s.parentEmail,
      address: s.address,
      notes: s.notes
    }));

    let inserted;
    try {
      inserted = await Student.insertMany(studentsToInsert, { ordered: true });
    } catch (error) {
      if (error.code === 11000) {
        const retryDocs = studentsToInsert.filter((doc, i) => 
          error.writeErrors?.some(e => e.index === i)
        ).map(doc => {
          let newCode = doc.studentCode;
          let suffix = 1;
          while (studentsToInsert.some(d => d.studentCode === newCode)) {
            newCode = `${doc.studentCode}-${suffix++}`;
          }
          return { ...doc, studentCode: newCode };
        });
        if (retryDocs.length > 0) {
          await Student.insertMany(retryDocs);
          inserted = [...(error.insertedDocs || []), ...retryDocs];
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    res.status(201).json({ message: `Đã thêm ${inserted.length} học sinh`, count: inserted.length });
  } catch (error) {
    next(error);
  }
});

// PUT /students/:id - Cập nhật học sinh
router.put('/:id', requireAdminOrStaff, async (req, res, next) => {
  try {
    const oldStudent = await Student.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    });
    if (!oldStudent) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    const {
      name, dob, gender, avatar,
      parentName, parentPhone, parentEmail, address,
      classIds, status, notes
    } = req.body;

    const updatedFields = [];
    if (status && status !== oldStudent.status) updatedFields.push('trạng thái');
    if (name && name !== oldStudent.name) updatedFields.push('tên');
    if (parentPhone && parentPhone !== oldStudent.parentPhone) updatedFields.push('SĐT phụ huynh');

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { name, dob, gender, avatar, parentName, parentPhone, parentEmail, address, classIds, status, notes },
      { new: true, runValidators: true }
    ).populate('classIds', 'name code');

    // Đồng bộ thông tin phụ huynh
    if (parentName || parentPhone || parentEmail || address) {
      await Student.updateMany(
        { globalStudentId: oldStudent.globalStudentId, _id: { $ne: oldStudent._id } },
        { $set: { ...(parentName && { parentName }), ...(parentPhone && { parentPhone }), ...(parentEmail && { parentEmail }), ...(address && { address }) } }
      );
    }

    if (updatedFields.length > 0) {
      await notificationService.notifyStudentUpdated(student, updatedFields, req.user.name);
    }

    if (status && status !== oldStudent.status) {
      await notificationService.notifyStudentStatusChanged(student.organizationId, student._id, student.name, oldStudent.status, status);
    }

    res.json(student);
  } catch (error) {
    next(error);
  }
});

// PUT /students/:id/transfer - Chuyển học sinh sang trung tâm khác
router.put('/:id/transfer', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { targetOrganizationId, notes } = req.body;
    if (!targetOrganizationId) {
      return res.status(400).json({ error: 'Vui lòng chọn trung tâm đích' });
    }

    const student = await Student.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    const targetOrg = await Organization.findById(targetOrganizationId);
    if (!targetOrg) {
      return res.status(404).json({ error: 'Không tìm thấy trung tâm đích' });
    }

    const existingInTarget = await Student.findOne({
      globalStudentId: student.globalStudentId,
      organizationId: targetOrganizationId
    });

    if (existingInTarget) {
      return res.status(400).json({ error: 'Học sinh đã được ghi danh tại trung tâm đích' });
    }

    student.status = 'transferred';
    student.notes = notes ? `${student.notes || ''}\n[Chuyển] ${notes}` : student.notes;
    await student.save();

    const newStudent = await Student.create({
      globalStudentId: student.globalStudentId,
      organizationId: targetOrganizationId,
      studentCode: await generateStudentCode(targetOrganizationId),
      name: student.name,
      dob: student.dob,
      gender: student.gender,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      address: student.address,
      notes: `[Nhận từ "${(await Organization.findById(req.organizationId)).name}"] ${notes || ''}`.trim()
    });

    res.json({ message: 'Chuyển học sinh thành công', newStudent });
  } catch (error) {
    next(error);
  }
});

// DELETE /students/:id - Xóa học sinh
router.delete('/:id', requireAdminOrStaff, async (req, res, next) => {
  try {
    const student = await Student.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    await Student.updateMany(
      { globalStudentId: student.globalStudentId },
      { $pull: { otherEnrollments: { organizationId: req.organizationId } } }
    );

    await notificationService.notifyStudentDeleted(student.name, student.studentCode, req.user.name);
    res.json({ message: 'Xóa học sinh thành công' });
  } catch (error) {
    next(error);
  }
});

// POST /students/import - Import từ Excel
router.post('/import', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Dữ liệu import không hợp lệ' });
    }

    const org = await Organization.findById(req.organizationId);
    const limitStatus = await org.checkStudentLimit();
    const available = limitStatus.available;

    if (available !== Infinity && students.length > available) {
      return res.status(400).json({
        error: `Chỉ có thể thêm tối đa ${available} học sinh.`,
        code: 'STUDENT_LIMIT_EXCEEDED'
      });
    }

    const orgWithCounter = await Organization.findByIdAndUpdate(
      req.organizationId,
      { $inc: { studentCounter: students.length } },
      { new: true }
    );
    const startCounter = orgWithCounter.studentCounter - students.length + 1;

    const studentsToInsert = students.map((s, index) => ({
      organizationId: req.organizationId,
      studentCode: s.studentCode || `HS${String(startCounter + index).padStart(6, '0')}`,
      name: s.name,
      dob: s.dob ? new Date(s.dob) : undefined,
      gender: s.gender,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      parentEmail: s.parentEmail,
      address: s.address,
      notes: s.notes
    }));

    const inserted = await Student.insertMany(studentsToInsert, { ordered: true });
    res.status(201).json({ message: `Đã import ${inserted.length} học sinh`, count: inserted.length });
  } catch (error) {
    next(error);
  }
});

// GET /students/stats/count - Thống kê
router.get('/stats/count', async (req, res, next) => {
  try {
    const [total, active, inactive, transferred] = await Promise.all([
      Student.countDocuments({ organizationId: req.organizationId }),
      Student.countDocuments({ organizationId: req.organizationId, status: 'active' }),
      Student.countDocuments({ organizationId: req.organizationId, status: 'inactive' }),
      Student.countDocuments({ organizationId: req.organizationId, status: 'transferred' })
    ]);

    const org = await Organization.findById(req.organizationId);
    const limitStatus = await org.checkStudentLimit();

    res.json({ total, active, inactive, transferred, limit: limitStatus });
  } catch (error) {
    next(error);
  }
});

export default router;