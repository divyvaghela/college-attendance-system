const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  leaveType: { type: String, enum: ['MEDICAL', 'ON_DUTY_EVENT', 'SPORTS', 'PERSONAL'], required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  approvedBy: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);