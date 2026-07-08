import Notification, { NOTIFICATION_TYPES, NOTIFICATION_CHANNEL, NOTIFICATION_PRIORITY } from '../models/Notification.js';
import User from '../models/User.js';

class NotificationService {
  /**
   * Tạo thông báo cho một user cụ thể
   */
  async createForUser(userId, title, message, type = 'system', data = {}, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      const notification = await Notification.create({
        organizationId: user.organizationId,
        userId: user._id,
        type,
        title,
        message,
        data,
        channel: options.channel || NOTIFICATION_CHANNEL.IN_APP,
        priority: options.priority || NOTIFICATION_PRIORITY.NORMAL,
        status: 'sent',
        sentAt: new Date(),
        scheduledAt: options.scheduledAt || null,
        expiresAt: options.expiresAt || null
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification for user:', error);
      return null;
    }
  }

  /**
   * Tạo thông báo cho phụ huynh dựa trên student
   */
  async createForParent(studentId, title, message, type = 'system', data = {}, options = {}) {
    try {
      const UserModel = (await import('../models/User.js')).default;
      const parents = await UserModel.find({
        childIds: studentId,
        role: 'family',
        familyType: 'parent'
      });

      if (parents.length === 0) return [];

      const notifications = await Promise.all(
        parents.map(parent =>
          Notification.create({
            organizationId: parent.organizationId,
            userId: parent._id,
            studentId,
            type,
            title,
            message,
            data,
            channel: options.channel || NOTIFICATION_CHANNEL.IN_APP,
            priority: options.priority || NOTIFICATION_PRIORITY.NORMAL,
            status: 'sent',
            sentAt: new Date(),
            scheduledAt: options.scheduledAt || null,
            expiresAt: options.expiresAt || null
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating notification for parent:', error);
      return [];
    }
  }

  /**
   * Tạo thông báo cho học sinh (tài khoản family type=student)
   */
  async createForStudent(studentId, title, message, type = 'system', data = {}, options = {}) {
    try {
      const UserModel = (await import('../models/User.js')).default;
      const studentUser = await UserModel.findOne({
        studentId,
        role: 'family',
        familyType: 'student'
      });

      if (!studentUser) return null;

      return await Notification.create({
        organizationId: studentUser.organizationId,
        userId: studentUser._id,
        studentId,
        type,
        title,
        message,
        data,
        channel: options.channel || NOTIFICATION_CHANNEL.IN_APP,
        priority: options.priority || NOTIFICATION_PRIORITY.NORMAL,
        status: 'sent',
        sentAt: new Date()
      });
    } catch (error) {
      console.error('Error creating notification for student:', error);
      return null;
    }
  }

  /**
   * Tạo thông báo cho tất cả học sinh của một trung tâm
   */
  async createForAllStudents(organizationId, title, message, type = 'system', data = {}, options = {}) {
    try {
      const UserModel = (await import('../models/User.js')).default;
      const studentUsers = await UserModel.find({
        organizationId,
        role: 'family',
        familyType: 'student'
      });

      const notifications = await Promise.all(
        studentUsers.map(studentUser =>
          Notification.create({
            organizationId: studentUser.organizationId,
            userId: studentUser._id,
            studentId: studentUser.studentId,
            type,
            title,
            message,
            data,
            channel: options.channel || NOTIFICATION_CHANNEL.IN_APP,
            priority: options.priority || NOTIFICATION_PRIORITY.NORMAL,
            status: 'sent',
            sentAt: new Date()
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating notification for all students:', error);
      return [];
    }
  }

  /**
   * Tạo thông báo cho tất cả phụ huynh của một trung tâm
   */
  async createForOrganizationParents(organizationId, title, message, type = 'system', data = {}, options = {}) {
    try {
      const parents = await User.find({
        organizationId,
        role: 'family',
        familyType: 'parent'
      });

      const notifications = await Promise.all(
        parents.map(parent =>
          Notification.create({
            organizationId,
            userId: parent._id,
            type,
            title,
            message,
            data,
            channel: options.channel || NOTIFICATION_CHANNEL.IN_APP,
            priority: options.priority || NOTIFICATION_PRIORITY.NORMAL,
            status: 'sent',
            sentAt: new Date()
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating notification for org parents:', error);
      return [];
    }
  }

  /**
   * Tạo thông báo cho tất cả admin/staff của một trung tâm
   */
  async createForOrganizationAdmins(organizationId, title, message, type = 'system', data = {}, options = {}) {
    try {
      const admins = await User.find({
        organizationId,
        role: { $in: ['admin', 'staff'] }
      });

      const notifications = await Promise.all(
        admins.map(admin =>
          Notification.create({
            organizationId,
            userId: admin._id,
            type,
            title,
            message,
            data,
            channel: options.channel || NOTIFICATION_CHANNEL.IN_APP,
            priority: options.priority || NOTIFICATION_PRIORITY.NORMAL,
            status: 'sent',
            sentAt: new Date()
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating notification for org admins:', error);
      return [];
    }
  }

  /**
   * Tạo thông báo cho tất cả nhân viên (bao gồm cashier, viewer)
   */
  async createForAllStaff(organizationId, title, message, type = 'system', data = {}, options = {}) {
    try {
      const staff = await User.find({
        organizationId,
        role: { $in: ['admin', 'staff', 'cashier', 'viewer'] }
      });

      const notifications = await Promise.all(
        staff.map(s =>
          Notification.create({
            organizationId,
            userId: s._id,
            type,
            title,
            message,
            data,
            channel: options.channel || NOTIFICATION_CHANNEL.IN_APP,
            priority: options.priority || NOTIFICATION_PRIORITY.NORMAL,
            status: 'sent',
            sentAt: new Date()
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating notification for all staff:', error);
      return [];
    }
  }

  /**
   * Tạo thông báo cho Super Admin
   */
  async createForSuperAdmins(title, message, type = 'system', data = {}, options = {}) {
    try {
      const superAdmins = await User.find({ role: 'superadmin' });

      const notifications = await Promise.all(
        superAdmins.map(admin =>
          Notification.create({
            organizationId: data.organizationId || null,
            userId: admin._id,
            type,
            title,
            message,
            data,
            channel: options.channel || NOTIFICATION_CHANNEL.IN_APP,
            priority: options.priority || NOTIFICATION_PRIORITY.NORMAL,
            status: 'sent',
            sentAt: new Date()
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating notification for superadmins:', error);
      return [];
    }
  }

  // ==================== PAYMENT NOTIFICATIONS ====================

  /**
   * Thông báo thanh toán thành công - cho phụ huynh
   */
  async notifyPaymentSuccess(studentId, payment, organizationName) {
    const title = 'Thanh toán thành công';
    const amountFormatted = this.formatCurrency(payment.amount);
    const message = `Đã thanh toán ${amountFormatted} cho học phí tại ${organizationName}. Mã giao dịch: ${payment.transactionId || payment._id}`;

    // Thông báo cho phụ huynh
    await this.createForParent(studentId, title, message, NOTIFICATION_TYPES.PAYMENT_SUCCESS, {
      paymentId: payment._id,
      studentId,
      amount: payment.amount,
      transactionId: payment.transactionId,
      orderCode: payment.orderCode,
      paymentMethod: payment.paymentMethod
    });

    // Thông báo cho học sinh
    await this.createForStudent(studentId, title, message, NOTIFICATION_TYPES.PAYMENT_SUCCESS, {
      paymentId: payment._id,
      studentId,
      amount: payment.amount
    });

    // Thông báo cho admin trung tâm
    await this.createForOrganizationAdmins(payment.organizationId,
      'Thanh toán mới',
      `Học sinh ${payment.studentId?.name || ''} đã thanh toán ${amountFormatted} qua ${this.getPaymentMethodLabel(payment.paymentMethod)}.`,
      NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      {
        paymentId: payment._id,
        studentId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod
      }
    );

    return true;
  }

  /**
   * Thông báo thanh toán thất bại
   */
  async notifyPaymentFailed(studentId, payment, reason = '') {
    const title = 'Thanh toán thất bại';
    const message = `Thanh toán ${this.formatCurrency(payment.amount)} không thành công. ${reason}`;

    await this.createForParent(studentId, title, message, NOTIFICATION_TYPES.PAYMENT_FAILED, {
      paymentId: payment._id,
      studentId,
      amount: payment.amount,
      reason
    });

    await this.createForStudent(studentId, title, message, NOTIFICATION_TYPES.PAYMENT_FAILED, {
      paymentId: payment._id,
      studentId,
      amount: payment.amount,
      reason
    });

    return true;
  }

  /**
   * Thông báo thanh toán đang chờ xử lý
   */
  async notifyPaymentPending(studentId, payment, organizationName) {
    const title = 'Thanh toán đang xử lý';
    const message = `Yêu cầu thanh toán ${this.formatCurrency(payment.amount)} đang được xử lý. Vui lòng chờ xác nhận từ trung tâm.`;

    await this.createForParent(studentId, title, message, NOTIFICATION_TYPES.PAYMENT_PENDING, {
      paymentId: payment._id,
      studentId,
      amount: payment.amount
    });

    // Thông báo cho admin
    await this.createForOrganizationAdmins(payment.organizationId,
      'Chờ xác nhận thanh toán',
      `Có yêu cầu thanh toán ${this.formatCurrency(payment.amount)} đang chờ xác nhận.`,
      NOTIFICATION_TYPES.PAYMENT_PENDING,
      {
        paymentId: payment._id,
        studentId,
        amount: payment.amount
      }
    );

    return true;
  }

  /**
   * Thông báo nhắc nhở thanh toán - cho phụ huynh
   */
  async notifyPaymentReminder(studentId, fee, daysOverdue) {
    const title = daysOverdue > 0 ? 'Nhắc nhở thanh toán quá hạn' : 'Nhắc nhở thanh toán sắp đến hạn';
    const dueDateStr = fee.dueDate ? `Hạn: ${this.formatDate(fee.dueDate)}` : '';
    const description = fee.description || (fee.classId?.name ? `Học phí lớp ${fee.classId.name}` : (fee.feePeriodId?.name ? `Học phí ${fee.feePeriodId.name}` : 'Học phí'));
    const message = `Khoản phí "${description}" ${daysOverdue > 0 ? `đã quá hạn ${daysOverdue} ngày` : 'sắp đến hạn thanh toán'}. Số tiền: ${this.formatCurrency(fee.finalAmount)}. ${dueDateStr}`;

    await this.createForParent(studentId, title, message, NOTIFICATION_TYPES.PAYMENT_REMINDER, {
      feeId: fee._id,
      studentId,
      amount: fee.finalAmount,
      dueDate: fee.dueDate,
      daysOverdue
    }, { priority: daysOverdue > 7 ? NOTIFICATION_PRIORITY.HIGH : NOTIFICATION_PRIORITY.NORMAL });

    await this.createForStudent(studentId, title, message, NOTIFICATION_TYPES.PAYMENT_REMINDER, {
      feeId: fee._id,
      studentId,
      amount: fee.finalAmount,
      daysOverdue
    });

    return true;
  }

  // ==================== FEE NOTIFICATIONS ====================

  /**
   * Thông báo tạo học phí mới - cho phụ huynh
   */
  async notifyFeeCreated(studentId, fee, organizationName) {
    const title = 'Học phí mới được tạo';
    const dueDateStr = fee.dueDate ? `Hạn thanh toán: ${this.formatDate(fee.dueDate)}` : 'Chưa có hạn thanh toán';
    const message = `${organizationName} đã tạo khoản phí "${fee.description}" với số tiền ${this.formatCurrency(fee.finalAmount)}. ${dueDateStr}`;

    await this.createForParent(studentId, title, message, NOTIFICATION_TYPES.FEE_CREATED, {
      feeId: fee._id,
      studentId,
      amount: fee.finalAmount,
      dueDate: fee.dueDate,
      description: fee.description
    });

    await this.createForStudent(studentId, title, message, NOTIFICATION_TYPES.FEE_CREATED, {
      feeId: fee._id,
      studentId,
      amount: fee.finalAmount
    });

    return true;
  }

  /**
   * Thông báo cập nhật học phí
   */
  async notifyFeeUpdated(studentId, fee, changes, organizationName) {
    const title = 'Học phí được cập nhật';
    const message = `Khoản phí "${fee.description}" đã được cập nhật. Số tiền mới: ${this.formatCurrency(fee.finalAmount)}`;

    await this.createForParent(studentId, title, message, NOTIFICATION_TYPES.FEE_UPDATED, {
      feeId: fee._id,
      studentId,
      amount: fee.finalAmount,
      changes
    });

    return true;
  }

  /**
   * Thông báo xóa học phí
   */
  async notifyFeeDeleted(studentId, fee, organizationName) {
    const title = 'Học phí đã bị xóa';
    const message = `Khoản phí "${fee.description}" với số tiền ${this.formatCurrency(fee.finalAmount)} đã bị xóa khỏi hệ thống.`;

    await this.createForParent(studentId, title, message, NOTIFICATION_TYPES.FEE_DELETED, {
      feeId: fee._id,
      studentId,
      amount: fee.finalAmount
    });

    return true;
  }

  /**
   * Thông báo học phí quá hạn nghiêm trọng
   */
  async notifyFeeOverdue(studentId, fee, organizationName) {
    const title = 'Cảnh báo: Học phí quá hạn';
    const message = `Khoản phí "${fee.description}" đã quá hạn rất lâu. Số tiền còn nợ: ${this.formatCurrency(fee.finalAmount - (fee.paidAmount || 0))}. Vui lòng thanh toán sớm nhất có thể.`;

    await this.createForParent(studentId, title, message, NOTIFICATION_TYPES.FEE_OVERDUE, {
      feeId: fee._id,
      studentId,
      amount: fee.finalAmount,
      unpaidAmount: fee.finalAmount - (fee.paidAmount || 0)
    }, { priority: NOTIFICATION_PRIORITY.HIGH });

    // Thông báo cho admin
    await this.createForOrganizationAdmins(fee.organizationId,
      'Cảnh báo công nợ',
      `Học sinh ${fee.studentId?.name || ''} có khoản phí quá hạn ${this.formatCurrency(fee.finalAmount - (fee.paidAmount || 0))}.`,
      NOTIFICATION_TYPES.FEE_OVERDUE,
      {
        feeId: fee._id,
        studentId,
        amount: fee.finalAmount
      }
    );

    return true;
  }

  // ==================== STUDENT NOTIFICATIONS ====================

  /**
   * Thông báo học sinh mới được thêm
   */
  async notifyStudentAdded(student, createdBy) {
    const title = 'Học sinh mới được thêm';
    const message = `Học sinh "${student.name}" (${student.studentCode}) đã được thêm vào hệ thống.`;

    await this.createForOrganizationAdmins(student.organizationId, title, message, NOTIFICATION_TYPES.STUDENT_ADDED, {
      studentId: student._id,
      studentCode: student.studentCode,
      studentName: student.name,
      addedBy: createdBy
    });

    return true;
  }

  /**
   * Thông báo thông tin học sinh được cập nhật
   */
  async notifyStudentUpdated(student, changes) {
    const title = 'Thông tin học sinh được cập nhật';
    const message = `Thông tin của học sinh "${student.name}" đã được cập nhật.`;

    await this.createForOrganizationAdmins(student.organizationId, title, message, NOTIFICATION_TYPES.STUDENT_UPDATED, {
      studentId: student._id,
      studentName: student.name,
      changes
    });

    return true;
  }

  /**
   * Thông báo học sinh được xóa
   */
  async notifyStudentDeleted(student, deletedBy) {
    const title = 'Học sinh đã bị xóa';
    const message = `Học sinh "${student.name}" (${student.studentCode}) đã bị xóa khỏi hệ thống.`;

    await this.createForOrganizationAdmins(student.organizationId, title, message, NOTIFICATION_TYPES.STUDENT_DELETED, {
      studentId: student._id,
      studentCode: student.studentCode,
      studentName: student.name,
      deletedBy
    });

    return true;
  }

  /**
   * Thông báo trạng thái học sinh thay đổi
   */
  async notifyStudentStatusChanged(organizationId, studentId, studentName, oldStatus, newStatus) {
    const statusLabels = {
      active: 'Hoạt động',
      inactive: 'Không hoạt động',
      graduated: 'Đã tốt nghiệp'
    };

    const title = 'Trạng thái học sinh thay đổi';
    const message = `Học sinh "${studentName}" đã được chuyển từ trạng thái "${statusLabels[oldStatus] || oldStatus}" sang "${statusLabels[newStatus] || newStatus}".`;

    // Thông báo cho phụ huynh
    await this.createForParent(studentId, title, message, NOTIFICATION_TYPES.STUDENT_UPDATED, {
      studentId,
      studentName,
      oldStatus,
      newStatus
    });

    // Thông báo cho học sinh
    await this.createForStudent(studentId, title, message, NOTIFICATION_TYPES.STUDENT_UPDATED, {
      studentId,
      studentName,
      oldStatus,
      newStatus
    });

    return true;
  }

  /**
   * Thông báo học sinh được thêm vào lớp
   */
  async notifyStudentClassAdded(studentId, classData, organizationName) {
    const title = 'Đã thêm vào lớp mới';
    const message = `Bạn đã được thêm vào lớp "${classData.name}" tại ${organizationName}.`;

    await this.createForStudent(studentId, title, message, NOTIFICATION_TYPES.STUDENT_CLASS_ADDED, {
      studentId,
      classId: classData._id,
      className: classData.name
    });

    await this.createForParent(studentId,
      'Thông báo thêm lớp cho con',
      `Con bạn "${classData.studentName || ''}" đã được thêm vào lớp "${classData.name}".`,
      NOTIFICATION_TYPES.STUDENT_CLASS_ADDED,
      {
        studentId,
        classId: classData._id,
        className: classData.name
      }
    );

    return true;
  }

  /**
   * Thông báo học sinh bị xóa khỏi lớp
   */
  async notifyStudentClassRemoved(studentId, classData, organizationName) {
    const title = 'Đã xóa khỏi lớp';
    const message = `Bạn đã được xóa khỏi lớp "${classData.name}" tại ${organizationName}.`;

    await this.createForStudent(studentId, title, message, NOTIFICATION_TYPES.STUDENT_CLASS_REMOVED, {
      studentId,
      classId: classData._id,
      className: classData.name
    });

    await this.createForParent(studentId,
      'Thông báo xóa khỏi lớp',
      `Con bạn đã được xóa khỏi lớp "${classData.name}".`,
      NOTIFICATION_TYPES.STUDENT_CLASS_REMOVED,
      {
        studentId,
        classId: classData._id,
        className: classData.name
      }
    );

    return true;
  }

  // ==================== CLASS NOTIFICATIONS ====================

  /**
   * Thông báo lớp học mới được tạo
   */
  async notifyClassCreated(classData, createdBy) {
    const title = 'Lớp học mới được tạo';
    const message = `Lớp "${classData.name}" đã được tạo với học phí ${this.formatCurrency(classData.feeAmount)}/tháng.`;

    await this.createForOrganizationAdmins(classData.organizationId, title, message, NOTIFICATION_TYPES.CLASS_CREATED, {
      classId: classData._id,
      className: classData.name,
      feeAmount: classData.feeAmount,
      createdBy
    });

    // Thông báo cho phụ huynh nếu lớp có học sinh
    if (classData.studentCount > 0) {
      await this.createForOrganizationParents(classData.organizationId,
        'Lớp học mới',
        `Trung tâm vừa mở lớp mới "${classData.name}".`,
        NOTIFICATION_TYPES.CLASS_CREATED,
        {
          classId: classData._id,
          className: classData.name
        }
      );
    }

    return true;
  }

  /**
   * Thông báo lớp học được cập nhật
   */
  async notifyClassUpdated(classData, changes) {
    const title = 'Lớp học được cập nhật';
    const message = `Lớp "${classData.name}" đã được cập nhật thông tin.`;

    await this.createForOrganizationAdmins(classData.organizationId, title, message, NOTIFICATION_TYPES.CLASS_UPDATED, {
      classId: classData._id,
      className: classData.name,
      changes
    });

    return true;
  }

  /**
   * Thông báo lớp học bị xóa
   */
  async notifyClassDeleted(classData) {
    const title = 'Lớp học đã bị xóa';
    const message = `Lớp "${classData.name}" đã bị xóa khỏi hệ thống.`;

    await this.createForOrganizationAdmins(classData.organizationId, title, message, NOTIFICATION_TYPES.CLASS_DELETED, {
      classId: classData._id,
      className: classData.name
    });

    return true;
  }

  /**
   * Thông báo lớp học đã đầy
   */
  async notifyClassFull(classData) {
    const title = 'Lớp học đã đầy';
    const message = `Lớp "${classData.name}" đã đạt sĩ số tối đa (${classData.maxStudents} học sinh). Không thể thêm học sinh mới.`;

    await this.createForOrganizationAdmins(classData.organizationId, title, message, NOTIFICATION_TYPES.CLASS_FULL, {
      classId: classData._id,
      className: classData.name,
      maxStudents: classData.maxStudents
    });

    return true;
  }

  // Alias methods for class routes compatibility
  async notifyClassAdded(classData, createdBy) {
    return this.notifyClassCreated(classData, createdBy);
  }

  async notifyStudentJoinedClass(studentId, classId, studentName, className, organizationName) {
    return this.notifyStudentClassAdded(studentId, {
      _id: classId,
      name: className,
      studentName
    }, organizationName);
  }

  async notifyStudentLeftClass(studentId, classId, studentName, className, organizationName) {
    return this.notifyStudentClassRemoved(studentId, {
      _id: classId,
      name: className
    }, organizationName);
  }

  async notifyClassUpdated(classData, changes, updatedBy) {
    return this.notifyClassUpdated(classData, changes);
  }

  async notifyClassDeleted(organizationId, className, classCode, deletedBy) {
    return this.createForOrganizationAdmins(organizationId,
      'Lớp học đã bị xóa',
      `Lớp "${className}" (${classCode}) đã bị xóa khỏi hệ thống bởi ${deletedBy}.`,
      NOTIFICATION_TYPES.CLASS_DELETED,
      { className, classCode }
    );
  }

  // ==================== ACCOUNT NOTIFICATIONS ====================

  /**
   * Thông báo tài khoản mới được tạo - cho người dùng
   */
  async notifyAccountCreated(user, password, organizationName) {
    const title = 'Tài khoản đã được tạo';
    const roleLabel = this.getRoleLabel(user.role);
    const message = `Tài khoản ${roleLabel} của bạn tại ${organizationName} đã được tạo. Email: ${user.email}`;

    await this.createForUser(user._id, title, message, NOTIFICATION_TYPES.ACCOUNT_CREATED, {
      userId: user._id,
      role: user.role,
      email: user.email,
      organizationName
    });

    return true;
  }

  /**
   * Thông báo tài khoản family được liên kết với học sinh
   */
  async notifyAccountLinked(parentUser, student) {
    const title = 'Liên kết tài khoản thành công';
    const message = `Tài khoản của bạn đã được liên kết với học sinh "${student.name}" (${student.studentCode}).`;

    await this.createForUser(parentUser._id, title, message, NOTIFICATION_TYPES.ACCOUNT_LINKED, {
      parentId: parentUser._id,
      studentId: student._id,
      studentName: student.name
    });

    return true;
  }

  /**
   * Thông báo hủy liên kết tài khoản với học sinh
   */
  async notifyAccountUnlinked(parentUser, student) {
    const title = 'Hủy liên kết tài khoản';
    const message = `Tài khoản của bạn đã được hủy liên kết với học sinh "${student.name}".`;

    await this.createForUser(parentUser._id, title, message, NOTIFICATION_TYPES.ACCOUNT_UNLINKED, {
      parentId: parentUser._id,
      studentId: student._id,
      studentName: student.name
    });

    return true;
  }

  /**
   * Thông báo mật khẩu đã thay đổi
   */
  async notifyPasswordChanged(user) {
    const title = 'Mật khẩu đã được thay đổi';
    const message = `Mật khẩu tài khoản của bạn đã được thay đổi vào ${this.formatDateTime(new Date())}. Nếu không phải bạn, vui lòng liên hệ trung tâm ngay.`;

    await this.createForUser(user._id, title, message, NOTIFICATION_TYPES.PASSWORD_CHANGED, {
      userId: user._id,
      changedAt: new Date()
    }, { priority: NOTIFICATION_PRIORITY.HIGH });

    return true;
  }

  /**
   * Thông báo yêu cầu đặt lại mật khẩu
   */
  async notifyPasswordResetRequested(user) {
    const title = 'Yêu cầu đặt lại mật khẩu';
    const message = `Có yêu cầu đặt lại mật khẩu cho tài khoản ${user.email}. Nếu không phải bạn, vui lòng bỏ qua email này.`;

    await this.createForUser(user._id, title, message, NOTIFICATION_TYPES.PASSWORD_RESET_REQUEST, {
      userId: user._id,
      requestedAt: new Date()
    });

    return true;
  }

  /**
   * Thông báo đăng nhập từ thiết bị mới
   */
  async notifyLoginAlert(user, deviceInfo) {
    const title = 'Đăng nhập từ thiết bị mới';
    const message = `Tài khoản của bạn vừa được đăng nhập từ ${deviceInfo.location || 'một thiết bị mới'} vào ${this.formatDateTime(new Date())}.`;

    await this.createForUser(user._id, title, message, NOTIFICATION_TYPES.LOGIN_ALERT, {
      userId: user._id,
      deviceInfo,
      loginAt: new Date()
    }, { priority: NOTIFICATION_PRIORITY.HIGH });

    return true;
  }

  // ==================== STAFF NOTIFICATIONS ====================

  /**
   * Thông báo nhân viên mới được thêm
   */
  async notifyStaffAdded(user, organizationName, addedBy) {
    const title = 'Nhân viên mới được thêm';
    const roleLabel = this.getRoleLabel(user.role);
    const message = `Nhân viên "${user.name}" đã được thêm vào ${organizationName} với vai trò ${roleLabel}.`;

    await this.createForOrganizationAdmins(user.organizationId, title, message, NOTIFICATION_TYPES.STAFF_ADDED, {
      staffId: user._id,
      staffName: user.name,
      role: user.role,
      addedBy
    });

    // Thông báo cho chính nhân viên
    await this.createForUser(user._id,
      'Chào mừng đến với SmartFee',
      `Bạn đã được thêm vào ${organizationName} với vai trò ${roleLabel}.`,
      NOTIFICATION_TYPES.WELCOME,
      {
        organizationName,
        role: user.role
      }
    );

    return true;
  }

  /**
   * Thông báo thông tin nhân viên được cập nhật
   */
  async notifyStaffUpdated(user, changes) {
    const title = 'Thông tin nhân viên được cập nhật';
    const message = `Thông tin nhân viên "${user.name}" đã được cập nhật.`;

    await this.createForOrganizationAdmins(user.organizationId, title, message, NOTIFICATION_TYPES.STAFF_UPDATED, {
      staffId: user._id,
      staffName: user.name,
      changes
    });

    return true;
  }

  /**
   * Thông báo nhân viên bị xóa
   */
  async notifyStaffDeleted(user, organizationName) {
    const title = 'Nhân viên đã bị xóa';
    const message = `Nhân viên "${user.name}" đã bị xóa khỏi ${organizationName}.`;

    await this.createForOrganizationAdmins(user.organizationId, title, message, NOTIFICATION_TYPES.STAFF_DELETED, {
      staffId: user._id,
      staffName: user.name
    });

    return true;
  }

  /**
   * Thông báo vai trò nhân viên được thay đổi
   */
  async notifyStaffRoleChanged(user, oldRole, newRole) {
    const title = 'Vai trò được thay đổi';
    const oldRoleLabel = this.getRoleLabel(oldRole);
    const newRoleLabel = this.getRoleLabel(newRole);
    const message = `Vai trò của bạn đã được thay đổi từ ${oldRoleLabel} sang ${newRoleLabel}.`;

    await this.createForUser(user._id, title, message, NOTIFICATION_TYPES.STAFF_ROLE_CHANGED, {
      staffId: user._id,
      oldRole,
      newRole
    });

    return true;
  }

  // ==================== PLAN/SUBSCRIPTION NOTIFICATIONS ====================

  /**
   * Thông báo trung tâm mới đăng ký - cho Super Admin
   */
  async notifyNewOrganization(organization) {
    const admin = await User.findOne({ organizationId: organization._id, role: 'admin' });
    const adminName = admin?.name || 'Chưa có';
    const adminEmail = admin?.email || 'Chưa có';

    const title = 'Trung tâm mới đăng ký';
    const message = `Trung tâm "${organization.name}" vừa đăng ký sử dụng SmartFee. Admin: ${adminName} (${adminEmail}). Gói: ${organization.plan?.toUpperCase() || 'BASIC'}`;

    await this.createForSuperAdmins(title, message, NOTIFICATION_TYPES.ORG_REGISTERED, {
      organizationId: organization._id,
      organizationName: organization.name,
      adminEmail,
      adminName,
      plan: organization.plan
    }, { priority: NOTIFICATION_PRIORITY.NORMAL });

    return true;
  }

  /**
   * Thông báo yêu cầu nâng cấp gói - cho Super Admin
   */
  async notifyUpgradeRequest(organization, requestedPlan) {
    const title = 'Yêu cầu nâng cấp gói dịch vụ';
    const message = `Trung tâm "${organization.name}" yêu cầu nâng cấp lên gói ${requestedPlan.toUpperCase()}.`;

    await this.createForSuperAdmins(title, message, NOTIFICATION_TYPES.UPGRADE_REQUESTED, {
      organizationId: organization._id,
      organizationName: organization.name,
      currentPlan: organization.plan,
      requestedPlan
    });

    return true;
  }

  /**
   * Thông báo nâng cấp gói thành công - cho Admin trung tâm
   */
  async notifyPlanUpgraded(organization, oldPlan, newPlan) {
    const title = 'Nâng cấp gói dịch vụ thành công';
    const newPlanLabel = this.getPlanLabel(newPlan);
    const message = `Trung tâm đã được nâng cấp lên gói ${newPlanLabel}. Cảm ơn bạn đã tin tưởng SmartFee!`;

    await this.createForOrganizationAdmins(organization._id, title, message, NOTIFICATION_TYPES.PLAN_UPGRADED, {
      organizationId: organization._id,
      oldPlan,
      newPlan,
      planExpiresAt: organization.planExpiresAt
    });

    return true;
  }

  /**
   * Thông báo hạ cấp gói dịch vụ
   */
  async notifyPlanDowngraded(organization, oldPlan, newPlan) {
    const title = 'Gói dịch vụ được thay đổi';
    const message = `Trung tâm đã được chuyển từ gói ${this.getPlanLabel(oldPlan)} sang gói ${this.getPlanLabel(newPlan)}.`;

    await this.createForOrganizationAdmins(organization._id, title, message, NOTIFICATION_TYPES.PLAN_DOWNGRADED, {
      organizationId: organization._id,
      oldPlan,
      newPlan
    });

    return true;
  }

  /**
   * Thông báo gói sắp hết hạn - cho Admin trung tâm
   */
  async notifyPlanExpiringSoon(organization, daysLeft) {
    const title = 'Gói dịch vụ sắp hết hạn';
    const planLabel = this.getPlanLabel(organization.plan);
    const message = `Gói ${planLabel} của trung tâm sẽ hết hạn sau ${daysLeft} ngày (${this.formatDate(organization.planExpiresAt)}). Vui lòng gia hạn hoặc nâng cấp để tiếp tục sử dụng.`;

    await this.createForOrganizationAdmins(organization._id, title, message, NOTIFICATION_TYPES.PLAN_EXPIRING, {
      organizationId: organization._id,
      plan: organization.plan,
      daysLeft,
      planExpiresAt: organization.planExpiresAt
    }, { priority: daysLeft <= 3 ? NOTIFICATION_PRIORITY.HIGH : NOTIFICATION_PRIORITY.NORMAL });

    // Thông báo cho super admin nếu sắp hết hạn
    if (daysLeft <= 7) {
      await this.createForSuperAdmins(
        'Cảnh báo: Trung tâm sắp hết hạn',
        `Trung tâm "${organization.name}" sẽ hết hạn sau ${daysLeft} ngày.`,
        NOTIFICATION_TYPES.PLAN_EXPIRING,
        {
          organizationId: organization._id,
          organizationName: organization.name,
          daysLeft
        }
      );
    }

    return true;
  }

  /**
   * Thông báo gói đã hết hạn
   */
  async notifyPlanExpired(organization) {
    const title = 'Gói dịch vụ đã hết hạn';
    const message = `Gói ${this.getPlanLabel(organization.plan)} của trung tâm đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng đầy đủ tính năng.`;

    await this.createForOrganizationAdmins(organization._id, title, message, NOTIFICATION_TYPES.PLAN_EXPIRED, {
      organizationId: organization._id,
      plan: organization.plan
    }, { priority: NOTIFICATION_PRIORITY.URGENT });

    await this.createForSuperAdmins(
      'Trung tâm đã hết hạn',
      `Trung tâm "${organization.name}" đã hết hạn gói dịch vụ.`,
      NOTIFICATION_TYPES.PLAN_EXPIRED,
      {
        organizationId: organization._id,
        organizationName: organization.name
      }
    );

    return true;
  }

  /**
   * Thông báo trung tâm bị tạm ngưng - cho Super Admin
   */
  async notifyOrgSuspended(organization) {
    const title = 'Trung tâm bị tạm ngưng';
    const message = `Trung tâm "${organization.name}" đã bị tạm ngưng hoạt động.`;

    await this.createForSuperAdmins(title, message, NOTIFICATION_TYPES.ORG_SUSPENDED, {
      organizationId: organization._id,
      organizationName: organization.name
    });

    return true;
  }

  /**
   * Thông báo trung tâm được phê duyệt - cho Admin trung tâm
   */
  async notifyOrgApproved(organization) {
    const title = 'Trung tâm được phê duyệt';
    const message = `Trung tâm "${organization.name}" đã được phê duyệt và hoạt động bình thường.`;

    await this.createForOrganizationAdmins(organization._id, title, message, NOTIFICATION_TYPES.ORG_APPROVED, {
      organizationId: organization._id,
      organizationName: organization.name
    });

    return true;
  }

  // ==================== SYSTEM NOTIFICATIONS ====================

  /**
   * Thông báo chào mừng - cho user mới
   */
  async notifyWelcome(userId, organizationName) {
    const title = 'Chào mừng đến với SmartFee';
    const message = `Tài khoản của bạn đã được kích hoạt tại ${organizationName}. Bắt đầu quản lý học phí ngay hôm nay!`;

    await this.createForUser(userId, title, message, NOTIFICATION_TYPES.WELCOME, {
      organizationName
    });

    return true;
  }

  /**
   * Thông báo cảnh báo hệ thống - cho tất cả
   */
  async notifySystemAlert(organizationId, alertMessage, isGlobal = false) {
    if (isGlobal) {
      const OrganizationModel = (await import('../models/Organization.js')).default;
      const allOrgs = await OrganizationModel.find({});
      await Promise.all(
        allOrgs.map(org =>
          this.createForOrganizationAdmins(org._id, 'Cảnh báo hệ thống', alertMessage, NOTIFICATION_TYPES.SYSTEM_ALERT, {})
        )
      );
    } else {
      await this.createForOrganizationAdmins(organizationId, 'Cảnh báo', alertMessage, NOTIFICATION_TYPES.SYSTEM_ALERT, {});
    }
    return true;
  }

  /**
   * Thông báo bảo trì hệ thống
   */
  async notifyMaintenance(organizationId, message, scheduledAt, duration) {
    const title = 'Thông báo bảo trì';
    const fullMessage = `${message}${scheduledAt ? `. Dự kiến hoàn thành: ${this.formatDateTime(scheduledAt)}` : ''}`;

    if (organizationId) {
      await this.createForOrganizationAdmins(organizationId, title, fullMessage, NOTIFICATION_TYPES.MAINTENANCE, {
        scheduledAt,
        duration
      });
    } else {
      await this.createForSuperAdmins(title, fullMessage, NOTIFICATION_TYPES.MAINTENANCE, {
        scheduledAt,
        duration
      });
    }

    return true;
  }

  // ==================== HELPER METHODS ====================

  formatCurrency(amount) {
    if (!amount && amount !== 0) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN');
  }

  formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPaymentMethodLabel(method) {
    const labels = {
      cash: 'Tiền mặt',
      banking: 'Chuyển khoản ngân hàng',
      vnpay: 'VNPay',
      momo: 'Ví MoMo',
      payos: 'PayOS',
      wallet: 'Ví điện tử'
    };
    return labels[method] || method;
  }

  getRoleLabel(role) {
    const labels = {
      superadmin: 'Quản trị hệ thống',
      admin: 'Quản trị viên',
      staff: 'Nhân viên',
      cashier: 'Thu ngân',
      viewer: 'Người xem',
      family: 'Phụ huynh/Học sinh'
    };
    return labels[role] || role;
  }

  getPlanLabel(plan) {
    const labels = {
      basic: 'Basic',
      gold: 'Gold',
      premium: 'Premium'
    };
    return labels[plan] || plan;
  }
}

export default new NotificationService();
export { NOTIFICATION_TYPES, NOTIFICATION_CHANNEL, NOTIFICATION_PRIORITY };
