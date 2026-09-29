/**
 * Centralized Error Handling Middleware
 */

const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled application error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const responseMessage = (statusCode === 500 && isProd)
    ? 'Lỗi hệ thống nội bộ'
    : (err.message || 'Lỗi hệ thống nội bộ');

  res.status(statusCode).json({
    error: responseMessage,
    status: statusCode
  });
}

module.exports = {
  errorHandler
};
