import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { studentService, classService, organizationService, authService } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Search, Plus, Filter, User, Phone, Mail,
  Edit, Trash2, Eye, ChevronLeft, ChevronRight, X, GraduationCap, Copy, CheckCircle, Users, KeyRound, QrCode,
  Building2, ArrowRightLeft, RefreshCw, AlertCircle, UserPlus
} from 'lucide-react';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  graduated: 'bg-blue-100 text-blue-700',
  transferred: 'bg-purple-100 text-purple-700'
};

const STATUS_LABELS = {
  active: 'Đang học',
  inactive: 'Nghỉ',
  graduated: 'Tốt nghiệp',
  transferred: 'Đã chuyển'
};

export default function Students() {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', classId: '' });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [transferringStudent, setTransferringStudent] = useState(null);
  const [createdAccounts, setCreatedAccounts] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '', dob: '', gender: 'other', parentName: '', parentPhone: '',
    parentEmail: '', address: '', classIds: [], notes: ''
  });
  const [transferForm, setTransferForm] = useState({ targetOrganizationId: '', notes: '' });
  const [errors, setErrors] = useState({});

  // Tìm kiếm học sinh có sẵn
  const [existingSearch, setExistingSearch] = useState('');
  const [existingResults, setExistingResults] = useState([]);
  const [selectedExistingStudent, setSelectedExistingStudent] = useState(null);
  const [searchingExisting, setSearchingExisting] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetchOrganizations();
  }, [pagination.page, filters]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        search: search || undefined,
        status: filters.status || undefined,
        classId: filters.classId || undefined
      };
      const res = await studentService.getAll(params);
      setStudents(res.data.students);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error('Không thể tải danh sách học sinh');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await classService.getAll({ limit: 100 });
      setClasses(res.data.classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await organizationService.getAll({ limit: 100 });
      setOrganizations(res.data.organizations || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  // Tìm kiếm học sinh có sẵn khi nhập
  const searchExistingStudents = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setExistingResults([]);
      return;
    }
    setSearchingExisting(true);
    try {
      const res = await studentService.searchExisting(query);
      setExistingResults(res.data.students || []);
    } catch (error) {
      console.error('Error searching existing students:', error);
    } finally {
      setSearchingExisting(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (existingSearch) searchExistingStudents(existingSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [existingSearch, searchExistingStudents]);

  // Kiểm tra trùng lặp khi nhập SĐT
  const checkDuplicate = useCallback(async (phone) => {
    if (!phone || phone.length < 9) return;
    try {
      const res = await studentService.checkDuplicate(phone);
      if (res.data.found) {
        const dup = res.data.student;
        setErrors(e => ({
          ...e,
          parentPhone: `HS "${dup.name}" đã có ở "${dup.organizationName}". Nhấn "Ghi danh" để thêm vào trung tâm này.`
        }));
      }
    } catch (error) {
      console.error('Error checking duplicate:', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.parentPhone) checkDuplicate(formData.parentPhone);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.parentPhone, checkDuplicate]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    fetchStudents();
  };

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPagination(p => ({ ...p, page: 1 }));
  };

  // Mở modal thêm mới
  const openAddModal = () => {
    setEditingStudent(null);
    setSelectedExistingStudent(null);
    setExistingSearch('');
    setExistingResults([]);
    setFormData({
      name: '', dob: '', gender: 'other', parentName: '', parentPhone: '',
      parentEmail: '', address: '', classIds: [], notes: ''
    });
    setErrors({});
    setShowModal(true);
  };

  // Mở modal sửa
  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      dob: student.dob ? student.dob.split('T')[0] : '',
      gender: student.gender || 'other',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      parentEmail: student.parentEmail || '',
      address: student.address || '',
      classIds: student.classIds?.map(c => c._id || c) || [],
      notes: student.notes || ''
    });
    setErrors({});
    setShowModal(true);
  };

  // Mở modal chuyển trung tâm
  const openTransferModal = (student) => {
    setTransferringStudent(student);
    setTransferForm({ targetOrganizationId: '', notes: '' });
    setShowTransferModal(true);
  };

  // Chọn học sinh có sẵn để ghi danh
  const selectExistingStudent = (student) => {
    setSelectedExistingStudent(student);
    setFormData({
      name: student.name,
      dob: student.dob ? student.dob.split('T')[0] : '',
      gender: student.gender || 'other',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      parentEmail: student.parentEmail || '',
      address: student.address || '',
      classIds: [],
      notes: ''
    });
    setErrors({});
  };

  // Bỏ chọn học sinh có sẵn
  const clearExistingStudent = () => {
    setSelectedExistingStudent(null);
    setFormData(f => ({
      ...f,
      name: '', dob: '', gender: 'other',
      parentPhone: '', parentEmail: ''
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Tên học sinh là bắt buộc';
    if (formData.parentEmail && !/\S+@\S+\.\S+/.test(formData.parentEmail)) {
      newErrors.parentEmail = 'Email không hợp lệ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingStudent) {
        await studentService.update(editingStudent._id, formData);
        toast.success('Cập nhật học sinh thành công');
        setShowModal(false);
        fetchStudents();
      } else {
        // Tạo mới hoặc ghi danh
        const payload = {
          ...formData,
          existingGlobalStudentId: selectedExistingStudent?.globalStudentId
        };
        const res = await studentService.create(payload);

        const newStudent = res.data.student || res.data;
        
        if (res.data.isEnrollment) {
          toast.success('Ghi danh học sinh thành công!');
        } else {
          toast.success('Thêm học sinh thành công!');
        }

        // Tạo tài khoản
        try {
          const accountRes = await authService.createUserAccounts({
            studentId: newStudent._id,
            parentEmail: formData.parentEmail,
            parentPhone: formData.parentPhone,
            parentName: formData.parentName
          });
          if (accountRes.data) {
            setCreatedAccounts(accountRes.data);
            setShowAccountModal(true);
          }
        } catch (accountError) {
          console.error('Error creating accounts:', accountError);
        }

        setShowModal(false);
        fetchStudents();
      }
    } catch (error) {
      const msg = error.response?.data?.error || 'Có lỗi xảy ra';
      toast.error(msg);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.targetOrganizationId) {
      toast.error('Vui lòng chọn trung tâm đích');
      return;
    }
    try {
      await studentService.transfer(transferringStudent._id, transferForm);
      toast.success('Chuyển học sinh thành công');
      setShowTransferModal(false);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa học sinh này?')) return;
    try {
      await studentService.delete(id);
      toast.success('Xóa học sinh thành công');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể xóa học sinh');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Học sinh</h1>
          <p className="text-gray-500 mt-1">Tổng cộng {pagination.total} học sinh</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Thêm học sinh
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
                placeholder="Tìm theo tên, mã HS, SĐT phụ huynh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
          </form>
          <div className="flex gap-2">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
            >
              <option value="">Tất cả</option>
              <option value="active">Đang học</option>
              <option value="inactive">Nghỉ</option>
              <option value="graduated">Tốt nghiệp</option>
              <option value="transferred">Đã chuyển</option>
            </select>
            <select
              value={filters.classId}
              onChange={(e) => handleFilterChange('classId', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
            >
              <option value="">Tất cả lớp</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Học sinh</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Liên hệ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Lớp</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Trung tâm khác</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Trạng thái</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse"></div></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Chưa có học sinh nào</p>
                    <button onClick={openAddModal} className="mt-2 text-primary-600 hover:underline">
                      Thêm học sinh đầu tiên
                    </button>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {student.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.studentCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {student.parentName && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <User size={14} /> {student.parentName}
                          </p>
                        )}
                        {student.parentPhone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone size={14} /> {student.parentPhone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {student.classIds?.slice(0, 2).map((c, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {c.name || c}
                          </span>
                        ))}
                        {student.classIds?.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{student.classIds.length - 2}
                          </span>
                        )}
                        {(!student.classIds || student.classIds.length === 0) && (
                          <span className="text-sm text-gray-400">Chưa có lớp</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {student.otherEnrollments?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {student.otherEnrollments.slice(0, 2).map((e, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs flex items-center gap-1">
                              <Building2 size={12} />
                              {e.organizationId?.name || 'Trung tâm'}
                            </span>
                          ))}
                          {student.otherEnrollments.length > 2 && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              +{student.otherEnrollments.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[student.status]}`}>
                        {STATUS_LABELS[student.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/students/${student._id}`} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-600">
                          <Eye size={18} />
                        </Link>
                        <button onClick={() => openEditModal(student)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-600">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => openTransferModal(student)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600" title="Chuyển trung tâm">
                          <ArrowRightLeft size={18} />
                        </button>
                        <button onClick={() => handleDelete(student._id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang {pagination.page} / {pagination.pages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa Học sinh */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingStudent ? 'Chỉnh sửa học sinh' : 'Thêm học sinh'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Tìm kiếm học sinh có sẵn - chỉ hiện khi thêm mới */}
            {!editingStudent && !selectedExistingStudent && (
              <div className="px-6 pt-4 border-b border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <UserPlus size={16} className="inline mr-1" />
                  Tìm học sinh đã ghi danh ở trung tâm khác
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nhập tên, mã HS, hoặc SĐT..."
                    value={existingSearch}
                    onChange={(e) => setExistingSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
                
                {searchingExisting && (
                  <p className="mt-2 text-sm text-gray-500">Đang tìm...</p>
                )}
                
                {existingResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {existingResults.map((student) => (
                      <button
                        key={student._id}
                        type="button"
                        onClick={() => selectExistingStudent(student)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-500">
                              {student.studentCode} • {student.organizationId?.name}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[student.status]}`}>
                            {STATUS_LABELS[student.status]}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Thông tin học sinh đã chọn */}
            {!editingStudent && selectedExistingStudent && (
              <div className="px-6 pt-4 border-b border-gray-100">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <RefreshCw size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-purple-900">Ghi danh: {selectedExistingStudent.name}</p>
                        <p className="text-sm text-purple-700">
                          Từ: {selectedExistingStudent.organizationId?.name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearExistingStudent}
                      className="text-purple-600 hover:text-purple-800 text-sm"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên học sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 outline-none ${
                      errors.name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Nguyễn Văn A"
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData(f => ({ ...f, dob: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(f => ({ ...f, gender: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  >
                    <option value="other">Khác</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên phụ huynh</label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData(f => ({ ...f, parentName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                    placeholder="Nguyễn Thị B"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SĐT phụ huynh</label>
                  <input
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData(f => ({ ...f, parentPhone: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 outline-none ${
                      errors.parentPhone ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                    }`}
                    placeholder="0123456789"
                  />
                  {errors.parentPhone && (
                    <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.parentPhone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email phụ huynh</label>
                  <input
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData(f => ({ ...f, parentEmail: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 outline-none ${
                      errors.parentEmail ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="email@example.com"
                  />
                  {errors.parentEmail && <p className="text-sm text-red-500 mt-1">{errors.parentEmail}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(f => ({ ...f, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lớp học</label>
                  <div className="flex flex-wrap gap-2">
                    {classes.map(c => (
                      <label key={c._id} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.classIds.includes(c._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(f => ({ ...f, classIds: [...f.classIds, c._id] }));
                            } else {
                              setFormData(f => ({ ...f, classIds: f.classIds.filter(id => id !== c._id) }));
                            }
                          }}
                          className="rounded text-primary-600"
                        />
                        <GraduationCap size={16} className="text-gray-400" />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  />
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
                  className={`px-4 py-2 rounded-lg text-white ${
                    selectedExistingStudent 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {editingStudent ? 'Cập nhật' : (selectedExistingStudent ? 'Ghi danh' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chuyển Trung tâm */}
      {showTransferModal && transferringStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chuyển học sinh</h2>
              <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-medium text-blue-900">{transferringStudent.name}</p>
                <p className="text-sm text-blue-700">{transferringStudent.studentCode}</p>
              </div>

              <form onSubmit={handleTransfer}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chọn trung tâm đích <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={transferForm.targetOrganizationId}
                    onChange={(e) => setTransferForm(f => ({ ...f, targetOrganizationId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                    required
                  >
                    <option value="">-- Chọn trung tâm --</option>
                    {organizations
                      .filter(org => org._id !== transferringStudent.organizationId)
                      .map(org => (
                        <option key={org._id} value={org._id}>{org.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowTransferModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Hủy
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Chuyển trung tâm
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tài khoản đã tạo */}
      {showAccountModal && createdAccounts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <CheckCircle size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Tạo tài khoản thành công!</h2>
                    <p className="text-emerald-100 text-sm">Hãy lưu lại thông tin bên dưới</p>
                  </div>
                </div>
                <button onClick={() => setShowAccountModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {createdAccounts.familyAccount && !createdAccounts.familyAccount.existed && (
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-blue-800">Tài khoản Phụ huynh</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between bg-white rounded-lg p-3">
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-mono">{createdAccounts.familyAccount.email}</p>
                      </div>
                      <button onClick={() => copyToClipboard(createdAccounts.familyAccount.email, 'email')} className="text-gray-400 hover:text-primary-600">
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="flex justify-between bg-white rounded-lg p-3">
                      <div>
                        <p className="text-xs text-gray-500">Mật khẩu</p>
                        <p className="font-mono">{createdAccounts.familyAccount.password}</p>
                      </div>
                      <button onClick={() => copyToClipboard(createdAccounts.familyAccount.password, 'mật khẩu')} className="text-gray-400 hover:text-primary-600">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {createdAccounts.studentAccount && !createdAccounts.studentAccount.existed && (
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap size={18} className="text-green-600" />
                    <h3 className="font-semibold text-green-800">Tài khoản Học sinh</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between bg-white rounded-lg p-3">
                      <div>
                        <p className="text-xs text-gray-500">Mã HS</p>
                        <p className="font-mono">{createdAccounts.studentAccount.studentCode}</p>
                      </div>
                      <button onClick={() => copyToClipboard(createdAccounts.studentAccount.studentCode, 'mã HS')} className="text-gray-400 hover:text-primary-600">
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="flex justify-between bg-white rounded-lg p-3">
                      <div>
                        <p className="text-xs text-gray-500">Mật khẩu</p>
                        <p className="font-mono">{createdAccounts.studentAccount.password}</p>
                      </div>
                      <button onClick={() => copyToClipboard(createdAccounts.studentAccount.password, 'mật khẩu')} className="text-gray-400 hover:text-primary-600">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(createdAccounts.familyAccount?.existed || createdAccounts.studentAccount?.existed) && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-center gap-3">
                  <KeyRound size={20} className="text-amber-600" />
                  <p className="text-sm text-amber-800">Tài khoản đã tồn tại - học sinh đã được thêm vào.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setShowAccountModal(false)}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}