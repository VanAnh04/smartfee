import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Eye, EyeOff, UserPlus, Shield, Users, GraduationCap, TrendingUp, CreditCard, CheckCircle, Sparkles, ChevronRight, Building2, User, Mail, Phone, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const FEATURES = [
  { icon: CreditCard, text: 'Quản lý học phí thông minh' },
  { icon: TrendingUp, text: 'Thống kê & báo cáo chi tiết' },
  { icon: Users, text: 'Quản lý học sinh hiệu quả' },
  { icon: CheckCircle, text: 'Theo dõi thanh toán dễ dàng' },
];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Tên trung tâm là bắt buộc';
    }
    if (!formData.name.trim()) newErrors.name = 'Tên là bắt buộc';
    if (!formData.email) newErrors.email = 'Email là bắt buộc';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email không hợp lệ';
    if (!formData.password) newErrors.password = 'Mật khẩu là bắt buộc';
    else if (formData.password.length < 6) newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        organizationName: formData.organizationName,
        phone: formData.phone
      });
      toast.success('Đăng ký thành công!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
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
              <div></div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">SmartFee</h1>
                <p className="text-primary-200 text-sm">Hệ thống quản lý học phí</p>
              </div>
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Bắt đầu quản lý<br />
              <span className="text-primary-200">học phí ngay hôm nay</span>
            </h2>
            <p className="text-primary-100 text-lg max-w-md">
              Đăng ký miễn phí và trải nghiệm giải pháp quản lý học phí hiệu quả cho trung tâm của bạn.
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

          {/* Package Info */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-300" />
                </div>
                <span className="text-lg font-semibold text-white">Gói Basic miễn phí</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">100</div>
                  <div className="text-primary-200 text-sm">Học sinh</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">4</div>
                  <div className="text-primary-200 text-sm">Lớp học</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">∞</div>
                  <div className="text-primary-200 text-sm">Năm sử dụng</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Element */}
        <div className="absolute bottom-0 right-0 w-1/2 h-full overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-t from-primary-800/50 to-transparent rounded-t-full transform translate-x-1/3"></div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
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

          {/* Register Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-gray-50 to-white px-8 pt-8 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-gray-500">Tạo tài khoản mới</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Đăng ký SmartFee</h2>
            </div>

            {/* Card Body */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Organization Name */}
                <div className="space-y-1.5">
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                    Tên trung tâm / lớp học
                  </label>
                  <div className="relative">
                    <input
                      id="organizationName"
                      name="organizationName"
                      type="text"
                      value={formData.organizationName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${
                        errors.organizationName ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                      }`}
                      placeholder="Trung tâm Anh ngữ ABC"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  {errors.organizationName && (
                    <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.organizationName}
                    </p>
                  )}
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${
                        errors.name ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                      }`}
                      placeholder="Nguyễn Văn A"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${
                        errors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                      }`}
                      placeholder="admin@example.com"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Số điện thoại <span className="text-gray-400">(tùy chọn)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white focus:border-primary-500"
                      placeholder="0912 345 678"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Phone className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 pr-12 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${
                        errors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                      }`}
                      placeholder="Tối thiểu 6 ký tự"
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

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 pr-12 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${
                        errors.confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                      }`}
                      placeholder="Nhập lại mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300 mt-6 ${
                    loading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  } text-white`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Tạo tài khoản
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
                  <span className="px-4 bg-white text-sm text-gray-400">Hoặc</span>
                </div>
              </div>

              {/* Login Link */}
              <p className="text-center text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <Link 
                  to="/login" 
                  className="font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center justify-center gap-1 group"
                >
                  Đăng nhập ngay
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
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
