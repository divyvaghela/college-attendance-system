const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Student = require('./models/Student');
const Subject = require('./models/Subject');
const ProjectGroup = require('./models/ProjectGroup');
const User = require('./models/User');
const Timetable = require('./models/Timetable');

async function runSeed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college_attendance_db');
  await Student.deleteMany({});
  await Subject.deleteMany({});
  await ProjectGroup.deleteMany({});
  await User.deleteMany({});
  await Timetable.deleteMany({});

  // 1. Users
  const hashedPassword = await bcrypt.hash('123456', 10);
  await User.insertMany([
    { name: 'Dr. Sharma (Faculty)', email: 'faculty@college.edu', password: hashedPassword, role: 'FACULTY' },
    { name: 'Admin Office', email: 'admin@college.edu', password: hashedPassword, role: 'ADMIN' },
    { name: 'Aarav Sharma (Student)', email: 'aarav@college.edu', password: hashedPassword, role: 'STUDENT', rollNo: '01' },
    { name: 'Vaghela Divy Dipakbhai', email: 'divyvaghela63@gmail.com', password: hashedPassword, role: 'STUDENT', rollNo: '56' }
  ]);

  // 2. Subjects (Sem 1 to 10)
  const subjects = await Subject.insertMany([
    { subjectCode: 'MSC101', name: 'Programming in C', semester: 1, subjectType: 'COMMON' },
    { subjectCode: 'MSC301', name: 'Fundamental of Networking', semester: 3, subjectType: 'COMMON' },
    { subjectCode: 'MSC302', name: 'English for Excellence', semester: 3, subjectType: 'COMMON' },
    { subjectCode: 'MSC501', name: 'Machine Learning', semester: 5, subjectType: 'COMMON' },
    { subjectCode: 'MSC504_AI', name: 'Artificial Intelligence', semester: 5, subjectType: 'TRACK_AI' },
    { subjectCode: 'MSC504_IS', name: 'Cryptography', semester: 5, subjectType: 'TRACK_IS' },
    { subjectCode: 'MSC701', name: 'Research Methodology – 1', semester: 7, subjectType: 'COMMON' },
    { subjectCode: 'MSC702', name: 'DevSecOps', semester: 7, subjectType: 'COMMON' },
    { subjectCode: 'MSC703', name: 'Cloud Computing', semester: 7, subjectType: 'COMMON' },
    { subjectCode: 'MSC704', name: 'Fullstack Web Dev Practical', semester: 7, subjectType: 'COMMON', isPractical: true },
    { subjectCode: 'MSC705_AI', name: 'Deep Learning', semester: 7, subjectType: 'TRACK_AI' },
    { subjectCode: 'MSC705_IS', name: 'Network Security', semester: 7, subjectType: 'TRACK_IS' },
    { subjectCode: 'MSC707_PROJ', name: 'Research Project', semester: 7, subjectType: 'ELECTIVE_GROUP', isPractical: true }
  ]);

  // 3. Students
  const students = await Student.insertMany([
    { rollNo: '01', name: 'Aarav Sharma', currentSem: 7, division: 'Div-1', track: 'AI' },
    { rollNo: '02', name: 'Ananya Patel', currentSem: 7, division: 'Div-1', track: 'AI' },
    { rollNo: '03', name: 'Dev Joshi', currentSem: 7, division: 'Div-1', track: 'IS' },
    { rollNo: '04', name: 'Diya Shah', currentSem: 7, division: 'Div-1', track: 'IS' },
    { rollNo: '56', name: 'Vaghela Divy Dipakbhai', currentSem: 7, division: 'Div-1', track: 'IS' },
    { rollNo: '61', name: 'Kabir Mehta', currentSem: 7, division: 'Div-2', track: 'AI' },
    { rollNo: '62', name: 'Khushi Desai', currentSem: 7, division: 'Div-2', track: 'AI' },
    { rollNo: '63', name: 'Meet Varma', currentSem: 7, division: 'Div-2', track: 'IS' },
    { rollNo: '64', name: 'Neha Trivedi', currentSem: 7, division: 'Div-2', track: 'IS' }
  ]);

  // 4. Research Project Group
  const projSubj = subjects.find(s => s.subjectCode === 'MSC707_PROJ');
  const divy = students.find(s => s.rollNo === '56');
  await ProjectGroup.create({
    groupName: 'AI-Security Hybrid Lab Group',
    mentorName: 'Dr. K. Patel',
    subjectId: projSubj._id,
    studentIds: [divy._id, students[0]._id, students[1]._id, students[5]._id]
  });

  // 5. Timetable Slots
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];

  await Timetable.insertMany([
    { day: todayName, slot: '10:30 AM - 11:30 AM', semester: 7, subjectId: subjects[6]._id, facultyName: 'Dr. Sharma' },
    { day: todayName, slot: '11:30 AM - 12:30 PM', semester: 7, subjectId: subjects[10]._id, facultyName: 'Prof. AI' },
    { day: todayName, slot: '11:30 AM - 12:30 PM', semester: 7, subjectId: subjects[11]._id, facultyName: 'Prof. IS' }
  ]);

  console.log('Seeded Users, Timetable, Subjects & Students successfully!');
  process.exit();
}

runSeed();