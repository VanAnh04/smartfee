import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Lock, Loader2, Eye, EyeOff, CheckCircle, Shield } from 'lucide-react';

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const resetToken = location.state?.resetToken;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (!email || !resetToken) {
      navigate('/forgot-password');
    }
  }, [email, resetToken, navigate]);

  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  }, [password]);

  const validate = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (password !== confirmPassword) {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          resetToken, 
          newPassword: password, 
          confirmPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      setSuccess(true);
      toast.success('Đặt lại mật khẩu thành công!');

    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 25) return 'bg-red-500';
    if (passwordStrength <= 50) return 'bg-orange-500';
    if (passwordStrength <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 25) return 'Yếu';
    if (passwordStrength <= 50) return 'Trung bình';
    if (passwordStrength <= 75) return 'Khá';
    return 'Mạnh';
  };

  if (success) {
    return (
      <div className="min-h-screen flex bg-white">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}></div>
          </div>

          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
            <div className="mb-12">
              <Link to="/login" className="flex items-center gap-4 mb-6 group">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/20 group-hover:bg-white/30 transition-all">
                  <span className="text-white font-bold text-2xl">SF</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">SmartFee</h1>
                  <p className="text-primary-200 text-sm">Hệ thống quản lý học phí</p>
                </div>
              </Link>
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                Đặt lại mật khẩu<br />
                <span className="text-primary-200">thành công!</span>
              </h2>
              <p className="text-primary-100 text-lg max-w-md">
                Mật khẩu của bạn đã được thay đổi thành công. Bây giờ bạn có thể đăng nhập với mật khẩu mới.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Bảo mật</p>
                <p className="text-white font-semibold">Tài khoản của bạn đã được bảo vệ</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-1/2 h-full overflow-hidden pointer-events-none">
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-t from-primary-800/50 to-transparent rounded-t-full transform translate-x-1/3"></div>
          </div>
        </div>

        {/* Right Panel - Success */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50">
          <div className="w-full max-w-md text-center">
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden p-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Đặt lại mật khẩu thành công!</h2>
              <p className="text-gray-500 mb-6">
                Mật khẩu của bạn đã được thay đổi thành công. Tất cả các phiên đăng nhập trước đó đã bị vô hiệu hóa.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold shadow-lg bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] text-white transition-all"
              >
                Đăng nhập ngay
              </Link>
            </div>

            <p className="mt-6 text-center text-xs text-gray-400">
              SmartFee v1.0.0 — Hệ thống quản lý học phí thông minh
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-400 rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <div className="mb-12">
            <Link to="/login" className="flex items-center gap-4 mb-6 group">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/20 group-hover:bg-white/30 transition-all">
                <span className="text-white font-bold text-2xl">SF</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">SmartFee</h1>
                <p className="text-primary-200 text-sm">Hệ thống quản lý học phí</p>
              </div>
            </Link>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Tạo mật khẩu<br />
              <span className="text-primary-200">mới an toàn</span>
            </h2>
            <p className="text-primary-100 text-lg max-w-md">
              Nhập mật khẩu mới cho tài khoản của bạn. Hãy chọn một mật khẩu mạnh và dễ nhớ.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Bảo mật</p>
              <p className="text-white font-semibold">Liên kết có hiệu lực trong 15 phút</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 w-1/2 h-full overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-t from-primary-800/50 to-transparent rounded-t-full transform translate-x-1/3"></div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/login" className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.35)]">
                <img src="/favicon.jpg" alt="SF Logo" className="w-full h-full object-cover"/></div>
              <div></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SmartFee</h1>
                <p className="text-xs text-gray-500">Quản lý học phí</p>
              </div>
            </Link>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-white px-8 pt-8 pb-6 border-b border-gray-100">
              <Link 
                to="/verify-otp" 
                state={{ email }}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4"
              >
                <ArrowLeft size={16} />
                Quay lại xác thực OTP
              </Link>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Bước 3 / 3</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Đặt mật khẩu mới</h2>
              <p className="text-gray-500 mt-1 text-sm">
                Tạo mật khẩu mới cho tài khoản <span className="font-medium text-gray-700">{email}</span>
              </p>
            </div>

            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 py-3 pl-12 pr-12 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${
                        errors.password 
                          ? 'border-red-400 focus:border-red-500' 
                          : 'border-gray-200 focus:border-primary-500'
                      }`}
                      placeholder="Nhập mật khẩu mới"
                      disabled={loading}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Độ mạnh:</span>
                        <span className={`text-xs font-medium ${
                          passwordStrength <= 25 ? 'text-red-500' :
                          passwordStrength <= 50 ? 'text-orange-500' :
                          passwordStrength <= 75 ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {getStrengthText()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
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
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 pl-12 pr-12 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${
                        errors.confirmPassword 
                          ? 'border-red-400 focus:border-red-500' 
                          : 'border-gray-200 focus:border-primary-500'
                      }`}
                      placeholder="Nhập lại mật khẩu mới"
                      disabled={loading}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Password Requirements */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm">💡</span>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">
                        Mật khẩu mạnh nên có:
                      </p>
                      <ul className="text-xs text-blue-600 space-y-1">
                        <li className="flex items-center gap-1">
                          <span>{password.length >= 8 ? '✓' : '○'}</span> Ít nhất 8 ký tự
                        </li>
                        <li className="flex items-center gap-1">
                          <span>{/[A-Z]/.test(password) ? '✓' : '○'}</span> Ít nhất 1 chữ hoa (A-Z)
                        </li>
                        <li className="flex items-center gap-1">
                          <span>{/[a-z]/.test(password) ? '✓' : '○'}</span> Ít nhất 1 chữ thường (a-z)
                        </li>
                        <li className="flex items-center gap-1">
                          <span>{/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password) ? '✓' : '○'}</span> Ít nhất 1 số hoặc ký tự đặc biệt
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300 ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] text-white'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Đang đặt lại mật khẩu...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Đặt lại mật khẩu
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600">
                  Nhớ mật khẩu rồi?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-primary-600 hover:text-primary-700 hover:underline decoration-2 underline-offset-2"
                  >
                    Đăng nhập ngay
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            SmartFee v1.0.0 — Hệ thống quản lý học phí thông minh
          </p>
        </div>
      </div>
    </div>
  );
}
