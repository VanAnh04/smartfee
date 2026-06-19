import { useState, useEffect } from 'react';
import { feeService, classService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';
import {
  Search, Plus, Receipt, Calendar, DollarSign, Users,
  CheckCircle, Clock, AlertCircle, Edit, Trash2,
  ChevronLeft, ChevronRight, X, Filter
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

export default function Fees() {
  const toast = useToast();
  const [fees, setFees] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: '', periodId: '', classId: '', status: ''
  });
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: '', periodType: 'month', startDate: '', endDate: '', dueDate: ''
  });
  const [generateForm, setGenerateForm] = useState({ periodId: '', classId: '', customAmount: '', noDueDate: false });

  useEffect(() => {
    fetchPeriods();
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchFees();
  }, [pagination.page, filters]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...filters
      };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await feeService.getAll(params);
      setFees(res.data.fees);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error('Không thể tải danh sách học phí');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await feeService.getPeriods();
      setPeriods(res.data);
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await classService.getAll({ limit: 100 });
      setClasses(res.data.classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    try {
      await feeService.createPeriod(periodForm);
      toast.success('Tạo kỳ thu thành công');
      setShowPeriodModal(false);
      setPeriodForm({ name: '', periodType: 'month', startDate: '', endDate: '', dueDate: '' });
      fetchPeriods();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDeletePeriod = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa kỳ thu này?')) return;
    try {
      await feeService.deletePeriod(id);
      toast.success('Xóa kỳ thu thành công');
      fetchPeriods();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể xóa kỳ thu');
    }
  };

  const handleGenerateFees = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        periodId: generateForm.periodId,
        classId: generateForm.classId || undefined,
        customAmount: generateForm.customAmount || undefined,
        noDueDate: generateForm.noDueDate || undefined
      };
      const res = await feeService.generate(payload);
      toast.success(res.data.message);
      setShowGenerateModal(false);
      setGenerateForm({ periodId: '', classId: '', customAmount: '', noDueDate: false });
      fetchFees();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const stats = {
    total: fees.reduce((sum, f) => sum + f.finalAmount, 0),
    paid: fees.filter(f => f.status === 'paid').length,
    unpaid: fees.filter(f => f.status === 'unpaid' || f.status === 'overdue').length,
    partial: fees.filter(f => f.status === 'partial').length
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Học phí</h1>
          <p className="text-gray-500 mt-1">Tổng cộng {pagination.total} phiếu thu</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Tạo phiếu thu
          </button>
          <button
            onClick={() => setShowPeriodModal(true)}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Calendar size={18} />
            Kỳ thu học phí
          </button>
        </div>
      </div>

      {/* Periods List */}
      {periods.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Kỳ thu học phí</h2>
          <div className="flex flex-wrap gap-2">
            {periods.map(p => (
              <div
                key={p._id}
                className={`px-3 py-2 rounded-lg border ${
                  p.status === 'active' ? 'bg-primary-50 border-primary-200' :
                  p.status === 'closed' ? 'bg-gray-50 border-gray-200' :
                  'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'active' ? 'bg-green-100 text-green-700' :
                    p.status === 'closed' ? 'bg-gray-200 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.status === 'active' ? 'Đang thu' : p.status === 'closed' ? 'Đã đóng' : 'Nháp'}
                  </span>
                  <button
                    onClick={() => handleDeletePeriod(p._id)}
                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Hạn: {p.dueDate ? new Date(p.dueDate).toLocaleDateString('vi-VN') : 'Không có'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Tổng cộng</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(stats.total)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <CheckCircle size={14} className="text-green-500" /> Đã đóng
          </p>
          <p className="text-xl font-bold text-green-600 mt-1">{stats.paid}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Clock size={14} className="text-yellow-500" /> Chưa đóng
          </p>
          <p className="text-xl font-bold text-yellow-600 mt-1">{stats.unpaid}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <AlertCircle size={14} className="text-red-500" /> Quá hạn
          </p>
          <p className="text-xl font-bold text-red-600 mt-1">{stats.partial}</p>
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
            value={filters.periodId}
            onChange={(e) => handleFilterChange('periodId', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
          >
            <option value="">Tất cả kỳ thu</option>
            {periods.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filters.classId}
            onChange={(e) => handleFilterChange('classId', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
          >
            <option value="">Tất cả lớp</option>
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="paid">Đã đóng</option>
            <option value="unpaid">Chưa đóng</option>
            <option value="partial">Một phần</option>
            <option value="overdue">Quá hạn</option>
          </select>
        </div>
      </div>

      {/* Fees Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Học sinh</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Kỳ thu</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Lớp</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Số tiền</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Hạn thanh toán</th>
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
                  </tr>
                ))
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Chưa có phiếu thu học phí nào</p>
                  </td>
                </tr>
              ) : (
                fees.map((fee) => (
                  <tr key={fee._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 text-sm font-medium">
                            {fee.studentId?.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{fee.studentId?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{fee.studentId?.studentCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{fee.feePeriodId?.name || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{fee.classId?.name || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(fee.finalAmount)}</p>
                      {fee.paidAmount > 0 && fee.paidAmount < fee.finalAmount && (
                        <p className="text-xs text-gray-500">Đã đóng: {formatCurrency(fee.paidAmount)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[fee.status]}`}>
                        {STATUS_LABELS[fee.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">
                        {!fee.dueDate ? '—' : new Date(fee.dueDate).toLocaleDateString('vi-VN')}
                      </p>
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

      {/* Create Period Modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tạo kỳ thu học phí</h2>
              <button onClick={() => setShowPeriodModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePeriod} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên kỳ thu</label>
                <input
                  type="text"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  placeholder="Học phí tháng 5/2026"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại kỳ</label>
                <select
                  value={periodForm.periodType}
                  onChange={(e) => setPeriodForm(f => ({ ...f, periodType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                >
                  <option value="month">Theo tháng</option>
                  <option value="quarter">Theo quý</option>
                  <option value="semester">Theo học kỳ</option>
                  <option value="custom">Tùy chỉnh</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={periodForm.startDate}
                  onChange={(e) => setPeriodForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                <input
                  type="date"
                  value={periodForm.endDate}
                  onChange={(e) => setPeriodForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn thanh toán</label>
                <input
                  type="date"
                  value={periodForm.dueDate}
                  onChange={(e) => setPeriodForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Tạo kỳ thu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Fees Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tạo phiếu thu học phí</h2>
              <button onClick={() => setShowGenerateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGenerateFees} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kỳ thu</label>
                <select
                  value={generateForm.periodId}
                  onChange={(e) => setGenerateForm(f => ({ ...f, periodId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  required
                >
                  <option value="">Chọn kỳ thu</option>
                  {periods.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lớp học (tùy chọn)</label>
                <select
                  value={generateForm.classId}
                  onChange={(e) => setGenerateForm(f => ({ ...f, classId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                >
                  <option value="">Tất cả lớp</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Để trống để tạo cho tất cả lớp</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền tùy chỉnh (VNĐ)</label>
                <input
                  type="number"
                  value={generateForm.customAmount}
                  onChange={(e) => setGenerateForm(f => ({ ...f, customAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  placeholder="Để trống = lấy theo học phí lớp"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Để trống sẽ lấy theo học phí đã đặt của lớp</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noDueDate"
                  checked={generateForm.noDueDate}
                  onChange={(e) => setGenerateForm(f => ({ ...f, noDueDate: e.target.checked }))}
                  className="rounded text-primary-600"
                />
                <label htmlFor="noDueDate" className="text-sm text-gray-700 cursor-pointer">
                  Không có hạn thanh toán
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Tạo phiếu thu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
