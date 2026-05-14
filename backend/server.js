require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

connectDB();

app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts in frontend HTML
}));
app.use(xss());
app.use(mongoSanitize());

// FIX: Allow requests from any origin so the browser-served frontend can reach the API
app.use(cors({
  origin: '*',
  credentials: false
}));

app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20, // Relaxed for development; tighten in production
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Relaxed for development
  message: {
    success: false,
    message: 'Too many registration attempts, please try again after 15 minutes'
  }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);

app.use(require('./middleware/logger').logger);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all: serve index.html for any non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Website URL: http://localhost:${PORT}`);
  console.log(`🔒 Security features enabled: Helmet, XSS Protection, Mongo Sanitize, Rate Limiting`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
});
