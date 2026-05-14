const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');
const ClassRoster = require('../models/ClassRoster');
const cache = require('../utils/cache');

// Create an attendance session (for a specific class on a specific date)
exports.createSession = async (req, res) => {
    try {
        const { sessionDate, className, startTime, endTime, allowanceMinutes, notes } = req.body;

        if (!sessionDate || !className || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'sessionDate, className, startTime, and endTime are required'
            });
        }

        const session = new AttendanceSession({
            sessionDate: new Date(sessionDate),
            className,
            startTime,
            endTime,
            allowanceMinutes: allowanceMinutes ?? 5,
            createdBy: req.user.id,
            notes: notes || ''
        });

        await session.save();
        cache.del('attendance_sessions_all');

        res.status(201).json({
            success: true,
            message: 'Attendance session created',
            data: session
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all sessions for a class or by date range
exports.getSessions = async (req, res) => {
    try {
        const { className, startDate, endDate } = req.query;
        const query = {};

        if (className) query.className = className;
        if (startDate || endDate) {
            query.sessionDate = {};
            if (startDate) query.sessionDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.sessionDate.$lte = end;
            }
        }

        const sessions = await AttendanceSession.find(query)
            .sort({ sessionDate: -1 })
            .populate('createdBy', 'username');

        res.json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get a single session with attendance details
exports.getSessionDetails = async (req, res) => {
    try {
        const session = await AttendanceSession.findById(req.params.id)
            .populate('createdBy', 'username');

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        const attendance = await Attendance.find({ session: session._id })
            .populate('user', 'username email');

        res.json({
            success: true,
            data: {
                session,
                attendance,
                attendanceCount: attendance.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Close a session and mark all non-checked-in roster students as Absent
exports.closeSession = async (req, res) => {
    try {
        const session = await AttendanceSession.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (session.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'Session is already closed'
            });
        }

        // Get roster for this class
        const roster = await ClassRoster.find({
            className: session.className,
            isActive: true
        });

        const checkedInStudents = await Attendance.find({ session: session._id })
            .select('studentId');
        const checkedInIds = new Set(checkedInStudents.map(a => a.studentId));

        // Create Absent records for students not checked in
        const absenceRecords = [];
        for (const rosterEntry of roster) {
            if (!checkedInIds.has(rosterEntry.studentId)) {
                absenceRecords.push({
                    session: session._id,
                    studentId: rosterEntry.studentId,
                    user: rosterEntry.student,
                    timeIn: new Date(session.sessionDate).setHours(
                        parseInt(session.startTime.split(':')[0]),
                        parseInt(session.startTime.split(':')[1])
                    ),
                    status: 'Absent',
                    subject: session.className,
                    markedByAdmin: true,
                    notes: 'Auto-marked absent: no check-in'
                });
            }
        }

        if (absenceRecords.length > 0) {
            await Attendance.insertMany(absenceRecords);
        }

        session.status = 'closed';
        await session.save();
        cache.del('attendance_sessions_all');

        res.json({
            success: true,
            message: `Session closed. ${absenceRecords.length} absence records created.`,
            data: {
                session,
                absencesCreated: absenceRecords.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
