const Attendance = require('../models/Attendance');
const User = require('../models/User');
const ClassSchedule = require('../models/ClassSchedule');
const cache = require('../utils/cache');

const classifyTime = (time, schedule) => {
  const checkInDate = new Date(time);
  const hours = checkInDate.getHours();
  const minutes = checkInDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (schedule && schedule.startTime) {
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMin;
    const allowance = schedule.allowanceMinutes ?? 5;
    const lateThreshold = startTotal + allowance;
    const absentThreshold = startTotal + 60; // 1 hour after start = Absent

    if (totalMinutes < startTotal) return 'Early';
    if (totalMinutes <= lateThreshold) return 'On-Time';
    if (totalMinutes < absentThreshold) return 'Late';
    return 'Absent';
  }

  // Default fallback if no schedule is saved yet
  if (hours < 8) return 'Early';
  if (hours === 8 && minutes <= 30) return 'On-Time';
  if ((hours === 8 && minutes > 30) || hours === 9) return 'Late';
  return 'Absent';
};

exports.checkIn = async (req, res) => {
  try {
    const { subject, notes } = req.body;

    const student = await User.findById(req.user.id);
    if (!student || student.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only student accounts can check in' });
    }

    const now = new Date();

    // Fetch active schedule from DB
    const schedule = await ClassSchedule.findOne().sort({ updatedAt: -1 });
    const status = classifyTime(now, schedule);

    const studentIdValue = student.studentId || student._id.toString();

    const record = new Attendance({
      studentId: studentIdValue,
      user: student._id,
      timeIn: now,
      status,
      subject: subject || (schedule?.className) || 'General',
      notes: notes || ''
    });

    await record.save();

    cache.del('attendance_all');
    cache.del(`attendance_student_${studentIdValue}`);
    cache.del('attendance_student_summary');

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      data: {
        ...record.toObject(),
        studentName: student.username
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Keep all other exports exactly as they were (getAll, getMyAttendance, getById, getStats, getStudentSummary, update, deleteAttendance)
exports.getAll = async (req, res) => {
  try {
    const cachedData = cache.get('attendance_all');

    if (cachedData) {
      console.log('📦 Serving attendance from cache');
      return res.json({
        success: true,
        source: 'cache',
        count: cachedData.length,
        data: cachedData
      });
    }

    const data = await Attendance.find()
      .populate('user', 'username email role')
      .lean()
      .sort({ timeIn: -1 });

    cache.set('attendance_all', data);
    console.log('💾 Attendance stored in cache');

    res.json({
      success: true,
      source: 'database',
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const studentId = req.user.studentId || req.user.id;
    const cacheKey = `attendance_student_${studentId}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.json({
        success: true,
        source: 'cache',
        count: cachedData.length,
        data: cachedData
      });
    }

    const data = await Attendance.find({ studentId })
      .lean()
      .sort({ timeIn: -1 });

    cache.set(cacheKey, data);

    res.json({
      success: true,
      source: 'database',
      count: data.length,
      data
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

    const record = await Attendance.findById(req.params.id)
      .populate('user', 'username email')
      .lean();

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

exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Attendance.aggregate([
      { $match: { timeIn: { $gte: today } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusCounts = { Early: 0, 'On-Time': 0, Late: 0, Absent: 0 };
    stats.forEach(stat => { statusCounts[stat._id] = stat.count; });

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      data: {
        today: statusCounts,
        total,
        percentages: {
          Early: total ? ((statusCounts.Early / total) * 100).toFixed(1) : 0,
          'On-Time': total ? ((statusCounts['On-Time'] / total) * 100).toFixed(1) : 0,
          Late: total ? ((statusCounts.Late / total) * 100).toFixed(1) : 0,
          Absent: total ? ((statusCounts.Absent / total) * 100).toFixed(1) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentSummary = async (req, res) => {
  try {
    const cacheKey = 'attendance_student_summary';
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.json({ success: true, source: 'cache', count: cachedData.length, data: cachedData });
    }

    const summary = await Attendance.aggregate([
      {
        $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' }
      },
      {
        $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: '$studentId',
          studentName: { $first: { $ifNull: ['$userInfo.username', '$studentId'] } },
          email: { $first: { $ifNull: ['$userInfo.email', 'N/A'] } },
          Early: { $sum: { $cond: [{ $eq: ['$status', 'Early'] }, 1, 0] } },
          'On-Time': { $sum: { $cond: [{ $eq: ['$status', 'On-Time'] }, 1, 0] } },
          Late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          Absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          studentName: 1,
          email: 1,
          Early: 1,
          'On-Time': 1,
          Late: 1,
          Absent: 1,
          total: 1,
          percentages: {
            Early: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$Early', '$total'] }, 100] }] },
            'On-Time': { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$On-Time', '$total'] }, 100] }] },
            Late: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$Late', '$total'] }, 100] }] },
            Absent: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$Absent', '$total'] }, 100] }] }
          }
        }
      },
      { $sort: { studentName: 1 } }
    ]);

    cache.set(cacheKey, summary);

    res.json({ success: true, source: 'database', count: summary.length, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    cache.del('attendance_all');
    cache.del(`attendance_${req.params.id}`);
    cache.del(`attendance_student_${updated.studentId}`);
    cache.del('attendance_student_summary');

    res.json({ success: true, message: 'Updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    cache.del('attendance_all');
    cache.del(`attendance_${req.params.id}`);
    cache.del(`attendance_student_${record.studentId}`);
    cache.del('attendance_student_summary');

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};