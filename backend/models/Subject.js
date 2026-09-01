const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subjectCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  semester: { type: Number, required: true },
  subjectType: { 
    type: String, 
    enum: ['COMMON', 'TRACK_IS', 'TRACK_AI', 'ELECTIVE_GROUP'], 
    required: true 
  },
  isPractical: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);