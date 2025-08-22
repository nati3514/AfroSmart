import http from 'http';
import app from './app.js';
import config from './config/config.js';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { initializeDatabase } from './config/database.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Server {
  constructor() {
    this.app = app;
    this.server = null;
    this.port = config.port || 3000;
    this.host = config.host || '0.0.0.0';
    this.db = null; // Will hold the database instance
    this.setupProcessHandlers();
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Initialize database connection
      this.db = await initializeDatabase();
      
      // Set the database instance in the app for easy access in routes
      this.app.set('db', this.db);

      // Create HTTP server
      this.server = http.createServer(this.app);

      // Start listening
      this.server.listen(this.port, this.host, () => {
        logger.info(`Server is running on http://${this.host === '0.0.0.0' ? 'localhost' : this.host}:${this.port}`);
        logger.info(`Environment: ${config.env}`);
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        // Handle specific listen errors with friendly messages
        switch (error.code) {
          case 'EACCES':
            console.error(`Error: Port ${this.port} requires elevated privileges`);
            process.exit(1);
          case 'EADDRINUSE':
            console.error(`Error: Port ${this.port} is already in use`);
            process.exit(1);
          default:
            throw error;
        }
      });

      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason);
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error.message);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      await this.gracefulShutdown(1);
    }
  }
  
  /**
   * Setup process event handlers
   */
  setupProcessHandlers() {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown(1);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown(1);
    });
    
    // Handle termination signals
    process.on('SIGTERM', () => this.gracefulShutdown(0));
    process.on('SIGINT', () => this.gracefulShutdown(0));
  }
  
  /**
   * Gracefully shut down the server
   * @param {number} code - Exit code
   */
  async gracefulShutdown(code = 0) {
    logger.info('Initiating graceful shutdown...');
    
    try {
      // Close the HTTP server
      if (this.server) {
        logger.info('Closing HTTP server...');
        await new Promise((resolve) => {
          this.server.close((err) => {
            if (err) {
              logger.error('Error closing server:', err);
            } else {
              logger.info('HTTP server closed');
            }
            resolve();
          });
        });
      }
      
      // Close database connection if it exists
      if (this.db && this.db.sequelize) {
        logger.info('Closing database connection...');
        await this.db.sequelize.close();
        logger.info('Database connection closed');
      } else {
        // Fallback to direct import if db instance is not available
        try {
          const { sequelize } = await import('./config/database.js');
          if (sequelize) {
            await sequelize.close();
            logger.info('Database connection closed (fallback)');
          }
        } catch (error) {
          logger.error('Error closing database connection (fallback):', error);
        }
      }
      
      logger.info('Shutdown complete');
      process.exit(code);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server when this file is run directly
const server = new Server();
server.start().catch((error) => {
  console.error('Fatal error during server startup:', error);
  logger.error('Fatal error during server startup:', {
    message: error.message,
    stack: error.stack,
    ...error
  });
  process.exit(1);
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    ...error
  });
  process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
