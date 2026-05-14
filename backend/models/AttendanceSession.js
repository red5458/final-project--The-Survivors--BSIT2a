const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
    sessionDate: {
        type: Date,
        required: true,
        index: true
    },
    className: {
        type: String,
        required: true
    },
    startTime: {
        type: String, // "HH:MM"
        required: true
    },
    endTime: {
        type: String, // "HH:MM"
        required: true
    },
    allowanceMinutes: {
        type: Number,
        default: 5
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

attendanceSessionSchema.index({ sessionDate: 1, className: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
