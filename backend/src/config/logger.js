/**
 * Winston Structured JSON Logger Configuration
 * Output structured JSON logs to stdout for Promtail/Loki ingestion
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'cinema-event-api' },
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;
