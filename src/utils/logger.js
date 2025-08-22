import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger instance
const logger = winston.createLogger({
  level: 'warn', // Only show warnings and errors by default
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.simple()
  ),
  defaultMeta: { service: 'express-auth-system' },
  transports: [
    // In development, only log to console
    ...(process.env.NODE_ENV !== 'development' ? [
      // In production, log to files
      new winston.transports.File({ 
        filename: path.join(__dirname, '../../logs/error.log'), 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({ 
        filename: path.join(__dirname, '../../logs/combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    ] : [])
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
