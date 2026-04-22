const Attendance = require('../models/Attendance');

// Auto classification
const classifyTime = (time) => {
  const hour = new Date(time).getHours();

  if (hour < 8) return "Early";
  if (hour === 8) return "On-Time";
  if (hour > 8 && hour < 10) return "Late";
  return "Absent";
};

// CREATE (Check-in)
exports.checkIn = async (req, res) => {
  const { studentId } = req.body;

  const now = new Date();
  const status = classifyTime(now);

  const record = new Attendance({
    studentId,
    timeIn: now,
    status
  });

  await record.save();
  res.json(record);
};

// READ
exports.getAll = async (req, res) => {
  const data = await Attendance.find();
  res.json(data);
};

// UPDATE
exports.update = async (req, res) => {
  const updated = await Attendance.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updated);
};

// DELETE
exports.delete = async (req, res) => {
  await Attendance.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};