import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  Clock,
  Bell,
  HeadphonesIcon,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  FileText,
  Lock,
  Check,
  CheckCheck
} from 'lucide-react';
import { getInitials } from '../utils/helpers';
import ChangePasswordModal from './ChangePasswordModal';
import { notificationService } from '../services/api';

const navItems = [
  { path: '/dashboard/parent/student', icon: LayoutDashboard, label: 'Bảng điều khiển' },
  { path: '/dashboard/parent/student/fees', icon: Receipt, label: 'Chi tiết học phí' },
  { path: '/dashboard/parent/student/history', icon: Clock, label: 'Lịch sử thanh toán' },
  { path: '/dashboard/parent/student/notifications', icon: Bell, label: 'Thông báo' },
  { path: '/dashboard/parent/student/support', icon: HeadphonesIcon, label: 'Hỗ trợ' },
  { path: '/dashboard/parent/student/feedback', icon: MessageSquare, label: 'Góp ý' },
];

const TYPE_ICONS = {
  payment_success: '💳',
  payment_failed: '❌',
  payment_pending: '⏳',
  payment_reminder: '🔔',
  fee_created: '📋',
  fee_updated: '✏️',
  fee_overdue: '⚠️',
  welcome: '🎉',
  default: '📢'
};

export default function FamilyLayout() {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifDropdownRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (notifDropdownOpen) {
      fetchNotifications();
    }
  }, [notifDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getAll({ limit: 10 });
      setNotifications(res.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true, status: 'read' } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, status: 'read' })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const accountType = user?.childIds?.length > 0 ? 'parent' : 'student';
  const displayRole = accountType === 'parent' ? 'Phụ huynh' : 'Học sinh';

  const getNotificationIcon = (type) => {
    return TYPE_ICONS[type] || TYPE_ICONS.default;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays < 7) return `${diffDays} ngày`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-gradient-to-b from-primary-600 to-primary-800 text-white z-40 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.35)]">
                <img src="/favicon.jpg" alt="SF Logo" className="w-full h-full object-cover"/></div>
              <div>
                <h1 className="font-bold text-lg">SmartFee</h1>
                <p className="text-xs text-white/70">{organization?.name}</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user?.name}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white mt-1">
                  {displayRole}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isNotifications = item.path.includes('notifications');
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard/parent/student'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/20 backdrop-blur-sm text-white shadow-lg'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={20} />
                  <span className="flex-1">{item.label}</span>
                  {isNotifications && unreadCount > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
            >
              <LogOut size={20} />
              Đăng xuất
            </button>
            <p className="text-xs text-white/50 text-center mt-4">
              SmartFee v1.0.0
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <User size={20} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{user?.name}</h2>
                  <p className="text-xs text-gray-500">{organization?.name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Dropdown */}
              <div className="relative" ref={notifDropdownRef}>
                <button
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="relative p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Bell size={22} className="text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fade-in">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Thông báo</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Không có thông báo nào</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div
                            key={notification._id}
                            className={`p-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${
                              !notification.isRead && notification.status === 'pending' ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              <span className="text-lg flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <h4 className={`text-sm font-medium ${
                                      !notification.isRead && notification.status === 'pending' ? 'text-gray-900' : 'text-gray-600'
                                    }`}>
                                      {notification.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notification.createdAt)}</p>
                                  </div>
                                  {(!notification.isRead && notification.status === 'pending') && (
                                    <button
                                      onClick={() => markAsRead(notification._id)}
                                      className="p-1 hover:bg-white rounded"
                                    >
                                      <Check size={14} className="text-gray-400 hover:text-primary-600" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setNotifDropdownOpen(false);
                          navigate('/dashboard/parent/student/notifications');
                        }}
                        className="w-full py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg font-medium"
                      >
                        Xem tất cả thông báo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">
                      {getInitials(user?.name)}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); setShowPasswordModal(true); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Lock size={16} />
                      Đổi mật khẩu
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
