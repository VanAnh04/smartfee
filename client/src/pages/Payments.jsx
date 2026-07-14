import { useState, useEffect } from 'react';
import { paymentService, studentService, feeService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';
import {
  Search, Plus, CreditCard, DollarSign, ArrowUpRight, ArrowDownRight,
  ChevronLeft, ChevronRight, X, CheckCircle, Clock, XCircle,
  Receipt, Filter, User, QrCode, Check, Trash2
} from 'lucide-react';

const METHOD_LABELS = {
  cash: 'Tiền mặt',
  banking: 'Chuyển khoản',
  vnpay: 'VNPay',
  wallet: 'Ví điện tử'
};

const STATUS_COLORS = {
  success: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600'
};

const STATUS_LABELS = {
  success: 'Thành công',
  pending: 'Đang xử lý',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền'
};

const getReceiptUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  const match = url.match(/\/uploads\/.+/);
  return match ? match[0] : url;
};

export default function Payments() {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: '', status: '', paymentMethod: '', startDate: '', endDate: ''
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [formData, setFormData] = useState({
    studentId: '', feeId: '', amount: '', paymentMethod: 'cash', notes: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [unpaidFees, setUnpaidFees] = useState([]);
  const [studentDebt, setStudentDebt] = useState(0);
  const [loadingFees, setLoadingFees] = useState(false);

  useEffect(() => {
    if (!showPaymentModal) {
      setStudentSearchInput('');
      setSearchResults([]);
      setUnpaidFees([]);
      setStudentDebt(0);
      setFormData({ studentId: '', feeId: '', amount: '', paymentMethod: 'cash', notes: '' });
    }
  }, [showPaymentModal]);

  useEffect(() => {
    fetchPayments();
    fetchStudents();
  }, [pagination.page, filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...filters
      };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await paymentService.getAll(params);
      setPayments(res.data.payments);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error('Không thể tải danh sách thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await studentService.getAll({ limit: 100 });
      setStudents(res.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSearchStudent = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await studentService.getAll({ search: query, limit: 10 });
      setSearchResults(res.data.students);
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setSearching(false);
    }
  };

  const fetchStudentUnpaidFees = async (studentId) => {
    setLoadingFees(true);
    try {
      const res = await feeService.getAll({ studentId, limit: 100 });
      const unpaid = res.data.fees.filter(f => f.status !== 'paid');
      setUnpaidFees(unpaid);
      
      const total = unpaid.reduce((sum, f) => sum + (f.finalAmount - (f.paidAmount || 0)), 0);
      setStudentDebt(total);
      
      setFormData(f => ({ 
        ...f, 
        amount: total > 0 ? total.toString() : '0',
        feeId: ''
      }));
    } catch (error) {
      console.error('Error fetching student fees:', error);
      toast.error('Không thể tải dư nợ của học sinh');
    } finally {
      setLoadingFees(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      await paymentService.create(formData);
      toast.success('Thu tiền thành công');
      setShowPaymentModal(false);
      setFormData({ studentId: '', feeId: '', amount: '', paymentMethod: 'cash', notes: '' });
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleGenerateQR = async () => {
    if (!formData.studentId || !formData.amount) {
      toast.error('Vui lòng chọn học sinh và nhập số tiền');
      return;
    }
    try {
      const res = await paymentService.createQRCode({
        studentId: formData.studentId,
        amount: parseFloat(formData.amount),
        description: 'Thanh toán học phí'
      });
      setQrData(res.data);
      setShowQRModal(true);
    } catch (error) {
      toast.error('Không thể tạo QR code');
    }
  };

  const handleApprovePayment = async (paymentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn PHÊ DUYỆT giao dịch này? Số tiền sẽ được cập nhật vào học phí của học sinh.')) return;
    try {
      await paymentService.approve(paymentId);
      toast.success('Phê duyệt giao dịch thành công');
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể phê duyệt giao dịch');
    }
  };

  const handleRejectPayment = async (paymentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn TỪ CHỐI giao dịch này?')) return;
    try {
      await paymentService.reject(paymentId);
      toast.success('Đã từ chối giao dịch');
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể từ chối giao dịch');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn XÓA giao dịch này? Nếu giao dịch đã thành công, số tiền đóng học phí của học sinh sẽ bị trừ lại.')) return;
    try {
      await paymentService.delete(paymentId);
      toast.success('Đã xóa giao dịch thành công');
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể xóa giao dịch');
    }
  };

  const stats = {
    total: payments.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0),
    count: payments.filter(p => p.status === 'success').length,
    cash: payments.filter(p => p.status === 'success' && p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amount, 0),
    banking: payments.filter(p => p.status === 'success' && p.paymentMethod === 'banking').reduce((sum, p) => sum + p.amount, 0)
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thu chi</h1>
          <p className="text-gray-500 mt-1">Quản lý các giao dịch thu tiền</p>
        </div>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Thu tiền
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng thu</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(stats.total)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Số giao dịch</p>
              <p className="text-xl font-bold text-gray-900">{stats.count}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Tiền mặt</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(stats.cash)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Chuyển khoản</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(stats.banking)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="success">Thành công</option>
            <option value="pending">Đang xử lý</option>
            <option value="failed">Thất bại</option>
          </select>
          <select
            value={filters.paymentMethod}
            onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
          >
            <option value="">Tất cả phương thức</option>
            <option value="cash">Tiền mặt</option>
            <option value="banking">Chuyển khoản</option>
            <option value="vnpay">VNPay</option>
            <option value="wallet">Ví điện tử</option>
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Mã GD</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Học sinh</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Phương thức</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Trạng thái</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Số tiền</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ngày / Biên lai</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse"></div></td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Chưa có giao dịch nào</p>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-gray-900">{payment.transactionId || payment._id.slice(-8)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 text-sm font-medium">
                            {payment.studentId?.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{payment.studentId?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{payment.studentId?.studentCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{METHOD_LABELS[payment.paymentMethod]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[payment.status]}`}>
                        {STATUS_LABELS[payment.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className={`font-semibold ${payment.status === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                        {payment.status === 'success' ? '+' : ''}{formatCurrency(payment.amount)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">
                        {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {payment.paidAt ? new Date(payment.paidAt).toLocaleTimeString('vi-VN') : ''}
                      </p>
                      {payment.receiptUrl && (
                        <a 
                          href={getReceiptUrl(payment.receiptUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-primary-600 hover:underline block mt-1"
                        >
                          Xem ảnh biên lai
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {payment.status === 'pending' && payment.paymentMethod === 'banking' && (
                          <>
                            <button
                              onClick={() => handleApprovePayment(payment._id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors flex items-center gap-0.5 text-xs font-semibold border border-green-200"
                              title="Duyệt giao dịch"
                            >
                              <Check size={14} />
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment._id)}
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors flex items-center gap-0.5 text-xs font-semibold border border-amber-200"
                              title="Từ chối"
                            >
                              <X size={14} />
                              Từ chối
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeletePayment(payment._id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-0.5 text-xs font-semibold border border-red-200"
                          title="Xóa giao dịch"
                        >
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang {pagination.page} / {pagination.pages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Thu tiền</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Học sinh</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm học sinh..."
                    value={studentSearchInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentSearchInput(val);
                      handleSearchStudent(val);
                      setFormData(f => ({ ...f, studentId: '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map(s => (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => {
                            setFormData(f => ({ ...f, studentId: s._id }));
                            setStudentSearchInput(s.name);
                            if (!students.some(item => item._id === s._id)) {
                              setStudents(prev => [...prev, s]);
                            }
                            setSearchResults([]);
                            fetchStudentUnpaidFees(s._id);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <User size={16} className="text-gray-400" />
                          <span>{s.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{s.studentCode}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formData.studentId && (
                  <div className="mt-2 space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Học sinh:</span>
                      <span className="font-semibold text-gray-900">
                        {students.find(s => s._id === formData.studentId)?.name || studentSearchInput}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng nợ hiện tại:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(studentDebt)}
                      </span>
                    </div>

                    {loadingFees ? (
                      <p className="text-xs text-gray-400 animate-pulse">Đang tải thông tin nợ...</p>
                    ) : unpaidFees.length > 0 ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Áp dụng gạch nợ cho khoản thu</label>
                        <select
                          value={formData.feeId || ''}
                          onChange={(e) => {
                            const selectedFeeId = e.target.value;
                            if (selectedFeeId === '') {
                              setFormData(f => ({ ...f, feeId: '', amount: studentDebt.toString() }));
                            } else {
                              const selected = unpaidFees.find(f => f._id === selectedFeeId);
                              const remaining = selected ? (selected.finalAmount - (selected.paidAmount || 0)) : 0;
                              setFormData(f => ({ ...f, feeId: selectedFeeId, amount: remaining.toString() }));
                            }
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                        >
                          <option value="">Tất cả nợ / Nộp chung ({formatCurrency(studentDebt)})</option>
                          {unpaidFees.map(f => {
                            const remaining = f.finalAmount - (f.paidAmount || 0);
                            return (
                              <option key={f._id} value={f._id}>
                                {f.feePeriodId?.name || f.description || 'Kỳ học'} (Còn nợ: {formatCurrency(remaining)})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      <p className="text-xs text-green-600 font-medium">✓ Học sinh này không có nợ học phí</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData(f => ({ ...f, paymentMethod: e.target.value }))}
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
                  value={formData.notes}
                  onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  rows={2}
                  placeholder="Ghi chú (tùy chọn)"
                />
              </div>
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={handleGenerateQR}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <QrCode size={16} />
                  Tạo QR
                </button>
                <div className="flex gap-3">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">QR Thanh toán</h2>
              <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 text-center">
              <img src={qrData.qrCode} alt="QR Code" className="mx-auto w-64 h-64" />
              <p className="mt-4 text-lg font-medium">{qrData.student?.name}</p>
              <p className="text-2xl font-bold text-primary-600 mt-2">
                {formatCurrency(qrData.amount)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Quét mã để thanh toán</p>
              <button
                onClick={() => setShowQRModal(false)}
                className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
