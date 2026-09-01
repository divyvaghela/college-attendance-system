import React, { useState, useEffect } from 'react';

export default function App() {
  // Auth State
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [loginEmail, setLoginEmail] = useState('faculty@college.edu');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [authError, setAuthError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' | 'history' | 'student' | 'admin' | 'defaulters'

  // Faculty State
  const [semester, setSemester] = useState(7);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [division, setDivision] = useState('ALL');
  const [slot, setSlot] = useState('10:30 AM - 11:30 AM');
  const [facultyName, setFacultyName] = useState(user?.name || 'Prof. Sharma');

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [isGroupSelectNeeded, setIsGroupSelectNeeded] = useState(false);

  const [roster, setRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [facultyMsg, setFacultyMsg] = useState('');
  const [todaySchedule, setTodaySchedule] = useState([]);

  // History & Edit State
  const [historySessions, setHistorySessions] = useState([]);
  const [editSessionRecords, setEditSessionRecords] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Student State
  const [searchRollNo, setSearchRollNo] = useState(user?.rollNo || '01');
  const [studentData, setStudentData] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  // Defaulter State
  const [defaulterSem, setDefaulterSem] = useState(7);
  const [defaulters, setDefaulters] = useState([]);

  // CSV State
  const [csvFile, setCsvFile] = useState(null);
  const [adminMsg, setAdminMsg] = useState('');

  // Handle Login
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
          setSearchRollNo(data.user.rollNo || '01');
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
    localStorage.clear();
  };

  // Fetch Subjects & Schedule
  useEffect(() => {
    if (user) {
      fetch(`http://localhost:5000/api/subjects?semester=${semester}`)
        .then(res => res.json())
        .then(data => {
          setSubjects(data);
          if (data.length > 0) {
            setSelectedSubjectId(data[0]._id);
          } else {
            setSelectedSubjectId('');
            setRoster([]);
          }
        });

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      fetch(`http://localhost:5000/api/timetable/today?day=${today}&semester=${semester}`)
        .then(res => res.json())
        .then(data => setTodaySchedule(data));
    }
  }, [semester, user]);

  // Fetch Roster
  const fetchRoster = async () => {
    if (!selectedSubjectId) return;
    setLoading(true);
    setFacultyMsg('');
    try {
      let url = `http://localhost:5000/api/attendance/roster?subjectId=${selectedSubjectId}&division=${division}`;
      if (selectedGroupId) url += `&groupId=${selectedGroupId}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.isGroupSelectNeeded) {
        setIsGroupSelectNeeded(true);
        setGroups(data.groups || []);
        setRoster([]);
      } else {
        setIsGroupSelectNeeded(false);
        setRoster(data.students || []);
        const map = {};
        (data.students || []).forEach(st => { map[st._id] = 'PRESENT'; });
        setAttendanceMap(map);
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

  const handleSubmitAttendance = async () => {
    const payload = {
      subjectId: selectedSubjectId,
      facultyName: user.name,
      slot,
      divisionTarget: division,
      groupId: selectedGroupId || null,
      records: roster.map(st => ({
        studentId: st._id,
        status: attendanceMap[st._id]
      }))
    };

    const res = await fetch('http://localhost:5000/api/attendance/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setFacultyMsg('Attendance successfully submitted and recorded in database!');
    } else {
      setFacultyMsg('Failed to submit attendance.');
    }
  };

  // History & Edit
  const fetchHistory = async () => {
    const res = await fetch(`http://localhost:5000/api/attendance/history?semester=${semester}`);
    const data = await res.json();
    setHistorySessions(data);
  };

  const loadSessionForEdit = async (sessionId) => {
    setSelectedSessionId(sessionId);
    const res = await fetch(`http://localhost:5000/api/attendance/session/${sessionId}`);
    const data = await res.json();
    setEditSessionRecords(data);
  };

  const toggleIndividualRecord = async (recordId, currentStatus) => {
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    const res = await fetch('http://localhost:5000/api/attendance/record/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, status: nextStatus })
    });
    if (res.ok) {
      setEditSessionRecords(prev => prev.map(r => r._id === recordId ? { ...r, status: nextStatus } : r));
    }
  };

  // Student Analytics
  const fetchStudentAnalytics = async () => {
    if (!searchRollNo) return;
    setStudentLoading(true);
    setStudentError('');
    setStudentData(null);
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/student/${searchRollNo}`);
      const data = await res.json();
      if (res.ok) {
        setStudentData(data);
      } else {
        setStudentError(data.message || 'Error fetching student record');
      }
    } catch (err) {
      setStudentError('Cannot connect to server');
    } finally {
      setStudentLoading(false);
    }
  };

  // Defaulters
  const fetchDefaulters = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/analytics/defaulters?semester=${defaulterSem}`);
      const data = await res.json();
      setDefaulters(data);
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Upload
  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('file', csvFile);

    const res = await fetch('http://localhost:5000/api/students/import-csv', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    setAdminMsg(data.message || 'Upload complete');
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'defaulters') fetchDefaulters();
    if (activeTab === 'student' && user?.role === 'STUDENT') fetchStudentAnalytics();
  }, [activeTab, semester, defaulterSem]);

  // ---------------- LOGIN SCREEN ----------------
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
            <p>Faculty Demo: <b>faculty@college.edu</b> / 123456</p>
            <p>Admin Demo: <b>admin@college.edu</b> / 123456</p>
            <p>Student Demo: <b>aarav@college.edu</b> / 123456</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- MAIN DASHBOARD ----------------
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Integrated M.Sc (Computer Science)</h1>
            <p className="text-slate-400 text-sm">
              Logged in: <b className="text-indigo-400">{user.name} ({user.role})</b>
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center bg-slate-800 p-1 rounded-xl border border-slate-700 gap-1">
            {(user.role === 'FACULTY' || user.role === 'ADMIN') && (
              <>
                <button
                  onClick={() => setActiveTab('faculty')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'faculty' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Mark Attendance
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  History & Edit
                </button>
              </>
            )}

            {user.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                CSV Import
              </button>
            )}

            <button
              onClick={() => setActiveTab('student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'student' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Student Analytics
            </button>

            <button
              onClick={() => setActiveTab('defaulters')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'defaulters' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Defaulter List
            </button>

            <button
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg ml-1"
            >
              Logout
            </button>
          </div>
        </div>

        {/* ================= TAB 1: FACULTY ATTENDANCE MARKING ================= */}
        {activeTab === 'faculty' && (
          <div className="p-6 md:p-8">
            {/* Timetable Quick Selector */}
            {todaySchedule.length > 0 && (
              <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-xs font-bold uppercase text-indigo-900 block mb-2">Today's Scheduled Lectures:</span>
                <div className="flex flex-wrap gap-2">
                  {todaySchedule.map(s => (
                    <button
                      key={s._id}
                      onClick={() => {
                        setSelectedSubjectId(s.subjectId._id);
                        setSlot(s.slot);
                      }}
                      className="bg-white border border-indigo-300 text-indigo-800 text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-600 hover:text-white transition"
                    >
                      {s.slot} ➔ {s.subjectId.name} ({s.subjectId.subjectType})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Semester (1-10)</label>
                <select
                  className="w-full border rounded-lg p-2.5 bg-white text-sm font-medium"
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Subject & Track</label>
                <select
                  className="w-full border rounded-lg p-2.5 bg-white text-sm font-medium"
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
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Division Filter</label>
                <select
                  className="w-full border rounded-lg p-2.5 bg-white text-sm font-medium"
                  value={division}
                  onChange={e => setDivision(e.target.value)}
                >
                  <option value="ALL">All Batches Combined</option>
                  <option value="Div-1">Division 1 (1-60)</option>
                  <option value="Div-2">Division 2 (61-120)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchRoster}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg transition"
                >
                  {loading ? 'Loading...' : 'Load Students'}
                </button>
              </div>
            </div>

            {isGroupSelectNeeded && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl">
                <p className="text-xs font-black uppercase text-amber-900 mb-2">Research Project / 4-Student Group Selection:</p>
                <div className="flex gap-4">
                  <select
                    className="w-full border rounded-lg p-2 bg-white text-sm font-medium"
                    value={selectedGroupId}
                    onChange={e => setSelectedGroupId(e.target.value)}
                  >
                    <option value="">-- Choose Assigned Project Group --</option>
                    {groups.map(g => (
                      <option key={g._id} value={g._id}>{g.groupName} (Mentor: {g.mentorName})</option>
                    ))}
                  </select>
                  <button
                    onClick={fetchRoster}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg font-bold text-sm whitespace-nowrap"
                  >
                    Load Group
                  </button>
                </div>
              </div>
            )}

            {facultyMsg && (
              <div className="mb-6 p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl font-semibold">
                {facultyMsg}
              </div>
            )}

            {roster.length > 0 && (
              <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
                  <span className="text-sm font-bold text-slate-700">
                    Active Enrolled Students: <span className="text-indigo-600 font-extrabold">{roster.length}</span>
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={`http://localhost:5000/api/attendance/export/csv?subjectId=${selectedSubjectId}`}
                      className="text-xs bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg font-bold"
                    >
                      Export CSV
                    </a>
                    <button onClick={() => markAll('PRESENT')} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-bold">Mark All Present</button>
                    <button onClick={() => markAll('ABSENT')} className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg font-bold">Mark All Absent</button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b">
                      <tr>
                        <th className="p-3.5 text-xs font-bold text-slate-600 uppercase">Roll No</th>
                        <th className="p-3.5 text-xs font-bold text-slate-600 uppercase">Name</th>
                        <th className="p-3.5 text-xs font-bold text-slate-600 uppercase">Division</th>
                        <th className="p-3.5 text-xs font-bold text-slate-600 uppercase">Track</th>
                        <th className="p-3.5 text-xs font-bold text-slate-600 uppercase text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {roster.map(st => {
                        const isPresent = attendanceMap[st._id] === 'PRESENT';
                        return (
                          <tr key={st._id} className="hover:bg-slate-50 transition">
                            <td className="p-3.5 font-bold text-slate-800">{st.rollNo}</td>
                            <td className="p-3.5 text-slate-700 font-medium">{st.name}</td>
                            <td className="p-3.5 text-slate-500">{st.division}</td>
                            <td className="p-3.5">
                              <span className={`text-xs px-2.5 py-1 rounded-md font-extrabold ${
                                st.track === 'IS' ? 'bg-purple-100 text-purple-700' :
                                st.track === 'AI' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {st.track}
                              </span>
                            </td>
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

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSubmitAttendance}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-8 rounded-xl shadow-lg transition"
                  >
                    Submit Attendance Session
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: HISTORY & REAL-TIME EDIT ================= */}
        {activeTab === 'history' && (
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-black text-slate-800 uppercase mb-4">Past Attendance Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {historySessions.map(sess => (
                  <div
                    key={sess._id}
                    onClick={() => loadSessionForEdit(sess._id)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${selectedSessionId === sess._id ? 'border-indigo-600 bg-indigo-50/50' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800 text-sm">{sess.subjectId?.name}</span>
                      <span className="text-xs bg-slate-200 px-2 py-0.5 rounded font-bold">{sess.slot}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Faculty: {sess.facultyName} | Date: {new Date(sess.sessionDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                {editSessionRecords.length > 0 ? (
                  <div className="border rounded-xl p-4 bg-slate-50">
                    <span className="text-xs font-black uppercase text-slate-700 block mb-3">Edit Records (Click button to change status):</span>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto">
                      {editSessionRecords.map(r => (
                        <div key={r._id} className="flex justify-between items-center p-2.5 bg-white border rounded-lg">
                          <div>
                            <span className="font-bold text-sm">#{r.studentId?.rollNo} - {r.studentId?.name}</span>
                            <span className="text-xs text-slate-400 block">{r.studentId?.track} | {r.studentId?.division}</span>
                          </div>
                          <button
                            onClick={() => toggleIndividualRecord(r._id, r.status)}
                            className={`px-3 py-1 rounded-full text-xs font-bold ${r.status === 'PRESENT' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
                          >
                            {r.status}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-8 border border-dashed rounded-xl text-slate-400 text-sm">
                    Select a session from the left to view & edit records
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 3: CSV BULK IMPORT (ADMIN) ================= */}
        {activeTab === 'admin' && (
          <div className="p-6 md:p-8 max-w-lg mx-auto">
            <h2 className="text-lg font-black text-slate-800 uppercase mb-2">Student Bulk CSV Import</h2>
            <p className="text-xs text-slate-500 mb-6">Upload CSV file with columns: <b>rollNo, name, currentSem, division, track</b></p>

            <form onSubmit={handleCsvUpload} className="space-y-4 bg-slate-50 p-6 rounded-xl border">
              <input
                type="file"
                accept=".csv"
                onChange={e => setCsvFile(e.target.files[0])}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
              />
              <button className="w-full bg-slate-900 hover:bg-black text-white font-bold py-2 rounded-lg text-sm">
                Upload & Sync Students
              </button>
            </form>
            {adminMsg && <p className="mt-4 p-3 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold text-center">{adminMsg}</p>}
          </div>
        )}

        {/* ================= TAB 4: STUDENT ANALYTICS ================= */}
        {activeTab === 'student' && (
          <div className="p-6 md:p-8">
            <div className="max-w-md mx-auto mb-8">
              <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Enter Student Roll Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchRollNo}
                  onChange={e => setSearchRollNo(e.target.value)}
                  placeholder="e.g. 01, 03, 61..."
                  className="flex-1 border p-2.5 rounded-lg font-bold text-slate-800"
                />
                <button
                  onClick={fetchStudentAnalytics}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-bold rounded-lg"
                >
                  {studentLoading ? 'Checking...' : 'View'}
                </button>
              </div>
              {studentError && <p className="text-rose-600 text-xs font-bold mt-2">{studentError}</p>}
            </div>

            {studentData && (
              <div>
                <div className="bg-slate-50 border p-6 rounded-2xl mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Name</span>
                    <p className="font-extrabold text-slate-800 text-lg">{studentData.student.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Roll No & Sem</span>
                    <p className="font-extrabold text-slate-800 text-lg">#{studentData.student.rollNo} (Sem {studentData.student.currentSem})</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Division & Track</span>
                    <p className="font-extrabold text-indigo-600 text-lg">{studentData.student.division} | {studentData.student.track}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Overall Attendance</span>
                    <p className={`font-black text-2xl ${studentData.overallPercentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {studentData.overallPercentage}%
                    </p>
                  </div>
                </div>

                {studentData.isShortage && (
                  <div className="mb-6 p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 flex items-center justify-between">
                    <span className="font-bold text-sm">⚠️ Defaulter Alert: Attendance is below 75% in the current semester.</span>
                    <span className="text-xs bg-rose-600 text-white px-3 py-1 rounded font-bold">Action Required</span>
                  </div>
                )}

                <h3 className="text-md font-black text-slate-800 uppercase tracking-wide mb-3">Enrolled Subject-Wise Breakdown</h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b text-xs font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="p-3">Subject Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-center">Conducted</th>
                        <th className="p-3 text-center">Attended</th>
                        <th className="p-3 text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {studentData.subjects.map(s => (
                        <tr key={s.code} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{s.name} ({s.code})</td>
                          <td className="p-3 text-xs font-bold text-slate-500">{s.type}</td>
                          <td className="p-3 text-center font-bold text-slate-600">{s.conducted}</td>
                          <td className="p-3 text-center font-bold text-emerald-600">{s.attended}</td>
                          <td className={`p-3 text-right font-black ${s.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {s.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: DEFAULTER LIST ================= */}
        {activeTab === 'defaulters' && (
          <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-slate-800 uppercase">Attendance Defaulter List (&lt; 75%)</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase text-slate-600">Semester:</label>
                <select
                  className="border rounded p-1.5 bg-white text-sm font-bold"
                  value={defaulterSem}
                  onChange={e => setDefaulterSem(e.target.value)}
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>Sem {i + 1}</option>
                  ))}
                </select>
              </div>
            </div>

            {defaulters.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold">
                🎉 No defaulters found in Semester {defaulterSem}! All students have 75%+ attendance.
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-rose-50 border-b text-xs font-bold text-rose-900 uppercase">
                    <tr>
                      <th className="p-3.5">Roll No</th>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Division</th>
                      <th className="p-3.5">Track</th>
                      <th className="p-3.5 text-center">Attended / Total</th>
                      <th className="p-3.5 text-right">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {defaulters.map(d => (
                      <tr key={d.rollNo} className="hover:bg-rose-50/50">
                        <td className="p-3.5 font-bold text-slate-800">#{d.rollNo}</td>
                        <td className="p-3.5 font-semibold text-slate-700">{d.name}</td>
                        <td className="p-3.5 text-slate-500">{d.division}</td>
                        <td className="p-3.5 font-bold text-indigo-600">{d.track}</td>
                        <td className="p-3.5 text-center font-bold text-slate-600">{d.attended} / {d.conducted}</td>
                        <td className="p-3.5 text-right font-black text-rose-600">{d.percentage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}