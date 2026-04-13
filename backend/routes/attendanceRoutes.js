const router = require('express').Router();
const {
  checkIn,
  getAll,
  update,
  delete: deleteAttendance
} = require('../controllers/attendanceController');

router.post('/checkin', checkIn);
router.get('/', getAll);
router.put('/:id', update);
router.delete('/:id', deleteAttendance);

module.exports = router;