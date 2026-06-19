import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { notificationService } from '../services/api';
import {
  Bell, CheckCircle, AlertCircle, Info, X, Settings, Trash2,
  FileText, CreditCard, Clock, Loader2
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
  account_unlinked: '⛓️‍💥',
  password_changed: '🔑',
  staff_added: '👨‍💼',
  staff_updated: '📝',
  staff_deleted: '🚫',
  plan_upgraded: '⬆️',
  plan_downgraded: '⬇️',
  plan_expiring: '⏰',
  plan_expired: '❗',
  welcome: '🎉',
  system_alert: '🚨',
  default: '📢'
};

export default function FamilyNotifications() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

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
        if (filter === 'unread') {
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
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Đã xóa thông báo');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Không thể xóa thông báo');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa tất cả thông báo?')) return;
    
    try {
      await Promise.all(notifications.map(n => notificationService.delete(n._id)));
      setNotifications([]);
      toast.success('Đã xóa tất cả thông báo');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Không thể xóa tất cả thông báo');
    }
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
    if (type === 'payment_failed' || type === 'fee_overdue') return 'bg-red-50 border-red-200';
    if (type === 'payment_reminder' || type === 'payment_pending') return 'bg-amber-50 border-amber-200';
    if (type === 'plan_expiring' || type === 'plan_expired') return 'bg-orange-50 border-orange-200';
    
    return 'bg-blue-50 border-blue-200';
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead && n.status === 'pending';
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.isRead && n.status === 'pending').length;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
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
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Xóa tất cả
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'all', label: 'Tất cả', count: notifications.length },
            { id: 'unread', label: 'Chưa đọc', count: unreadCount },
            { id: 'payment_success', label: 'Thanh toán', count: notifications.filter(n => n.type?.startsWith('payment_')).length },
            { id: 'fee_overdue', label: 'Quá hạn', count: notifications.filter(n => n.type === 'fee_overdue').length },
            { id: 'plan_expiring', label: 'Gói dịch vụ', count: notifications.filter(n => n.type?.startsWith('plan_')).length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Đang tải thông báo...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={40} className="text-gray-300" />
            </div>
            <p className="text-gray-500">
              {filter === 'all' ? 'Không có thông báo nào' : 'Không có thông báo phù hợp'}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification._id}
              className={`rounded-xl shadow-sm border transition-all hover:shadow-md ${getNotificationColor(notification)}`}
            >
              <div className="p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-200">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold ${
                          notification.isRead || notification.status === 'read'
                            ? 'text-gray-600' 
                            : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h4>
                        {(!notification.isRead && notification.status === 'pending') && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${
                        notification.isRead || notification.status === 'read'
                          ? 'text-gray-500' 
                          : 'text-gray-700'
                      }`}>
                        {notification.message}
                      </p>
                      {notification.studentId && (
                        <p className="text-xs text-gray-400 mt-1">
                          Học sinh: {typeof notification.studentId === 'object' ? notification.studentId.name : notification.studentId}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {(!notification.isRead && notification.status === 'pending') && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                          title="Đánh dấu đã đọc"
                        >
                          <CheckCircle size={18} className="text-gray-400 hover:text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={18} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Trang {pagination.page} / {pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
