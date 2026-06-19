import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import {
  Clock, CreditCard, CheckCircle, Search, Calendar, Download,
  PiggyBank, Receipt, ChevronDown, FileText, ChevronLeft, ChevronRight,
  Building2
} from 'lucide-react';

export default function FamilyHistory() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const feesRes = await authService.getMyFees();
      setPayments(feesRes.data.payments || []);
    } catch (error) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'cash':
        return <PiggyBank size={20} />;
      case 'banking':
        return <Building2 size={20} />;
      case 'vnpay':
        return <Receipt size={20} />;
      default:
        return <CreditCard size={20} />;
    }
  };

  const getMethodLabel = (method) => {
    switch (method) {
      case 'cash':
        return 'Tiền mặt';
      case 'banking':
        return 'Chuyển khoản';
      case 'vnpay':
        return 'VNPay';
      default:
        return method;
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-600';
      case 'banking':
        return 'bg-blue-100 text-blue-600';
      case 'vnpay':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filter payments
  const filteredPayments = payments.filter(p => {
    if (!searchTerm && !filterDate) return true;
    
    const matchesSearch = searchTerm && (
      p._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesDate = filterDate && (
      formatShortDate(p.createdAt) === filterDate
    );
    
    return (!searchTerm || matchesSearch) && (!filterDate || matchesDate);
  });

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const thisMonth = new Date().getMonth();
  const thisMonthPayments = payments.filter(p => new Date(p.createdAt).getMonth() === thisMonth);
  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lịch sử giao dịch</h1>
        <p className="text-gray-500 mt-1">Xem lại các giao dịch đã thực hiện</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <span className="text-sm font-medium opacity-90">Tổng chi tiêu</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-white/70 mt-1">{payments.length} giao dịch</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Chi tiêu tháng này</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(thisMonthTotal)}</p>
          <p className="text-xs text-gray-500 mt-1">{thisMonthPayments.length} giao dịch</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Thành công</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{payments.filter(p => p.status === 'success').length}</p>
          <p className="text-xs text-gray-500 mt-1">Tất cả giao dịch</p>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h3 className="font-semibold text-gray-900">Danh sách giao dịch</h3>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Mã giao dịch hoặc nội dung..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64"
                />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-40"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NGÀY GIAO DỊCH</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MÃ GIAO DỊCH</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SỐ TIỀN</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PHƯƠNG THỨC</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">TRẠNG THÁI</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-500">
                    Không có giao dịch nào
                  </td>
                </tr>
              ) : (
                paginatedPayments.map(payment => (
                  <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {formatShortDate(payment.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700 font-mono">
                        {payment.transactionId || payment._id?.slice(-8).toUpperCase()}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${getMethodColor(payment.method)}`}>
                        {getMethodIcon(payment.method)}
                        {getMethodLabel(payment.method)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700">
                        <CheckCircle size={14} />
                        Thành công
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toast.info('Đang tải hóa đơn...')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Tải hóa đơn"
                      >
                        <Download size={18} className="text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPayments.length)} của {filteredPayments.length} giao dịch
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} className="text-gray-500" />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-primary-500 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} className="text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
