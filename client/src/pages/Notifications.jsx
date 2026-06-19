import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { notificationService } from '../services/api';
import {
  Bell, CheckCircle, AlertCircle, Info, X, Trash2,
  Clock, Loader2, Filter, Download, RefreshCw, Eye, Mail, Building2, User
} from 'lucide-react';

const TYPE_ICONS = {
  payment_success: '💳',
  payment_failed: '❌',
  payment_pending: '⏳',
  payment_reminder: '🔔',
  fee_created: '📋',
  fee_updated: '✏️',
  fee_deleted: '🗑️',
  fee_overdue: '⚠️',
  student_added: '👤',
  student_updated: '📝',
  student_deleted: '🚫',
  student_class_added: '🎓',
  student_class_removed: '📤',
  class_created: '🏫',
  class_updated: '✏️',
  class_deleted: '🗑️',
  account_created: '🔐',
  account_linked: '🔗',
  password_changed: '🔑',
  staff_added: '👨‍💼',
  staff_updated: '📝',
  staff_deleted: '🚫',
  staff_role_changed: '👔',
  plan_upgraded: '⬆️',
  plan_downgraded: '⬇️',
  plan_expiring: '⏰',
  plan_expired: '❗',
  upgrade_requested: '📨',
  org_registered: '🏢',
  org_approved: '✅',
  org_suspended: '🚫',
  welcome: '🎉',
  system_alert: '🚨',
  maintenance: '🔧',
  default: '📢'
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chưa đọc' },
  { id: 'payment_success', label: 'Thanh toán thành công' },
  { id: 'payment_failed', label: 'Thanh toán thất bại' },
  { id: 'fee_overdue', label: 'Học phí quá hạn' },
  { id: 'fee_created', label: 'Học phí mới' },
  { id: 'student_added', label: 'Học sinh mới' },
  { id: 'staff_added', label: 'Nhân viên mới' },
  { id: 'plan_expiring', label: 'Gói dịch vụ' },
  { id: 'system_alert', label: 'Cảnh báo hệ thống' },
];

export default function Notifications() {
  const toast = useToast();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [filter, pagination.page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filter !== 'all') {
        if (filter === 'pending') {
          params.status = 'pending';
        } else {
          params.type = filter;
        }
      }

      const res = await notificationService.getAll(params);
      setNotifications(res.data.notifications || []);
      if (res.data.pagination) {
        setPagination(prev => ({
          ...prev,
          total: res.data.pagination.total,
          pages: res.data.pagination.pages
        }));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true, status: 'read' } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, status: 'read' })));
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Không thể đánh dấu tất cả');
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Đã xóa thông báo');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Không thể xóa thông báo');
    }
  };

  const viewNotification = async (notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    
    // Mark as read if unread
    if (!notification.isRead && notification.status === 'pending') {
      await markAsRead(notification._id);
    }
  };

  const deleteSelected = async () => {
    if (selectedNotifications.length === 0) return;
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedNotifications.length} thông báo đã chọn?`)) return;
    
    try {
      await Promise.all(selectedNotifications.map(id => notificationService.delete(id)));
      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n._id)));
      setSelectedNotifications([]);
      toast.success(`Đã xóa ${selectedNotifications.length} thông báo`);
    } catch (error) {
      console.error('Error deleting selected:', error);
      toast.error('Không thể xóa các thông báo đã chọn');
    }
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n._id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(n => n !== id)
        : [...prev, id]
    );
  };

  const getNotificationIcon = (type) => {
    const icon = TYPE_ICONS[type] || TYPE_ICONS.default;
    return <span className="text-xl">{icon}</span>;
  };

  const getNotificationColor = (notification) => {
    if (notification.isRead || notification.status === 'read') {
      return 'bg-white border-gray-100';
    }
    
    const type = notification.type;
    if (type === 'payment_success') return 'bg-green-50 border-green-200';
    if (type === 'payment_failed' || type === 'fee_overdue' || type === 'org_suspended') return 'bg-red-50 border-red-200';
    if (type === 'payment_reminder' || type === 'payment_pending') return 'bg-amber-50 border-amber-200';
    if (type === 'plan_expiring' || type === 'plan_expired') return 'bg-orange-50 border-orange-200';
    if (type === 'system_alert' || type === 'maintenance') return 'bg-purple-50 border-purple-200';
    
    return 'bg-blue-50 border-blue-200';
  };

  const filteredNotifications = notifications.filter(n => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      n.title?.toLowerCase().includes(query) ||
      n.message?.toLowerCase().includes(query) ||
      n.type?.toLowerCase().includes(query)
    );
  });

  const unreadCount = notifications.filter(n => !n.isRead && n.status === 'pending').length;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    setSelectedNotifications([]);
  };

  const exportNotifications = () => {
    const data = filteredNotifications.map(n => ({
      'Loại': n.type,
      'Tiêu đề': n.title,
      'Nội dung': n.message,
      'Trạng thái': n.status === 'read' || n.isRead ? 'Đã đọc' : 'Chưa đọc',
      'Ngày tạo': formatDate(n.createdAt)
    }));
    
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notifications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file CSV');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Tất cả thông báo đã được đọc'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="Làm mới"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Đánh dấu tất cả đã đọc
            </button>
          )}
          <button
            onClick={exportNotifications}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Xuất CSV
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm thông báo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
              />
            </div>
          </div>
          
          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-white"
            >
              {FILTER_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <div className="bg-primary-50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-primary-700">
            Đã chọn {selectedNotifications.length} thông báo
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                Promise.all(selectedNotifications.map(id => notificationService.markAsRead(id)))
                  .then(() => {
                    setNotifications(prev => prev.map(n => 
                      selectedNotifications.includes(n._id) ? { ...n, isRead: true, status: 'read' } : n
                    ));
                    setSelectedNotifications([]);
                    toast.success('Đã đánh dấu các thông báo đã chọn');
                  });
              }}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
            >
              Đánh dấu đã đọc
            </button>
            <button
              onClick={deleteSelected}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* Notifications Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Thông báo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ngày
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">Đang tải thông báo...</p>
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell size={32} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500">
                      {searchQuery ? 'Không tìm thấy thông báo phù hợp' : 'Không có thông báo nào'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredNotifications.map(notification => (
                  <tr 
                    key={notification._id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.isRead && notification.status === 'pending' 
                        ? 'bg-blue-50/30' 
                        : ''
                    }`}
                    onClick={() => viewNotification(notification)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification._id)}
                        onChange={() => toggleSelect(notification._id)}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          !notification.isRead && notification.status === 'pending'
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium text-sm ${
                              !notification.isRead && notification.status === 'pending'
                                ? 'text-gray-900'
                                : 'text-gray-600'
                            }`}>
                              {notification.title}
                            </h4>
                            {(!notification.isRead && notification.status === 'pending') && (
                              <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                            {notification.message}
                          </p>
                          {notification.studentId && (
                            <p className="text-xs text-gray-400 mt-1">
                              Học sinh: {typeof notification.studentId === 'object' ? notification.studentId.name : 'N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        {notification.type?.replace(/_/g, ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Clock size={14} className="text-gray-400" />
                        {formatDate(notification.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {(!notification.isRead && notification.status === 'pending') && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-green-600 transition-colors"
                            title="Đánh dấu đã đọc"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong {pagination.total} thông báo
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chi tiết thông báo Modal */}
      {showDetailModal && selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-primary-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm">
                  {getNotificationIcon(selectedNotification.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedNotification.title}</h3>
                  <p className="text-xs text-gray-500 capitalize">
                    {selectedNotification.type?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedNotification(null); }}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Nội dung */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nội dung</label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{selectedNotification.message}</p>
              </div>

              {/* Thông tin bổ sung */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                {/* Thời gian */}
                <div className="flex items-start gap-2">
                  <Clock size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Thời gian</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedNotification.createdAt)}</p>
                  </div>
                </div>

                {/* Trạng thái */}
                <div className="flex items-start gap-2">
                  {selectedNotification.isRead || selectedNotification.status === 'read' ? (
                    <CheckCircle size={16} className="text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-500 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Trạng thái</p>
                    <p className="text-sm text-gray-900">
                      {selectedNotification.isRead || selectedNotification.status === 'read' ? 'Đã đọc' : 'Chưa đọc'}
                    </p>
                  </div>
                </div>

                {/* Trung tâm (cho superadmin) */}
                {selectedNotification.organizationId && (
                  <div className="flex items-start gap-2">
                    <Building2 size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Trung tâm</p>
                      <p className="text-sm text-gray-900">
                        {typeof selectedNotification.organizationId === 'object' 
                          ? selectedNotification.organizationId.name 
                          : selectedNotification.organizationId}
                      </p>
                    </div>
                  </div>
                )}

                {/* Học sinh liên quan */}
                {selectedNotification.studentId && (
                  <div className="flex items-start gap-2">
                    <User size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Học sinh</p>
                      <p className="text-sm text-gray-900">
                        {typeof selectedNotification.studentId === 'object' 
                          ? `${selectedNotification.studentId.name} (${selectedNotification.studentId.studentCode || ''})`
                          : 'Xem chi tiết'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                  <div className="col-span-2 pt-4 border-t border-gray-100">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dữ liệu bổ sung</label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                        {JSON.stringify(selectedNotification.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn xóa thông báo này?')) {
                    deleteNotification(selectedNotification._id);
                    setShowDetailModal(false);
                    setSelectedNotification(null);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Xóa thông báo
              </button>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedNotification(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
