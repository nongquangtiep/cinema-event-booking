/**
 * Main Express Application
 * Cinema & Event Booking Backend API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { testConnection } = require('./config/database');
const logger = require('./config/logger');
const { register, metricsMiddleware } = require('./utils/metrics');
const { errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const showtimeRoutes = require('./routes/showtimeRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics Collection Middleware
app.use(metricsMiddleware);

// Request Logger Middleware
app.use((req, res, next) => {
  if (req.path !== '/api/health' && req.path !== '/metrics') {
    logger.info('Incoming request', {
      method: req.method,
      path: req.originalUrl,
      ip: req.ip
    });
  }
  next();
});

// System Endpoints
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  if (dbConnected) {
    return res.status(200).json({
      status: 'ok',
      database: 'connected'
    });
  } else {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected'
    });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Business API Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Centralized Error Handler
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Cinema API server started on port ${PORT}`);
  });
}

module.exports = app;
