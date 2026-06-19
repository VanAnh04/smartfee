export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (time) => {
  if (!time) return '';
  return time.substring(0, 5);
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
};

export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export const getStatusColor = (status) => {
  const colors = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    graduated: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    unpaid: 'bg-red-100 text-red-700',
    partial: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-700',
    closed: 'bg-blue-100 text-blue-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export const getStatusLabel = (status) => {
  const labels = {
    active: 'Hoạt động',
    inactive: 'Không hoạt động',
    graduated: 'Tốt nghiệp',
    paid: 'Đã đóng',
    unpaid: 'Chưa đóng',
    partial: 'Đóng một phần',
    overdue: 'Quá hạn',
    pending: 'Đang xử lý',
    success: 'Thành công',
    failed: 'Thất bại',
    draft: 'Bản nháp',
    closed: 'Đã đóng',
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
  };
  return labels[status] || status;
};

export const getDayName = (day) => {
  const days = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
  return days[day] || '';
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};
