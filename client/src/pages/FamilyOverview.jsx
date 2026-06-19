import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import {
  Wallet, CreditCard, Clock, CheckCircle, AlertCircle,
  ChevronRight, GraduationCap, BookOpen, Users,
  Receipt, ArrowRight, TrendingUp, FileText, Download,
  ChevronDown, UserPlus
} from 'lucide-react';

export default function FamilyOverview() {
  const { user, organization } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [showAllChildren, setShowAllChildren] = useState(false);
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const accountType = user?.childIds?.length > 0 ? 'parent' : 'student';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const storedStudent = localStorage.getItem('student');
      const storedChildren = localStorage.getItem('children');
      
      if (storedStudent) {
        setStudent(JSON.parse(storedStudent));
      }
      if (storedChildren) {
        const childrenData = JSON.parse(storedChildren);
        setChildren(childrenData);
        if (childrenData.length > 0 && !selectedChild) {
          setSelectedChild(childrenData[0]);
        }
      }
      
      const feesRes = await authService.getMyFees();
      setFees(feesRes.data.fees || []);
      setPayments(feesRes.data.payments || []);
      
      if (accountType === 'parent') {
        const childrenRes = await authService.getMyChildren();
        const childrenData = childrenRes.data.children || [];
        setChildren(childrenData);
        if (childrenData.length > 0 && !selectedChild) {
          setSelectedChild(childrenData[0]);
        }
      }
    } catch (error) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Tính toán tổng hợp cho TẤT CẢ con (khi là parent)
  const totalDebtAllChildren = fees
    .filter(f => f.status === 'unpaid' || f.status === 'partial')
    .reduce((sum, f) => sum + ((f.finalAmount || f.amount) - (f.paidAmount || 0)), 0);

  const totalPaidAllChildren = payments.reduce((sum, p) => sum + p.amount, 0);

  // Tính toán cho con đang được chọn
  const childFees = selectedChild 
    ? fees.filter(f => f.studentId === selectedChild._id || f.studentId?._id === selectedChild._id)
    : fees;

  const childDebt = childFees
    .filter(f => f.status === 'unpaid' || f.status === 'partial')
    .reduce((sum, f) => sum + ((f.finalAmount || f.amount) - (f.paidAmount || 0)), 0);

  const childPaid = selectedChild
    ? payments.filter(p => p.studentId === selectedChild._id || p.studentId?._id === selectedChild._id)
        .reduce((sum, p) => sum + p.amount, 0)
    : totalPaidAllChildren;

  const walletBalance = selectedChild 
    ? selectedChild.walletBalance || 0 
    : (student?.walletBalance || 0);

  const displayName = selectedChild?.name || user?.name || 'Học sinh';
  const displayCode = selectedChild?.studentCode || student?.studentCode || '';

  const unpaidFees = childFees.filter(f => f.status !== 'paid');
  const paidFees = childFees.filter(f => f.status === 'paid');

  // Tính tổng số dư ví của tất cả con
  const totalWalletBalance = children.reduce((sum, child) => sum + (child.walletBalance || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Xin chào, {user?.name}!</h1>
            <p className="text-white/80">
              {accountType === 'parent' 
                ? (children.length > 1 
                    ? `Theo dõi học phí của ${children.length} con` 
                    : 'Theo dõi học phí của các con')
                : 'Xem thông tin học phí của bạn'
              }
            </p>
          </div>
          {displayCode && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
              <p className="text-xs text-white/70">Mã học sinh</p>
              <p className="font-semibold">{displayCode}</p>
            </div>
          )}
        </div>
      </div>

      {/* Student Selector - CHỈ HIỂN THỊ KHI CÓ NHIỀU HƠN 1 CON */}
      {accountType === 'parent' && children.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600">
                Đang xem: <span className="text-primary-600">{selectedChild?.name}</span>
              </span>
              <span className="text-xs text-gray-400">({children.indexOf(selectedChild) + 1}/{children.length})</span>
            </div>
          </div>
          
          {/* Horizontal Scrollable Children List */}
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-3 min-w-max">
              {children.map((child, index) => {
                const childFeesData = fees.filter(f => 
                  f.studentId === child._id || f.studentId?._id === child._id
                );
                const childDebtData = childFeesData
                  .filter(f => f.status !== 'paid')
                  .reduce((sum, f) => sum + (f.amount - (f.paidAmount || 0)), 0);
                const isSelected = selectedChild?._id === child._id;
                
                return (
                  <button
                    key={child._id}
                    onClick={() => setSelectedChild(child)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-primary-500 bg-primary-50 shadow-md' 
                        : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      isSelected 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {child.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                        {child.name}
                      </p>
                      <p className="text-xs text-gray-500">{child.studentCode}</p>
                      {childDebtData > 0 && (
                        <p className="text-xs text-red-500 font-medium mt-1">
                          Nợ: {formatCurrency(childDebtData)}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle size={18} className="text-primary-500 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Quick Summary All Children */}
          <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Tổng nợ ({children.length} con):
                </span>
              </div>
              <span className="text-lg font-bold text-red-600">{formatCurrency(totalDebtAllChildren)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Student Info Card - CHO TRƯỜNG HỢP 1 CON HOẶC ĐÃ CHỌN 1 CON */}
      {(accountType !== 'parent' || children.length === 1 || selectedChild) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-600">
                    {displayName?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{displayName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {displayCode && (
                      <span className="flex items-center gap-1">
                        <GraduationCap size={14} /> {displayCode}
                      </span>
                    )}
                    {accountType === 'parent' && selectedChild?.classIds?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={14} />
                        {selectedChild.classIds.map((c) => c.name || 'Lớp').join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {accountType === 'parent' && children.length > 1 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Con thứ</p>
                  <p className="text-lg font-bold text-primary-600">
                    {children.findIndex(c => c._id === selectedChild?._id) + 1} / {children.length}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            <div className="p-5 text-center">
              <p className="text-sm text-gray-500 mb-1">Tổng học phí</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(childFees.reduce((sum, f) => sum + (f.finalAmount || f.amount), 0))}</p>
            </div>
            <div className="p-5 text-center bg-red-50/50">
              <p className="text-sm text-red-600 mb-1">Cần đóng</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(childDebt)}</p>
            </div>
            <div className="p-5 text-center bg-green-50/50">
              <p className="text-sm text-green-600 mb-1">Đã đóng</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(childPaid)}</p>
            </div>
            <div className="p-5 text-center">
              <p className="text-sm text-gray-500 mb-1">Số dư ví</p>
              <p className="text-xl font-bold text-primary-600">{formatCurrency(walletBalance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng nợ TẤT CẢ con - CHỈ HIỂN THỊ KHI CÓ NHIỀU HƠN 1 CON */}
        {accountType === 'parent' && children.length > 1 && (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-5 shadow-sm border border-red-100 md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <AlertCircle size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Tổng nợ tất cả con</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebtAllChildren)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
                {children.map(child => {
                const childDebtData = fees
                  .filter(f => (f.studentId === child._id || f.studentId?._id === child._id) && f.status !== 'paid')
                  .reduce((sum, f) => sum + ((f.finalAmount || f.amount) - (f.paidAmount || 0)), 0);
                return (
                  <span key={child._id} className="px-3 py-1 bg-white rounded-full text-xs font-medium text-red-600 border border-red-200">
                    {child.name}: {formatCurrency(childDebtData)}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Card "Chưa đóng" - ẨN KHI CÓ NHIỀU CON (vì đã hiển thị ở trên) */}
        {!(accountType === 'parent' && children.length > 1) && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Chưa đóng</p>
                <p className="text-lg font-bold text-red-600">{unpaidFees.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">{formatCurrency(unpaidFees.reduce((sum, f) => sum + ((f.finalAmount || f.amount) - (f.paidAmount || 0)), 0))}</p>
          </div>
        )}

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đã đóng</p>
              <p className="text-lg font-bold text-green-600">{paidFees.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{formatCurrency(paidFees.reduce((sum, f) => sum + (f.finalAmount || f.amount), 0))}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Receipt size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng khoản phí</p>
              <p className="text-lg font-bold text-blue-600">{childFees.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Học phí & phí dịch vụ</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Wallet size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ví</p>
              <p className="text-lg font-bold text-purple-600">{formatCurrency(walletBalance)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Số dư khả dụng</p>
        </div>
      </div>

      {/* Recent Fees & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Fees */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Receipt size={18} className="text-gray-400" />
              Khoản phí gần đây
            </h3>
            <button 
              onClick={() => navigate('/dashboard/parent/student/fees')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              Xem tất cả <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="divide-y divide-gray-100">
            {childFees.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Chưa có khoản phí nào</p>
              </div>
            ) : (
              childFees.slice(0, 5).map(fee => {
                // Tìm tên con cho khoản phí này (khi có nhiều con)
                const feeStudent = children.find(c => 
                  c._id === fee.studentId || c._id === fee.studentId?._id
                );
                return (
                <div key={fee._id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      fee.status === 'paid' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {fee.status === 'paid' 
                        ? <CheckCircle size={20} className="text-green-600" />
                        : <AlertCircle size={20} className="text-red-600" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {fee.feePeriodId?.name || 'Học phí'}
                        </p>
                        {/* Hiển thị tên con khi có nhiều hơn 1 con */}
                        {accountType === 'parent' && children.length > 1 && feeStudent && (
                          <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-xs rounded-full font-medium">
                            {feeStudent.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{fee.classId?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(fee.amount)}</p>
                    <span className={`text-sm font-medium ${
                      fee.status === 'paid' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {fee.status === 'paid' ? 'Đã đóng' : 'Chưa đóng'}
                    </span>
                  </div>
                </div>
              )})
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Thao tác nhanh</h3>
          </div>
          <div className="p-4 space-y-3">
            {/* Chỉ hiển thị khi có nhiều con */}
            {accountType === 'parent' && children.length > 1 && (
              <button
                onClick={() => navigate('/dashboard/parent/student/fees')}
                className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-purple-700">Xem tất cả con</p>
                  <p className="text-xs text-purple-600">{children.length} con • Tổng nợ: {formatCurrency(totalDebtAllChildren)}</p>
                </div>
                <ChevronRight size={20} className="text-purple-400" />
              </button>
            )}

            <button
              onClick={() => navigate('/dashboard/parent/student/fees')}
              className="w-full flex items-center gap-4 p-4 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <CreditCard size={20} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-primary-700">
                  {selectedChild ? `Thanh toán cho ${selectedChild.name}` : 'Thanh toán học phí'}
                </p>
                <p className="text-xs text-primary-600">Xem và thanh toán các khoản phí</p>
              </div>
              <ChevronRight size={20} className="text-primary-400 ml-auto" />
            </button>

            <button
              onClick={() => navigate('/dashboard/parent/student/history')}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-gray-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-700">Lịch sử giao dịch</p>
                <p className="text-xs text-gray-500">Xem các giao dịch đã thực hiện</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 ml-auto" />
            </button>

            <button
              onClick={() => toast.info('Tính năng đang phát triển')}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Download size={20} className="text-gray-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-700">Xuất hóa đơn</p>
                <p className="text-xs text-gray-500">Tải về file PDF</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
