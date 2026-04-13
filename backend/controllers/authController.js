const User = require('../models/User');
const bcrypt = require('bcrypt');

// REGISTER
exports.register = async (req, res) => {
  const { username, email, password, role, studentId } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: "Email exists" });

  const hashed = await bcrypt.hash(password, 10);

  const user = new User({
    username,
    email,
    password: hashed,
    role,
    studentId
  });

  await user.save();

  res.json({ message: "Registered" });
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "Not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Wrong password" });

  res.json({
    message: "Login success",
    user: { id: user._id, role: user.role }
  });
};