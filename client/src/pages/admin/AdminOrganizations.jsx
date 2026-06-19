import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/admin';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { Building2, Search, ExternalLink, Loader2, Plus, X, Building } from 'lucide-react';

const PLANS = {
  basic: { label: 'Basic', color: 'bg-gray-100 text-gray-700' },
  gold: { label: 'Gold', color: 'bg-yellow-100 text-yellow-700' },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-700' },
};

const PLAN_OPTIONS = [
  { value: 'basic', label: 'Basic', description: 'Miễn phí - 100 học sinh' },
  { value: 'gold', label: 'Gold', description: '299.000đ/tháng - 350 học sinh' },
  { value: 'premium', label: 'Premium', description: '799.000đ/tháng - Không giới hạn' },
];

export default function AdminOrganizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    plan: 'basic',
  });

  const loadOrganizations = async (pageNum = 1) => {
    try {
      setLoading(true);
      const { data } = await adminService.getOrganizations({ search, page: pageNum, limit: 10 });
      setOrganizations(data.organizations || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error(error);
      toast.showError('Không tải được danh sách trung tâm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations(page);
  }, [search, page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await adminService.createOrganization(formData);
      toast.showSuccess('Tạo trung tâm thành công');
      resetForm();
      loadOrganizations(1);
      setPage(1);
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
      phone: '',
      address: '',
      plan: 'basic',
    });
    setShowForm(false);
  };

  const stats = useMemo(() => {
    const total = organizations.length;
    const active = organizations.filter((org) => org.isActive).length;
    const byPlan = organizations.reduce((acc, org) => {
      acc[org.plan || 'basic'] = (acc[org.plan || 'basic'] || 0) + 1;
      return acc;
    }, {});

    return { total, active, inactive: total - active, byPlan };
  }, [organizations]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý trung tâm</h1>
          <p className="text-gray-500 mt-1">Danh sách và thông tin các trung tâm trên hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            <Plus size={16} />
            Thêm trung tâm
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tổng trung tâm</p>
              <p className="text-xl font-bold text-gray-900">{pagination?.total || stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Building2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Đang hoạt động</p>
              <p className="text-xl font-bold text-emerald-600">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Building2 size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Đã vô hiệu hóa</p>
              <p className="text-xl font-bold text-red-600">{stats.inactive}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Building size={20} className="text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Thêm trung tâm mới</h2>
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
                  Tên trung tâm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nhập tên trung tâm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email liên hệ
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="email@trungtam.vn"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Địa chỉ trung tâm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gói dịch vụ
                </label>
                <div className="space-y-2">
                  {PLAN_OPTIONS.map((plan) => (
                    <label
                      key={plan.value}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.plan === plan.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.value}
                        checked={formData.plan === plan.value}
                        onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{plan.label}</p>
                        <p className="text-xs text-gray-500">{plan.description}</p>
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
                      Tạo trung tâm
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm trung tâm theo tên..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            {search ? 'Không tìm thấy trung tâm phù hợp' : 'Chưa có trung tâm nào'}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {organizations.map((org) => (
                <div key={org._id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{org.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLANS[org.plan]?.color || PLANS.basic.color}`}>
                        {PLANS[org.plan]?.label || 'Basic'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        org.isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {org.isActive ? 'Hoạt động' : 'Khóa'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {org.address && <span>{org.address}</span>}
                      {org.phone && <span className="mx-2">|</span>}
                      {org.phone && <span>{org.phone}</span>}
                      {!org.address && !org.phone && 'Chưa có thông tin'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/organizations/${org._id}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    Chi tiết
                    <ExternalLink size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Trang {pagination.page} / {pagination.pages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
