require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// CRITICAL: Serve static files from frontend folder
// This line was missing - it makes your HTML files accessible
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Website URL: http://localhost:${PORT}`);
});