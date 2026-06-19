import express from 'express';
import Class from '../models/Class.js';
import Student from '../models/Student.js';
import Organization from '../models/Organization.js';
import { auth, requireAdminOrStaff } from '../middleware/auth.js';
import { checkClassLimit } from '../middleware/planLimits.js';
import notificationService from '../services/notification.service.js';

const router = express.Router();

router.use(auth);

// GET /classes - Danh sách lớp học (ai cũng xem được)
router.get('/', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { organizationId: req.organizationId };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [classes, total] = await Promise.all([
      Class.find(query)
        .populate('teacherId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Class.countDocuments(query)
    ]);

    res.json({
      classes,
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

// GET /classes/:id - Chi tiết lớp học
router.get('/:id', async (req, res, next) => {
  try {
    const classData = await Class.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    }).populate('teacherId', 'name email phone');

    if (!classData) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    }

    const students = await Student.find({
      organizationId: req.organizationId,
      classIds: req.params.id,
      status: 'active'
    }).select('name studentCode parentName parentPhone');

    if (students.length !== classData.currentStudents) {
      classData.currentStudents = students.length;
      await classData.save();
    }

    res.json({ ...classData.toObject(), students });
  } catch (error) {
    next(error);
  }
});

// POST /classes - Tạo lớp học MỚI (chỉ admin/staff)
router.post('/', requireAdminOrStaff, checkClassLimit, async (req, res, next) => {
  try {
    const { 
      name, code, description, teacherId, teacherName, schedule, 
      maxStudents, feeAmount, startDate, endDate,
      studentIds
    } = req.body;

    const classData = await Class.create({
      organizationId: req.organizationId,
      name,
      code,
      description,
      teacherId,
      teacherName,
      schedule,
      maxStudents: maxStudents || 30,
      feeAmount: feeAmount || 0,
      startDate,
      endDate,
      currentStudents: 0
    });

    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      const validStudentIds = studentIds.filter(id => id && id.trim() !== '');
      if (validStudentIds.length > 0) {
        await Student.updateMany(
          { 
            _id: { $in: validStudentIds },
            organizationId: req.organizationId,
            status: 'active'
          },
          { $addToSet: { classIds: classData._id } }
        );

        const actualCount = await Student.countDocuments({
          _id: { $in: validStudentIds },
          organizationId: req.organizationId,
          status: 'active'
        });
        classData.currentStudents = actualCount;
        await classData.save();
      }
    }

    const populated = await Class.findById(classData._id)
      .populate('teacherId', 'name email');

    // Gửi thông báo cho admin
    await notificationService.notifyClassAdded(populated, req.user.name);

    const students = await Student.find({
      organizationId: req.organizationId,
      classIds: classData._id,
      status: 'active'
    }).select('name studentCode parentName parentPhone');

    const response = {
      ...populated.toObject(),
      students,
      warnings: []
    };

    if (req.planStatus?.classLimitWarning) {
      response.warnings.push(req.planStatus.classLimitWarning);
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /classes/:id - Cập nhật lớp học (chỉ admin/staff)
router.put('/:id', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { 
      name, code, description, teacherId, teacherName, schedule, 
      maxStudents, feeAmount, status, startDate, endDate,
      studentIds
    } = req.body;

    const classData = await Class.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!classData) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    }

    // Xác định các trường đã thay đổi
    const updatedFields = [];
    if (name !== undefined && name !== classData.name) updatedFields.push('tên lớp');
    if (code !== undefined && code !== classData.code) updatedFields.push('mã lớp');
    if (status !== undefined && status !== classData.status) updatedFields.push('trạng thái');
    if (maxStudents !== undefined && maxStudents !== classData.maxStudents) updatedFields.push('sĩ số tối đa');
    if (feeAmount !== undefined && feeAmount !== classData.feeAmount) updatedFields.push('học phí');

    if (name !== undefined) classData.name = name;
    if (code !== undefined) classData.code = code;
    if (description !== undefined) classData.description = description;
    if (teacherId !== undefined) classData.teacherId = teacherId;
    if (teacherName !== undefined) classData.teacherName = teacherName;
    if (schedule !== undefined) classData.schedule = schedule;
    if (maxStudents !== undefined) classData.maxStudents = maxStudents;
    if (feeAmount !== undefined) classData.feeAmount = feeAmount;
    if (status !== undefined) classData.status = status;
    if (startDate !== undefined) classData.startDate = startDate;
    if (endDate !== undefined) classData.endDate = endDate;

    if (studentIds !== undefined) {
      const oldStudents = await Student.find({
        classIds: classData._id,
        organizationId: req.organizationId
      });
      const oldStudentIds = oldStudents.map(s => s._id.toString());

      const newStudentIds = (studentIds || [])
        .filter(id => id && id.trim() !== '')
        .map(id => id.toString());

      const toAdd = newStudentIds.filter(id => !oldStudentIds.includes(id));
      const toRemove = oldStudentIds.filter(id => !newStudentIds.includes(id));

      // Thêm học sinh mới và thông báo
      if (toAdd.length > 0) {
        await Student.updateMany(
          { 
            _id: { $in: toAdd },
            organizationId: req.organizationId,
            status: 'active'
          },
          { $addToSet: { classIds: classData._id } }
        );
        // Gửi thông báo cho phụ huynh các học sinh được thêm
        const addedStudents = await Student.find({ _id: { $in: toAdd } });
        for (const student of addedStudents) {
          await notificationService.notifyStudentJoinedClass(
            student._id, student.name, classData._id, classData.name
          );
        }
      }

      if (toRemove.length > 0) {
        await Student.updateMany(
          { 
            _id: { $in: toRemove },
            organizationId: req.organizationId
          },
          { $pull: { classIds: classData._id } }
        );
        // Gửi thông báo cho phụ huynh các học sinh bị xóa
        const removedStudents = await Student.find({ _id: { $in: toRemove } });
        for (const student of removedStudents) {
          await notificationService.notifyStudentLeftClass(
            student._id, student.name, classData._id, classData.name
          );
        }
      }

      classData.currentStudents = newStudentIds.length;
    }

    await classData.save();

    // Gửi thông báo cập nhật cho admin
    if (updatedFields.length > 0) {
      await notificationService.notifyClassUpdated(classData, updatedFields, req.user.name);
    }

    const populated = await Class.findById(classData._id)
      .populate('teacherId', 'name email');

    const students = await Student.find({
      organizationId: req.organizationId,
      classIds: classData._id,
      status: 'active'
    }).select('name studentCode parentName parentPhone');

    res.json({ ...populated.toObject(), students });
  } catch (error) {
    next(error);
  }
});

// DELETE /classes/:id - Xóa lớp học (chỉ admin/staff)
router.delete('/:id', requireAdminOrStaff, async (req, res, next) => {
  try {
    const classData = await Class.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!classData) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    }

    await Student.updateMany(
      { organizationId: req.organizationId, classIds: req.params.id },
      { $pull: { classIds: req.params.id } }
    );

    // Gửi thông báo cho admin
    await notificationService.notifyClassDeleted(classData.organizationId, classData.name, classData.code, req.user.name);

    res.json({ message: 'Xóa lớp học thành công' });
  } catch (error) {
    next(error);
  }
});

// POST /classes/:id/students/:studentId - Thêm 1 học sinh vào lớp (chỉ admin/staff)
router.post('/:id/students/:studentId', requireAdminOrStaff, async (req, res, next) => {
  try {
    const classId = req.params.id;
    const studentId = req.params.studentId;

    const classData = await Class.findOne({
      _id: classId,
      organizationId: req.organizationId
    });

    if (!classData) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    }

    const student = await Student.findOne({
      _id: studentId,
      organizationId: req.organizationId
    });

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    const alreadyIn = student.classIds.some(cid => cid.toString() === classId);
    
    if (!alreadyIn) {
      if (classData.currentStudents >= classData.maxStudents) {
        return res.status(400).json({ error: 'Lớp học đã đầy' });
      }

      student.classIds.push(classData._id);
      await student.save();

      classData.currentStudents += 1;
      await classData.save();

      // Gửi thông báo cho phụ huynh
      await notificationService.notifyStudentJoinedClass(
        student._id, student.name, classData._id, classData.name
      );
    }

    res.json({ 
      message: alreadyIn ? 'Học sinh đã có trong lớp' : 'Thêm học sinh vào lớp thành công',
      alreadyIn 
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /classes/:id/students/:studentId - Xóa 1 học sinh khỏi lớp (chỉ admin/staff)
router.delete('/:id/students/:studentId', requireAdminOrStaff, async (req, res, next) => {
  try {
    const classId = req.params.id;
    const studentId = req.params.studentId;

    const classData = await Class.findOne({
      _id: classId,
      organizationId: req.organizationId
    });

    if (!classData) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    }

    const student = await Student.findOne({
      _id: studentId,
      organizationId: req.organizationId
    });

    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    const wasInClass = student.classIds.some(cid => cid.toString() === classId);
    student.classIds = student.classIds.filter(cid => cid.toString() !== classId);
    await student.save();

    if (wasInClass && classData.currentStudents > 0) {
      classData.currentStudents -= 1;
      await classData.save();

      // Gửi thông báo cho phụ huynh
      await notificationService.notifyStudentLeftClass(
        student._id, student.name, classData._id, classData.name
      );
    }

    res.json({ message: wasInClass ? 'Xóa học sinh khỏi lớp thành công' : 'Học sinh không có trong lớp' });
  } catch (error) {
    next(error);
  }
});

// GET /classes/stats/count - Thống kê số lượng lớp
router.get('/stats/count', async (req, res, next) => {
  try {
    const [total, active] = await Promise.all([
      Class.countDocuments({ organizationId: req.organizationId }),
      Class.countDocuments({ organizationId: req.organizationId, status: 'active' })
    ]);

    // Lấy thêm thông tin giới hạn
    const Organization = (await import('../models/Organization.js')).default;
    const org = await Organization.findById(req.organizationId);
    const limitStatus = await org.checkClassLimit();

    res.json({
      total,
      active,
      limit: limitStatus
    });
  } catch (error) {
    next(error);
  }
});

export default router;
