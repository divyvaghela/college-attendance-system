const mongoose = require('mongoose');

const projectGroupSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  mentorName: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

module.exports = mongoose.model('ProjectGroup', projectGroupSchema);