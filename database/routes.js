const express = require('express');
const router = express.Router();
const { register, login } = require('./controllers/authController');

// Auth routes
router.post('/register', register);
router.post('/login', login);

// Other routes
// router.get('/attendance', attendanceController.getAttendance);
// etc.

module.exports = router;