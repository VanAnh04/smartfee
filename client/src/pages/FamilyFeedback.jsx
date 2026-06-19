import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { feedbackService } from '../services/feedback';
import { Star, MessageSquare, Send, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const TYPES = [
  { value: 'bug', label: 'Báo lỗi' },
  { value: 'feature', label: 'Góp ý chức năng' },
  { value: 'improvement', label: 'Cải thiện' },
  { value: 'other', label: 'Khác' },
];

export default function FamilyFeedback() {
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({ type: 'other', rating: 5, title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung góp ý');
      return;
    }

    try {
      setSubmitting(true);
      await feedbackService.create({
        type: form.type,
        rating: Number(form.rating),
        title: form.title.trim(),
        content: form.content.trim()
      });
      toast.success('Gửi góp ý thành công. Cảm ơn bạn!');
      setForm({ type: 'other', rating: 5, title: '', content: '' });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Không gửi được góp ý');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Góp ý & Đánh giá</h1>
        <p className="text-gray-500 mt-1">Chia sẻ trải nghiệm của bạn để chúng tôi cải thiện dịch vụ tốt hơn</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại góp ý</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đánh giá</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, rating: value })}
                  className={`p-1 rounded-md transition-colors ${
                    value <= form.rating ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'
                  }`}
                >
                  <Star size={24} fill={value <= form.rating ? 'currentColor' : 'none'} />
                </button>
              ))}
              <span className="text-sm text-gray-500 ml-2">{form.rating}/5</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Tóm tắt ngắn gọn góp ý"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung chi tiết</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Mô tả chi tiết vấn đề hoặc đề xuất của bạn..."
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Gửi góp ý
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
