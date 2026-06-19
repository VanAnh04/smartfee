import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { 
  ArrowLeft, Building2, Users, GraduationCap, Receipt, 
  CreditCard, Calendar, MapPin, Phone, Mail, Edit2, 
  Loader2, Save, X 
} from 'lucide-react';
import { adminService } from '../../services/admin';

const PLANS = {
  basic: { label: 'Basic', color: 'bg-gray-100 text-gray-700' },
  gold: { label: 'Gold', color: 'bg-yellow-100 text-yellow-700' },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-700' },
};

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  cashier: 'Thu ngân',
  viewer: 'Người xem',
  family: 'Phụ huynh/Học sinh',
};

export default function AdminOrganizationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [organization, setOrganization] = useState(null);
  const [users, setUsers] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    isActive: true,
    plan: 'basic',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgRes, usersRes] = await Promise.all([
        adminService.getOrganization(id),
        adminService.getOrganizationUsers(id),
      ]);
      
      const orgData = orgRes.data;
      setOrganization(orgData.organization);
      setUsage(orgData.usage);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setFormData({
        name: orgData.organization?.name || '',
        address: orgData.organization?.address || '',
        phone: orgData.organization?.phone || '',
        email: orgData.organization?.email || '',
        isActive: orgData.organization?.isActive ?? true,
        plan: orgData.organization?.plan || 'basic',
      });
    } catch (error) {
      console.error('Load data error:', error);
      toast.showError('Không tải được thông tin trung tâm');
      navigate('/admin/organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await adminService.updateOrganization(id, formData);
      toast.showSuccess('Cập nhật trung tâm thành công');
      setEditing(false);
      loadData();
    } catch (error) {
      toast.showError(error?.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        address: organization.address || '',
        phone: organization.phone || '',
        email: organization.email || '',
        isActive: organization.isActive ?? true,
        plan: organization.plan || 'basic',
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!organization) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/organizations')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-gray-500 mt-1">Chi tiết trung tâm</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Edit2 size={16} />
            Chỉnh sửa
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-900">Thông tin cơ bản</h2>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <X size={14} />
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Lưu
                </button>
              </div>
            )}
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên trung tâm
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-900">{organization.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gói dịch vụ
                </label>
                {editing ? (
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="gold">Gold</option>
                    <option value="premium">Premium</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-medium ${PLANS[organization.plan]?.color || PLANS.basic.color}`}>
                    {PLANS[organization.plan]?.label || 'Basic'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    Địa chỉ
                  </span>
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Nhập địa chỉ trung tâm"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <div className="group relative">
                    <p className={`px-4 py-2 rounded-lg text-sm pr-10 ${organization.address ? 'bg-gray-50 text-gray-900' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                      {organization.address || '🔴 Chưa cập nhật - Click để thêm'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <Phone size={14} />
                    Số điện thoại
                  </span>
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <div className="group relative">
                    <p className={`px-4 py-2 rounded-lg text-sm pr-10 ${organization.phone ? 'bg-gray-50 text-gray-900' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                      {organization.phone || '🔴 Chưa cập nhật - Click để thêm'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <Mail size={14} />
                    Email
                  </span>
                </label>
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <div className="group relative">
                    <p className={`px-4 py-2 rounded-lg text-sm pr-10 ${organization.email ? 'bg-gray-50 text-gray-900' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                      {organization.email || '🔴 Chưa cập nhật - Click để thêm'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trạng thái
                </label>
                {editing ? (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    <span className="ml-3 text-sm text-gray-700">
                      {formData.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                    </span>
                  </label>
                ) : (
                  <span className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-medium ${
                    organization.isActive 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {organization.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Ngày tạo
                  </span>
                </label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-900">
                  {organization.createdAt ? new Date(organization.createdAt).toLocaleDateString('vi-VN') : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Usage Stats */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Nhân viên</p>
                <p className="text-lg font-bold text-gray-900">
                  {usage.staff?.current || 0}
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    / {usage.staff?.unlimited ? '∞' : usage.staff?.max}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <GraduationCap size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Học sinh</p>
                <p className="text-lg font-bold text-gray-900">
                  {usage.students?.current || 0}
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    / {usage.students?.unlimited ? '∞' : usage.students?.max}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Receipt size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Lớp học</p>
                <p className="text-lg font-bold text-gray-900">
                  {usage.classes?.current || 0}
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    / {usage.classes?.unlimited ? '∞' : usage.classes?.max}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <CreditCard size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Gói dịch vụ</p>
                <p className="text-lg font-bold text-gray-900">{usage.plan?.name || 'Basic'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Người dùng trong trung tâm</h2>
            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
              {users.length}
            </span>
          </div>
        </div>
        
        {users.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Chưa có người dùng nào trong trung tâm
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((user) => (
              <div key={user._id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {user.isActive ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{user.email}</p>
                </div>
                <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 whitespace-nowrap">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
