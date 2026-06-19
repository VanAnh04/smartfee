import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { organizationService } from '../services/api';
import {
  HeadphonesIcon, MessageCircle, Phone, Mail, Clock, Send,
  ChevronDown, ChevronUp, HelpCircle, BookOpen, Video, FileText,
  MapPin, Globe, ExternalLink
} from 'lucide-react';

export default function FamilySupport() {
  const { user, organization } = useAuth();
  const toast = useToast();
  
  const [supportSettings, setSupportSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      type: 'bot',
      message: 'Xin chào! Tôi là trợ lý của SmartFee. Bạn cần hỗ trợ gì hôm nay?'
    }
  ]);

  useEffect(() => {
    fetchSupportSettings();
  }, [organization]);

  const fetchSupportSettings = async () => {
    try {
      setLoading(true);
      // Lấy từ organization settings
      if (organization?.supportSettings) {
        setSupportSettings(organization.supportSettings);
      } else {
        // Fallback: fetch từ API
        const res = await organizationService.getById(organization?._id);
        if (res.data?.supportSettings) {
          setSupportSettings(res.data.supportSettings);
        } else {
          setSupportSettings(null);
        }
      }
    } catch (error) {
      console.error('Error fetching support settings:', error);
      setSupportSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      message: message.trim()
    }]);
    
    setMessage('');
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        message: 'Cảm ơn bạn đã nhắn tin! Đội ngũ hỗ trợ sẽ phản hồi trong vòng 24 giờ. Nếu cần hỗ trợ khẩn cấp, vui lòng liên hệ hotline của trung tâm.'
      }]);
    }, 1000);
  };

  const handleSubmitTicket = () => {
    toast.success('Đã gửi yêu cầu hỗ trợ. Chúng tôi sẽ phản hồi sớm nhất có thể.');
  };

  const hasContactInfo = supportSettings && (
    supportSettings.hotline || 
    supportSettings.email || 
    supportSettings.zalo || 
    supportSettings.website || 
    supportSettings.address
  );

  const faqs = supportSettings?.faqs?.length > 0 ? supportSettings.faqs : null;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hỗ trợ</h1>
          <p className="text-gray-500 mt-1">Đang tải...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hỗ trợ</h1>
        <p className="text-gray-500 mt-1">
          {organization?.name ? `Liên hệ với ${organization.name} nếu bạn cần giúp đỡ` : 'Liên hệ với chúng tôi nếu bạn cần giúp đỡ'}
        </p>
      </div>

      {/* Contact Cards - Chỉ hiển thị nếu có thông tin */}
      {hasContactInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {supportSettings.hotline && (
            <a href={`tel:${supportSettings.hotline.replace(/\s/g, '')}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow block">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Phone size={28} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Hotline</h3>
              <p className="text-gray-500 text-sm mb-3">Gọi trực tiếp để được hỗ trợ</p>
              <p className="font-bold text-gray-900">{supportSettings.hotline}</p>
              {supportSettings.workingHours && (
                <p className="text-xs text-gray-500 mt-1">{supportSettings.workingHours}</p>
              )}
            </a>
          )}

          {supportSettings.email && (
            <a href={`mailto:${supportSettings.email}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow block">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Mail size={28} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-500 text-sm mb-3">Gửi email để được phản hồi</p>
              <p className="font-bold text-gray-900">{supportSettings.email}</p>
              <p className="text-xs text-gray-500 mt-1">Phản hồi trong 24 giờ</p>
            </a>
          )}

          {supportSettings.zalo && (
            <a href={supportSettings.zalo.startsWith('http') ? supportSettings.zalo : `https://zalo.me/${supportSettings.zalo}`} target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow block">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Zalo</h3>
              <p className="text-gray-500 text-sm mb-3">Nhắn tin qua Zalo</p>
              <p className="font-bold text-gray-900 flex items-center gap-1">
                {supportSettings.zalo}
                <ExternalLink size={14} />
              </p>
            </a>
          )}
        </div>
      )}

      {/* Address & Website */}
      {hasContactInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supportSettings.address && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin size={20} className="text-gray-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Địa chỉ</h3>
                  <p className="text-gray-600">{supportSettings.address}</p>
                </div>
              </div>
            </div>
          )}

          {supportSettings.website && (
            <a href={supportSettings.website.startsWith('http') ? supportSettings.website : `https://${supportSettings.website}`} target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow block">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe size={20} className="text-gray-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Website</h3>
                  <p className="text-primary-600 flex items-center gap-1">
                    {supportSettings.website}
                    <ExternalLink size={14} />
                  </p>
                </div>
              </div>
            </a>
          )}
        </div>
      )}

      {/* Main Content - Chat & FAQ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Chat */}
        {supportSettings?.chatEnabled !== false && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-primary-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                  <HeadphonesIcon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Trò chuyện trực tuyến</h3>
                  <p className="text-xs text-gray-500">Phản hồi trong vài phút</p>
                </div>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4">
              {chatMessages.map(chat => (
                <div
                  key={chat.id}
                  className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      chat.type === 'user'
                        ? 'bg-primary-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm">{chat.message}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAQ - Từ organization settings hoặc default */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <HelpCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Câu hỏi thường gặp</h3>
                <p className="text-xs text-gray-500">
                  {faqs ? 'Câu hỏi từ trung tâm' : 'Tìm câu trả lời nhanh'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {faqs ? (
              faqs.map((faq, index) => (
                <div key={index} className="p-4">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                    {expandedFaq === index ? (
                      <ChevronUp size={20} className="text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                  )}
                </div>
              ))
            ) : (
              /* Default FAQs khi không có cấu hình */
              <>
                {[
                  {
                    question: 'Làm sao để thanh toán học phí trực tuyến?',
                    answer: 'Bạn có thể thanh toán học phí qua các phương thức: Chuyển khoản ngân hàng, Ví điện tử (Momo, VNPay, ZaloPay), hoặc thẻ Visa/Mastercard. Truy cập trang "Chi tiết học phí" để xem và thanh toán các khoản phí.'
                  },
                  {
                    question: 'Tôi có thể xuất hóa đơn sau khi thanh toán không?',
                    answer: 'Có, sau khi thanh toán thành công, bạn có thể xem và tải hóa đơn trong mục "Lịch sử thanh toán". Hóa đơn sẽ được gửi qua email đăng ký.'
                  },
                  {
                    question: 'Làm sao để biết tôi đã thanh toán thành công?',
                    answer: 'Sau khi thanh toán, trạng thái khoản phí sẽ được cập nhật thành "Đã đóng" trong vòng 5-10 phút. Bạn sẽ nhận được thông báo và email xác nhận.'
                  },
                  {
                    question: 'Tôi quên mật khẩu đăng nhập, phải làm sao?',
                    answer: 'Nhấn "Quên mật khẩu" trên trang đăng nhập và nhập email đã đăng ký. Hệ thống sẽ gửi link đặt lại mật khẩu cho bạn.'
                  },
                  {
                    question: 'Có thể thanh toán học phí cho nhiều con cùng lúc không?',
                    answer: 'Có, nếu bạn có nhiều con đang học tại trường, bạn có thể xem và thanh toán học phí cho từng con bằng cách chọn tên học sinh trong mục "Chi tiết học phí".'
                  }
                ].map((faq, index) => (
                  <div key={index} className="p-4">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                      {expandedFaq === index ? (
                        <ChevronUp size={20} className="text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFaq === index && (
                      <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Tài liệu hướng dẫn</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => toast.info('Đang mở hướng dẫn sử dụng...')}
            className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen size={24} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Hướng dẫn sử dụng</p>
              <p className="text-xs text-gray-500">PDF - 2.5 MB</p>
            </div>
          </button>

          <button
            onClick={() => toast.info('Đang mở video hướng dẫn...')}
            className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Video size={24} className="text-red-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Video hướng dẫn</p>
              <p className="text-xs text-gray-500">5 video ngắn</p>
            </div>
          </button>

          <button
            onClick={() => toast.info('Đang mở chính sách...')}
            className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText size={24} className="text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Chính sách & Điều khoản</p>
              <p className="text-xs text-gray-500">Cập nhật 01/06/2024</p>
            </div>
          </button>
        </div>
      </div>

      {/* Submit Ticket */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6 border border-primary-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Bạn không tìm thấy câu trả lời?</h3>
            <p className="text-sm text-gray-600 mt-1">Gửi yêu cầu hỗ trợ và chúng tôi sẽ phản hồi sớm nhất</p>
          </div>
          <button
            onClick={handleSubmitTicket}
            className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/30"
          >
            Gửi yêu cầu hỗ trợ
          </button>
        </div>
      </div>
    </div>
  );
}