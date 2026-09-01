const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['PRESENT', 'ABSENT', 'LEAVE'], required: true }
}, { timestamps: true });

attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);