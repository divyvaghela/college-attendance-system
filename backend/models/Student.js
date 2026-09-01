const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  currentSem: { type: Number, required: true },
  division: { type: String, required: true }, // 'Div-1', 'Div-2'
  track: { type: String, enum: ['NONE', 'IS', 'AI'], default: 'NONE' }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);