/**
 * Winston Structured JSON Logger Configuration
 * Outputs logs to stdout in JSON format for Promtail and Loki aggregation
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cinema-api' },
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;
