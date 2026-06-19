import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/admin';
import { Search, Shield, Loader2, Plus, X, User } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ROLE_LABELS = {
  superadmin: 'Quản trị hệ thống',
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  cashier: 'Thu ngân',
  viewer: 'Người xem',
  family: 'Phụ huynh/Học sinh',
};

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Quản trị viên', description: 'Toàn quyền quản lý trung tâm' },
  { value: 'staff', label: 'Nhân viên', description: 'Quản lý học sinh, lớp học, học phí' },
  { value: 'cashier', label: 'Thu ngân', description: 'Thu chi, thanh toán' },
  { value: 'viewer', label: 'Người xem', description: 'Chỉ xem báo cáo' },
  { value: 'family', label: 'Phụ huynh/Học sinh', description: 'Truy cập cổng thông tin' },
];

export default function AdminUsers() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'staff',
  });

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setLoadingOrgs(true);
        const { data } = await adminService.getOrganizations({ limit: 100 });
        setOrganizations(data.organizations || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingOrgs(false);
      }
    };

    loadOrganizations();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      if (!selectedOrgId) {
        setUsers([]);
        return;
      }
      try {
        setLoadingUsers(true);
        const response = await adminService.getOrganizationUsers(selectedOrgId);
        setUsers(response.data || []);
      } catch (error) {
        console.error(error);
        toast.showError('Không tải được danh sách người dùng');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [selectedOrgId]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      return (
        user.name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        ROLE_LABELS[user.role]?.toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await adminService.createOrganizationUser(selectedOrgId, formData);
      toast.showSuccess('Tạo người dùng thành công');
      resetForm();
      // Reload users list
      const data = await adminService.getOrganizationUsers(selectedOrgId);
      setUsers(data.data || []);
    } catch (error) {
      toast.showError(error?.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'staff',
    });
    setShowForm(false);
  };

  const selectedOrg = organizations.find(org => org._id === selectedOrgId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
        <p className="text-gray-500 mt-1">Xem và quản lý người dùng theo từng trung tâm</p>
      </div>

      {/* Organization Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn trung tâm</label>
        <select
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          disabled={loadingOrgs}
          className="w-full md:w-96 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">-- Chọn trung tâm --</option>
          {organizations.map((org) => (
            <option key={org._id} value={org._id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {selectedOrgId && (
        <>
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tổng người dùng</p>
                  <p className="text-xl font-bold text-gray-900">{users.length}</p>
                </div>
              </div>
            </div>
            {Object.entries(ROLE_LABELS).map(([role, label]) => {
              const count = users.filter(u => u.role === role).length;
              if (count === 0) return null;
              return (
                <div key={role} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Shield size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-xl font-bold text-gray-900">{count}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add User Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              <Plus size={16} />
              Thêm người dùng
            </button>
          </div>

          {/* Create User Form Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 animate-fade-in">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <User size={20} className="text-primary-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Thêm người dùng mới</h2>
                  </div>
                  <button
                    onClick={resetForm}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Nhập họ và tên"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ít nhất 6 ký tự"
                      minLength={6}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="0xxx xxx xxx"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vai trò
                    </label>
                    <div className="space-y-2">
                      {ROLE_OPTIONS.map((role) => (
                        <label
                          key={role.value}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            formData.role === role.value
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={role.value}
                            checked={formData.role === role.value}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{role.label}</p>
                            <p className="text-xs text-gray-500">{role.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Tạo người dùng
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-900">Người dùng trong trung tâm</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                  {filteredUsers.length}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên, email, vai trò..."
                  className="w-full sm:w-80 pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {loadingUsers || loadingOrgs ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                {search ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có người dùng nào'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <div key={user._id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
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
                      {user.phone && <p className="text-xs text-gray-400 mt-0.5">{user.phone}</p>}
                    </div>
                    <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 whitespace-nowrap">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
