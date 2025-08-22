import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import httpStatus from 'http-status';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import config from './config/config.js';
import logger from './utils/logger.js';
import { errorConverter, errorHandler } from './middleware/error.js';
import ApiError from './utils/ApiError.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import todoRoutes from './routes/todo.routes.js';

// Initialize express app
const app = express();

// Log app initialization
logger.info('Initializing Express application...');

// Trust proxy
app.set('trust proxy', 1);

// Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now, configure properly in production
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// Log middleware setup
app.use((req, res, next) => {
  logger.debug(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// Enable CORS
app.use(cors({
  origin: config.cors.origin,
  methods: config.cors.methods,
  credentials: config.cors.credentials,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
}));
app.options('*', cors());

// Development logging
if (config.env === 'development') {
  app.use(morgan('dev', { stream: { write: message => logger.info(message.trim()) } }));
  
  // Debug routes removed
}

// Parse JSON request body
app.use(express.json({ limit: config.bodyParser.limit || '10kb' }));

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true, limit: config.bodyParser.limit || '10kb' }));

// Parse cookies
app.use(cookieParser());

// Sanitize request data
app.use(xss());

// Gzip compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
  keyGenerator: (req) => {
    return req.ip; // IP address from request
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later.'
    });
  }
});

// Apply rate limiting to API routes
app.use(`${config.api.prefix}`, limiter);

// API routes
app.use(`${config.api.prefix}/auth`, authRoutes);
app.use(`${config.api.prefix}/users`, userRoutes);
app.use(`${config.api.prefix}/todos`, todoRoutes);

// Serve API documentation
if (config.env === 'development') {
  try {
    const swaggerPath = path.join(__dirname, './docs/swagger.yaml');
    if (fs.existsSync(swaggerPath)) {
      const swaggerDocument = YAML.load(swaggerPath);
      app.use(
        `${config.api.prefix}/docs`,
        swaggerUi.serve,
        swaggerUi.setup(swaggerDocument, {
          explorer: true,
          customCss: '.swagger-ui .topbar { display: none }',
        })
      );
      logger.info(`Swagger documentation available at ${config.api.prefix}/docs`);
    } else {
      logger.warn('Swagger documentation file not found. API docs will not be available.');
    }
  } catch (error) {
    logger.error('Failed to load Swagger documentation:', error);
  }
}

// Serve static files in production
if (config.env === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// Send 404 for any unknown API request
app.use((req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle error
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });
  errorHandler(err, req, res, next);
});

// Log successful initialization
app.on('ready', () => {
  logger.info(`Express application initialized in ${config.env} mode`);
});

export default app;
