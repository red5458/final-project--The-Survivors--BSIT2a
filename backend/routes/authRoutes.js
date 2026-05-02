const router = require('express').Router();
const { register, login, getAllUsers } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/users', protect, authorize('teacher', 'admin'), getAllUsers);

module.exports = router;