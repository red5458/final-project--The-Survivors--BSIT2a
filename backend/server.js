const dns = require('dns');
// Force Cloudflare and Google DNS servers
dns.setServers(['1.1.1.1', '8.8.8.8']);

// Then your existing mongoose connection code
const mongoose = require('mongoose');
// ... rest of your code

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});