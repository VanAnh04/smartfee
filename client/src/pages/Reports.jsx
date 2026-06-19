import { useState, useEffect } from 'react';
import { reportService, feeService, classService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';
import {
  FileText, Download, Calendar, TrendingUp, Users, DollarSign,
  BarChart3, PieChart as PieChartIcon, Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

export default function Reports() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', periodId: '', classId: '', groupBy: 'day'
  });
  const [revenueData, setRevenueData] = useState([]);
  const [debtData, setDebtData] = useState({ debts: [], summary: {} });
  const [classData, setClassData] = useState([]);

  useEffect(() => {
    fetchPeriods();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenueReport();
    } else if (activeTab === 'debt') {
      fetchDebtReport();
    } else if (activeTab === 'class') {
      fetchClassReport();
    }
  }, [activeTab, filters]);

  const fetchPeriods = async () => {
    try {
      const res = await feeService.getPeriods();
      setPeriods(res.data);
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await classService.getAll({ limit: 100 });
      setClasses(res.data.classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchRevenueReport = async () => {
    try {
      setLoading(true);
      const res = await reportService.getRevenueReport({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        groupBy: filters.groupBy
      });
      setRevenueData(res.data.report);
    } catch (error) {
      toast.error('Không thể tải báo cáo doanh thu');
    } finally {
      setLoading(false);
    }
  };

  const fetchDebtReport = async () => {
    try {
      setLoading(true);
      const res = await reportService.getDebtReport({
        periodId: filters.periodId || undefined,
        classId: filters.classId || undefined
      });
      setDebtData(res.data);
    } catch (error) {
      toast.error('Không thể tải báo cáo công nợ');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassReport = async () => {
    try {
      setLoading(true);
      const res = await reportService.getClassReport({
        periodId: filters.periodId || undefined
      });
      setClassData(res.data);
    } catch (error) {
      toast.error('Không thể tải báo cáo theo lớp');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    toast.success('Đang xuất báo cáo...');
  };

  const tabs = [
    { id: 'revenue', label: 'Doanh thu', icon: TrendingUp },
    { id: 'debt', label: 'Công nợ', icon: DollarSign },
    { id: 'class', label: 'Theo lớp', icon: Users }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo</h1>
          <p className="text-gray-500 mt-1">Xem và xuất các báo cáo tài chính</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Download size={18} />
          Xuất báo cáo
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex gap-6 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
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
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            {activeTab === 'revenue' && (
              <>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
                />
                <select
                  value={filters.groupBy}
                  onChange={(e) => setFilters(f => ({ ...f, groupBy: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
                >
                  <option value="day">Theo ngày</option>
                  <option value="month">Theo tháng</option>
                  <option value="year">Theo năm</option>
                </select>
              </>
            )}
            {activeTab === 'debt' && (
              <>
                <select
                  value={filters.periodId}
                  onChange={(e) => setFilters(f => ({ ...f, periodId: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
                >
                  <option value="">Tất cả kỳ thu</option>
                  {periods.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={filters.classId}
                  onChange={(e) => setFilters(f => ({ ...f, classId: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
                >
                  <option value="">Tất cả lớp</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </>
            )}
            {activeTab === 'class' && (
              <select
                value={filters.periodId}
                onChange={(e) => setFilters(f => ({ ...f, periodId: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
              >
                <option value="">Tất cả kỳ thu</option>
                {periods.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Revenue Report */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Biểu đồ doanh thu</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="_id" 
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
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                      />
                      <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Thời gian</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Số giao dịch</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Tổng tiền</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">TB/GC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {revenueData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row._id}</td>
                        <td className="px-4 py-3 text-right">{row.count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(row.total)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(Math.round(row.avgAmount || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Debt Report */}
          {activeTab === 'debt' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-red-600">Tổng công nợ</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(debtData.summary?.totalDebt || 0)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600">Tổng học phí</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {formatCurrency(debtData.summary?.totalAmount || 0)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-600">Đã thu</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(debtData.summary?.totalPaid || 0)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Học sinh</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Liên hệ</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Số phiếu</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Tổng nợ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {debtData.debts?.map((debt, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{debt.name}</p>
                          <p className="text-sm text-gray-500">{debt.studentCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{debt.parentName}</p>
                          <p className="text-sm text-gray-500">{debt.parentPhone}</p>
                        </td>
                        <td className="px-4 py-3 text-right">{debt.feeCount}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          {formatCurrency(debt.totalDebt)}
                        </td>
                      </tr>
                    ))}
                    {(!debtData.debts || debtData.debts.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          Không có dữ liệu công nợ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Class Report */}
          {activeTab === 'class' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Tỷ lệ thu theo lớp</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis 
                          type="number" 
                          domain={[0, 100]}
                          stroke="#64748B"
                          fontSize={12}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="className" 
                          stroke="#64748B"
                          fontSize={12}
                          width={100}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value.toFixed(1)}%`, 'Tỷ lệ thu']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                        />
                        <Bar dataKey="collectionRate" fill="#10B981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Công nợ theo lớp</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis 
                          dataKey="className" 
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
                          formatter={(value) => [formatCurrency(value), 'Công nợ']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                        />
                        <Bar dataKey="debt" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Lớp</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Học sinh</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Đã thu</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Còn nợ</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.className}</td>
                        <td className="px-4 py-3 text-right">{row.studentCount}</td>
                        <td className="px-4 py-3 text-right text-green-600">{formatCurrency(row.totalPaid)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.debt)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            row.collectionRate >= 80 ? 'bg-green-100 text-green-700' :
                            row.collectionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {row.collectionRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
