const ClassRoster = require('../models/ClassRoster');
const User = require('../models/User');
const cache = require('../utils/cache');

// Enroll a student in a class
exports.enrollStudent = async (req, res) => {
    try {
        const { studentId, className } = req.body;

        if (!studentId || !className) {
            return res.status(400).json({
                success: false,
                message: 'studentId and className are required'
            });
        }

        const student = await User.findOne({ studentId });
        if (!student || student.role !== 'student') {
            return res.status(400).json({
                success: false,
                message: 'Student not found or invalid role'
            });
        }

        const existing = await ClassRoster.findOne({ className, studentId });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Student is already enrolled in this class'
            });
        }

        const rosterEntry = new ClassRoster({
            className,
            student: student._id,
            studentId,
            isActive: true
        });

        await rosterEntry.save();
        cache.del(`roster_${className}`);

        res.status(201).json({
            success: true,
            message: 'Student enrolled successfully',
            data: rosterEntry
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get roster for a class
exports.getClassRoster = async (req, res) => {
    try {
        const { className } = req.params;

        const cacheKey = `roster_${className}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                source: 'cache',
                count: cachedData.length,
                data: cachedData
            });
        }

        const roster = await ClassRoster.find({ className, isActive: true })
            .populate('student', 'username email')
            .sort({ enrolledAt: 1 });

        cache.set(cacheKey, roster);

        res.json({
            success: true,
            source: 'database',
            count: roster.length,
            data: roster
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Remove a student from a class (soft delete)
exports.unenrollStudent = async (req, res) => {
    try {
        const { rosterEntryId } = req.params;

        const entry = await ClassRoster.findByIdAndUpdate(
            rosterEntryId,
            { isActive: false },
            { new: true }
        );

        if (!entry) {
            return res.status(404).json({ success: false, message: 'Roster entry not found' });
        }

        cache.del(`roster_${entry.className}`);

        res.json({
            success: true,
            message: 'Student unenrolled from class',
            data: entry
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all unique classes
exports.getAllClasses = async (req, res) => {
    try {
        const classes = await ClassRoster.distinct('className', { isActive: true });
        res.json({
            success: true,
            count: classes.length,
            data: classes
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
