const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: '30d'
    });
};

// REGISTER
exports.register = async (req, res) => {
    try {
        const { username, email, password, role, studentId } = req.body;

        // Check if user exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash password
        const hashed = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            username,
            email,
            password: hashed,
            role: role || 'student',
            studentId
        });

        await user.save();

        res.status(201).json({ 
            message: "Registered successfully",
            token: generateToken(user._id, user.role),
            user: { 
                id: user._id, 
                username: user.username,
                email: user.email,
                role: user.role,
                studentId: user.studentId
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ message: "Wrong password" });
        }

        res.json({
            message: "Login successful",
            token: generateToken(user._id, user.role),
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                studentId: user.studentId
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};