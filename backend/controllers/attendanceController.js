const Attendance = require('../models/Attendance');
const cache = require('../utils/cache');

const classifyTime = (time) => {
    const hour = new Date(time).getHours();

    if (hour < 8) return "Early";
    if (hour === 8) return "On-Time";
    if (hour > 8 && hour < 10) return "Late";
    return "Absent";
};

exports.checkIn = async (req, res) => {
    try {
        const { studentId } = req.body;

        const now = new Date();
        const status = classifyTime(now);

        const record = new Attendance({
            studentId,
            timeIn: now,
            status
        });

        await record.save();

        cache.del('attendance_all');

        res.status(201).json({
            success: true,
            message: 'Check-in successful',
            data: record
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAll = async (req, res) => {
    try {
        const cachedData = cache.get('attendance_all');

        if (cachedData) {
            console.log(' Serving from cache');
            return res.json({
                success: true,
                source: 'cache',
                count: cachedData.length,
                data: cachedData
            });
        }
        const data = await Attendance.find()
            .lean()           
            .sort({ timeIn: -1 }); 
        cache.set('attendance_all', data);
        console.log(' Stored in cache');

        res.json({
            success: true,
            source: 'database',
            count: data.length,
            data: data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getById = async (req, res) => {
    try {
        const cacheKey = `attendance_${req.params.id}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json({
                success: true,
                source: 'cache',
                data: cachedData
            });
        }

        const record = await Attendance.findById(req.params.id).lean();

        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        cache.set(cacheKey, record);

        res.json({
            success: true,
            source: 'database',
            data: record
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.update = async (req, res) => {
    try {
        const updated = await Attendance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).lean();
        cache.del('attendance_all');
        cache.del(`attendance_${req.params.id}`);

        res.json({
            success: true,
            message: 'Updated successfully',
            data: updated
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.delete = async (req, res) => {
    try {
        await Attendance.findByIdAndDelete(req.params.id);

        cache.del('attendance_all');
        cache.del(`attendance_${req.params.id}`);

        res.json({
            success: true,
            message: 'Deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};