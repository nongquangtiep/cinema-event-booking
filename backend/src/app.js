/**
 * Main Application Entry Point - Cinema & Event Booking API
 * Phase 1: Skeleton configuration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'cinema-event-booking-api'
  });
});

// Metrics Endpoint Placeholder
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# Phase 1: Metrics endpoint placeholder\n');
});

// API Routes Placeholder (Will be loaded in Phase 3)
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Cinema & Event Booking API',
    version: '1.0.0',
    phase: 1
  });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Cinema API] Server listening on internal port ${PORT}`);
  });
}

module.exports = app;
