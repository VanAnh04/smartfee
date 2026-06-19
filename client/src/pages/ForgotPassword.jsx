import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Mail, KeyRound, Loader2, CheckCircle, Shield } from 'lucide-react';

export default function ForgotPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState(null);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      setOtpSent(true);
      
      // Lưu OTP dev để hiển thị (chỉ trong dev mode)
      if (data.otp) {
        setDevOtp(data.otp);
      }

      toast.success('Mã OTP đã được gửi đến email của bạn!');
      
      // Chuyển sang trang xác thực OTP
      setTimeout(() => {
        navigate('/verify-otp', { 
          state: { email: email.trim().toLowerCase(), devOtp: data.otp } 
        });
      }, 1500);

    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra, vui lòng thử lại');
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
            <Link to="/login" className="flex items-center gap-4 mb-6 group">
              <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.35)]">
                <img src="/favicon.jpg" alt="SF Logo" className="w-full h-full object-cover"/></div>
              <div></div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">SmartFee</h1>
                <p className="text-primary-200 text-sm">Hệ thống quản lý học phí</p>
              </div>
            </Link>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Khôi phục<br />
              <span className="text-primary-200">tài khoản của bạn</span>
            </h2>
            <p className="text-primary-100 text-lg max-w-md">
              Nhập địa chỉ email đã đăng ký và chúng tôi sẽ gửi cho bạn mã OTP để đặt lại mật khẩu.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Mail size={20} />
              </div>
              <div>
                <span className="font-semibold">Nhập email của bạn</span>
                <p className="text-primary-200 text-sm">Email đã đăng ký tài khoản</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/70">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <KeyRound size={20} />
              </div>
              <div>
                <span className="font-semibold">Nhập mã OTP</span>
                <p className="text-primary-200 text-sm">Mã 6 số được gửi đến email</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/70">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div>
                <span className="font-semibold">Đặt mật khẩu mới</span>
                <p className="text-primary-200 text-sm">Tạo mật khẩu mới an toàn</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Element */}
        <div className="absolute bottom-0 right-0 w-1/2 h-full overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-t from-primary-800/50 to-transparent rounded-t-full transform translate-x-1/3"></div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/login" className="flex items-center gap-3 group">
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
            {/* Card Header */}
            <div className="bg-gradient-to-r from-gray-50 to-white px-8 pt-8 pb-6 border-b border-gray-100">
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4"
              >
                <ArrowLeft size={16} />
                Quay lại đăng nhập
              </Link>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Bước 1 / 3</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h2>
              <p className="text-gray-500 mt-1 text-sm">
                Không sao cả! Nhập email của bạn để nhận mã OTP.
              </p>
            </div>

            {/* Card Body */}
            <div className="p-8">
              {otpSent ? (
                // Success State
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Đã gửi mã OTP!
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Mã OTP đã được gửi đến email<br />
                    <span className="font-medium text-gray-700">{email}</span>
                  </p>
                  {devOtp && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-xs text-yellow-700 font-medium mb-1">🔐 Dev Mode - Mã OTP của bạn:</p>
                      <p className="text-2xl font-bold text-yellow-800 tracking-widest">{devOtp}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang chuyển hướng...
                  </div>
                </div>
              ) : (
                // Form State
                <form onSubmit={handleSubmit} className="space-y-5">
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
                        className={`w-full px-4 py-3 pl-12 bg-gray-50 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white ${
                          errors.email 
                            ? 'border-red-400 focus:border-red-500' 
                            : 'border-gray-200 focus:border-primary-500'
                        }`}
                        placeholder="email@example.com"
                        disabled={loading}
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
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

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm">💡</span>
                      </div>
                      <div>
                        <p className="text-sm text-blue-800 font-medium mb-1">
                          Mẹo bảo mật
                        </p>
                        <p className="text-xs text-blue-600">
                          Mã OTP sẽ có hiệu lực trong 5 phút. Vui lòng kiểm tra cả hộp thư spam nếu không thấy email.
                        </p>
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
                        Đang gửi mã OTP...
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        Gửi mã OTP
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Footer */}
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

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-400">
            SmartFee v1.0.0 — Hệ thống quản lý học phí thông minh
          </p>
        </div>
      </div>
    </div>
  );
}
