import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Calendar, Clock, BookOpen, Download, 
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Users, FileText, Printer 
} from 'lucide-react';

export default function App() {
  // ---------------- AUTH STATE ----------------
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [loginEmail, setLoginEmail] = useState('student56@college.edu');
  const [loginPassword, setLoginPassword] = useState('DCSGU');
  const [authError, setAuthError] = useState('');

  // Top Nav Tab
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' | 'student' | 'admin' | 'leave_portal'

  // Faculty Workflow State
  const [facultySubView, setFacultySubView] = useState('main'); // 'main' | 'view_attend' | 'view_subject' | 'take_attend'

  // Filter Dropdowns
  const [course, setCourse] = useState('Integrated M.Sc (CS)');
  const [semester, setSemester] = useState(7);
  const [division, setDivision] = useState('ALL');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [slot, setSlot] = useState('10:30 AM - 11:30 AM');
  const [todaySchedule, setTodaySchedule] = useState([]);

  // Project Group State
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [isGroupSelectNeeded, setIsGroupSelectNeeded] = useState(false);

  // Attendance Register (Take Attend) State
  const [attendDate, setAttendDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeFrom, setTimeFrom] = useState('10:30');
  const [timeTo, setTimeTo] = useState('11:30');
  const [topicOption, setTopicOption] = useState('Default Syllabus');
  const [customTopic, setCustomTopic] = useState('');
  const [description, setDescription] = useState('');
  const [roster, setRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [submitMsg, setSubmitMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // View Attend (Sessions) & Pagination State
  const [historySessions, setHistorySessions] = useState([]);
  const [attendPage, setAttendPage] = useState(1);
  const [activeSessionRecords, setActiveSessionRecords] = useState(null);

  // View Subject Sub-flow States
  const [subjectActiveTab, setSubjectActiveTab] = useState('topic'); // 'topic' | 'report_75'
  const [thresholdType, setThresholdType] = useState('less_than');
  const [reportResult, setReportResult] = useState(null);

  // ERP Leave Module State
  const [leavesList, setLeavesList] = useState([]);
  const [leaveType, setLeaveType] = useState('MEDICAL');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveMsg, setLeaveMsg] = useState('');

  // Student Portal State
  const [searchRollNo, setSearchRollNo] = useState(user?.rollNo || '56');
  const [studentData, setStudentData] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  // Admin CSV & CRUD State
  const [csvFile, setCsvFile] = useState(null);
  const [adminMsg, setAdminMsg] = useState('');
  const [adminDivisionFilter, setAdminDivisionFilter] = useState('ALL');
  const [adminTrackFilter, setAdminTrackFilter] = useState('ALL');
  const [adminStudentsList, setAdminStudentsList] = useState([]);
  const [isEditingStudent, setIsEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({ rollNo: '', name: '', currentSem: 7, division: 'Div-1', track: 'AI' });
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // ---------------- AUTH HANDLERS ----------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        if (data.user.role === 'STUDENT') {
          setActiveTab('student');
          setSearchRollNo(data.user.rollNo || '56');
        } else {
          setActiveTab('faculty');
          setFacultySubView('main');
        }
      } else {
        setAuthError(data.message || 'Login failed');
      }
    } catch (err) {
      setAuthError('Cannot connect to server');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setStudentData(null);
    localStorage.clear();
  };

  // ---------------- FETCH SUBJECTS & TIMETABLE ----------------
  useEffect(() => {
    if (user) {
      fetch(`http://localhost:5000/api/subjects?semester=${semester}`)
        .then(res => res.json())
        .then(data => {
          setSubjects(data || []);
          if (data && data.length > 0) {
            setSelectedSubjectId(data[0]._id);
            setSelectedGroupId('');
            setIsGroupSelectNeeded(false);
          } else {
            setSelectedSubjectId('');
          }
        })
        .catch(err => console.error(err));

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      fetch(`http://localhost:5000/api/timetable/today?day=${today}&semester=${semester}`)
        .then(res => res.json())
        .then(data => setTodaySchedule(data || []))
        .catch(err => console.error(err));
    }
  }, [semester, user]);

  // ---------------- LOAD ROSTER (TAKE ATTEND) ----------------
  const loadRosterForAttendance = async () => {
    if (!selectedSubjectId) return;
    setLoading(true);
    setSubmitMsg('');
    try {
      let url = `http://localhost:5000/api/attendance/roster?subjectId=${selectedSubjectId}&division=${division}`;
      if (selectedGroupId) url += `&groupId=${selectedGroupId}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.isGroupSelectNeeded && !selectedGroupId) {
        setIsGroupSelectNeeded(true);
        setGroups(data.groups || []);
        setRoster([]);
      } else {
        setIsGroupSelectNeeded(false);
        const students = data.students || [];
        setRoster(students);
        const map = {};
        students.forEach(st => { map[st._id] = 'PRESENT'; });
        setAttendanceMap(map);
        setFacultySubView('take_attend');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (id) => {
    setAttendanceMap(prev => ({
      ...prev,
      [id]: prev[id] === 'PRESENT' ? 'ABSENT' : 'PRESENT'
    }));
  };

  const markAll = (status) => {
    const updated = {};
    roster.forEach(st => { updated[st._id] = status; });
    setAttendanceMap(updated);
  };

  const totalStudents = roster.length;
  const presentCount = Object.values(attendanceMap).filter(v => v === 'PRESENT').length;
  const todayPercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  // ---------------- SUBMIT ATTENDANCE ----------------
  const handleSubmitAttendance = async () => {
    setIsSubmitting(true);
    setSubmitMsg('');
    const selectedSub = subjects.find(s => s._id === selectedSubjectId);
    const finalTopic = topicOption === 'Other' ? customTopic : `${selectedSub?.name || 'Lecture'} - Module`;

    const payload = {
      subjectId: selectedSubjectId,
      facultyName: user?.name || 'Prof. Faculty',
      slot: `${timeFrom} - ${timeTo}`,
      sessionDate: attendDate,
      topic: finalTopic,
      description,
      divisionTarget: division,
      groupId: selectedGroupId || null,
      records: roster.map(st => ({
        studentId: st._id,
        status: attendanceMap[st._id]
      }))
    };

    try {
      const res = await fetch('http://localhost:5000/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSubmitMsg('Attendance successfully submitted and recorded in database!');
        setTimeout(() => setFacultySubView('main'), 1200);
      } else {
        setSubmitMsg('Failed to record attendance');
      }
    } catch (err) {
      setSubmitMsg('Server connection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------- VIEW ATTEND WORKFLOW ----------------
  const handleOpenViewAttend = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/history?semester=${semester}`);
      const data = await res.json();
      setHistorySessions(data || []);
      setAttendPage(1);
      setFacultySubView('view_attend');
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSessionModal = async (sessionId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/session/${sessionId}`);
      const data = await res.json();
      setActiveSessionRecords(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- 75% REPORT ----------------
  const handleGenerate75Report = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/analytics/defaulters?semester=${semester}`);
      const data = await res.json();
      if (thresholdType === 'less_than') {
        setReportResult(data.filter(d => parseFloat(d.percentage) < 75));
      } else {
        setReportResult(data.filter(d => parseFloat(d.percentage) >= 75));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- ERP LEAVE WORKFLOW ----------------
  const fetchLeaves = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/leave/all');
      const data = await res.json();
      setLeavesList(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLeaveMsg('');
    try {
      let stId = studentData?.student?._id;

      if (!stId && user?.rollNo) {
        const studentRes = await fetch(`http://localhost:5000/api/attendance/student/${user.rollNo}`);
        const studentJson = await studentRes.json();
        stId = studentJson?.student?._id;
      }

      if (!stId) {
        setLeaveMsg('Error: Student profile not found. Please verify your roll number.');
        return;
      }

      const res = await fetch('http://localhost:5000/api/leave/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: stId,
          leaveType,
          fromDate: leaveFrom,
          toDate: leaveTo,
          reason: leaveReason
        })
      });

      if (res.ok) {
        setLeaveMsg('Leave application filed successfully!');
        setLeaveReason('');
        setLeaveFrom('');
        setLeaveTo('');
        fetchLeaves();
      } else {
        setLeaveMsg('Failed to submit application.');
      }
    } catch (err) {
      setLeaveMsg('Error submitting application');
    }
  };

  const updateLeaveStatus = async (leaveId, status) => {
    try {
      await fetch('http://localhost:5000/api/leave/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveId, status, facultyName: user.name })
      });
      fetchLeaves();
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- STUDENT ANALYTICS ----------------
  const fetchStudentAnalytics = async () => {
    const rollToQuery = searchRollNo || user?.rollNo;
    if (!rollToQuery) return;
    setStudentLoading(true);
    setStudentError('');
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/student/${rollToQuery}`);
      const data = await res.json();
      if (res.ok) setStudentData(data);
      else { setStudentError(data.message || 'Error'); setStudentData(null); }
    } catch (err) {
      setStudentError('Cannot connect to server');
    } finally {
      setStudentLoading(false);
    }
  };

  // ---------------- SUPER ADMIN STUDENTS CRUD & BULK DELETE ----------------
  const fetchAdminStudents = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/students?division=${adminDivisionFilter}&track=${adminTrackFilter}`);
      const data = await res.json();
      setAdminStudentsList(data || []);
      setSelectedStudentIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'student') fetchStudentAnalytics();
    if (activeTab === 'leave_portal') fetchLeaves();
    if (activeTab === 'admin') fetchAdminStudents();
  }, [activeTab, adminDivisionFilter, adminTrackFilter]);

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      const url = isEditingStudent 
        ? `http://localhost:5000/api/students/update/${isEditingStudent._id}`
        : 'http://localhost:5000/api/students/add';
      
      const method = isEditingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm)
      });

      if (res.ok) {
        setStudentModalOpen(false);
        setIsEditingStudent(null);
        setStudentForm({ rollNo: '', name: '', currentSem: 7, division: 'Div-1', track: 'AI' });
        fetchAdminStudents();
      } else {
        alert('Operation failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/students/delete/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAdminStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckboxChange = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = adminStudentsList.map(st => st._id);
      setSelectedStudentIds(allIds);
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) {
      alert('Please select at least one student.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selectedStudentIds.length} selected students?`)) return;

    try {
      const res = await fetch('http://localhost:5000/api/students/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedStudentIds })
      });

      if (res.ok) {
        setSelectedStudentIds([]);
        fetchAdminStudents();
      } else {
        alert('Failed to delete selected students.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('file', csvFile);
    try {
      const res = await fetch('http://localhost:5000/api/students/import-csv', { method: 'POST', body: formData });
      const data = await res.json();
      setAdminMsg(data.message || 'Upload complete');
      fetchAdminStudents();
    } catch (err) {
      setAdminMsg('Upload failed');
    }
  };

  const selectedSubjectObj = subjects.find(s => s._id === selectedSubjectId);

  // Filter leaves for student role RBAC
  const visibleLeaves = user?.role === 'STUDENT' 
    ? leavesList.filter(l => l.studentId?.rollNo === user.rollNo) 
    : leavesList;

  // =========================================================================
  // LOGIN SCREEN
  // =========================================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-black text-slate-800 text-center mb-1">College Portal Login</h2>
          <p className="text-center text-xs text-slate-500 mb-6">Integrated M.Sc Attendance Management</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
              <input
                type="email"
                className="w-full border p-2.5 rounded-lg text-sm"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
              <input
                type="password"
                className="w-full border p-2.5 rounded-lg text-sm"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
              />
            </div>
            {authError && <p className="text-rose-600 text-xs font-bold">{authError}</p>}
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition">
              Sign In
            </button>
          </form>

          <div className="mt-6 pt-4 border-t text-center text-xs text-slate-500 space-y-1">
            <p>Faculty: <b>faculty@college.edu</b> / 123456</p>
            <p>Student: <b>divyvaghela63@gmail.com</b> / 123456</p>
            <p>Admin: <b>admin@college.edu</b> / 123456</p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN ERP INTERFACE
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-6 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:m-0 print:p-0 print:max-w-none">
        
        {/* Top Navbar */}
        <div className="bg-slate-900 p-5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 print:hidden">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">Integrated M.Sc (Computer Science)</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Logged in: <b className="text-indigo-400">{user.name} ({user.role})</b>
            </p>
          </div>
          <div className="flex flex-wrap items-center bg-slate-800 p-1 rounded-xl border border-slate-700 gap-1 text-xs font-bold">
            {(user.role === 'FACULTY' || user.role === 'ADMIN') && (
              <button 
                onClick={() => { setActiveTab('faculty'); setFacultySubView('main'); }} 
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'faculty' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
              >
                Faculty Page
              </button>
            )}
            <button 
              onClick={() => setActiveTab('student')} 
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'student' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
            >
              Student Portal
            </button>
            <button 
              onClick={() => setActiveTab('leave_portal')} 
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'leave_portal' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
            >
              Leave & OD (ERP)
            </button>
            {user.role === 'ADMIN' && (
              <button 
                onClick={() => setActiveTab('admin')} 
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
              >
                Super Admin
              </button>
            )}
            <button onClick={handleLogout} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg ml-2">
              Logout
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FACULTY PAGE WORKFLOW                                              */}
        {/* ========================================================================= */}
        {activeTab === 'faculty' && (
          <div className="p-4 md:p-8 print:p-0">

            {facultySubView === 'main' && (
              <div className="space-y-6">

                {todaySchedule.length > 0 && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                    <span className="text-xs font-black uppercase text-indigo-900 block mb-2.5 tracking-wider">
                      TODAY'S SCHEDULED LECTURES:
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {todaySchedule.map(s => (
                        <button
                          key={s._id}
                          onClick={() => {
                            setSelectedSubjectId(s.subjectId._id);
                            setSlot(s.slot);
                            setTimeFrom(s.slot.split(' - ')[0]?.trim() || '10:30');
                            setTimeTo(s.slot.split(' - ')[1]?.trim() || '11:30');
                          }}
                          className={`border text-xs px-3.5 py-2 rounded-xl font-bold transition shadow-sm ${
                            selectedSubjectId === s.subjectId._id 
                              ? 'bg-indigo-600 text-white border-indigo-600' 
                              : 'bg-white border-indigo-300 text-indigo-800 hover:bg-indigo-50'
                          }`}
                        >
                          {s.slot} ➔ {s.subjectId.name} ({s.subjectId.subjectType})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Semester (1-10)</label>
                    <select
                      className="w-full border rounded-xl p-2.5 bg-white text-sm font-semibold"
                      value={semester}
                      onChange={e => setSemester(Number(e.target.value))}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Subject & Track</label>
                    <select
                      className="w-full border rounded-xl p-2.5 bg-white text-sm font-semibold"
                      value={selectedSubjectId}
                      onChange={e => {
                        setSelectedSubjectId(e.target.value);
                        setSelectedGroupId('');
                        setIsGroupSelectNeeded(false);
                      }}
                    >
                      {subjects.map(s => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.subjectType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Division Filter</label>
                    <select
                      className="w-full border rounded-xl p-2.5 bg-white text-sm font-semibold"
                      value={division}
                      onChange={e => setDivision(e.target.value)}
                    >
                      <option value="ALL">All Batches Combined</option>
                      <option value="Div-1">Division 1 (1-60)</option>
                      <option value="Div-2">Division 2 (61-120)</option>
                    </select>
                  </div>

                  <div>
                    <button
                      onClick={loadRosterForAttendance}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-md"
                    >
                      {loading ? 'Loading...' : 'Load Students'}
                    </button>
                  </div>
                </div>

                {isGroupSelectNeeded && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl shadow-sm">
                    <p className="text-xs font-black uppercase text-amber-900 mb-2">Research Project / 4-Student Group Selection:</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        className="w-full border rounded-xl p-2.5 bg-white text-sm font-semibold"
                        value={selectedGroupId}
                        onChange={e => setSelectedGroupId(e.target.value)}
                      >
                        <option value="">-- Choose Assigned Project Group --</option>
                        {groups.map(g => (
                          <option key={g._id} value={g._id}>{g.groupName} (Mentor: {g.mentorName})</option>
                        ))}
                      </select>
                      <button
                        onClick={loadRosterForAttendance}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap shadow-sm"
                      >
                        Load Group
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="border border-slate-300 bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Module A</span>
                      <h3 className="text-lg font-black text-slate-800 mt-2">Attendance & Reports</h3>
                      <p className="text-xs text-slate-500 mt-1">Date-wise sessions, CSV downloads, and 75% compliance tracking.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <button 
                        onClick={handleOpenViewAttend}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
                      >
                        View Attend ➔
                      </button>

                      <button 
                        onClick={() => {
                          setSubjectActiveTab('report_75');
                          handleGenerate75Report();
                          setFacultySubView('view_subject');
                        }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition"
                      >
                        Attend Report (75%)
                      </button>
                    </div>
                  </div>

                  <div className="border border-indigo-200 bg-indigo-50/30 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-1 rounded">Module B</span>
                      <h3 className="text-lg font-black text-slate-800 mt-2">Curriculum & Marking</h3>
                      <p className="text-xs text-slate-500 mt-1">Module syllabus details, or mark live student attendance register.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <button 
                        onClick={() => {
                          setSubjectActiveTab('topic');
                          setFacultySubView('view_subject');
                        }}
                        className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
                      >
                        View Subject ➔
                      </button>

                      <button 
                        onClick={loadRosterForAttendance}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition"
                      >
                        Take Att ➔
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {facultySubView === 'view_attend' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">View Attendance (Date Wise)</h2>
                    <p className="text-xs text-slate-500">Filter by selected parameters and examine logged sessions</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href={`http://localhost:5000/api/attendance/export/csv?subjectId=${selectedSubjectId}`} 
                      className="flex items-center gap-1 bg-slate-800 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                    <button 
                      onClick={loadRosterForAttendance}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm"
                    >
                      Take Attend
                    </button>
                    <button 
                      onClick={() => setFacultySubView('main')} 
                      className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl px-3 py-2 transition bg-white"
                    >
                      <ChevronLeft className="h-4 w-4" /> Go Back
                    </button>
                  </div>
                </div>

                {historySessions.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed rounded-2xl text-slate-400 text-sm font-semibold">
                    No attendance records found for this semester. Click <b>Take Attend</b> to mark the first session!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {historySessions.slice((attendPage - 1) * 6, attendPage * 6).map(sess => (
                      <div key={sess._id} className="border border-slate-200 bg-white hover:border-indigo-400 p-5 rounded-2xl shadow-sm flex flex-col justify-between transition">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {sess.subjectId?.subjectCode || 'LEC'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">{sess.divisionTarget || 'All Div'}</span>
                          </div>

                          <h4 className="font-bold text-slate-800 text-sm leading-snug mb-3">
                            {sess.subjectId?.name || 'Class Lecture'}
                          </h4>

                          <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                            <div className="flex justify-between">
                              <span className="font-bold text-slate-400">Date:</span>
                              <span className="font-extrabold text-slate-700">{new Date(sess.sessionDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-bold text-slate-400">Time:</span>
                              <span className="font-bold text-slate-700">{sess.slot}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-bold text-slate-400">Topic:</span>
                              <span className="font-bold text-indigo-700 truncate">{sess.topic || 'Regular Lecture'}</span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleOpenSessionModal(sess._id)}
                          className="mt-4 w-full bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition"
                        >
                          View Details ➔
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-500 font-bold">Total Sessions: {historySessions.length}</span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      disabled={attendPage === 1}
                      onClick={() => setAttendPage(p => Math.max(p - 1, 1))}
                      className="p-2 border rounded-xl bg-white disabled:opacity-40 hover:bg-slate-50 shadow-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {[...Array(Math.ceil(historySessions.length / 6) || 1)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setAttendPage(i + 1)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                          attendPage === i + 1 ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button 
                      disabled={attendPage * 6 >= historySessions.length}
                      onClick={() => setAttendPage(p => p + 1)}
                      className="p-2 border rounded-xl bg-white disabled:opacity-40 hover:bg-slate-50 shadow-sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {activeSessionRecords && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[85vh] flex flex-col shadow-2xl">
                      <div className="flex justify-between items-center border-b pb-3 mb-3">
                        <h3 className="font-black text-slate-800 text-sm uppercase">Session Attendance Register</h3>
                        <button onClick={() => setActiveSessionRecords(null)} className="text-slate-400 hover:text-slate-700 font-black text-lg">✕</button>
                      </div>
                      <div className="overflow-y-auto space-y-2 flex-1 pr-1 text-xs">
                        {activeSessionRecords.map(r => (
                          <div key={r._id} className="flex justify-between items-center p-2.5 bg-slate-50 border rounded-xl">
                            <div>
                              <span className="font-bold text-slate-800">#{r.studentId?.rollNo} - {r.studentId?.name}</span>
                              <span className="block text-[10px] text-slate-400">{r.studentId?.track} • {r.studentId?.division}</span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {facultySubView === 'view_subject' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4 print:hidden">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">
                      Subject Overview: {selectedSubjectObj?.name || 'Selected Subject'}
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold">{selectedSubjectObj?.subjectCode} • {selectedSubjectObj?.subjectType}</p>
                  </div>
                  <button 
                    onClick={() => setFacultySubView('main')} 
                    className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl px-3 py-1.5 transition bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" /> Go Back
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
                  <button
                    onClick={() => setSubjectActiveTab('topic')}
                    className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition border ${
                      subjectActiveTab === 'topic' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Topic
                  </button>
                  <button
                    onClick={handleOpenViewAttend}
                    className="p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition border bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    View Att
                  </button>
                  <button
                    onClick={loadRosterForAttendance}
                    className="p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition border bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    Take Att
                  </button>
                  <button
                    onClick={() => {
                      setSubjectActiveTab('report_75');
                      handleGenerate75Report();
                    }}
                    className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition border ${
                      subjectActiveTab === 'report_75' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    View Report (75%)
                  </button>
                </div>

                {subjectActiveTab === 'topic' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 print:hidden">
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Curriculum Module Topics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Unit 1: Fundamentals & Theoretical Architecture',
                        'Unit 2: Framework Implementation & Pipeline Design',
                        'Unit 3: Security Vectors, Testing & Validation',
                        'Unit 4: Real-Time Case Studies & Lab Evaluation'
                      ].map((t, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 flex items-center gap-3">
                          <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">{idx + 1}</span>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subjectActiveTab === 'report_75' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 print:bg-white print:border-none print:p-0">
                    <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
                      <div>
                        <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">75% Attendance Compliance Check</h3>
                        <p className="text-xs text-slate-400">Semester examination eligibility check</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <select 
                          value={thresholdType} 
                          onChange={e => setThresholdType(e.target.value)} 
                          className="border rounded-xl p-2 bg-white text-xs font-bold"
                        >
                          <option value="less_than">Less than 75% (Defaulter List)</option>
                          <option value="greater_than">Greater than / Equal 75% (Eligible List)</option>
                        </select>

                        <button 
                          onClick={handleGenerate75Report}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                        >
                          Generate Report
                        </button>

                        <button 
                          onClick={() => window.print()}
                          className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Official Notice
                        </button>
                      </div>
                    </div>

                    <div className="hidden print:block text-center border-b pb-4 mb-4">
                      <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">DEPARTMENT OF COMPUTER SCIENCE</h2>
                      <p className="text-xs text-slate-600 font-bold">INTEGRATED M.SC ATTENDANCE SHORTAGE COMPLIANCE NOTICE</p>
                      <p className="text-[10px] text-slate-500">Criteria: Below 75% Minimum Mandatory Term Attendance</p>
                    </div>

                    {reportResult && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm mt-4 print:border print:border-black">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-100 border-b text-slate-600 font-bold uppercase print:bg-slate-200">
                            <tr>
                              <th className="p-3">Roll No</th>
                              <th className="p-3">Student Name</th>
                              <th className="p-3">Division</th>
                              <th className="p-3">Track</th>
                              <th className="p-3 text-right">Attendance %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {reportResult.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                                  No students match the criteria for Semester {semester}.
                                </td>
                              </tr>
                            ) : (
                              reportResult.map(r => (
                                <tr key={r.rollNo} className="hover:bg-slate-50">
                                  <td className="p-3 font-bold">#{r.rollNo}</td>
                                  <td className="p-3 font-semibold">{r.name}</td>
                                  <td className="p-3 text-slate-500">{r.division}</td>
                                  <td className="p-3 font-bold text-indigo-600">{r.track}</td>
                                  <td className={`p-3 text-right font-black ${parseFloat(r.percentage) >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {r.percentage}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {facultySubView === 'take_attend' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Take Attendance</h2>
                    <p className="text-xs text-slate-500 font-medium">Record individual student attendance and lecture logs</p>
                  </div>
                  <button 
                    onClick={() => setFacultySubView('main')} 
                    className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl px-3.5 py-1.5 transition bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" /> Go Back
                  </button>
                </div>

                <div className="bg-slate-900 text-white p-5 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs shadow-lg">
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-bold">Course & Semester</span>
                    <span className="font-extrabold text-white text-sm">{course} (Sem {semester})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-bold">Batch & Division</span>
                    <span className="font-extrabold text-indigo-300 text-sm">Sem {semester} - {division}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-bold">Subject Code & Name</span>
                    <span className="font-extrabold text-white text-sm truncate block">
                      {selectedSubjectObj?.subjectCode}: {selectedSubjectObj?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-bold">Teacher / Username</span>
                    <span className="font-extrabold text-emerald-400 text-sm truncate block">{user.name}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Date</label>
                    <input 
                      type="date" 
                      value={attendDate} 
                      onChange={e => setAttendDate(e.target.value)} 
                      className="w-full border rounded-xl p-2.5 text-sm font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">From Time</label>
                    <input 
                      type="time" 
                      value={timeFrom} 
                      onChange={e => setTimeFrom(e.target.value)} 
                      className="w-full border rounded-xl p-2.5 text-sm font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">To Time</label>
                    <input 
                      type="time" 
                      value={timeTo} 
                      onChange={e => setTimeTo(e.target.value)} 
                      className="w-full border rounded-xl p-2.5 text-sm font-semibold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Topic</label>
                    <select 
                      value={topicOption} 
                      onChange={e => setTopicOption(e.target.value)} 
                      className="w-full border rounded-xl p-2.5 text-sm font-semibold bg-white"
                    >
                      <option value="Default Syllabus">Default Syllabus Topic</option>
                      <option value="Lab Practical Evaluation">Lab Practical Evaluation</option>
                      <option value="Seminar / Presentation">Seminar / Presentation</option>
                      <option value="Other">Other (Custom Topic)</option>
                    </select>
                    {topicOption === 'Other' && (
                      <input 
                        type="text" 
                        placeholder="Enter custom topic name..." 
                        value={customTopic} 
                        onChange={e => setCustomTopic(e.target.value)} 
                        className="mt-2 w-full border rounded-xl p-2 text-xs font-medium"
                      />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description</label>
                    <input 
                      type="text" 
                      placeholder="Brief remarks or lecture notes..." 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      className="w-full border rounded-xl p-2.5 text-sm font-medium bg-white"
                    />
                  </div>
                </div>

                <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-xs font-black uppercase text-indigo-900 block">Today Attend Percentage</span>
                    <span className="text-xs text-slate-600 font-medium">
                      Present: <b className="text-indigo-700">{presentCount}</b> / Total Enrolled: <b className="text-slate-800">{totalStudents}</b>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-black ${todayPercentage >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {todayPercentage}%
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => markAll('PRESENT')} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm">
                        Mark All Present
                      </button>
                      <button onClick={() => markAll('ABSENT')} className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm">
                        Mark All Absent
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b text-xs font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="p-3.5">Roll No</th>
                        <th className="p-3.5">Student Name</th>
                        <th className="p-3.5">Track</th>
                        <th className="p-3.5">Division</th>
                        <th className="p-3.5 text-center">Mark Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {roster.map(st => {
                        const isPresent = attendanceMap[st._id] === 'PRESENT';
                        return (
                          <tr key={st._id} className="hover:bg-slate-50 transition">
                            <td className="p-3.5 font-bold text-slate-800">#{st.rollNo}</td>
                            <td className="p-3.5 font-semibold text-slate-700">{st.name}</td>
                            <td className="p-3.5">
                              <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {st.track}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500 text-xs font-bold">{st.division}</td>
                            <td className="p-3.5 text-center">
                              <button 
                                onClick={() => toggleStatus(st._id)} 
                                className={`px-5 py-1.5 rounded-full text-xs font-extrabold transition shadow-sm ${
                                  isPresent ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'
                                }`}
                              >
                                {isPresent ? 'PRESENT' : 'ABSENT'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {submitMsg && (
                  <div className={`p-4 rounded-xl text-center font-bold text-xs ${submitMsg.includes('success') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {submitMsg}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button 
                    disabled={isSubmitting || roster.length === 0} 
                    onClick={handleSubmitAttendance} 
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold px-8 py-3 rounded-xl shadow-lg transition text-sm uppercase tracking-wider"
                  >
                    {isSubmitting ? 'Recording...' : 'Take Attend (Submit)'}
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

{/* ========================================================================= */}
{/* TAB 2: STUDENT PORTAL (WITH VISUAL ANALYTICS & DASHBOARD GRAPHS)          */}
{/* ========================================================================= */}
{activeTab === 'student' && (
  <div className="p-4 md:p-8 space-y-6 bg-slate-50/60 min-h-[500px]">
    
    {/* Shortage Warning Banner */}
    {studentData && studentData.isShortage && (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-900 shadow-sm animate-pulse">
        <AlertTriangle className="h-6 w-6 text-rose-600 flex-shrink-0" />
        <div className="text-xs md:text-sm">
          <span className="font-extrabold block">Attendance Shortage Alert (&lt; 75%)</span>
          Your total cumulative attendance is currently at <b className="underline">{studentData.overallPercentage}%</b>. University compliance requires a minimum of 75% to be eligible for semester examinations.
        </div>
      </div>
    )}

    {/* Top Bar / Search for Admin/Faculty checking student, or Student self view */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <div className="text-xs font-bold text-slate-500 uppercase">
        Student Portal: <b className="text-indigo-600 text-sm">#{studentData?.student?.rollNo || user?.rollNo || searchRollNo} - {studentData?.student?.name || user?.name}</b>
      </div>
      
      {user.role !== 'STUDENT' && (
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={searchRollNo}
            onChange={e => setSearchRollNo(e.target.value)}
            placeholder="Enter Roll No..."
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold w-36 focus:outline-indigo-600"
          />
          <button 
            onClick={fetchStudentAnalytics} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition"
          >
            {studentLoading ? 'Loading...' : 'Search RollNo'}
          </button>
        </div>
      )}
    </div>

    {studentError && (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
        {studentError}
      </div>
    )}

    {studentData && (
      <>
        {/* High-Level Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Overall Attendance</span>
              <p className={`text-3xl font-black mt-1 ${studentData.overallPercentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {studentData.overallPercentage}%
              </p>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${studentData.overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                style={{ width: `${Math.min(studentData.overallPercentage, 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Lectures Attended</span>
            <p className="text-2xl font-black text-slate-800 mt-1">{studentData.totalAttended} <span className="text-xs font-normal text-slate-400">sessions</span></p>
            <span className="text-xs text-emerald-600 font-bold mt-2 block">✔ Present marks recorded</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Conducted</span>
            <p className="text-2xl font-black text-slate-800 mt-1">{studentData.totalConducted} <span className="text-xs font-normal text-slate-400">sessions</span></p>
            <span className="text-xs text-slate-400 font-medium mt-2 block">Total faculty lectures logged</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Academic Division</span>
            <p className="text-lg font-black text-indigo-600 mt-1 truncate">{studentData.student.division} • {studentData.student.track}</p>
            <span className="text-xs text-slate-400 font-medium mt-2 block">Semester {studentData.student.currentSem} (CS)</span>
          </div>
        </div>

        {/* Visual Analytics & Subject Progress Bars */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Subject-Wise Analytics & Performance Graph</h3>
              <p className="text-xs text-slate-400">Detailed breakdown across all enrolled theoretical and practical modules</p>
            </div>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl">
              Target: 75% Minimum
            </span>
          </div>

          <div className="space-y-4">
            {studentData.subjects.map(s => (
              <div key={s.code} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">{s.code} • {s.type}</span>
                    <h4 className="font-bold text-sm text-slate-800">{s.name}</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-semibold">
                      Attended: <b className="text-slate-800">{s.attended}</b> / Conducted: <b className="text-slate-800">{s.conducted}</b>
                    </span>
                    <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg ${s.percentage >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {s.percentage}%
                    </span>
                  </div>
                </div>

                {/* Custom Animated Progress Bar / Visual Graph */}
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${s.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                    style={{ width: `${Math.min(s.percentage, 100)}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
)}
        {/* ========================================================================= */}
        {/* TAB 3: ERP LEAVE & ON-DUTY (OD) WORKFLOW PORTAL                           */}
        {/* ========================================================================= */}
        {activeTab === 'leave_portal' && (
          <div className="p-4 md:p-8 space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">ERP Leave & Duty Exemption Portal</h2>
              <p className="text-xs text-slate-500">Apply for Medical/Duty leaves and manage HOD/Faculty approvals</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {user.role === 'STUDENT' && (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-4">Submit Exemption Request</h3>
                  <form onSubmit={handleApplyLeave} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Leave Type</label>
                      <select 
                        value={leaveType} 
                        onChange={e => setLeaveType(e.target.value)} 
                        className="w-full border rounded-xl p-2 bg-white text-xs font-bold"
                      >
                        <option value="MEDICAL">Medical Exemption</option>
                        <option value="ON_DUTY_EVENT">On Duty (Hackathon/Event)</option>
                        <option value="SPORTS">Sports Championship</option>
                        <option value="PERSONAL">Personal / Emergency</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">From Date</label>
                      <input 
                        type="date" 
                        value={leaveFrom} 
                        onChange={e => setLeaveFrom(e.target.value)} 
                        className="w-full border rounded-xl p-2 bg-white text-xs font-semibold" 
                        required 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">To Date</label>
                      <input 
                        type="date" 
                        value={leaveTo} 
                        onChange={e => setLeaveTo(e.target.value)} 
                        className="w-full border rounded-xl p-2 bg-white text-xs font-semibold" 
                        required 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Reason / Document Note</label>
                      <textarea 
                        value={leaveReason} 
                        onChange={e => setLeaveReason(e.target.value)} 
                        placeholder="Specify event name or medical cause..." 
                        className="w-full border rounded-xl p-2 bg-white text-xs" 
                        rows={3} 
                        required 
                      />
                    </div>

                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition">
                      File Application
                    </button>
                    {leaveMsg && (
                      <p className={`text-xs text-center font-bold mt-2 ${leaveMsg.includes('successfully') ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {leaveMsg}
                      </p>
                    )}
                  </form>
                </div>
              )}

              <div className={`${user.role === 'STUDENT' ? 'md:col-span-2' : 'md:col-span-3'} space-y-3`}>
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  {user.role === 'STUDENT' ? 'My Leave Applications' : 'All Departmental Leave & OD Requests'}
                </h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 border-b text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="p-3">Student</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {visibleLeaves.length === 0 ? (
                        <tr><td colSpan={5} className="p-6 text-center text-slate-400">No leave requests logged yet.</td></tr>
                      ) : (
                        visibleLeaves.map(l => (
                          <tr key={l._id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <span className="font-bold block">#{l.studentId?.rollNo} - {l.studentId?.name}</span>
                              <span className="text-[10px] text-slate-400">{l.reason}</span>
                            </td>
                            <td className="p-3 font-bold text-indigo-700">{l.leaveType}</td>
                            <td className="p-3">{new Date(l.fromDate).toLocaleDateString()} - {new Date(l.toDate).toLocaleDateString()}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                l.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                l.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {l.status === 'PENDING' && (user.role === 'FACULTY' || user.role === 'ADMIN') ? (
                                <div className="flex gap-1 justify-center">
                                  <button onClick={() => updateLeaveStatus(l._id, 'APPROVED')} className="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold">Approve</button>
                                  <button onClick={() => updateLeaveStatus(l._id, 'REJECTED')} className="bg-rose-600 text-white px-2 py-1 rounded text-[10px] font-bold">Reject</button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-medium">{l.approvedBy ? `by ${l.approvedBy}` : 'Completed'}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SUPER ADMIN CRUD, SELECT ALL & BULK DELETE                         */}
        {/* ========================================================================= */}
        {activeTab === 'admin' && (
          <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Super Admin: Student Management</h2>
                <p className="text-xs text-slate-500">Complete CRUD operations with dynamic division, track filtering & bulk deletion</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedStudentIds.length > 0 && (
                  <button 
                    onClick={handleBulkDelete}
                    className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
                  >
                    Delete Selected ({selectedStudentIds.length})
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsEditingStudent(null);
                    setStudentForm({ rollNo: '', name: '', currentSem: 7, division: 'Div-1', track: 'AI' });
                    setStudentModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
                >
                  + Add New Student
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Division Filter</label>
                <select 
                  value={adminDivisionFilter} 
                  onChange={e => setAdminDivisionFilter(e.target.value)}
                  className="border rounded-xl p-2 bg-white text-xs font-bold"
                >
                  <option value="ALL">All Divisions</option>
                  <option value="Div-1">Division 1</option>
                  <option value="Div-2">Division 2</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Track Filter</label>
                <select 
                  value={adminTrackFilter} 
                  onChange={e => setAdminTrackFilter(e.target.value)}
                  className="border rounded-xl p-2 bg-white text-xs font-bold"
                >
                  <option value="ALL">All Tracks</option>
                  <option value="AI">AI Track</option>
                  <option value="IS">IS Track</option>
                  <option value="NONE">None</option>
                </select>
              </div>
            </div>

            {/* Students Table with Checkboxes */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={adminStudentsList.length > 0 && selectedStudentIds.length === adminStudentsList.length}
                        className="rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5">Roll No</th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Sem</th>
                    <th className="p-3.5">Division</th>
                    <th className="p-3.5">Track</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {adminStudentsList.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-medium">No students found matching filters.</td></tr>
                  ) : (
                    adminStudentsList.map(st => (
                      <tr key={st._id} className="hover:bg-slate-50">
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedStudentIds.includes(st._id)}
                            onChange={() => handleCheckboxChange(st._id)}
                            className="rounded cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 font-bold">#{st.rollNo}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{st.name}</td>
                        <td className="p-3.5">{st.currentSem}</td>
                        <td className="p-3.5 text-slate-500">{st.division}</td>
                        <td className="p-3.5 font-bold text-indigo-600">{st.track}</td>
                        <td className="p-3.5 text-center flex justify-center gap-2">
                          <button 
                            onClick={() => {
                              setIsEditingStudent(st);
                              setStudentForm({ rollNo: st.rollNo, name: st.name, currentSem: st.currentSem, division: st.division, track: st.track });
                              setStudentModalOpen(true);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg font-bold text-[10px]"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(st._id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg font-bold text-[10px]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* CSV Bulk Import Section */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-6 max-w-lg">
              <h3 className="text-xs font-black uppercase text-slate-800 mb-1">Student Bulk CSV Import</h3>
              <p className="text-xs text-slate-500 mb-4">Upload CSV file with columns: <b>rollNo, name, currentSem, division, track</b></p>
              <form onSubmit={handleCsvUpload} className="space-y-3">
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files[0])}
                  className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                />
                <button className="w-full bg-slate-900 hover:bg-black text-white font-bold py-2 rounded-xl text-xs">
                  Upload & Sync Students
                </button>
              </form>
              {adminMsg && <p className="mt-3 p-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold text-center">{adminMsg}</p>}
            </div>

            {/* Add/Edit Modal */}
            {studentModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-black text-slate-800 text-sm uppercase">
                      {isEditingStudent ? 'Edit Student Details' : 'Add New Student'}
                    </h3>
                    <button onClick={() => setStudentModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-black text-lg">✕</button>
                  </div>

                  <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-600 uppercase mb-1">Roll No</label>
                      <input 
                        type="text" 
                        value={studentForm.rollNo} 
                        onChange={e => setStudentForm({...studentForm, rollNo: e.target.value})} 
                        className="w-full border rounded-xl p-2.5 font-bold" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 uppercase mb-1">Full Name</label>
                      <input 
                        type="text" 
                        value={studentForm.name} 
                        onChange={e => setStudentForm({...studentForm, name: e.target.value})} 
                        className="w-full border rounded-xl p-2.5 font-bold" 
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-600 uppercase mb-1">Division</label>
                        <select 
                          value={studentForm.division} 
                          onChange={e => setStudentForm({...studentForm, division: e.target.value})}
                          className="w-full border rounded-xl p-2.5 bg-white font-bold"
                        >
                          <option value="Div-1">Div-1</option>
                          <option value="Div-2">Div-2</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 uppercase mb-1">Track</label>
                        <select 
                          value={studentForm.track} 
                          onChange={e => setStudentForm({...studentForm, track: e.target.value})}
                          className="w-full border rounded-xl p-2.5 bg-white font-bold"
                        >
                          <option value="AI">AI</option>
                          <option value="IS">IS</option>
                          <option value="NONE">NONE</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-3 flex justify-end gap-2">
                      <button 
                        type="button" 
                        onClick={() => setStudentModalOpen(false)}
                        className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm"
                      >
                        {isEditingStudent ? 'Update Changes' : 'Save Student'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}