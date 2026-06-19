import { useState, useEffect } from 'react';
import { dashboardService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/helpers';
import {
  Users,
  GraduationCap,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

export default function Dashboard() {
  const { organization } = useAuth();
  const [stats, setStats] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [topDebtors, setTopDebtors] = useState([]);
  const [feeDistribution, setFeeDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, revenueRes, paymentsRes, debtorsRes, distributionRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRevenueChart(12),
        dashboardService.getRecentPayments(5),
        dashboardService.getTopDebtors(5),
        dashboardService.getFeeDistribution()
      ]);

      setStats(statsRes.data);
      setRevenueChart(revenueRes.data);
      setRecentPayments(paymentsRes.data);
      setTopDebtors(debtorsRes.data);
      setFeeDistribution(distributionRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-xl"></div>
          <div className="h-80 bg-white rounded-xl"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Học sinh',
      value: stats?.students?.total || 0,
      subValue: `${stats?.students?.active || 0} đang học`,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500',
      link: '/students'
    },
    {
      title: 'Lớp học',
      value: stats?.classes?.total || 0,
      subValue: `${stats?.classes?.active || 0} đang hoạt động`,
      icon: GraduationCap,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-500',
      link: '/classes'
    },
    {
      title: 'Doanh thu tháng',
      value: formatCurrency(stats?.revenue?.month || 0),
      subValue: `${stats?.revenue?.monthCount || 0} giao dịch`,
      icon: DollarSign,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500',
      link: '/payments'
    },
    {
      title: 'Công nợ',
      value: formatCurrency(stats?.fees?.pending || 0),
      subValue: `${stats?.fees?.overdue || 0} quá hạn`,
      icon: AlertCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
      link: '/fees'
    }
  ];

  const pieData = feeDistribution.map(item => ({
    name: item._id === 'paid' ? 'Đã đóng' : 
          item._id === 'unpaid' ? 'Chưa đóng' :
          item._id === 'partial' ? 'Một phần' : 'Quá hạn',
    value: item.count,
    amount: item.amount
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-gray-500 mt-1">Xin chào, {organization?.name}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/payments"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <DollarSign size={18} />
            Thu tiền
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`${stat.iconColor} w-6 h-6`} />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.subValue}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Doanh thu 12 tháng</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp size={16} className="text-green-500" />
                <span className="text-green-600 font-medium">
                  {revenueChart.length > 1 && revenueChart[revenueChart.length - 1].total > revenueChart[revenueChart.length - 2].total ? '+' : ''}
                  {Math.round((revenueChart[revenueChart.length - 1]?.total / (revenueChart[revenueChart.length - 2]?.total || 1) - 1) * 100)}%
                </span>
              </div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                  labelStyle={{ color: '#1E293B' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fee Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Tình trạng học phí</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [value, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Thanh toán gần đây</h2>
            <Link to="/payments" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Xem tất cả
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Chưa có thanh toán nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div key={payment._id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {payment.studentId?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(payment.paidAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500">{payment.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Debtors */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Công nợ cao nhất</h2>
            <Link to="/fees" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Xem tất cả
            </Link>
          </div>
          {topDebtors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Không có công nợ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topDebtors.map((debtor, index) => (
                <Link
                  key={debtor._id}
                  to={`/students/${debtor.studentId}`}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{debtor.name}</p>
                    <p className="text-sm text-gray-500">{debtor.parentPhone || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{formatCurrency(debtor.totalDebt)}</p>
                    <p className="text-xs text-gray-500">{debtor.feeCount} phiếu</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
