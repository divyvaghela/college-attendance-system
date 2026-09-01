const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  slot: { type: String, required: true },
  semester: { type: Number, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  facultyName: { type: String, required: true },
  divisionTarget: { type: String, default: 'ALL' }
});

module.exports = mongoose.model('Timetable', timetableSchema);