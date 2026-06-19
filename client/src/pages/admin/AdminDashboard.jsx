import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/admin';
import { Building2, Users, GraduationCap, TrendingUp, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const StatCard = ({ icon: Icon, label, value, sub, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
};

export default function AdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data } = await adminService.getStats();
      setStats(data);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Không tải được thống kê');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h1>
        <p className="text-gray-500 mt-1">Thống kê toàn bộ nền tảng SmartFee</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Trung tâm"
          value={stats.organizations?.total || 0}
          sub={`${stats.organizations?.active || 0} đang hoạt động`}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Người dùng"
          value={stats.users?.total || 0}
          sub="Tất cả vai trò"
          color="purple"
        />
        <StatCard
          icon={GraduationCap}
          label="Học sinh"
          value={stats.students?.total || 0}
          sub="Trên toàn hệ thống"
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="Doanh thu"
          value={`${((stats.revenue || 0)).toLocaleString('vi-VN')}đ`}
          sub="Tổng thanh toán thành công"
          color="amber"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Phân bố gói dịch vụ</h3>
        <div className="space-y-3">
          {(stats.plans || []).map((plan) => {
            const planMap = {
              basic: 'Basic',
              gold: 'Gold',
              premium: 'Premium'
            };
            const total = (stats.plans || []).reduce((sum, item) => sum + (item.count || 0), 0);
            const percent = total ? Math.round(((plan.count || 0) / total) * 100) : 0;

            return (
              <div key={plan._id} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-700 capitalize">{planMap[plan._id] || plan._id}</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-primary-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
                <div className="w-24 text-right text-sm text-gray-600">{plan.count || 0} trung tâm</div>
              </div>
            );
          })}
          {(!stats.plans || stats.plans.length === 0) && (
            <p className="text-sm text-gray-500">Chưa có dữ liệu gói dịch vụ</p>
          )}
        </div>
      </div>
    </div>
  );
}
