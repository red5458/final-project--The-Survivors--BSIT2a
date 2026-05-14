const router = require('express').Router();
const {
    createSession,
    getSessions,
    getSessionDetails,
    closeSession
} = require('../controllers/attendanceSessionController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Teacher/Admin only - create an attendance session
router.post('/', protect, authorize('teacher', 'admin'), createSession);

// Get sessions (all users can view their own class sessions)
router.get('/', protect, getSessions);

// Get specific session details
router.get('/:id', protect, getSessionDetails);

// Close session and mark absences (teacher/admin only)
router.post('/:id/close', protect, authorize('teacher', 'admin'), closeSession);

module.exports = router;
