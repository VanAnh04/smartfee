import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth, getRedirectPath } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Eye, EyeOff, LogIn, Shield, Users, GraduationCap, TrendingUp, CreditCard, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';

const LOGIN_TYPES = [
  {
    id: 'admin',
    label: 'Quản trị',
    icon: Shield,
    description: 'Đăng nhập quản lý trung tâm',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'family',
    label: 'Phụ huynh',
    icon: Users,
    description: 'Theo dõi học phí con em',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'student',
    label: 'Học sinh',
    icon: GraduationCap,
    description: 'Xem thông tin học phí',
    color: 'from-violet-500 to-purple-600'
  }
];

const FEATURES = [
  { icon: CreditCard, text: 'Quản lý học phí thông minh' },
  { icon: TrendingUp, text: 'Thống kê & báo cáo chi tiết' },
  { icon: Users, text: 'Quản lý học sinh hiệu quả' },
  { icon: CheckCircle, text: 'Theo dõi thanh toán dễ dàng' },
];

export default function Login() {
  const { login, googleLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState('admin');
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isFormVisible, setIsFormVisible] = useState(true);

  const currentType = LOGIN_TYPES.find(t => t.id === loginType);

  const validate = () => {
    const newErrors = {};
    if (loginType === 'admin' || loginType === 'family') {
      if (!email) newErrors.email = 'Email là bắt buộc';
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email không hợp lệ';
    } else {
      if (!studentCode) newErrors.studentCode = 'Mã học sinh là bắt buộc';
    }
    if (!password) newErrors.password = 'Mật khẩu là bắt buộc';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let result;
      if (loginType === 'student') {
        result = await login(null, password, studentCode);
      } else {
        result = await login(email, password);
      }

      toast.success('Đăng nhập thành công!');

      const redirectPath = getRedirectPath(result.user.role);
      navigate(redirectPath);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (typeId) => {
    setIsFormVisible(false);
    setTimeout(() => {
      setLoginType(typeId);
      setEmail('');
      setStudentCode('');
      setErrors({});
      setIsFormVisible(true);
    }, 150);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-400 rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          {/* Logo & Brand */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.35)]">
                <img src="/favicon.jpg" alt="SF Logo" className="w-full h-full object-cover"/></div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">SmartFee</h1>
                <p className="text-primary-200 text-sm">Hệ thống quản lý học phí</p>
              </div>
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Quản lý học phí<br />
              <span className="text-primary-200">thông minh & hiệu quả</span>
            </h2>
            <p className="text-primary-100 text-lg max-w-md">
              Giải pháp toàn diện giúp các trung tâm giáo dục quản lý học phí một cách dễ dàng và minh bạch.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-4 text-white/90 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                  <feature.icon size={20} />
                </div>
                <span className="text-base font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold text-white">10K+</div>
                <div className="text-primary-200 text-sm">Học sinh</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">500+</div>
                <div className="text-primary-200 text-sm">Trung tâm</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">99%</div>
                <div className="text-primary-200 text-sm">Hài lòng</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Element */}
        <div className="absolute bottom-0 right-0 w-1/2 h-full overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-t from-primary-800/50 to-transparent rounded-t-full transform translate-x-1/3"></div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.35)]">
                <img src="/favicon.jpg" alt="SF Logo" className="w-full h-full object-cover"/></div>
              <div></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SmartFee</h1>
                <p className="text-xs text-gray-500">Quản lý học phí</p>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-gray-50 to-white px-8 pt-8 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-gray-500">Chào mừng bạn quay trở lại</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Đăng nhập tài khoản</h2>
            </div>

            {/* Card Body */}
            <div className="p-8">
              {/* Login Type Selector */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {LOGIN_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isActive = loginType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleTypeChange(type.id)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 ${isActive
                        ? `bg-gradient-to-br ${type.color} text-white shadow-lg shadow-${type.id === 'admin' ? 'blue' : type.id === 'family' ? 'emerald' : 'violet'}-500/25`
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white shadow-sm'
                        }`}>
                        <Icon size={20} className={isActive ? 'text-white' : ''} />
                      </div>
                      <span className={`text-sm font-semibold ${isActive ? '' : ''}`}>
                        {type.label}
                      </span>
                      {isActive && (
                        <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className={`transition-all duration-300 ${isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  {loginType === 'student' ? (
                    <div className="space-y-1.5">
                      <label htmlFor="studentCode" className="block text-sm font-medium text-gray-700">
                        Mã học sinh
                      </label>
                      <div className="relative">
                        <input
                          id="studentCode"
                          type="text"
                          value={studentCode}
                          onChange={(e) => setStudentCode(e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${errors.studentCode ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                            }`}
                          placeholder="Nhập mã học sinh (VD: HS000001)"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <GraduationCap className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                      {errors.studentCode && (
                        <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {errors.studentCode}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="relative">
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${errors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                            }`}
                          placeholder={loginType === 'admin' ? 'admin@smartfee.vn' : 'email@example.com'}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Users className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                      {errors.email && (
                        <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {errors.email}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className={`space-y-1.5 transition-all duration-300 ${isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ transitionDelay: '50ms' }}>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 py-3 pr-12 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${errors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                        }`}
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1 group"
                  >
                    Quên mật khẩu?
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300 ${loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : `bg-gradient-to-r ${currentType?.color} hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`
                    } text-white`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Đăng nhập
                    </>
                  )}
                </button>
              </form>



              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-sm text-gray-400">Hoặc đăng nhập bằng email</span>
                </div>
              </div>

              {/* Google Login Button - Admin/Family only */}
              {(loginType === 'admin' || loginType === 'family') && (
                <div className={`transition-all duration-300 ${isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ transitionDelay: '100ms' }}>
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      setLoading(true);
                      try {
                        const result = await googleLogin(credentialResponse.credential);
                        toast.success('Đăng nhập Google thành công!');
                        const redirectPath = getRedirectPath(result.user.role);
                        navigate(redirectPath);
                      } catch (error) {
                        toast.error(error.response?.data?.error || 'Đăng nhập Google thất bại');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    onError={() => {
                      toast.error('Đăng nhập Google thất bại');
                    }}
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    width="100%"
                  />
                </div>
              )}
              <br />

              {/* Register / Contact Link */}
              <p className="text-center text-sm text-gray-600">
                {loginType === 'admin' ? (
                  <>
                    Chưa có tài khoản?{' '}
                    <Link
                      to="/register"
                      className={`font-semibold bg-gradient-to-r ${currentType?.color} bg-clip-text text-transparent hover:underline decoration-2 underline-offset-2`}
                    >
                      Đăng ký ngay
                    </Link>
                  </>
                ) : (
                  <span className="text-gray-500">
                    Cần hỗ trợ? <span className="font-medium text-gray-600">Liên hệ quản trị viên</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-400">
            SmartFee v1.0.0 — Hệ thống quản lý học phí thông minh
          </p>
        </div>
      </div>
    </div>
  );
}
