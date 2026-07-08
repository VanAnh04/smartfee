import { useState, useEffect } from 'react';
import { classService, attendanceService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Calendar, Users, Check, X, AlertCircle, 
  Search, Loader2, Save, ArrowLeft, Info
} from 'lucide-react';

const STATUS_LABELS = {
  present: 'Mặt',
  absent: 'Vắng KP',
  absent_excused: 'Vắng CP'
};

export default function Attendance() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceData, setAttendanceData] = useState({ isNew: true });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedDate) {
      fetchAttendance();
    } else {
      setStudents([]);
    }
  }, [selectedClassId, selectedDate]);

  const fetchClasses = async () => {
    try {
      const res = await classService.getAll({ limit: 100, status: 'active' });
      setClasses(res.data.classes || []);
      if (res.data.classes?.length > 0) {
        setSelectedClassId(res.data.classes[0]._id);
      }
    } catch (error) {
      toast.error('Không thể tải danh sách lớp học');
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getByClassAndDate(selectedClassId, selectedDate);
      setAttendanceData(res.data);
      
      // Chuyển đổi dữ liệu học sinh sang dạng dễ thao tác trong state
      const initialStudents = res.data.students.map(s => ({
        studentId: s.studentId._id || s.studentId, // Đề phòng populate hoặc objectId
        name: s.studentId.name,
        studentCode: s.studentId.studentCode,
        parentName: s.studentId.parentName,
        parentEmail: s.studentId.parentEmail,
        status: s.status || 'present',
        notes: s.notes || ''
      }));
      setStudents(initialStudents);
    } catch (error) {
      toast.error('Không thể tải thông tin điểm danh');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setStudents(prev => 
      prev.map(s => s.studentId === studentId ? { ...s, status } : s)
    );
  };

  const handleNotesChange = (studentId, notes) => {
    setStudents(prev => 
      prev.map(s => s.studentId === studentId ? { ...s, notes } : s)
    );
  };

  const handleMarkAll = (status) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSaveAttendance = async () => {
    try {
      setSaveLoading(true);
      const payload = {
        classId: selectedClassId,
        date: selectedDate,
        students: students.map(s => ({
          studentId: s.studentId,
          status: s.status,
          notes: s.notes
        }))
      };

      await attendanceService.save(payload);
      toast.success('Lưu điểm danh thành công!');
      fetchAttendance(); // Tải lại để cập nhật trạng thái mới nhất
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra khi lưu điểm danh');
    } finally {
      setSaveLoading(false);
    }
  };

  // Lọc học sinh theo từ khóa tìm kiếm
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.studentCode && s.studentCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedClass = classes.find(c => c._id === selectedClassId);

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    absentExcused: students.filter(s => s.status === 'absent_excused').length
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Điểm danh Học sinh</h1>
          <p className="text-gray-500 mt-1">Ghi nhận thông tin chuyên cần hàng ngày và tự động gửi email báo vắng</p>
        </div>
      </div>

      {/* Bộ lọc và thông tin chung */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/3 space-y-2">
          <label className="text-sm font-medium text-gray-700">Lớp học</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-primary-500 focus:outline-none transition-colors"
            >
              {classes.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.code ? `(${c.code})` : ''} - {c.billingType === 'session' ? 'Theo buổi' : 'Theo tháng'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full md:w-1/3 space-y-2">
          <label className="text-sm font-medium text-gray-700">Ngày điểm danh</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-primary-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="w-full md:w-1/3 flex gap-2 justify-end">
          <button
            onClick={() => handleMarkAll('present')}
            disabled={loading || students.length === 0}
            className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            Đánh dấu đi học hết
          </button>
          <button
            onClick={() => handleMarkAll('absent_excused')}
            disabled={loading || students.length === 0}
            className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            Đánh dấu vắng phép hết
          </button>
        </div>
      </div>

      {/* Hiển thị tóm tắt thống kê của buổi điểm danh */}
      {students.length > 0 && !loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
            <p className="text-xs text-green-600 font-medium">Có mặt</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.present}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-center">
            <p className="text-xs text-amber-600 font-medium">Vắng có phép</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.absentExcused}</p>
          </div>
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
            <p className="text-xs text-red-600 font-medium">Vắng không phép</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{stats.absent}</p>
          </div>
        </div>
      )}

      {/* Cảnh báo hình thức thu phí */}
      {selectedClass?.billingType === 'session' && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Lớp học tính tiền theo buổi học</p>
            <p className="mt-0.5">Mỗi buổi học sinh được điểm danh <strong>Mặt (Có mặt)</strong> sẽ được tính phí {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedClass.feeAmount)}. Các buổi Vắng sẽ không tính tiền.</p>
          </div>
        </div>
      )}

      {/* Danh sách học sinh */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm học sinh theo tên, mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>

          <div className="text-xs text-gray-500 font-medium">
            {attendanceData.isNew ? (
              <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                Chưa điểm danh hôm nay
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800">
                Đã lưu điểm danh
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <p className="text-sm text-gray-500">Đang tải danh sách học sinh...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-600">Không tìm thấy học sinh nào trong lớp</p>
            <p className="text-xs mt-1">Đảm bảo học sinh đã được thêm vào lớp học</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4">Mã HS</th>
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Trạng thái điểm danh</th>
                  <th className="px-6 py-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm">
                {filteredStudents.map(student => (
                  <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {student.studentCode}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{student.name}</div>
                      {student.parentEmail && (
                        <div className="text-xs text-gray-400 mt-0.5">{student.parentEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.studentId, 'present')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            student.status === 'present'
                              ? 'bg-green-600 border-green-600 text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Đi học
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.studentId, 'absent_excused')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            student.status === 'absent_excused'
                              ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Vắng phép
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.studentId, 'absent')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            student.status === 'absent'
                              ? 'bg-red-600 border-red-600 text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Vắng không phép
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        placeholder="Thêm ghi chú nhanh..."
                        value={student.notes}
                        onChange={(e) => handleNotesChange(student.studentId, e.target.value)}
                        className="w-full max-w-xs px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary-500 focus:bg-white bg-gray-50/50 transition-colors"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleSaveAttendance}
            disabled={saveLoading || loading || students.length === 0}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saveLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Lưu điểm danh & Gửi Gmail báo vắng
          </button>
        </div>
      </div>
    </div>
  );
}
