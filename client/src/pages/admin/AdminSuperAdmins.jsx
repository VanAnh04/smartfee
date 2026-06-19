import { useEffect, useState, useMemo } from 'react';
import { adminService } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import {
  Shield,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  UserCheck,
  UserX,
  ChevronDown
} from 'lucide-react';

export default function AdminSuperAdmins() {
  const [superadmins, setSuperadmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    isActive: true
  });

  const loadSuperAdmins = async () => {
    try {
      setLoading(true);
      const { data } = await adminService.getSuperAdmins();
      setSuperadmins(data.superadmins || []);
    } catch (error) {
      console.error(error);
      toast.showError('Không thể tải danh sách quản trị hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuperAdmins();
  }, []);

  const stats = useMemo(() => {
    const total = superadmins.length;
    const active = superadmins.filter((u) => u.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [superadmins]);

  const filteredSuperadmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return superadmins;
    return superadmins.filter((u) => {
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    });
  }, [superadmins, search]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      isActive: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (user) => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      isActive: user.isActive
    });
    setEditingId(user._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        // Update existing
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;

        await adminService.updateSuperAdmin(editingId, updateData);
        toast.showSuccess('Cập nhật quản trị hệ thống thành công');
      } else {
        // Create new
        if (!formData.password) {
          toast.showError('Vui lòng nhập mật khẩu');
          setSubmitting(false);
          return;
        }

        await adminService.createSuperAdmin(formData);
        toast.showSuccess('Tạo quản trị hệ thống thành công');
      }

      resetForm();
      await loadSuperAdmins();
    } catch (error) {
      console.error(error);
      toast.showError(error?.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa quản trị hệ thống này?')) return;

    try {
      await adminService.deleteSuperAdmin(id);
      toast.showSuccess('Xóa quản trị hệ thống thành công');
      await loadSuperAdmins();
    } catch (error) {
      console.error(error);
      toast.showError(error?.response?.data?.error || 'Không thể xóa quản trị hệ thống');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await adminService.updateSuperAdmin(user._id, { isActive: !user.isActive });
      toast.showSuccess(user.isActive ? 'Đã vô hiệu hóa' : 'Đã kích hoạt');
      await loadSuperAdmins();
    } catch (error) {
      console.error(error);
      toast.showError('Không thể cập nhật trạng thái');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản trị hệ thống</h1>
          <p className="text-gray-500 mt-1">Danh sách và quản lý các quản trị hệ thống</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <Plus size={16} />
          Thêm quản trị
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Tổng quản trị</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Đang hoạt động</p>
          <p className="text-xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Đã vô hiệu hóa</p>
          <p className="text-xl font-bold text-red-600">{stats.inactive}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                {editingId ? 'Cập nhật quản trị hệ thống' : 'Thêm quản trị hệ thống mới'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-gray-200 rounded-lg"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  disabled={!!editingId}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mật khẩu {!editingId && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required={!editingId}
                  minLength={6}
                  placeholder={editingId ? 'Để trống nếu không đổi' : ''}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              {editingId && (
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-900"></div>
                  </label>
                  <span className="text-sm text-gray-700">Đang hoạt động</span>
                </div>
              )}
              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Shield size={16} />
                      {editingId ? 'Cập nhật' : 'Tạo quản trị'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : filteredSuperadmins.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            {search ? 'Không tìm thấy quản trị hệ thống phù hợp' : 'Chưa có quản trị hệ thống nào'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSuperadmins.map((user) => (
              <div key={user._id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {user.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {user.email}
                    {user.phone && <span className="mx-2 text-gray-300">|</span>}
                    {user.phone}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tạo lúc: {new Date(user.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`p-2 rounded-lg ${
                      user.isActive
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                  >
                    {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                    title="Chỉnh sửa"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(user._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
