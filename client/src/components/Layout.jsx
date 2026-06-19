import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Receipt,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Search,
  Lock
} from 'lucide-react';
import { getInitials } from '../utils/helpers';
import ChangePasswordModal from './ChangePasswordModal';
import NotificationDropdown from './NotificationDropdown';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tổng quan', roles: ['admin', 'staff', 'cashier', 'viewer'] },
  { path: '/students', icon: Users, label: 'Học sinh', roles: ['admin', 'staff'] },
  { path: '/classes', icon: GraduationCap, label: 'Lớp học', roles: ['admin', 'staff'] },
  { path: '/fees', icon: Receipt, label: 'Học phí', roles: ['admin', 'staff'] },
  { path: '/payments', icon: CreditCard, label: 'Thu chi', roles: ['admin', 'staff', 'cashier'] },
  { path: '/reports', icon: FileText, label: 'Báo cáo', roles: ['admin', 'staff', 'cashier', 'viewer'] },
  { path: '/notifications', icon: Bell, label: 'Thông báo', roles: ['admin', 'staff', 'cashier', 'viewer'] },
  { path: '/settings', icon: Settings, label: 'Cài đặt', roles: ['admin', 'staff', 'cashier', 'viewer'] },
];

export default function Layout() {
  const { user, organization, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleViewAllNotifications = () => {
    navigate('/notifications');
  };

  // Lọc menu theo role
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role)
  );

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40">
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <img src="/favicon.jpg" alt="SF Logo" className="w-full h-full object-cover"/>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-gray-900">SmartFee</h1>
                <p className="text-xs text-gray-500">{organization?.name}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm học sinh, lớp học..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-lg text-sm focus:bg-white focus:border-primary-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationDropdown onViewAll={handleViewAllNotifications} />

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
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {user?.name}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-fade-in">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <NavLink
                    to="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Cài đặt tài khoản
                  </NavLink>
                  <button
                    onClick={() => { setUserMenuOpen(false); setShowPasswordModal(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Lock size={16} />
                    Đổi mật khẩu
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
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

      {/* Sidebar */}
      <aside className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-l-3 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className={`px-3 py-2 rounded-lg ${
            organization?.plan === 'premium' ? 'bg-purple-50' :
            organization?.plan === 'gold' ? 'bg-yellow-50' : 'bg-gray-100'
          }`}>
            <p className="text-xs font-medium text-gray-600">
              Gói dịch vụ: <span className="capitalize">{organization?.plan || 'basic'}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {organization?.plan === 'premium' ? 'Không giới hạn' :
               organization?.plan === 'gold' ? '350 học sinh' : '100 học sinh'}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
