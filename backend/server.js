const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { Parser } = require('json2csv');
require('dotenv').config();

const Student = require('./models/Student');
const Subject = require('./models/Subject');
const ProjectGroup = require('./models/ProjectGroup');
const AttendanceSession = require('./models/AttendanceSession');
const AttendanceRecord = require('./models/AttendanceRecord');
const User = require('./models/User');
const Timetable = require('./models/Timetable');
const LeaveRequest = require('./models/LeaveRequest');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'integrated_msc_attendance_secret_2026';

// ---------------- 1. AUTHENTICATION ----------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, rollNo: user.rollNo },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, rollNo: user.rollNo }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 2. SUBJECTS & TIMETABLE ----------------
app.get('/api/subjects', async (req, res) => {
  try {
    const { semester } = req.query;
    const filter = semester ? { semester: Number(semester) } : {};
    const subjects = await Subject.find(filter).sort({ subjectCode: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/timetable/today', async (req, res) => {
  try {
    const { day, semester } = req.query;
    const filter = {};
    if (day) filter.day = day;
    if (semester) filter.semester = Number(semester);

    const schedule = await Timetable.find(filter).populate('subjectId');
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 3. DYNAMIC ROSTER ENGINE ----------------
// ---------------- 3. DYNAMIC ROSTER ENGINE ----------------
app.get('/api/attendance/roster', async (req, res) => {
  try {
    const { subjectId, division, groupId } = req.query;
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    if (subject.subjectType === 'ELECTIVE_GROUP') {
      if (groupId) {
        const group = await ProjectGroup.findById(groupId).populate({
          path: 'studentIds',
          options: { sort: { rollNo: 1 }, collation: { locale: "en", numericOrdering: true } }
        });
        return res.json({ subject, students: group ? group.studentIds : [] });
      }
      const groups = await ProjectGroup.find({ subjectId: subject._id });
      return res.json({ subject, groups, isGroupSelectNeeded: true });
    }

    let query = { currentSem: subject.semester };
    if (subject.subjectType === 'COMMON') {
      if (division && division !== 'ALL') query.division = division;
    } else if (subject.subjectType === 'TRACK_IS') {
      query.track = 'IS';
      if (division && division !== 'ALL') query.division = division;
    } else if (subject.subjectType === 'TRACK_AI') {
      query.track = 'AI';
      if (division && division !== 'ALL') query.division = division;
    }

    // MongoDB માં નંબર વાઈઝ પ્રોપર શોર્ટિંગ માટે collation વાપર્યું છે
    const students = await Student.find(query)
      .collation({ locale: "en", numericOrdering: true })
      .sort({ rollNo: 1 });
      
    res.json({ subject, students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ---------------- 4. ATTENDANCE SUBMISSION ----------------
app.post('/api/attendance/submit', async (req, res) => {
  try {
    const { subjectId, facultyName, slot, divisionTarget, groupId, sessionDate, topic, description, records } = req.body;

    if (!records || records.length === 0) {
      return res.status(400).json({ message: 'No records provided' });
    }

    const session = await AttendanceSession.create({
      subjectId,
      facultyName: facultyName || 'Faculty',
      slot: slot || 'Standard Lecture',
      divisionTarget: divisionTarget || 'ALL',
      groupId: groupId || null,
      sessionDate: sessionDate || new Date(),
      topic: topic || 'Standard Lecture',
      description: description || ''
    });

    const docs = records.map(r => ({
      sessionId: session._id,
      subjectId,
      studentId: r.studentId,
      status: r.status
    }));

    await AttendanceRecord.insertMany(docs);
    res.status(201).json({ message: 'Attendance recorded successfully!', sessionId: session._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 5. ATTENDANCE HISTORY & EDIT ----------------
app.get('/api/attendance/history', async (req, res) => {
  try {
    const { semester } = req.query;
    let query = {};
    if (semester) {
      const subjects = await Subject.find({ semester: Number(semester) }).select('_id');
      query.subjectId = { $in: subjects.map(s => s._id) };
    }

    const sessions = await AttendanceSession.find(query)
      .populate('subjectId', 'name subjectCode subjectType')
      .populate('groupId', 'groupName')
      .sort({ sessionDate: -1, createdAt: -1 })
      .limit(50);

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/session/:sessionId', async (req, res) => {
  try {
    const records = await AttendanceRecord.find({ sessionId: req.params.sessionId })
      .populate('studentId', 'rollNo name division track')
      .sort({ 'studentId.rollNo': 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 6. SUPER ADMIN STUDENT CRUD MANAGEMENT ----------------
// Get students sorted numerically by rollNo for Super Admin
app.get('/api/students', async (req, res) => {
  try {
    const { division, track } = req.query;
    let query = {};
    if (division && division !== 'ALL') query.division = division;
    if (track && track !== 'ALL') query.track = track;

    // MongoDB માં rollNo ને નંબર તરીકે શોર્ટ કરવા માટે
    const students = await Student.find(query).collation({ locale: "en", numericOrdering: true }).sort({ rollNo: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Add a new student & create their student user login
app.post('/api/students/add', async (req, res) => {
  try {
    const { rollNo, name, currentSem, division, track, email } = req.body;
    const newStudent = new Student(req.body);
    await newStudent.save();

    const studentEmail = email || `student${rollNo}@college.edu`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('DCSGu', salt);

    await User.findOneAndUpdate(
      { email: studentEmail.toLowerCase() },
      {
        name,
        email: studentEmail.toLowerCase(),
        password: hashedPassword,
        role: 'STUDENT',
        rollNo
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Student and login account added successfully', student: newStudent });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.put('/api/students/update/:id', async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedStudent) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student updated successfully', student: updatedStudent });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/students/delete/:id', async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    if (!deletedStudent) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 7. CSV BULK IMPORT (ADMIN) ----------------
app.post('/api/students/import-csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', data => results.push(data))
    .on('end', async () => {
      try {
        let inserted = 0;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('DCSGu', salt);

        for (let row of results) {
          const rNo = row.rollNo || row['Roll No'] || row['roll no'];
          const sName = row.name || row['Name'] || row['NAME'];
          const sem = row.currentSem || row['Current Sem'] || row['current sem'] || 7;
          const div = row.division || row['Division'] || row['DIV'] || 'Div-1';
          const trk = row.track || row['Track'] || row['TRACK'] || 'NONE';

          // Create a standard institutional email if not provided (e.g. studentrollno@college.edu)
          const sEmail = row.email || row['Email'] || `student${rNo}@college.edu`;

          if (rNo && sName) {
            // 1. Upsert Student Record
            const studentDoc = await Student.findOneAndUpdate(
              { rollNo: String(rNo).trim() },
              {
                name: String(sName).trim(),
                currentSem: Number(sem) || 7,
                division: String(div).trim(),
                track: String(trk).trim().toUpperCase()
              },
              { upsert: true, new: true }
            );

            // 2. Upsert User Login Record for this student with common password 'DCSGu'
            await User.findOneAndUpdate(
              { email: sEmail.toLowerCase().trim() },
              {
                name: String(sName).trim(),
                email: sEmail.toLowerCase().trim(),
                password: hashedPassword,
                role: 'STUDENT',
                rollNo: String(rNo).trim()
              },
              { upsert: true, new: true }
            );

            inserted++;
          }
        }
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.json({ message: `Successfully imported & updated ${inserted} students with login credentials!` });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
});
// ---------------- 8. STUDENT ANALYTICS & DEFAULTERS ----------------
app.get('/api/attendance/student/:rollNo', async (req, res) => {
  try {
    const student = await Student.findOne({ rollNo: req.params.rollNo });
    if (!student) return res.status(404).json({ message: 'Student not found with this Roll No' });

    const allowedTypes = ['COMMON'];
    if (student.track === 'IS') allowedTypes.push('TRACK_IS');
    if (student.track === 'AI') allowedTypes.push('TRACK_AI');

    const validSubjects = await Subject.find({
      semester: student.currentSem,
      $or: [{ subjectType: { $in: allowedTypes } }, { subjectType: 'ELECTIVE_GROUP' }]
    });

    let totalConducted = 0;
    let totalAttended = 0;
    const subjectBreakdown = [];

    for (const subj of validSubjects) {
      let conducted = 0;
      if (subj.subjectType === 'ELECTIVE_GROUP') {
        const group = await ProjectGroup.findOne({ subjectId: subj._id, studentIds: student._id });
        if (group) conducted = await AttendanceSession.countDocuments({ subjectId: subj._id, groupId: group._id });
      } else {
        conducted = await AttendanceSession.countDocuments({ subjectId: subj._id });
      }

      const attended = await AttendanceRecord.countDocuments({
        subjectId: subj._id,
        studentId: student._id,
        status: 'PRESENT'
      });

      const percentage = conducted > 0 ? ((attended / conducted) * 100).toFixed(2) : '0.00';
      totalConducted += conducted;
      totalAttended += attended;

      subjectBreakdown.push({
        name: subj.name,
        code: subj.subjectCode,
        type: subj.subjectType,
        conducted,
        attended,
        percentage: Number(percentage)
      });
    }

    const overallPercentage = totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(2)) : 0;

    res.json({
      student,
      overallPercentage,
      totalConducted,
      totalAttended,
      isShortage: overallPercentage < 75 && totalConducted > 0,
      subjects: subjectBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/defaulters', async (req, res) => {
  try {
    const { semester } = req.query;
    const students = await Student.find(semester ? { currentSem: Number(semester) } : {}).sort({ rollNo: 1 });
    const defaulters = [];

    for (const st of students) {
      const allowedTypes = ['COMMON'];
      if (st.track === 'IS') allowedTypes.push('TRACK_IS');
      if (st.track === 'AI') allowedTypes.push('TRACK_AI');

      const validSubjects = await Subject.find({
        semester: st.currentSem,
        $or: [{ subjectType: { $in: allowedTypes } }, { subjectType: 'ELECTIVE_GROUP' }]
      });

      let totalConducted = 0;
      let totalAttended = 0;

      for (const subj of validSubjects) {
        let conducted = 0;
        if (subj.subjectType === 'ELECTIVE_GROUP') {
          const group = await ProjectGroup.findOne({ subjectId: subj._id, studentIds: st._id });
          if (group) conducted = await AttendanceSession.countDocuments({ subjectId: subj._id, groupId: group._id });
        } else {
          conducted = await AttendanceSession.countDocuments({ subjectId: subj._id });
        }

        const attended = await AttendanceRecord.countDocuments({ 
          subjectId: subj._id, 
          studentId: st._id, 
          status: 'PRESENT' 
        });

        totalConducted += conducted;
        totalAttended += attended;
      }

      const percentage = totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(2)) : 100;
      if (percentage < 75 && totalConducted > 0) {
        defaulters.push({
          rollNo: st.rollNo,
          name: st.name,
          semester: st.currentSem,
          division: st.division,
          track: st.track,
          attended: totalAttended,
          conducted: totalConducted,
          percentage: `${percentage}%`
        });
      }
    }
    res.json(defaulters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 9. CSV EXPORT ----------------
app.get('/api/attendance/export/csv', async (req, res) => {
  try {
    const { subjectId } = req.query;
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).send('Subject not found');

    const records = await AttendanceRecord.find({ subjectId })
      .populate('studentId', 'rollNo name division track')
      .populate('sessionId', 'sessionDate slot');

    const data = records.map(r => ({
      RollNo: r.studentId?.rollNo || 'N/A',
      Name: r.studentId?.name || 'N/A',
      Division: r.studentId?.division || 'N/A',
      Track: r.studentId?.track || 'N/A',
      Date: r.sessionId?.sessionDate ? new Date(r.sessionId.sessionDate).toLocaleDateString() : 'N/A',
      Slot: r.sessionId?.slot || 'N/A',
      Status: r.status
    }));

    const json2csvParser = new Parser();
    const csvData = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`${subject.name.replace(/\s+/g, '_')}_Attendance.csv`);
    return res.send(csvData);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ---------------- 10. ERP LEAVE & OD WORKFLOW ----------------
app.post('/api/leave/apply', async (req, res) => {
  try {
    const { studentId, leaveType, fromDate, toDate, reason } = req.body;
    const leave = await LeaveRequest.create({ studentId, leaveType, fromDate, toDate, reason });
    res.status(201).json({ message: 'Leave application submitted successfully!', leave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leave/all', async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().populate('studentId', 'rollNo name division track').sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leave/status', async (req, res) => {
  try {
    const { leaveId, status, facultyName } = req.body;
    const updated = await LeaveRequest.findByIdAndUpdate(leaveId, { status, approvedBy: facultyName }, { new: true });
    res.json({ message: `Leave status updated to ${status}`, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college_attendance_db')
  .then(() => {
    console.log('MongoDB Connected successfully!');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('DB Error:', err));



// Bulk Delete Students
app.post('/api/students/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: 'No student IDs provided' });
    }
    await Student.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Selected students deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});