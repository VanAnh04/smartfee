import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { studentService, feeService, paymentService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, GraduationCap,
  Receipt, CreditCard, Edit, Plus, QrCode, Clock, CheckCircle,
  AlertCircle, XCircle
} from 'lucide-react';

const STATUS_COLORS = {
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  unpaid: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-700'
};

const STATUS_LABELS = {
  paid: 'Đã đóng',
  partial: 'Một phần',
  unpaid: 'Chưa đóng',
  overdue: 'Quá hạn'
};

export default function StudentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fees');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [paymentData, setPaymentData] = useState({ amount: '', paymentMethod: 'cash', notes: '' });

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const [studentRes, feesRes] = await Promise.all([
        studentService.getById(id),
        feeService.getAll({ studentId: id, limit: 50 })
      ]);
      setStudent(studentRes.data);
      setFees(feesRes.data.fees);
    } catch (error) {
      toast.error('Không thể tải thông tin học sinh');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const amount = parseFloat(paymentData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Số tiền không hợp lệ');
        return;
      }

      await paymentService.create({
        studentId: id,
        feeId: selectedFee?._id,
        amount,
        paymentMethod: paymentData.paymentMethod,
        notes: paymentData.notes
      });

      toast.success('Thu tiền thành công');
      setShowPaymentModal(false);
      setPaymentData({ amount: '', paymentMethod: 'cash', notes: '' });
      fetchStudentData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleGenerateQR = async (fee) => {
    try {
      setSelectedFee(fee);
      const remaining = fee.finalAmount - fee.paidAmount;
      const res = await paymentService.createQRCode({
        studentId: id,
        amount: remaining,
        description: `Học phí ${fee.feePeriodId?.name || ''}`
      });
      setQrCode(res.data);
      setShowQRModal(true);
    } catch (error) {
      toast.error('Không thể tạo QR code');
    }
  };

  const totalAmount = fees.reduce((sum, f) => sum + f.finalAmount, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);
  const totalDebt = totalAmount - totalPaid;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded"></div>
        <div className="h-48 bg-white rounded-xl"></div>
        <div className="h-96 bg-white rounded-xl"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <p className="text-gray-500">Không tìm thấy học sinh</p>
        <Link to="/students" className="text-primary-600 hover:underline mt-2 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/students" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600">
        <ArrowLeft size={18} />
        Quay lại danh sách học sinh
      </Link>

      {/* Student Info Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 text-3xl font-bold">
                  {student.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                  <p className="text-gray-500">{student.studentCode}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === 'active' ? 'bg-green-100 text-green-700' :
                      student.status === 'inactive' ? 'bg-gray-100 text-gray-600' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {student.status === 'active' ? 'Đang học' :
                       student.status === 'inactive' ? 'Nghỉ' : 'Tốt nghiệp'}
                    </span>
                    {student.walletBalance > 0 && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Ví: {formatCurrency(student.walletBalance)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Edit size={16} />
                    Sửa
                  </button>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                    <Plus size={16} />
                    Thu tiền
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phụ huynh</p>
                    <p className="font-medium">{student.parentName || 'Chưa có'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Phone size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Điện thoại</p>
                    <p className="font-medium">{student.parentPhone || 'Chưa có'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Mail size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{student.parentEmail || 'Chưa có'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Tổng học phí</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Đã đóng</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Còn nợ</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalDebt)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Lớp học</p>
          <p className="text-xl font-bold text-primary-600 mt-1">
            {student.classIds?.length || 0} lớp
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex gap-6 px-6">
            <button
              onClick={() => setActiveTab('fees')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fees'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Học phí ({fees.length})
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'classes'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Lớp học ({student.classIds?.length || 0})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'fees' && (
            <div className="space-y-4">
              {fees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Chưa có phiếu thu học phí</p>
                </div>
              ) : (
                fees.map((fee) => {
                  const remaining = fee.finalAmount - fee.paidAmount;
                  return (
                    <div key={fee._id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-200 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">
                              {fee.feePeriodId?.name || 'Kỳ thu học phí'}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[fee.status]}`}>
                              {STATUS_LABELS[fee.status]}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                            {fee.classId && (
                              <span className="flex items-center gap-1">
                                <GraduationCap size={14} />
                                {fee.classId.name}
                              </span>
                            )}
                            {fee.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                Hạn: {new Date(fee.dueDate).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {formatCurrency(fee.paidAmount)} / {formatCurrency(fee.finalAmount)}
                            </p>
                            {remaining > 0 && (
                              <p className="text-sm font-medium text-red-600">
                                Còn nợ: {formatCurrency(remaining)}
                              </p>
                            )}
                          </div>
                          {fee.status !== 'paid' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedFee(fee);
                                  setPaymentData({ ...paymentData, amount: remaining.toString() });
                                  setShowPaymentModal(true);
                                }}
                                className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                              >
                                Thu tiền
                              </button>
                              <button
                                onClick={() => handleGenerateQR(fee)}
                                className="px-3 py-1.5 border border-gray-200 text-sm rounded-lg hover:bg-gray-50"
                              >
                                <QrCode size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {fee.paidAmount > 0 && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${(fee.paidAmount / fee.finalAmount) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {student.classIds?.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Chưa tham gia lớp học nào</p>
                </div>
              ) : (
                student.classIds.map((cls) => (
                  <div key={cls._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{cls.name}</h3>
                        <p className="text-sm text-gray-500">{cls.code}</p>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {formatCurrency(cls.feeAmount || 0)}/tháng
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Thu tiền</h2>
            </div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(d => ({ ...d, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData(d => ({ ...d, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="banking">Chuyển khoản</option>
                  <option value="vnpay">VNPay</option>
                  <option value="wallet">Ví điện tử</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(d => ({ ...d, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && qrCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">QR Thanh toán</h2>
              <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 text-center">
              <img src={qrCode.qrCode} alt="QR Code" className="mx-auto w-64 h-64" />
              <p className="mt-4 text-lg font-medium">{student.name}</p>
              <p className="text-2xl font-bold text-primary-600 mt-2">
                {formatCurrency(qrCode.amount)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Quét mã để thanh toán</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
