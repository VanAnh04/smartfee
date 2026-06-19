import { useState, useEffect } from 'react';
import { settingsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';
import {
  Building, Mail, Phone, MapPin, User, CreditCard, Lock, Shield,
  Check, Plus, Edit, Trash2, X, AlertCircle, Eye, EyeOff, Crown,
  Users, BookOpen, History, Zap, ArrowUp, Clock, AlertTriangle,
  QrCode, Smartphone, CreditCard as CreditCardIcon, Headphones, Globe, MessageCircle, ChevronDown, ChevronUp
} from 'lucide-react';

// Định nghĩa các gói dịch vụ - khớp với backend
const PLANS = {
  basic: {
    name: 'Basic',
    price: 0,
    priceDisplay: 'Miễn phí',
    color: 'gray',
    colorClass: 'bg-gray-500',
    borderClass: 'border-gray-300',
    icon: '📦',
    description: 'Dành cho các trung tâm nhỏ mới bắt đầu',
    features: [
      { text: '100 học sinh tối đa', included: true, icon: Users },
      { text: '4 lớp học', included: true, icon: BookOpen },
      { text: 'Báo cáo hàng tháng', included: true, icon: History },
      { text: 'Lịch sử 3 tháng', included: true, icon: Clock },
      { text: 'Nhắc nhở Gmail/SMS', included: false, icon: Zap },
      { text: 'QR code thanh toán', included: false, icon: Zap },
      { text: 'Ví điện tử', included: false, icon: Zap },
      { text: 'Analytics nâng cao', included: false, icon: Zap },
    ]
  },
  gold: {
    name: 'Gold',
    price: 299000,
    priceDisplay: '299.000đ',
    period: '/tháng',
    color: 'yellow',
    colorClass: 'bg-yellow-500',
    borderClass: 'border-yellow-500',
    icon: '🥇',
    description: 'Dành cho các trung tâm đang phát triển',
    features: [
      { text: '350 học sinh', included: true, icon: Users },
      { text: 'Không giới hạn lớp học', included: true, icon: BookOpen },
      { text: 'Báo cáo chi tiết', included: true, icon: History },
      { text: 'Lịch sử 1 năm', included: true, icon: Clock },
      { text: 'Nhắc nhở Gmail/SMS', included: true, icon: Zap },
      { text: 'QR tĩnh cho mỗi học sinh', included: true, icon: Zap },
      { text: 'Ví điện tử', included: false, icon: Zap },
      { text: 'Analytics nâng cao', included: false, icon: Zap },
    ]
  },
  premium: {
    name: 'Premium',
    price: 799000,
    priceDisplay: '799.000đ',
    period: '/tháng',
    color: 'purple',
    colorClass: 'bg-purple-500',
    borderClass: 'border-purple-500',
    icon: '💎',
    description: 'Giải pháp toàn diện cho trung tâm lớn',
    features: [
      { text: 'Không giới hạn học sinh', included: true, icon: Users },
      { text: 'Không giới hạn lớp học', included: true, icon: BookOpen },
      { text: 'Báo cáo chi tiết', included: true, icon: History },
      { text: 'Lịch sử vô thời hạn', included: true, icon: Clock },
      { text: 'Nhắc nhở tự động theo lịch', included: true, icon: Zap },
      { text: 'QR động (bảo mật cao)', included: true, icon: Zap },
      { text: 'Ví điện tử (nạp tiền trước)', included: true, icon: Zap },
      { text: 'Analytics nâng cao', included: true, icon: Zap },
    ]
  }
};

const PLAN_ORDER = { basic: 1, gold: 2, premium: 3 };

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  cashier: 'Thu ngân',
  viewer: 'Người xem',
  family_student: 'Học sinh',
  family_parent: 'Phụ huynh'
};

// Hàm lấy nhãn vai trò cho family accounts
const getFamilyRoleLabel = (member) => {
  if (member.role !== 'family') return ROLE_LABELS[member.role];
  // Ưu tiên kiểm tra familyType nếu có (từ backend)
  if (member.familyType === 'student') return 'Học sinh';
  if (member.familyType === 'parent') return 'Phụ huynh';
  // Fallback: kiểm tra studentId và childIds
  if (member.studentId) return 'Học sinh';
  if (member.childIds && member.childIds.length > 0) return 'Phụ huynh';
  return 'Phụ huynh';
};

// Hàm lấy màu cho role (cũng phân biệt học sinh/phụ huynh)
const getFamilyRoleColor = (member) => {
  if (member.familyType === 'student') return 'bg-teal-100 text-teal-700'; // Học sinh - màu teal
  if (member.familyType === 'parent') return 'bg-orange-100 text-orange-700'; // Phụ huynh - màu cam
  if (member.studentId) return 'bg-teal-100 text-teal-700'; // Học sinh - màu teal
  if (member.childIds && member.childIds.length > 0) return 'bg-orange-100 text-orange-700'; // Phụ huynh - màu cam
  return 'bg-orange-100 text-orange-700';
};

const ROLE_DESCRIPTIONS = {
  admin: 'Toàn quyền quản lý hệ thống',
  staff: 'Quản lý học sinh, lớp học và xem báo cáo',
  cashier: 'Chỉ thu tiền và ghi nhận thanh toán',
  viewer: 'Chỉ xem thông tin, không có quyền chỉnh sửa',
  family_student: 'Tài khoản của học sinh - xem thông tin cá nhân và học phí',
  family_parent: 'Tài khoản của phụ huynh - xem thông tin các con và thanh toán học phí'
};

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  staff: 'bg-blue-100 text-blue-700',
  cashier: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
  family: 'bg-orange-100 text-orange-700'
};

export default function Settings() {
  const { user, organization, setOrganization } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('organization');
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [orgData, setOrgData] = useState({
    name: '', address: '', phone: '', email: ''
  });

  // Plan state
  const [planUsage, setPlanUsage] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [upgradeMonths, setUpgradeMonths] = useState(1);
  const [upgrading, setUpgrading] = useState(false);

  // QR/PayOS state
  const [qrForm, setQrForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    qrImageUrl: '',
    momoNumber: '',
    momoQrUrl: '',
    vnpayQrUrl: '',
    instructions: '',
    isActive: true,
    payosClientId: '',
    payosApiKey: '',
    payosChecksumKey: ''
  });
  const [savingQr, setSavingQr] = useState(false);
  const [showQrDetails, setShowQrDetails] = useState({ payos: false });

  // Support Settings state
  const [supportForm, setSupportForm] = useState({
    hotline: '',
    email: '',
    zalo: '',
    website: '',
    address: '',
    workingHours: '8:00 - 17:00 (Thứ 2 - Thứ 6)',
    chatEnabled: true,
    faqs: []
  });
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);
  const [savingSupport, setSavingSupport] = useState(false);

  // Staff modal state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: '', email: '', password: '', phone: '', role: 'staff'
  });

  // Xử lý khi quay lại từ PayOS
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderCode = params.get('orderCode');

    console.log('Payment callback:', { paymentStatus, orderCode });

    if (paymentStatus === 'success' && orderCode) {
      toast.success('Thanh toán thành công! Đang xác nhận nâng cấp...');
      console.log('Calling confirm API with orderCode:', orderCode);

      // Gọi API confirm để xác nhận nâng cấp
      settingsService.confirmUpgrade(orderCode)
        .then(res => {
          console.log('Confirm success:', res.data);
          toast.success('Nâng cấp gói dịch vụ thành công!');
          if (res.data.organization) {
            setOrganization(res.data.organization);
          }
          fetchPlanUsage();
        })
        .catch(err => {
          console.error('Confirm error:', err);
          toast.error(err.response?.data?.error || 'Không thể xác nhận nâng cấp');
        })
        .finally(() => {
          window.history.replaceState({}, '', '/settings');
        });
    } else if (paymentStatus === 'cancelled') {
      toast.info('Đã hủy thanh toán');
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  useEffect(() => {
    if (organization) {
      setOrgData({
        name: organization.name || '',
        address: organization.address || '',
        phone: organization.phone || '',
        email: organization.email || ''
      });
    }
    if (activeTab === 'staff') {
      fetchStaff();
    }
    if (activeTab === 'plan') {
      fetchPlanUsage();
    }
    if (activeTab === 'qr') {
      fetchQrConfig();
    }
    if (activeTab === 'support') {
      fetchSupportSettings();
    }
  }, [activeTab, organization]);

  const fetchStaff = async () => {
    try {
      const res = await settingsService.getStaff();
      setStaff(res.data);
    } catch (error) {
      toast.error('Không thể tải danh sách người dùng');
    }
  };

  const fetchPlanUsage = async () => {
    try {
      const res = await settingsService.getUsage();
      setPlanUsage(res.data);
    } catch (error) {
      console.error('Error fetching plan usage:', error);
    }
  };

  const fetchQrConfig = async () => {
    try {
      const res = await settingsService.getQRConfig();
      const data = res.data;
      setQrForm({
        bankName: data.qrConfig?.bankName || '',
        accountNumber: data.qrConfig?.accountNumber || '',
        accountName: data.qrConfig?.accountName || '',
        qrImageUrl: data.qrConfig?.qrImageUrl || '',
        momoNumber: data.qrConfig?.momoNumber || '',
        momoQrUrl: data.qrConfig?.momoQrUrl || '',
        vnpayQrUrl: data.qrConfig?.vnpayQrUrl || '',
        instructions: data.qrConfig?.instructions || '',
        isActive: data.qrConfig?.isActive ?? true,
        payosClientId: data.payosConfig?.clientId || '',
        payosApiKey: data.payosConfig?.apiKey || '',
        payosChecksumKey: data.payosConfig?.checksumKey || ''
      });
    } catch (error) {
      console.error('Error fetching QR config:', error);
    }
  };

  const fetchSupportSettings = async () => {
    try {
      const res = await settingsService.getSupportSettings();
      const data = res.data?.supportSettings || {};
      setSupportForm({
        hotline: data.hotline || '',
        email: data.email || '',
        zalo: data.zalo || '',
        website: data.website || '',
        address: data.address || '',
        workingHours: data.workingHours || '8:00 - 17:00 (Thứ 2 - Thứ 6)',
        chatEnabled: data.chatEnabled ?? true,
        faqs: data.faqs || []
      });
    } catch (error) {
      console.error('Error fetching support settings:', error);
    }
  };

  const handleSaveSupportSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSupport(true);
      await settingsService.updateSupportSettings(supportForm);
      toast.success('Đã lưu cấu hình hỗ trợ');
      setOrganization({
        ...organization,
        supportSettings: supportForm
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể lưu cấu hình');
    } finally {
      setSavingSupport(false);
    }
  };

  const addFaq = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      toast.error('Vui lòng nhập đầy đủ câu hỏi và câu trả lời');
      return;
    }
    setSupportForm(f => ({
      ...f,
      faqs: [...f.faqs, { ...newFaq }]
    }));
    setNewFaq({ question: '', answer: '' });
  };

  const removeFaq = (index) => {
    setSupportForm(f => ({
      ...f,
      faqs: f.faqs.filter((_, i) => i !== index)
    }));
  };

  const handleSaveQrConfig = async (e) => {
    e.preventDefault();
    try {
      setSavingQr(true);
      await settingsService.updateQRConfig(qrForm);
      toast.success('Đã lưu cấu hình QR/PayOS');
      if (qrForm.payosClientId) {
        setOrganization({
          ...organization,
          payosConfig: {
            clientId: qrForm.payosClientId,
            apiKey: qrForm.payosApiKey,
            checksumKey: qrForm.payosChecksumKey
          }
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể lưu cấu hình');
    } finally {
      setSavingQr(false);
    }
  };

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await settingsService.update(orgData);
      setOrganization({ ...organization, ...orgData });
      toast.success('Cập nhật thông tin thành công');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await settingsService.updateStaff(editingStaff._id, staffForm);
        toast.success('Cập nhật người dùng thành công');
      } else {
        await settingsService.createStaff(staffForm);
        toast.success('Thêm người dùng thành công');
      }
      setShowStaffModal(false);
      setEditingStaff(null);
      setStaffForm({ name: '', email: '', password: '', phone: '', role: 'staff' });
      fetchStaff();
    } catch (error) {
      if (error.response?.data?.code === 'STAFF_LIMIT_REACHED') {
        toast.error('Bạn đã đạt giới hạn người dùng. Vui lòng nâng cấp gói dịch vụ.');
      } else {
        toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
      }
    }
  };

  const handleEditStaff = (member) => {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      email: member.email,
      password: '',
      phone: member.phone || '',
      role: member.role
    });
    setShowStaffModal(true);
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    try {
      await settingsService.deleteStaff(id);
      toast.success('Xóa người dùng thành công');
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể xóa người dùng');
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      setUpgrading(true);
      const res = await settingsService.upgradePlan(selectedPlan, upgradeMonths);

      if (res.data.paymentUrl) {
        // Có URL thanh toán PayOS - redirect đến trang thanh toán
        toast.success('Đang chuyển đến trang thanh toán PayOS...');
        setShowUpgradeModal(false);
        setTimeout(() => {
          window.location.href = res.data.paymentUrl;
        }, 500);
      } else {
        // Không có URL thanh toán (thanh toán thành công luôn - test mode)
        toast.success(`Nâng cấp lên ${PLANS[selectedPlan].name} thành công!`);
        setShowUpgradeModal(false);
        setSelectedPlan(null);

        if (res.data.organization) {
          setOrganization(res.data.organization);
        }
        fetchPlanUsage();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể nâng cấp gói dịch vụ');
    } finally {
      setUpgrading(false);
    }
  };

  const openUpgradeModal = (planKey) => {
    setSelectedPlan(planKey);
    setUpgradeMonths(1);
    setShowUpgradeModal(true);
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isCashier = user?.role === 'cashier';

  const tabs = [
    { id: 'organization', label: 'Thông tin trung tâm', icon: Building, roles: ['admin'] },
    { id: 'support', label: 'Cấu hình hỗ trợ', icon: Headphones, roles: ['admin'] },
    { id: 'staff', label: 'Người dùng', icon: User, roles: ['admin', 'staff'] },
    { id: 'qr', label: 'Cấu hình QR & PayOS', icon: QrCode, roles: ['admin', 'staff'] },
    { id: 'plan', label: 'Gói dịch vụ', icon: CreditCard, roles: ['admin'] }
  ].filter(tab => tab.roles.includes(user?.role));

  const currentPlan = organization?.plan || 'basic';
  const isUpgradeAvailable = (targetPlan) => PLAN_ORDER[targetPlan] > PLAN_ORDER[currentPlan];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-gray-500 mt-1">Quản lý thông tin và cấu hình</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex gap-6 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Organization Settings */}
          {activeTab === 'organization' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Thông tin trung tâm</h2>
                {!isAdmin && (
                  <span className="text-sm text-amber-600 flex items-center gap-1">
                    <Lock size={14} /> Chỉ quản trị viên mới có thể chỉnh sửa
                  </span>
                )}
              </div>
              <form onSubmit={handleUpdateOrg} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên trung tâm</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={orgData.name}
                      onChange={(e) => setOrgData(d => ({ ...d, name: e.target.value }))}
                      className="w-full pl-10 px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                      placeholder="Trung tâm ABC"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={orgData.address}
                      onChange={(e) => setOrgData(d => ({ ...d, address: e.target.value }))}
                      className="w-full pl-10 px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                      placeholder="123 Đường ABC, Quận XYZ"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={orgData.phone}
                        onChange={(e) => setOrgData(d => ({ ...d, phone: e.target.value }))}
                        className="w-full pl-10 px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="0123456789"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={orgData.email}
                        onChange={(e) => setOrgData(d => ({ ...d, email: e.target.value }))}
                        className="w-full pl-10 px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Staff Management */}
          {activeTab === 'staff' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Quản lý người dùng</h2>
                {planUsage && !planUsage.staff.unlimited && (
                  <span className={`text-sm ${planUsage.staff.percentage >= 80 ? 'text-amber-600' : 'text-gray-500'}`}>
                    Đã dùng: {planUsage.staff.current}/{planUsage.staff.max} người dùng
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Người dùng</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Vai trò</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Trạng thái</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staff.map(member => (
                      <tr key={member._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-600 text-sm font-medium">
                                {member.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.phone || 'Chưa có SĐT'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{member.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.role === 'family' ? getFamilyRoleColor(member) : ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-600'}`}>
                            {member.role === 'family' ? getFamilyRoleLabel(member) : ROLE_LABELS[member.role] || member.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {member.isActive ? 'Hoạt động' : 'Bị khóa'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditStaff(member)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-600"
                            >
                              <Edit size={16} />
                            </button>
                            {member._id !== user._id && (
                              <button
                                onClick={() => handleDeleteStaff(member._id)}
                                className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => {
                  setEditingStaff(null);
                  setStaffForm({ name: '', email: '', password: '', phone: '', role: 'staff' });
                  setShowStaffModal(true);
                }}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Plus size={18} />
                Thêm người dùng
              </button>
            </div>
          )}

          {/* Plan Settings */}
          {activeTab === 'plan' && (
            <div>
              {/* Current Plan Card */}
              <h2 className="text-lg font-semibold mb-4">Gói dịch vụ hiện tại</h2>
              
              <div className={`p-6 rounded-xl border-2 mb-6 ${PLANS[currentPlan]?.borderClass || 'border-gray-300'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${PLANS[currentPlan]?.colorClass} flex items-center justify-center text-2xl`}>
                      {PLANS[currentPlan]?.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${PLANS[currentPlan]?.colorClass} text-white`}>
                          {PLANS[currentPlan]?.name}
                        </span>
                        {currentPlan === 'basic' && (
                          <span className="text-sm text-gray-500">Miễn phí</span>
                        )}
                        {currentPlan !== 'basic' && planUsage?.planExpiresAt && (
                          <span className="text-sm text-gray-600">
                            Hết hạn: {new Date(planUsage.planExpiresAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{PLANS[currentPlan]?.description}</p>
                    </div>
                  </div>
                  
                  {currentPlan !== 'premium' && (
                    <button 
                      onClick={() => openUpgradeModal(currentPlan === 'basic' ? 'gold' : 'premium')}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                      <ArrowUp size={16} />
                      Nâng cấp
                    </button>
                  )}
                </div>

                {/* Usage Summary */}
                {planUsage && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Mức sử dụng</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Students */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Users size={16} /> Học sinh
                          </span>
                          <span className="text-sm font-medium">
                            {planUsage.students.current}
                            {!planUsage.students.unlimited && `/${planUsage.students.max}`}
                            {planUsage.students.unlimited && '/∞'}
                          </span>
                        </div>
                        {!planUsage.students.unlimited && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${planUsage.students.percentage >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(planUsage.students.percentage, 100)}%` }}
                            />
                          </div>
                        )}
                        {planUsage.students.unlimited && (
                          <p className="text-xs text-green-600 mt-1">Không giới hạn ✓</p>
                        )}
                        {planUsage.students.percentage >= 80 && !planUsage.students.unlimited && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                            <AlertTriangle size={12} />
                            <span>Sắp đạt giới hạn</span>
                          </div>
                        )}
                      </div>

                      {/* Classes */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <BookOpen size={16} /> Lớp học
                          </span>
                          <span className="text-sm font-medium">
                            {planUsage.classes.current}
                            {!planUsage.classes.unlimited && `/${planUsage.classes.max}`}
                            {planUsage.classes.unlimited && '/∞'}
                          </span>
                        </div>
                        {!planUsage.classes.unlimited && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${planUsage.classes.percentage >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(planUsage.classes.percentage, 100)}%` }}
                            />
                          </div>
                        )}
                        {planUsage.classes.unlimited && (
                          <p className="text-xs text-green-600 mt-1">Không giới hạn ✓</p>
                        )}
                      </div>

                      {/* Staff */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <User size={16} /> Người dùng
                          </span>
                          <span className="text-sm font-medium">
                            {planUsage.staff.current}
                            {!planUsage.staff.unlimited && `/${planUsage.staff.max}`}
                            {planUsage.staff.unlimited && '/∞'}
                          </span>
                        </div>
                        {!planUsage.staff.unlimited && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${planUsage.staff.percentage >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(planUsage.staff.percentage, 100)}%` }}
                            />
                          </div>
                        )}
                        {planUsage.staff.unlimited && (
                          <p className="text-xs text-green-600 mt-1">Không giới hạn ✓</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Compare Plans */}
              <h3 className="text-lg font-semibold mb-4">So sánh các gói dịch vụ</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(PLANS).map(([key, plan]) => {
                  const isCurrentPlan = key === currentPlan;
                  const canUpgrade = isUpgradeAvailable(key);
                  const isDowngrade = PLAN_ORDER[key] < PLAN_ORDER[currentPlan];
                  
                  return (
                    <div
                      key={key}
                      className={`border-2 rounded-xl p-6 transition-all ${
                        isCurrentPlan 
                          ? `${plan.borderClass} ring-2 ring-opacity-50 ${key === 'basic' ? 'ring-gray-300' : key === 'gold' ? 'ring-yellow-300' : 'ring-purple-300'}` 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${key === 'premium' && !isCurrentPlan ? 'relative' : ''}`}
                    >
                      {key === 'premium' && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                            <Crown size={12} /> Phổ biến
                          </span>
                        </div>
                      )}
                      
                      <div className="text-center mb-4">
                        <div className={`w-16 h-16 mx-auto rounded-xl ${plan.colorClass} flex items-center justify-center text-3xl mb-3`}>
                          {plan.icon}
                        </div>
                        <h4 className="font-bold text-lg">{plan.name}</h4>
                        <p className="text-2xl font-bold mt-1">
                          {plan.price === 0 ? 'Miễn phí' : plan.priceDisplay}
                          {plan.period && <span className="text-sm font-normal text-gray-500">{plan.period}</span>}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            {feature.included ? (
                              <Check size={16} className="text-green-500 flex-shrink-0" />
                            ) : (
                              <X size={16} className="text-gray-300 flex-shrink-0" />
                            )}
                            <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {isCurrentPlan ? (
                        <div className="text-center">
                          <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-lg font-medium">
                            Gói hiện tại
                          </span>
                        </div>
                      ) : canUpgrade ? (
                        <button 
                          onClick={() => openUpgradeModal(key)}
                          className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                        >
                          Nâng cấp lên {plan.name}
                        </button>
                      ) : isDowngrade ? (
                        <button 
                          disabled
                          className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                        >
                          Hạ cấp
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="max-w-3xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Cấu hình QR thanh toán & PayOS</h2>
                <span className="text-sm text-gray-500">
                  Gói hiện tại: <span className="font-semibold capitalize">{currentPlan}</span>
                </span>
              </div>

              <form onSubmit={handleSaveQrConfig} className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode size={18} className="text-primary-600" />
                    <h3 className="font-semibold text-gray-900">QR thanh toán cơ bản (Basic/Gold)</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Dùng cho gói Basic và Gold. Khách hàng quét mã QR để chuyển khoản thủ công.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                      <input
                        type="text"
                        value={qrForm.bankName}
                        onChange={(e) => setQrForm(d => ({ ...d, bankName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="VD: Vietcombank"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                      <input
                        type="text"
                        value={qrForm.accountNumber}
                        onChange={(e) => setQrForm(d => ({ ...d, accountNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="0123456789"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chủ tài khoản</label>
                      <input
                        type="text"
                        value={qrForm.accountName}
                        onChange={(e) => setQrForm(d => ({ ...d, accountName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="NGUYEN VAN A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại MoMo</label>
                      <input
                        type="text"
                        value={qrForm.momoNumber}
                        onChange={(e) => setQrForm(d => ({ ...d, momoNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="0901234567"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hướng dẫn chuyển khoản</label>
                      <textarea
                        value={qrForm.instructions}
                        onChange={(e) => setQrForm(d => ({ ...d, instructions: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        rows="2"
                        placeholder="Vui lòng chuyển khoản theo thông tin bên trên..."
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCardIcon size={18} className="text-green-600" />
                    <h3 className="font-semibold text-gray-900">PayOS (Gold/Premium)</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Kích hoạt thanh toán tự động. Khách hàng sẽ được chuyển đến trang PayOS của trung tâm.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                      <input
                        type="text"
                        value={qrForm.payosClientId}
                        onChange={(e) => setQrForm(d => ({ ...d, payosClientId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="Client ID từ PayOS"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                      <div className="relative">
                        <input
                          type={showQrDetails.payos ? 'text' : 'password'}
                          value={qrForm.payosApiKey}
                          onChange={(e) => setQrForm(d => ({ ...d, payosApiKey: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none pr-10"
                          placeholder="API Key"
                        />
                        <button
                          type="button"
                          onClick={() => setShowQrDetails(d => ({ ...d, payos: !d.payos }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showQrDetails.payos ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Checksum Key</label>
                      <div className="relative">
                        <input
                          type={showQrDetails.payos ? 'text' : 'password'}
                          value={qrForm.payosChecksumKey}
                          onChange={(e) => setQrForm(d => ({ ...d, payosChecksumKey: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none pr-10"
                          placeholder="Checksum Key"
                        />
                        <button
                          type="button"
                          onClick={() => setShowQrDetails(d => ({ ...d, payos: !d.payos }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showQrDetails.payos ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      Lưu ý: Thông tin PayOS được lưu riêng cho từng trung tâm. Tìm Client ID, API Key và Checksum Key trong tài khoản PayOS của bạn.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingQr}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {savingQr ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                  {qrForm.payosClientId && (
                    <span className="inline-flex items-center gap-1 text-sm text-green-600">
                      <Check size={16} /> PayOS đã được kích hoạt
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Support Settings */}
          {activeTab === 'support' && (
            <div className="max-w-2xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Cấu hình hỗ trợ</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Thông tin này sẽ hiển thị cho phụ huynh/học sinh khi họ cần liên hệ hoặc xem FAQ
                </p>
              </div>

              <form onSubmit={handleSaveSupportSettings} className="space-y-6">
                {/* Contact Info */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Phone size={18} className="text-primary-600" />
                    Thông tin liên hệ
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hotline</label>
                      <input
                        type="tel"
                        value={supportForm.hotline}
                        onChange={(e) => setSupportForm(f => ({ ...f, hotline: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="1900 1234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email hỗ trợ</label>
                      <input
                        type="email"
                        value={supportForm.email}
                        onChange={(e) => setSupportForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="hotro@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zalo</label>
                      <input
                        type="text"
                        value={supportForm.zalo}
                        onChange={(e) => setSupportForm(f => ({ ...f, zalo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="ID Zalo hoặc link"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={supportForm.website}
                        onChange={(e) => setSupportForm(f => ({ ...f, website: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                      <input
                        type="text"
                        value={supportForm.address}
                        onChange={(e) => setSupportForm(f => ({ ...f, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giờ làm việc</label>
                      <input
                        type="text"
                        value={supportForm.workingHours}
                        onChange={(e) => setSupportForm(f => ({ ...f, workingHours: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="8:00 - 17:00 (Thứ 2 - Thứ 6)"
                      />
                    </div>
                  </div>
                </div>

                {/* Chat Settings */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MessageCircle size={18} className="text-primary-600" />
                    Trò chuyện trực tuyến
                  </h3>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={supportForm.chatEnabled}
                      onChange={(e) => setSupportForm(f => ({ ...f, chatEnabled: e.target.checked }))}
                      className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Bật tính năng trò chuyện trực tuyến</span>
                  </label>
                  <p className="text-xs text-gray-500 -mt-2">
                    Khi bật, phụ huynh/học sinh có thể gửi tin nhắn hỗ trợ trực tiếp từ trang Hỗ trợ
                  </p>
                </div>

                {/* FAQ */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Headphones size={18} className="text-primary-600" />
                    Câu hỏi thường gặp (FAQ)
                  </h3>

                  {/* Add new FAQ */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-700">Thêm câu hỏi mới</p>
                    <input
                      type="text"
                      value={newFaq.question}
                      onChange={(e) => setNewFaq(f => ({ ...f, question: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                      placeholder="Câu hỏi..."
                    />
                    <textarea
                      value={newFaq.answer}
                      onChange={(e) => setNewFaq(f => ({ ...f, answer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                      rows="2"
                      placeholder="Câu trả lời..."
                    />
                    <button
                      type="button"
                      onClick={addFaq}
                      className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                    >
                      Thêm FAQ
                    </button>
                  </div>

                  {/* FAQ List */}
                  {supportForm.faqs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Danh sách FAQ ({supportForm.faqs.length})</p>
                      {supportForm.faqs.map((faq, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedFaqIndex(expandedFaqIndex === index ? null : index)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <span className="text-sm font-medium text-gray-900 text-left pr-4">{faq.question}</span>
                            {expandedFaqIndex === index ? (
                              <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
                            )}
                          </button>
                          {expandedFaqIndex === index && (
                            <div className="px-4 py-3 bg-white">
                              <p className="text-sm text-gray-600">{faq.answer}</p>
                              <button
                                type="button"
                                onClick={() => removeFaq(index)}
                                className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                              >
                                <Trash2 size={14} />
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingSupport}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {savingSupport ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingStaff ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
              </h2>
              <button onClick={() => setShowStaffModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên người dùng</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  placeholder="email@example.com"
                />
              </div>
              {!editingStaff && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                  <input
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                    placeholder="••••••••"
                    required={!editingStaff}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  placeholder="0123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                >
                  <option value="staff">Nhân viên - Quản lý học sinh, lớp học</option>
                  <option value="cashier">Thu ngân - Chỉ thu tiền</option>
                  <option value="admin">Quản trị viên - Toàn quyền</option>
                  <option value="viewer">Người xem - Chỉ xem thông tin</option>
                </select>
                {staffForm.role && ROLE_DESCRIPTIONS[staffForm.role] && (
                  <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[staffForm.role]}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingStaff ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ArrowUp className="text-primary-600" size={20} />
                Nâng cấp lên {PLANS[selectedPlan].name}
              </h2>
              <button onClick={() => setShowUpgradeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Plan Summary */}
              <div className={`p-4 rounded-xl border-2 ${PLANS[selectedPlan].borderClass} flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-lg ${PLANS[selectedPlan].colorClass} flex items-center justify-center text-2xl`}>
                  {PLANS[selectedPlan].icon}
                </div>
                <div>
                  <h3 className="font-semibold">{PLANS[selectedPlan].name}</h3>
                  <p className="text-lg font-bold">{PLANS[selectedPlan].priceDisplay}/tháng</p>
                </div>
              </div>

              {/* Thời hạn */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thời hạn đăng ký</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 3, 6].map(months => (
                    <button
                      key={months}
                      onClick={() => setUpgradeMonths(months)}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
                        upgradeMonths === months 
                          ? 'border-primary-500 bg-primary-50 text-primary-700' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold">{months} tháng</div>
                      <div className="text-sm text-gray-500">
                        {months === 1 && 'Giá gốc'}
                        {months === 3 && `-${Math.round((1 - 0.95) * 100)}%`}
                        {months === 6 && `-${Math.round((1 - 0.9) * 100)}%`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tổng tiền */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tổng tiền</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatCurrency(PLANS[selectedPlan].price * upgradeMonths * (upgradeMonths === 3 ? 0.95 : upgradeMonths === 6 ? 0.9 : 1))}
                  </span>
                </div>
                {upgradeMonths > 1 && (
                  <p className="text-sm text-green-600 mt-1 text-right">
                    Tiết kiệm {formatCurrency(PLANS[selectedPlan].price * upgradeMonths - PLANS[selectedPlan].price * upgradeMonths * (upgradeMonths === 3 ? 0.95 : upgradeMonths === 6 ? 0.9 : 1))}
                  </p>
                )}
              </div>

              {/* Lưu ý */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <AlertCircle size={16} className="inline mr-1" />
                  Sau khi nâng cấp, bạn sẽ được sử dụng ngay các tính năng của gói {PLANS[selectedPlan].name}.
                  Thanh toán sẽ được gia hạn tự động sau khi hết hạn.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
              >
                {upgrading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <ArrowUp size={16} />
                    Xác nhận nâng cấp
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
