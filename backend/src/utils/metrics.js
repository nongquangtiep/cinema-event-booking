/**
 * Prometheus Metrics Exporter Utility
 * Tracks runtime metrics, HTTP request telemetry, and business KPIs
 */

const client = require('prom-client');

const register = new client.Registry();

// Enable standard NodeJS process and runtime metrics
client.collectDefaultMetrics({ register });

// 1. HTTP Request Total Counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// 2. HTTP Request Duration Histogram
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Histogram of HTTP request durations in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register]
});

// 3. Cinema Tickets Booked Total Counter
const cinemaTicketsBookedTotal = new client.Counter({
  name: 'cinema_tickets_booked_total',
  help: 'Total number of tickets successfully booked and paid',
  labelNames: ['movie_id'],
  registers: [register]
});

// 4. Cinema Revenue Total (VND) Counter
const cinemaRevenueTotalVnd = new client.Counter({
  name: 'cinema_revenue_total_vnd',
  help: 'Total revenue collected in VND from paid ticket bookings',
  registers: [register]
});

// 5. Cinema Active Seat Locks Gauge
const cinemaActiveSeatLocks = new client.Gauge({
  name: 'cinema_active_seat_locks',
  help: 'Current number of active seat holds in the system',
  registers: [register]
});

/**
 * Express Middleware for measuring request latency and status codes
 */
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;

    // Normalize route path for metrics aggregation (avoid high cardinality)
    const route = req.baseUrl ? `${req.baseUrl}${req.route ? req.route.path : ''}` : (req.route ? req.route.path : req.path);
    const status = res.statusCode.toString();
    const method = req.method;

    httpRequestsTotal.inc({ method, route, status });
    httpRequestDurationSeconds.observe({ method, route, status }, duration);
  });

  next();
}

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  cinemaTicketsBookedTotal,
  cinemaRevenueTotalVnd,
  cinemaActiveSeatLocks,
  metricsMiddleware
};
