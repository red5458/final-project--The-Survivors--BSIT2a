const router = require('express').Router();
const {
    checkIn,
    getAll,
    getById,
    update,
    deleteAttendance    
} = require('../controllers/attendanceController');

const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/checkin', protect, authorize('student'), checkIn);
router.get('/', protect, authorize('teacher', 'admin'), getAll);
router.get('/:id', protect, authorize('teacher', 'admin'), getById);
router.put('/:id', protect, authorize('admin'), update);
router.delete('/:id', protect, authorize('admin'), deleteAttendance);

module.exports = router;