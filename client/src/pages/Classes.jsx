import { useState, useEffect, useRef } from 'react';
import { classService, studentService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';
import {
  Search, Plus, Users, GraduationCap, Clock, Edit, Trash2,
  ChevronLeft, ChevronRight, X, DollarSign, UserCheck
} from 'lucide-react';

const DAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export default function Classes() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const studentPickerRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '', code: '', description: '', teacherName: '', schedule: [],
    maxStudents: 30, feeAmount: 0, startDate: '', endDate: '',
    studentIds: []
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (studentPickerRef.current && !studentPickerRef.current.contains(e.target)) {
        setShowStudentPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined
      };
      const res = await classService.getAll(params);
      setClasses(res.data.classes);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error('Không thể tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await studentService.getAll({ limit: 500, status: 'active' });
      setAllStudents(res.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    fetchClasses();
  };

  const openAddModal = () => {
    setEditingClass(null);
    setShowStudentPicker(false);
    setStudentSearch('');
    setFormData({
      name: '', code: '', description: '', teacherName: '', schedule: [],
      maxStudents: 30, feeAmount: 0, billingType: 'monthly', startDate: '', endDate: '',
      studentIds: []
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = async (cls) => {
    setEditingClass(cls);
    try {
      const res = await classService.getById(cls._id);
      const detail = res.data;
      setFormData({
        name: cls.name,
        code: cls.code || '',
        description: cls.description || '',
        teacherName: cls.teacherName || '',
        schedule: cls.schedule || [],
        maxStudents: cls.maxStudents || 30,
        feeAmount: cls.feeAmount || 0,
        billingType: cls.billingType || 'monthly',
        startDate: cls.startDate ? cls.startDate.split('T')[0] : '',
        endDate: cls.endDate ? cls.endDate.split('T')[0] : '',
        studentIds: (detail.students || []).map(s => s._id)
      });
    } catch (error) {
      setFormData({
        name: cls.name,
        code: cls.code || '',
        description: cls.description || '',
        teacherName: cls.teacherName || '',
        schedule: cls.schedule || [],
        maxStudents: cls.maxStudents || 30,
        feeAmount: cls.feeAmount || 0,
        billingType: cls.billingType || 'monthly',
        startDate: cls.startDate ? cls.startDate.split('T')[0] : '',
        endDate: cls.endDate ? cls.endDate.split('T')[0] : '',
        studentIds: []
      });
    }
    setErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Tên lớp là bắt buộc';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingClass) {
        await classService.update(editingClass._id, formData);
        toast.success('Cập nhật lớp học thành công');
      } else {
        await classService.create(formData);
        toast.success('Thêm lớp học thành công');
      }
      setShowModal(false);
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa lớp học này?')) return;
    try {
      await classService.delete(id);
      toast.success('Xóa lớp học thành công');
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể xóa lớp học');
    }
  };

  const addSchedule = () => {
    setFormData(f => ({
      ...f,
      schedule: [...f.schedule, { day: 2, startTime: '08:00', endTime: '10:00' }]
    }));
  };

  const removeSchedule = (index) => {
    setFormData(f => ({
      ...f,
      schedule: f.schedule.filter((_, i) => i !== index)
    }));
  };

  const updateSchedule = (index, field, value) => {
    setFormData(f => ({
      ...f,
      schedule: f.schedule.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const toggleStudent = (studentId) => {
    setFormData(f => {
      const current = f.studentIds || [];
      const isSelected = current.includes(studentId);
      const newIds = isSelected
        ? current.filter(id => id !== studentId)
        : [...current, studentId];
      return { ...f, studentIds: newIds };
    });
  };

  const filteredStudents = allStudents.filter(s => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.studentCode?.toLowerCase().includes(q) ||
      s.parentPhone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Lớp học</h1>
          <p className="text-gray-500 mt-1">Tổng cộng {pagination.total} lớp học</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Thêm lớp học
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã lớp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm h-48 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/4"></div>
            </div>
          ))
        ) : classes.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Chưa có lớp học nào</p>
            <button onClick={openAddModal} className="mt-2 text-primary-600 hover:underline">
              Thêm lớp học đầu tiên
            </button>
          </div>
        ) : (
          classes.map((cls) => (
            <div key={cls._id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      cls.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {cls.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                  </div>
                  {cls.code && <p className="text-sm text-gray-500 mt-1">{cls.code}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(cls)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-600"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cls._id)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {cls.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{cls.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Users size={14} /> Sĩ số
                  </span>
                  <span className="font-medium">
                    {cls.currentStudents || 0} / {cls.maxStudents}
                  </span>
                </div>

                {cls.schedule?.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock size={14} />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cls.schedule.slice(0, 3).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {DAYS[s.day - 2]?.substring(0, 3)} {s.startTime}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {cls.feeAmount > 0 && (
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
                    <span className="text-gray-500 flex items-center gap-1">
                      <DollarSign size={14} /> Học phí
                    </span>
                    <span className="font-medium text-primary-600">
                      {formatCurrency(cls.feeAmount)}/{cls.billingType === 'session' ? 'buổi' : 'tháng'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Trang {pagination.page} / {pagination.pages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingClass ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tên lớp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 outline-none ${
                      errors.name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Lớp Toán A"
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* Mã lớp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã lớp</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                    placeholder="TOAN-A"
                  />
                </div>

                {/* Mô tả */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                    rows={2}
                    placeholder="Mô tả về lớp học..."
                  />
                </div>

                {/* Giáo viên */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giáo viên</label>
                  <input
                    type="text"
                    value={formData.teacherName}
                    onChange={(e) => setFormData(f => ({ ...f, teacherName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                    placeholder="Nguyễn Văn Giáo"
                  />
                </div>

                {/* Sĩ số */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sĩ số tối đa</label>
                  <input
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData(f => ({ ...f, maxStudents: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                    min="1"
                  />
                </div>

                {/* Hình thức thu phí */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức thu phí</label>
                  <select
                    value={formData.billingType}
                    onChange={(e) => setFormData(f => ({ ...f, billingType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  >
                    <option value="monthly">Theo tháng</option>
                    <option value="session">Theo buổi học</option>
                  </select>
                </div>

                {/* Học phí */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.billingType === 'session' ? 'Học phí mỗi buổi (VNĐ/buổi)' : 'Học phí (VNĐ/tháng)'}
                  </label>
                  <input
                    type="number"
                    value={formData.feeAmount}
                    onChange={(e) => setFormData(f => ({ ...f, feeAmount: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                    placeholder="500000"
                    min="0"
                  />
                </div>

                {/* Ngày bắt đầu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                {/* Ngày kết thúc */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                {/* Lịch học */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Lịch học</label>
                    <button
                      type="button"
                      onClick={addSchedule}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      + Thêm lịch
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.schedule.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={s.day}
                          onChange={(e) => updateSchedule(i, 'day', parseInt(e.target.value))}
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        >
                          {[2, 3, 4, 5, 6, 7, 8].map(d => (
                            <option key={d} value={d}>{DAYS[d - 2]}</option>
                          ))}
                        </select>
                        <input
                          type="time"
                          value={s.startTime}
                          onChange={(e) => updateSchedule(i, 'startTime', e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="time"
                          value={s.endTime}
                          onChange={(e) => updateSchedule(i, 'endTime', e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeSchedule(i)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danh sách học sinh - Compact Dropdown */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <UserCheck size={16} />
                    Học sinh trong lớp
                    {(formData.studentIds?.length || 0) > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                        {formData.studentIds.length} học sinh
                      </span>
                    )}
                  </label>

                  <div className="relative" ref={studentPickerRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowStudentPicker(!showStudentPicker);
                        setStudentSearch('');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 border rounded-lg hover:border-gray-300 transition-colors bg-white text-left"
                    >
                      <span className={formData.studentIds.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                        {formData.studentIds.length > 0
                          ? `Đã chọn ${formData.studentIds.length} học sinh`
                          : 'Chọn học sinh...'}
                      </span>
                      <ChevronRight
                        size={16}
                        className={`text-gray-400 transition-transform ${showStudentPicker ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {showStudentPicker && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Tìm tên, mã HS, SĐT..."
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="max-h-52 overflow-y-auto">
                          {filteredStudents.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-400">
                              Không tìm thấy học sinh
                            </div>
                          ) : (
                            filteredStudents.map(student => {
                              const isSelected = (formData.studentIds || []).includes(student._id);
                              return (
                                <label
                                  key={student._id}
                                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary-50' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleStudent(student._id)}
                                    className="rounded text-primary-600"
                                  />
                                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-medium flex-shrink-0">
                                    {student.name?.charAt(0)?.toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                                    <p className="text-xs text-gray-400">{student.studentCode}</p>
                                  </div>
                                  {student.parentPhone && (
                                    <p className="text-xs text-gray-400 flex-shrink-0">{student.parentPhone}</p>
                                  )}
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {(formData.studentIds?.length || 0) > formData.maxStudents && (
                    <p className="text-sm text-red-500 mt-1">
                      Sĩ số vượt quá giới hạn ({formData.studentIds.length} / {formData.maxStudents})
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingClass ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
