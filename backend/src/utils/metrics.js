/**
 * Prometheus Metrics Exporter Utility
 * Uses prom-client to collect default and business metrics
 */

const client = require('prom-client');

// Create a Registry which registers the metrics
const register = new client.Registry();

// Enable the collection of default runtime metrics
client.collectDefaultMetrics({ register });

// Custom Business Metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const cinemaTicketsBookedTotal = new client.Counter({
  name: 'cinema_tickets_booked_total',
  help: 'Total number of cinema/event tickets successfully booked',
  labelNames: ['movie_id', 'cinema_id'],
  registers: [register]
});

const cinemaRevenueTotalVnd = new client.Counter({
  name: 'cinema_revenue_total_vnd',
  help: 'Total revenue accumulated from ticket bookings in VND',
  registers: [register]
});

const cinemaActiveSeatLocks = new client.Gauge({
  name: 'cinema_active_seat_locks',
  help: 'Current number of active seat locks holding in the system',
  registers: [register]
});

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  cinemaTicketsBookedTotal,
  cinemaRevenueTotalVnd,
  cinemaActiveSeatLocks
};
