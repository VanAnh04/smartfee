import express from 'express';
import Attendance from '../models/Attendance.js';
import Class from '../models/Class.js';
import Student from '../models/Student.js';
import Organization from '../models/Organization.js';
import { auth, requireAdminOrStaff } from '../middleware/auth.js';
import { sendAbsenceEmail } from '../utils/emailService.js';
import notificationService from '../services/notification.service.js';

const router = express.Router();

router.use(auth);

// Helper to normalize date to YYYY-MM-DD at 00:00:00 UTC
const normalizeDate = (dateVal) => {
  const d = new Date(dateVal);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// GET /api/attendance - Lấy lịch sử điểm danh
router.get('/', async (req, res, next) => {
  try {
    const { classId, date, startDate, endDate } = req.query;
    const query = { organizationId: req.organizationId };

    if (classId) query.classId = classId;
    
    if (date) {
      query.date = normalizeDate(date);
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = normalizeDate(startDate);
      if (endDate) query.date.$lte = normalizeDate(endDate);
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('classId', 'name code')
      .populate('students.studentId', 'name studentCode')
      .sort({ date: -1 });

    res.json(attendanceRecords);
  } catch (error) {
    next(error);
  }
});

// GET /api/attendance/student/:studentId/stats - Thống kê điểm danh học sinh
router.get('/student/:studentId/stats', async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const records = await Attendance.find({
      organizationId: req.organizationId,
      'students.studentId': studentId
    }).populate('classId', 'name code');

    let present = 0;
    let absent = 0;
    let absentExcused = 0;

    const history = [];

    records.forEach(r => {
      const studRecord = r.students.find(s => s.studentId.toString() === studentId);
      if (studRecord) {
        if (studRecord.status === 'present') present++;
        else if (studRecord.status === 'absent') absent++;
        else if (studRecord.status === 'absent_excused') absentExcused++;

        history.push({
          date: r.date,
          classId: r.classId?._id,
          className: r.classId?.name || 'Lớp đã xóa',
          classCode: r.classId?.code,
          status: studRecord.status,
          notes: studRecord.notes
        });
      }
    });

    res.json({
      summary: {
        total: present + absent + absentExcused,
        present,
        absent,
        absentExcused,
        attendanceRate: (present + absent + absentExcused) > 0 
          ? Math.round((present / (present + absent + absentExcused)) * 100) 
          : 100
      },
      history: history.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/attendance/class/:classId/date/:date - Chi tiết điểm danh theo lớp và ngày
router.get('/class/:classId/date/:date', async (req, res, next) => {
  try {
    const { classId, date } = req.params;
    const targetDate = normalizeDate(date);

    // 1. Tìm bản ghi điểm danh hiện có
    let attendanceRecord = await Attendance.findOne({
      organizationId: req.organizationId,
      classId,
      date: targetDate
    }).populate('students.studentId', 'name studentCode parentName parentPhone parentEmail');

    // 2. Nếu đã có bản ghi, trả về luôn
    if (attendanceRecord) {
      return res.json(attendanceRecord);
    }

    // 3. Nếu chưa có, lấy danh sách học sinh hoạt động của lớp đó để trả về cấu trúc mặc định
    const cls = await Class.findOne({ _id: classId, organizationId: req.organizationId });
    if (!cls) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    }

    const students = await Student.find({
      organizationId: req.organizationId,
      classIds: classId,
      status: 'active'
    }).select('name studentCode parentName parentPhone parentEmail');

    const defaultStudents = students.map(s => ({
      studentId: s,
      status: 'present',
      notes: ''
    }));

    res.json({
      classId,
      date: targetDate,
      students: defaultStudents,
      isNew: true
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance - Lưu/Cập nhật điểm danh & Gửi email khi vắng
router.post('/', requireAdminOrStaff, async (req, res, next) => {
  try {
    const { classId, date, students } = req.body;
    const targetDate = normalizeDate(date);

    const organization = await Organization.findById(req.organizationId);
    const orgName = organization?.name || 'Trung tâm SmartFee';

    const cls = await Class.findOne({ _id: classId, organizationId: req.organizationId });
    if (!cls) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    }

    // 1. Tìm bản ghi cũ để so sánh (tránh gửi email trùng lặp nếu trạng thái vắng đã được thông báo rồi)
    const oldRecord = await Attendance.findOne({
      organizationId: req.organizationId,
      classId,
      date: targetDate
    });

    const oldStatuses = {};
    if (oldRecord) {
      oldRecord.students.forEach(s => {
        oldStatuses[s.studentId.toString()] = s.status;
      });
    }

    // 2. Cập nhật hoặc Tạo mới bản ghi điểm danh
    const formattedStudents = students.map(s => ({
      studentId: s.studentId,
      status: s.status,
      notes: s.notes || ''
    }));

    const attendanceRecord = await Attendance.findOneAndUpdate(
      { organizationId: req.organizationId, classId, date: targetDate },
      { 
        students: formattedStudents,
        takenBy: req.user._id
      },
      { new: true, upsert: true }
    ).populate('students.studentId', 'name parentEmail parentName');

    // 3. Xử lý gửi thông báo & Gmail vắng học cho phụ huynh
    // Chỉ gửi khi học sinh vắng (absent / absent_excused) và trạng thái này là mới (hoặc trước đó không vắng)
    const dateFormatted = targetDate.toLocaleDateString('vi-VN');

    attendanceRecord.students.forEach(s => {
      const student = s.studentId;
      const currentStatus = s.status;
      const previousStatus = oldStatuses[student._id.toString()];

      const isAbsent = currentStatus === 'absent' || currentStatus === 'absent_excused';
      const isNewAbsent = isAbsent && (previousStatus === undefined || previousStatus === 'present');

      if (isNewAbsent) {
        const parentEmail = student.parentEmail;
        const parentName = student.parentName || 'phụ huynh';
        const studentName = student.name;
        const notes = s.notes || '';

        // A. Gửi thông báo trong hệ thống (In-app)
        const statusText = currentStatus === 'absent_excused' ? 'Vắng có phép' : 'Vắng không phép';
        notificationService.createForParent(
          student._id,
          'Thông báo vắng học',
          `Học sinh ${studentName} vắng mặt (${statusText}) trong buổi học lớp ${cls.name} ngày ${dateFormatted}. Ghi chú: ${notes || 'Không có'}`,
          'absence_notification',
          { classId, date: targetDate, status: currentStatus }
        ).catch(err => console.error('Lỗi gửi thông báo in-app cho phụ huynh:', err.message));

        notificationService.createForStudent(
          student._id,
          'Thông báo vắng học',
          `Bạn được ghi nhận vắng mặt (${statusText}) lớp ${cls.name} ngày ${dateFormatted}.`,
          'absence_notification',
          { classId, date: targetDate, status: currentStatus }
        ).catch(err => console.error('Lỗi gửi thông báo in-app cho học sinh:', err.message));

        // B. Gửi Email thông báo qua Gmail (Chạy background)
        if (parentEmail && !parentEmail.endsWith('@smartfee.local')) {
          sendAbsenceEmail(
            parentEmail,
            parentName,
            studentName,
            cls.name,
            dateFormatted,
            currentStatus,
            notes,
            orgName
          ).catch(err => console.error(`Lỗi khi gửi email vắng học đến ${parentEmail}:`, err.message));
        }
      }
    });

    res.json({
      success: true,
      message: 'Lưu thông tin điểm danh và gửi thông báo vắng học thành công',
      attendance: attendanceRecord
    });
  } catch (error) {
    next(error);
  }
});

export default router;
