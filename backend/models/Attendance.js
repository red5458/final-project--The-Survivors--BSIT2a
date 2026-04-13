const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Early', 'On-Time', 'Late', 'Absent']
  },
  timeIn: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);