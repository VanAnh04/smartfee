import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getRedirectPath } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import FamilyLayout from './components/FamilyLayout';
import SuperAdminLayout from './components/SuperAdminLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Classes from './pages/Classes';
import Fees from './pages/Fees';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import FamilyOverview from './pages/FamilyOverview';
import FamilyFees from './pages/FamilyFees';
import FamilyHistory from './pages/FamilyHistory';
import FamilyNotifications from './pages/FamilyNotifications';
import FamilySupport from './pages/FamilySupport';
import FamilyFeedback from './pages/FamilyFeedback';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrganizations from './pages/admin/AdminOrganizations';
import AdminOrganizationDetail from './pages/admin/AdminOrganizationDetail';
import AdminUsers from './pages/admin/AdminUsers';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminSuperAdmins from './pages/admin/AdminSuperAdmins';
import AdminSettings from './pages/admin/AdminSettings';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Kiểm tra role nếu có allowedRoles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect dựa trên role
    if (user.role === 'family') {
      return <Navigate to="/dashboard/parent/student" />;
    }
    if (user.role === 'superadmin') {
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/login" />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  // Nếu đã đăng nhập, redirect đến trang phù hợp với role
  if (user) {
    return <Navigate to={getRedirectPath(user.role)} />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/verify-otp" element={<PublicRoute><VerifyOTP /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

      {/* Admin routes - require admin role */}
      <Route path="/" element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="classes" element={<Classes />} />
        <Route path="fees" element={<Fees />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Family Portal - cho cả phụ huynh và học sinh */}
      <Route path="/dashboard/parent/student" element={<ProtectedRoute allowedRoles={['family']}><FamilyLayout /></ProtectedRoute>}>
        <Route index element={<FamilyOverview />} />
        <Route path="fees" element={<FamilyFees />} />
        <Route path="history" element={<FamilyHistory />} />
        <Route path="notifications" element={<FamilyNotifications />} />
        <Route path="support" element={<FamilySupport />} />
        <Route path="feedback" element={<FamilyFeedback />} />
      </Route>

      {/* Super Admin routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['superadmin']}><SuperAdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="organizations" element={<AdminOrganizations />} />
        <Route path="organizations/:id" element={<AdminOrganizationDetail />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="superadmins" element={<AdminSuperAdmins />} />
        <Route path="feedback" element={<AdminFeedback />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
