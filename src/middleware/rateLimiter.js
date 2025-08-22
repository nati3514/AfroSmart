import rateLimit from 'express-rate-limit';
import config from '../config/config.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

// Default rate limit configuration
const defaultRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
};

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimit?.windowMs || defaultRateLimit.windowMs,
  max: config.rateLimit?.max || defaultRateLimit.max,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: (req, res, next) => {
    next(
      new ApiError(
        httpStatus.TOO_MANY_REQUESTS,
        'Too many requests, please try again later.'
      )
    );
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: (req, res, next) => {
    next(
      new ApiError(
        httpStatus.TOO_MANY_REQUESTS,
        'Too many requests, please try again later.'
      )
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export { authLimiter, apiLimiter };
