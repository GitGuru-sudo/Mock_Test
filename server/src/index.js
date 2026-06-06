'use strict';

require('dotenv').config();

const { validateEnv } = require('./config/env');
validateEnv();

// Initialize Redis client on startup
require('./config/redis');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const connectDB = require('./config/db');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS — allow requests from the configured client origin and send credentials
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Parse cookies (required for httpOnly refresh-token cookie)
app.use(cookieParser());

// HTTP request logger (dev format)
app.use(morgan('dev'));

// Parse incoming JSON bodies
app.use(express.json());

// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/students',  require('./routes/students'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/sessions',    require('./routes/sessions'));
app.use('/api/attendance',  require('./routes/attendance'));
app.use('/api/results',     require('./routes/results'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/portal',      require('./routes/studentPortal'));
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Error Handler — must be last middleware registered
// ---------------------------------------------------------------------------
app.use(require('./middleware/errorHandler'));

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

start();

module.exports = app; // exported for testing
