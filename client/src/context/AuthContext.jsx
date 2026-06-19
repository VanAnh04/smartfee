import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function để lấy redirect path dựa trên role
export const getRedirectPath = (role) => {
  switch (role) {
    case 'admin':
    case 'staff':
    case 'cashier':
    case 'viewer':
      return '/';
    case 'superadmin':
      return '/admin';
    case 'family':
      return '/dashboard/parent/student';
    default:
      return '/login';
  }
};

// Helper functions để kiểm tra quyền
export const canManageUsers = (role) => ['admin', 'superadmin'].includes(role);
export const canManageStudents = (role) => ['admin', 'staff'].includes(role);
export const canManageClasses = (role) => ['admin', 'staff'].includes(role);
export const canManageFees = (role) => ['admin', 'staff'].includes(role);
export const canProcessPayments = (role) => ['admin', 'staff', 'cashier'].includes(role);
export const canViewReports = (role) => ['admin', 'staff', 'cashier', 'viewer'].includes(role);
export const canManageSettings = (role) => ['admin', 'superadmin'].includes(role);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const savedOrg = localStorage.getItem('organization');

      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.user);
          setOrganization(response.data.organization);
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('organization');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, studentCode) => {
    const response = await api.post('/auth/login', { email, password, studentCode });
    const { user, organization, accessToken, refreshToken, student, children } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('organization', JSON.stringify(organization));

    // Lưu thêm thông tin student/children nếu có
    if (student) {
      localStorage.setItem('student', JSON.stringify(student));
    }
    if (children) {
      localStorage.setItem('children', JSON.stringify(children));
    }

    setUser(user);
    setOrganization(organization);

    return response.data;
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    const { user, organization, accessToken, refreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('organization', JSON.stringify(organization));

    setUser(user);
    setOrganization(organization);

    return response.data;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('organization');
    localStorage.removeItem('student');
    localStorage.removeItem('children');

    setUser(null);
    setOrganization(null);
  };

  const updateProfile = async (data) => {
    const response = await api.put('/auth/profile', data);
    setUser(response.data.user);
    return response.data;
  };

  const googleLogin = async (googleToken) => {
    const response = await api.post('/auth/google', { googleToken });
    const { user, organization, accessToken, refreshToken, student, children } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('organization', JSON.stringify(organization));

    if (student) {
      localStorage.setItem('student', JSON.stringify(student));
    }
    if (children) {
      localStorage.setItem('children', JSON.stringify(children));
    }

    setUser(user);
    setOrganization(organization);

    return response.data;
  };

  const value = {
    user,
    organization,
    loading,
    login,
    googleLogin,
    register,
    logout,
    updateProfile,
    setOrganization
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
