import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { feedbackService } from '../../services/feedback';
import { useToast } from '../../context/ToastContext';
import { Star, Search, Loader2, X, CheckCircle, Eye, Clock, Ban, ChevronDown, MessageSquare } from 'lucide-react';

const TYPES = [
  { value: 'bug', label: 'Báo lỗi' },
  { value: 'feature', label: 'Góp ý chức năng' },
  { value: 'improvement', label: 'Cải thiện' },
  { value: 'other', label: 'Khác' },
];

const STATUSES = [
  { value: 'pending', label: 'Chờ xử lý', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  { value: 'reviewed', label: 'Đã xem', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Eye },
  { value: 'resolved', label: 'Đã giải quyết', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  { value: 'rejected', label: 'Từ chối', color: 'bg-red-50 text-red-700 border-red-200', icon: Ban },
];

const TYPE_COLORS = {
  bug: 'bg-red-50 text-red-700',
  feature: 'bg-purple-50 text-purple-700',
  improvement: 'bg-blue-50 text-blue-700',
  other: 'bg-gray-50 text-gray-700',
};

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  cashier: 'Thu ngân',
  viewer: 'Người xem',
  family: 'Phụ huynh/Học sinh',
  superadmin: 'Quản trị hệ thống',
};

export default function AdminFeedback() {
  const toast = useToast();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [updating, setUpdating] = useState(false);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const [feedbacksRes, statsRes] = await Promise.all([
        feedbackService.getAllFeedbacks({ status: statusFilter || undefined, type: typeFilter || undefined }),
        feedbackService.getFeedbackStats()
      ]);
      setFeedbacks(feedbacksRes.data.feedbacks || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error(error);
      toast.showError('Không tải được danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [statusFilter, typeFilter]);

  const filteredFeedbacks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return feedbacks;
    return feedbacks.filter((fb) => {
      return (
        fb.title?.toLowerCase().includes(q) ||
        fb.content?.toLowerCase().includes(q) ||
        fb.userId?.name?.toLowerCase().includes(q) ||
        ROLE_LABELS[fb.userRole]?.toLowerCase().includes(q)
      );
    });
  }, [feedbacks, search]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={14} className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
    ));
  };

  const handleUpdateStatus = async (id, status) => {
    setUpdating(true);
    try {
      await feedbackService.updateStatus(id, { status });
      toast.showSuccess('Cập nhật trạng thái thành công');
      loadFeedbacks();
      if (selectedFeedback?._id === id) {
        setSelectedFeedback({ ...selectedFeedback, status });
      }
    } catch (error) {
      toast.showError(error?.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đánh giá</h1>
        <p className="text-gray-500 mt-1">Xem và xử lý góp ý từ người dùng</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MessageSquare size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tổng đánh giá</p>
                <p className="text-xl font-bold text-gray-900">{stats.summary?.totalFeedbacks || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Star size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Đánh giá TB</p>
                <p className="text-xl font-bold text-amber-600">{Number(stats.summary?.avgRating || 0).toFixed(1)}/5</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Clock size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Chờ xử lý</p>
                <p className="text-xl font-bold text-red-600">{stats.summary?.pendingCount || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Đã giải quyết</p>
                <p className="text-xl font-bold text-emerald-600">{stats.summary?.resolvedCount || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung, người dùng..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tất cả loại</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            {search || statusFilter || typeFilter ? 'Không tìm thấy đánh giá phù hợp' : 'Chưa có đánh giá nào'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredFeedbacks.map((fb) => {
              const statusInfo = STATUSES.find(s => s.value === fb.status) || STATUSES[0];
              const StatusIcon = statusInfo.icon;
              
              return (
                <div 
                  key={fb._id} 
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedFeedback?._id === fb._id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => setSelectedFeedback(fb)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{fb.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[fb.type] || TYPE_COLORS.other}`}>
                          {TYPES.find(t => t.value === fb.type)?.label || fb.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          <span className="flex items-center gap-1">
                            <StatusIcon size={10} />
                            {statusInfo.label}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(fb.rating)}
                      </div>
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">{fb.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>
                          {fb.userId?.name || 'Ẩn danh'} · {ROLE_LABELS[fb.userRole] || fb.userRole}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(fb.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Chi tiết đánh giá</h2>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedFeedback.title}</h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[selectedFeedback.type] || TYPE_COLORS.other}`}>
                      {TYPES.find(t => t.value === selectedFeedback.type)?.label || selectedFeedback.type}
                    </span>
                    <div className="flex items-center gap-1">
                      {renderStars(selectedFeedback.rating)}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedFeedback.content}</p>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="font-medium text-gray-900">{selectedFeedback.userId?.name || 'Ẩn danh'}</span>
                  <span>·</span>
                  <span>{ROLE_LABELS[selectedFeedback.userRole] || selectedFeedback.userRole}</span>
                  <span>·</span>
                  <span>{new Date(selectedFeedback.createdAt).toLocaleString('vi-VN')}</span>
                </div>

                {/* Status Update */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cập nhật trạng thái</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((status) => {
                      const StatusIcon = status.icon;
                      const isActive = selectedFeedback.status === status.value;
                      return (
                        <button
                          key={status.value}
                          onClick={() => !isActive && handleUpdateStatus(selectedFeedback._id, status.value)}
                          disabled={updating || isActive}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            isActive
                              ? `${status.color} cursor-default`
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50'
                          }`}
                        >
                          <StatusIcon size={14} />
                          {status.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
