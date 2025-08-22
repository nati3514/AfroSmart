import httpStatus from 'http-status';
import config from '../config/config.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

/**
 * Error handler. Send stacktrace only during development
 * @public
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode = httpStatus.INTERNAL_SERVER_ERROR, message, isOperational } = err;
  
  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = httpStatus.BAD_REQUEST;
    message = err.errors.map(e => e.message).join('; ');
    isOperational = true;
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = httpStatus.UNAUTHORIZED;
    message = 'Invalid token';
    isOperational = true;
  }
  // Handle Token expiration
  else if (err.name === 'TokenExpiredError') {
    statusCode = httpStatus.UNAUTHORIZED;
    message = 'Token expired';
    isOperational = true;
  }
  // Handle invalid JSON body
  else if (err.type === 'entity.parse.failed') {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Invalid JSON payload';
    isOperational = true;
  }
  // Handle rate limit exceeded
  else if (err.statusCode === 429) {
    statusCode = httpStatus.TOO_MANY_REQUESTS;
    message = 'Too many requests, please try again later';
    isOperational = true;
  }
  // Handle unknown errors
  else if (!(err instanceof ApiError)) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = message || httpStatus[statusCode];
  }

  // Log the error
  logger.error({
    message: err.message,
    statusCode,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    stack: config.env === 'development' ? err.stack : undefined,
    ...(config.env === 'development' && { error: err })
  });

  // Prepare error response
  const response = {
    success: false,
    error: {
      code: statusCode,
      message: message || 'An unexpected error occurred',
      ...(config.env === 'development' && { stack: err.stack }),
      ...(isOperational && { isOperational })
    }
  };

  // Send error response
  res.status(statusCode).json(response);
};

/**
 * If error is not an instance of API Error, convert it.
 * @public
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 
                      (error.response?.status) || 
                      httpStatus.INTERNAL_SERVER_ERROR;
    
    const message = error.message || 
                   error.response?.data?.message || 
                   httpStatus[statusCode];
    
    error = new ApiError(statusCode, message, false, err.stack);
  }
  
  next(error);
};

/**
 * Catch 404 and forward to error handler
 * @public
 */
const notFound = (req, res, next) => {
  const error = new ApiError(
    httpStatus.NOT_FOUND,
    `API endpoint not found: ${req.originalUrl}`
  );
  next(error);
};

/**
 * Handle unhandled promise rejections
 * @public
 */
const handleUnhandledRejection = (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider restarting the process in production
  if (config.env === 'production') {
    // You might want to use a process manager like PM2 to restart the process
    process.exit(1);
  }
};

/**
 * Handle uncaught exceptions
 * @public
 */
const handleUncaughtException = (error) => {
  logger.error('Uncaught Exception:', error);
  // Consider graceful shutdown in production
  if (config.env === 'production') {
    // You might want to use a process manager like PM2 to restart the process
    process.exit(1);
  }
};

export {
  errorHandler,
  errorConverter,
  notFound,
  handleUnhandledRejection,
  handleUncaughtException,
};
