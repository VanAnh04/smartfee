import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService, paymentService } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import {
  CreditCard, CheckCircle, AlertCircle, FileText, ChevronDown,
  Building2, Smartphone, CreditCardIcon, Download, Search, Filter,
  X, QrCode, Upload, Clock, CheckCircle2, XCircle, Copy,
  ExternalLink, RefreshCw
} from 'lucide-react';

export default function FamilyFees() {
  const { user, organization } = useAuth();
  const toast = useToast();
  
  const [fees, setFees] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [lastPaymentId, setLastPaymentId] = useState(null);

  const accountType = user?.childIds?.length > 0 ? 'parent' : 'student';
  const plan = organization?.plan || 'basic';
  const isGoldOrPremium = ['gold', 'premium'].includes(plan);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const storedChildren = localStorage.getItem('children');
      if (storedChildren) {
        const childrenData = JSON.parse(storedChildren);
        setChildren(childrenData);
        if (childrenData.length > 0) {
          setSelectedChild(childrenData[0]);
        }
      }
      
      const feesRes = await authService.getMyFees();
      setFees(feesRes.data.fees || []);
      
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

  const displayName = selectedChild?.name || user?.name || 'Học sinh';

  const childFees = selectedChild 
    ? fees.filter(f => f.studentId === selectedChild._id || f.studentId?._id === selectedChild._id)
    : fees;

  const filteredFees = childFees.filter(fee => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      fee.feePeriodId?.name?.toLowerCase().includes(search) ||
      fee.classId?.name?.toLowerCase().includes(search)
    );
  });

  const unpaidFees = filteredFees.filter(f => f.status !== 'paid');
  const paidFees = filteredFees.filter(f => f.status === 'paid');
  const totalDebt = unpaidFees.reduce((sum, f) => sum + ((f.finalAmount || f.amount) - (f.paidAmount || 0)), 0);

  const openPaymentModal = async (fee) => {
    setSelectedFee(fee);
    setShowPaymentModal(true);
    setPaymentStatus('pending');
    setQrData(null);
    setUploadedImage(null);
    
    await generateQR(fee);
  };

  const generateQR = async (fee) => {
    setQrLoading(true);
    try {
      const student = selectedChild || childFees.find(f => f._id === fee._id)?.studentId;
      const amount = (fee.finalAmount || fee.amount) - (fee.paidAmount || 0);
      
      const response = await paymentService.createQRCode({
        studentId: student?._id || student,
        amount,
        description: fee.feePeriodId?.name || 'Thanh toán học phí',
        paymentMethod: 'banking'
      });

      if (response.data.type === 'dynamic') {
        setQrData({
          type: 'dynamic',
          paymentUrl: response.data.paymentUrl,
          orderCode: response.data.orderCode,
          amount: response.data.amount
        });
        setPaymentStatus('waiting');
        startPolling(response.data.orderCode);
      } else {
        setQrData(response.data);
        setPaymentStatus('waiting');
      }
    } catch (error) {
      toast.error('Không thể tạo mã QR');
      console.error(error);
    } finally {
      setQrLoading(false);
    }
  };

  const startPolling = (orderCode) => {
    const interval = setInterval(async () => {
      try {
        // Check payment status by re-fetching fees
        const feesRes = await authService.getMyFees();
        setFees(feesRes.data.fees || []);
        
        const updatedFee = feesRes.data.fees.find(f => f._id === selectedFee._id);
        if (updatedFee?.status === 'paid') {
          setPaymentStatus('success');
          clearInterval(interval);
          setPollingInterval(null);
          toast.success('Thanh toán thành công!');
          setTimeout(() => {
            setShowPaymentModal(false);
          }, 2000);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    setPollingInterval(interval);

    setTimeout(() => {
      clearInterval(interval);
      setPollingInterval(null);
    }, 300000);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const res = await paymentService.uploadReceipt(file);
      setUploadedImage(res.data.file.url);
    } catch (error) {
      toast.error('Không thể upload ảnh. Vui lòng thử lại');
      console.error(error);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const submitManualPayment = async () => {
    if (!uploadedImage && !isGoldOrPremium) {
      toast.error('Vui lòng upload ảnh chuyển khoản');
      return;
    }

    try {
      const res = await paymentService.confirmManual({
        studentId: selectedChild?._id || selectedFee?.studentId,
        feeId: selectedFee?._id,
        amount: (selectedFee?.finalAmount || selectedFee?.amount) - (selectedFee?.paidAmount || 0),
        paymentMethod: 'banking',
        notes: uploadedImage ? 'Đã upload ảnh chuyển khoản' : 'QR tự động',
        receiptUrl: uploadedImage || null
      });

      setLastPaymentId(res.data._id);
      setPaymentStatus('success');
      toast.success('Đã gửi yêu cầu xác nhận thanh toán');
    } catch (error) {
      toast.error('Không thể gửi yêu cầu thanh toán');
      console.error(error);
    }
  };

  const handleDownloadInvoice = () => {
    if (!lastPaymentId) return;
    const url = paymentService.getInvoiceUrl(lastPaymentId);
    window.open(url, '_blank');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép');
  };

  const getPlanBadge = () => {
    const badges = {
      basic: { text: 'Basic', class: 'bg-gray-100 text-gray-700' },
      gold: { text: 'Gold', class: 'bg-yellow-100 text-yellow-700' },
      premium: { text: 'Premium', class: 'bg-purple-100 text-purple-700' }
    };
    return badges[plan] || badges.basic;
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Thông tin học phí chi tiết</h1>
        <p className="text-gray-500 mt-1">Xem và thanh toán các khoản phí</p>
      </div>

      {/* Plan Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-50 border border-gray-200">
        <span>Gói hiện tại:</span>
        <span className={`px-3 py-1 rounded-full ${getPlanBadge().class}`}>
          {getPlanBadge().text}
        </span>
        {isGoldOrPremium && (
          <span className="text-green-600 text-xs">✓ Thanh toán tự động</span>
        )}
      </div>

      {/* Notice Banner */}
      <div className={`rounded-xl p-4 flex items-start gap-3 ${
        isGoldOrPremium 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-amber-50 border border-amber-200'
      }`}>
        {isGoldOrPremium ? (
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <p className={`font-medium ${isGoldOrPremium ? 'text-green-800' : 'text-amber-800'}`}>
            {isGoldOrPremium 
              ? 'Thanh toán tự động qua PayOS' 
              : 'Thanh toán thủ công - Vui lòng kiểm tra lại sau khi chuyển khoản'}
          </p>
          <p className={`text-sm mt-1 ${isGoldOrPremium ? 'text-green-700' : 'text-amber-700'}`}>
            {isGoldOrPremium
              ? 'Hệ thống sẽ tự động cập nhật trạng thái khi nhận được tiền'
              : 'Sau khi chuyển khoản, vui lòng upload ảnh biên lai để chúng tôi xác nhận nhanh nhất có thể!'}
          </p>
          <p className={`text-xs mt-2 ${isGoldOrPremium ? 'text-green-600' : 'text-amber-600'}`}>
            💡 Đây là học phí thanh toán cho <strong>{organization?.name || 'Trung tâm'}</strong>
          </p>
        </div>
      </div>

      {/* Student Selector */}
      {accountType === 'parent' && children.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">Học sinh:</span>
            <div className="relative">
              <select
                value={selectedChild?._id || ''}
                onChange={(e) => {
                  const child = children.find(c => c._id === e.target.value);
                  setSelectedChild(child);
                }}
                className="appearance-none bg-primary-50 border border-primary-200 rounded-lg px-4 py-2 pr-10 text-sm font-semibold text-primary-700 cursor-pointer focus:ring-2 focus:ring-primary-500"
              >
                {children.map(child => (
                  <option key={child._id} value={child._id}>{child.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Fee Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="font-semibold text-gray-900">Danh sách khoản phí</h3>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm khoản phí..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">TÊN KHOẢN PHÍ</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SỐ TIỀN</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">HẠN THANH TOÁN</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">TRẠNG THÁI</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-gray-500">
                    Không có khoản phí nào
                  </td>
                </tr>
              ) : (
                filteredFees.map(fee => (
                  <tr key={fee._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {fee.feePeriodId?.name || 'Học phí'}
                        </p>
                        <p className="text-sm text-gray-500">{fee.classId?.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{formatCurrency(fee.finalAmount || fee.amount)}</p>
                      {fee.paidAmount > 0 && fee.status !== 'paid' && (
                        <p className="text-xs text-gray-500">
                          Đã đóng: {formatCurrency(fee.paidAmount)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-700">
                        {fee.dueDate 
                          ? new Date(fee.dueDate).toLocaleDateString('vi-VN')
                          : 'Không có'
                        }
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {fee.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                          <CheckCircle size={14} />
                          Đã đóng
                        </span>
                      ) : fee.status === 'partial' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                          <Clock size={14} />
                          Đóng một phần
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                          <AlertCircle size={14} />
                          Chưa đóng
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {fee.status !== 'paid' ? (
                          <button
                            onClick={() => openPaymentModal(fee)}
                            className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
                          >
                            Thanh toán
                          </button>
                        ) : (
                          <button
                            onClick={() => toast.info('Đang tải hóa đơn...')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                          >
                            <FileText size={14} />
                            Hóa đơn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Debt Summary */}
      {totalDebt > 0 && (
        <div className={`rounded-xl p-6 border ${
          isGoldOrPremium
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100'
            : 'bg-gradient-to-r from-red-50 to-amber-50 border-red-100'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className={isGoldOrPremium ? 'text-green-600' : 'text-gray-600'}>Tổng phí cần đóng:</p>
              <p className={`text-3xl font-bold ${isGoldOrPremium ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalDebt)}
              </p>
            </div>
            <button
              onClick={() => {
                if (unpaidFees.length > 0) {
                  openPaymentModal(unpaidFees[0]);
                }
              }}
              className={`px-6 py-3 text-white font-semibold rounded-xl transition-colors shadow-lg ${
                isGoldOrPremium
                  ? 'bg-green-500 hover:bg-green-600 shadow-green-500/30'
                  : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/30'
              }`}
            >
              Thanh toán ngay
            </button>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      {!isGoldOrPremium && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Phương thức thanh toán</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Chuyển khoản ngân hàng</p>
                  <p className="text-xs text-gray-500">Vietcombank, Techcombank...</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <Smartphone size={24} className="text-pink-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Ví điện tử</p>
                  <p className="text-xs text-gray-500">Momo, ZaloPay</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CreditCardIcon size={24} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Thẻ Visa/Mastercard</p>
                  <p className="text-xs text-gray-500">Thanh toán quốc tế</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Thanh toán học phí</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    if (pollingInterval) clearInterval(pollingInterval);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {paymentStatus === 'pending' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Đang tạo mã QR...</p>
                </div>
              )}

              {paymentStatus === 'waiting' && qrData && (
                <div className="space-y-6">
                  {/* Amount */}
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Số tiền cần thanh toán</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(qrData.amount || selectedFee?.finalAmount || selectedFee?.amount)}
                    </p>
                  </div>

                  {qrData.type === 'dynamic' ? (
                    /* Dynamic QR - PayOS */
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 size={20} className="text-green-600" />
                          <p className="font-medium text-green-800">Thanh toán tự động</p>
                        </div>
                        <p className="text-sm text-green-700">
                          Quét QR hoặc click nút bên dưới để thanh toán qua PayOS
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center">
                        {qrData.paymentUrl && (
                          <div className="w-64 h-64 bg-white rounded-lg shadow-sm mb-4 flex items-center justify-center">
                            <QrCode size={200} className="text-gray-800" />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mb-4">
                          Mã đơn: {qrData.orderCode}
                        </p>
                      </div>

                      <button
                        onClick={() => window.open(qrData.paymentUrl, '_blank')}
                        className="w-full py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={18} />
                        Thanh toán ngay
                      </button>

                      <div className="text-center">
                        <p className="text-xs text-gray-500">
                          Hệ thống sẽ tự động cập nhật sau khi thanh toán thành công
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Static QR - Manual */
                    <div className="space-y-4">
                      {qrData.qrImageUrl && (
                        <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center">
                          <img 
                            src={qrData.qrImageUrl} 
                            alt="QR Code" 
                            className="w-64 h-64 object-contain rounded-lg"
                          />
                        </div>
                      )}

                      {qrData.qrConfig && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                          <p className="font-medium text-blue-800 flex items-center gap-2">
                            <Building2 size={16} />
                            Thông tin chuyển khoản cho {organization?.name || 'Trung tâm'}:
                          </p>
                          {qrData.qrConfig.bankName && (
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700">Ngân hàng:</span>
                              <span className="font-medium text-blue-900">{qrData.qrConfig.bankName}</span>
                            </div>
                          )}
                          {qrData.qrConfig.accountNumber && (
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700">Số tài khoản:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-blue-900">{qrData.qrConfig.accountNumber}</span>
                                <button
                                  onClick={() => copyToClipboard(qrData.qrConfig.accountNumber)}
                                  className="p-1 hover:bg-blue-100 rounded"
                                >
                                  <Copy size={14} className="text-blue-600" />
                                </button>
                              </div>
                            </div>
                          )}
                          {qrData.qrConfig.accountName && (
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700">Chủ tài khoản:</span>
                              <span className="font-medium text-blue-900">{qrData.qrConfig.accountName}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Số tiền:</span>
                            <span className="font-bold text-blue-900">
                              {formatCurrency(qrData.amount || selectedFee?.finalAmount || selectedFee?.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Nội dung:</span>
                            <span className="font-medium text-blue-900">
                              HP {selectedChild?.studentCode || ''} {selectedChild?.name || ''}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Upload image */}
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <div className="text-center">
                            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm font-medium text-gray-700">
                              {uploadedImage ? 'Đã chọn ảnh' : 'Upload ảnh chuyển khoản'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG up to 5MB
                            </p>
                          </div>
                        </label>
                        {uploadedImage && (
                          <img 
                            src={uploadedImage} 
                            alt="Uploaded receipt" 
                            className="mt-4 w-full rounded-lg"
                          />
                        )}
                      </div>

                      <button
                        onClick={submitManualPayment}
                        disabled={!uploadedImage}
                        className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Xác nhận đã chuyển khoản
                      </button>
                    </div>
                  )}
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={48} className="text-green-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h4>
                  <p className="text-gray-600">
                    Cảm ơn bạn đã thanh toán. Hệ thống sẽ cập nhật trạng thái ngay.
                  </p>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle size={48} className="text-red-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Thanh toán thất bại</h4>
                  <p className="text-gray-600 mb-4">
                    Vui lòng thử lại hoặc liên hệ hỗ trợ
                  </p>
                  <button
                    onClick={() => {
                      setPaymentStatus('waiting');
                      generateQR(selectedFee);
                    }}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
