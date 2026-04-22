const router = require('express').Router();
const {
  checkIn,
  getAll,
  update,
  delete: deleteAttendance
} = require('../controllers/attendanceController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Student can check-in
router.post('/checkin', protect, authorize('student'), checkIn);

// Only teacher/admin can view all
router.get('/', protect, authorize('teacher', 'admin'), getAll);

// Admin only update/delete
router.put('/:id', protect, authorize('admin'), update);
router.delete('/:id', protect, authorize('admin'), deleteAttendance);

module.exports = router;