const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  facultyName: { type: String, required: true },
  sessionDate: { type: Date, default: Date.now },
  slot: { type: String, required: true },
  divisionTarget: { type: String, default: 'ALL' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectGroup', default: null }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);