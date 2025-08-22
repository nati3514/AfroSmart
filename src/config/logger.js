import winston from 'winston';
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, align } = format;
import config from './config.js';

// Define custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  const logMessage = `${timestamp} [${level}]: ${stack || message}`;
  return logMessage;
});

// Create logger instance
const logger = createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    align(),
    logFormat
  ),
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level `info` and below to `combined.log`
    new transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// If we're not in production, log to the console as well
if (config.env === 'development') {
  logger.add(new transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      align(),
      logFormat
    ),
  }));
}

// Create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export default logger;
