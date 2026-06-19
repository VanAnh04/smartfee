import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, KeyRound, Loader2, CheckCircle, RefreshCw, Mail, AlertCircle } from 'lucide-react';

export default function VerifyOTP() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const devOtp = location.state?.devOtp;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [error, setError] = useState('');

  const inputRefs = useRef([]);
  const isUpdatingRef = useRef(false);
  const pendingVerifyRef = useRef(null);

  // Redirect nếu không có email
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  // Countdown timer cho resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // EFFECT: Auto-focus next input when a digit is entered
  // Dùng useEffect thay vì gọi focus trong onChange để tránh trigger lại onChange
  const focusNextInput = useCallback((index) => {
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  }, []);

  // EFFECT: Auto-submit when all 6 digits are filled
  // Tách riêng để tránh stale closure trong handleChange
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === 6 && otp.every(digit => digit !== '')) {
      handleVerify(otpString);
    }
  }, [otp]);

  const handleChange = (index, e) => {
    // Prevent concurrent updates to avoid race conditions
    if (isUpdatingRef.current) {
      e.target.value = otp[index] || '';
      return;
    }

    const inputValue = e.target.value;
    const currentValue = otp[index];

    // Detect if value was cleared (backspace)
    if (inputValue.length === 0 && currentValue !== '') {
      isUpdatingRef.current = true;
      setOtp(prev => {
        const newOtp = [...prev];
        newOtp[index] = '';
        return newOtp;
      });
      isUpdatingRef.current = false;
      return;
    }

    // If input already has same value, ignore (prevents duplicate onChange from focus)
    if (inputValue === currentValue) {
      return;
    }

    // Handle paste or multi-character input - take only last character
    const char = inputValue.slice(-1);

    // Only process if it's a single digit
    if (!/^[0-9]$/.test(char)) {
      // Clear invalid input
      e.target.value = currentValue || '';
      return;
    }

    isUpdatingRef.current = true;
    setOtp(prev => {
      const newOtp = [...prev];
      newOtp[index] = char;
      return newOtp;
    });
    setError('');
    isUpdatingRef.current = false;

    // Schedule focus move (don't call immediately to avoid triggering onChange)
    requestAnimationFrame(() => {
      focusNextInput(index);
    });
  };

  const handleKeyDown = (index, e) => {
    // Use functional update pattern to avoid stale state
    const handleBackspace = () => {
      setOtp(prev => {
        const newOtp = [...prev];
        if (newOtp[index]) {
          newOtp[index] = '';
          return newOtp;
        } else if (index > 0) {
          newOtp[index - 1] = '';
          // Focus previous input after state update
          requestAnimationFrame(() => {
            inputRefs.current[index - 1]?.focus();
          });
          return newOtp;
        }
        return prev;
      });
    };

    const handleDelete = () => {
      setOtp(prev => {
        const newOtp = [...prev];
        newOtp[index] = '';
        if (index < 5) {
          requestAnimationFrame(() => {
            inputRefs.current[index + 1]?.focus();
          });
        }
        return newOtp;
      });
    };

    const handleArrowNav = (direction) => {
      e.preventDefault();
      const newIndex = direction === 'left' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex <= 5) {
        requestAnimationFrame(() => {
          inputRefs.current[newIndex]?.focus();
        });
      }
    };

    switch (e.key) {
      case 'Backspace':
        e.preventDefault();
        handleBackspace();
        break;
      case 'Delete':
        e.preventDefault();
        handleDelete();
        break;
      case 'ArrowLeft':
        handleArrowNav('left');
        break;
      case 'ArrowRight':
        handleArrowNav('right');
        break;
      case 'Home':
        e.preventDefault();
        requestAnimationFrame(() => inputRefs.current[0]?.focus());
        break;
      case 'End':
        e.preventDefault();
        requestAnimationFrame(() => inputRefs.current[5]?.focus());
        break;
      case 'a':
      case 'A':
        if (e.ctrlKey || e.metaKey) {
          // Let browser handle select all
        }
        break;
      default:
        // Ignore non-numeric keys
        if (/^[0-9]$/.test(e.key)) {
          // Digit pressed - handle directly for better UX
          e.preventDefault();
          isUpdatingRef.current = true;
          setOtp(prev => {
            const newOtp = [...prev];
            newOtp[index] = e.key;
            return newOtp;
          });
          setError('');
          isUpdatingRef.current = false;
          requestAnimationFrame(() => focusNextInput(index));
        }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');

    if (pastedData.length > 0) {
      isUpdatingRef.current = true;
      const digits = pastedData.slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];

      digits.forEach((digit, i) => {
        newOtp[i] = digit;
      });

      setOtp(newOtp);
      isUpdatingRef.current = false;

      // Focus the first empty input or last input
      const nextEmptyIndex = newOtp.findIndex(d => d === '');
      const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;

      requestAnimationFrame(() => {
        inputRefs.current[focusIndex]?.focus();
      });
    }
  };

  const handleVerify = async (otpCode = otp.join('')) => {
    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        setError(data.error || 'Mã OTP không hợp lệ');

        // Shake animation effect
        const inputs = inputRefs.current.filter(Boolean);
        inputs.forEach(input => {
          input.classList.add('shake');
          setTimeout(() => input.classList.remove('shake'), 500);
        });
        return;
      }

      toast.success('Xác thực thành công!');

      // Chuyển sang trang đặt lại mật khẩu với resetToken
      navigate('/reset-password', {
        state: {
          email,
          resetToken: data.resetToken
        }
      });

    } catch (err) {
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      toast.success('Mã OTP mới đã được gửi!');
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60); // 60 giây cooldown
      inputRefs.current[0]?.focus();

      // Hiển thị OTP dev nếu có
      if (data.otp) {
        console.log('🔐 New OTP:', data.otp);
      }

    } catch (err) {
      toast.error(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
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
              Xác thực<br />
              <span className="text-primary-200">mã OTP</span>
            </h2>
            <p className="text-primary-100 text-lg max-w-md">
              Nhập mã OTP 6 chữ số đã được gửi đến email <br />
              <span className="font-semibold text-white">{email}</span>
            </p>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <span className="text-2xl">⏱️</span>
            </div>
            <div>
              <p className="text-white/70 text-sm">Mã OTP có hiệu lực trong</p>
              <p className="text-white font-semibold">5 phút</p>
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
            <Link to="/login" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">SF</span>
              </div>
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
                to="/forgot-password"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4"
              >
                <ArrowLeft size={16} />
                Nhập lại email
              </Link>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Bước 2 / 3</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Nhập mã xác thực</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <Mail size={14} />
                <span>Mã đã gửi đến <span className="font-medium text-gray-700">{email}</span></span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-8">
              {/* Dev OTP Display */}
              {devOtp && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Dev Mode - Mã OTP của bạn:</span>
                  </div>
                  <p className="text-3xl font-bold text-yellow-900 tracking-widest text-center">{devOtp}</p>
                </div>
              )}

              {/* OTP Input */}
              <div className="mb-6">
                <div className="flex justify-center gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      disabled={verifying}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${error
                        ? 'border-red-300 bg-red-50 focus:border-red-500 shake'
                        : digit
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-gray-200 bg-gray-50 focus:border-primary-500'
                        }`}
                    />
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-red-500 text-sm">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                    {remainingAttempts !== null && (
                      <span className="text-gray-400">({remainingAttempts} lần thử còn lại)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Verify Button */}
              <button
                onClick={() => handleVerify()}
                disabled={verifying || otp.join('').length !== 6}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300 ${verifying || otp.join('').length !== 6
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] text-white'
                  }`}
              >
                {verifying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Xác thực mã OTP
                  </>
                )}
              </button>

              {/* Resend */}
              <div className="mt-6 text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-gray-500">
                    Gửi lại mã sau <span className="font-semibold text-primary-600">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Gửi lại mã OTP
                  </button>
                )}
              </div>

              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  Không nhận được mã? Kiểm tra hộp thư spam hoặc bấm "Gửi lại mã OTP"
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

      {/* CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
