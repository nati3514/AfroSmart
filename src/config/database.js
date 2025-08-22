import { Sequelize } from 'sequelize';
import logger from '../utils/logger.js';
import config from './config.js';
import { fileURLToPath } from 'url';
import path, { dirname, basename } from 'path';
import { readdirSync } from 'fs';

// Configure database connection using environment variables with fallbacks
const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'db4',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? false : (msg) => logger.debug(msg),  // Disable SQL logging in development
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true,
    paranoid: false, // Disable soft deletes since we don't have the deleted_at column
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Removed deletedAt since we're not using soft deletes
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX, 10) || 5,
    min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
  },
  dialectOptions: config.env === 'production' 
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  benchmark: true,
  retry: {
    max: 3,
    timeout: 30000,
  },
});

// Initialize models
const db = {};

// Load models in a specific order to handle dependencies
const modelLoadOrder = [
  'user.model.js',
  'token.model.js',
  'todo.model.js',
  'activityLog.model.js'
];

// Load models dynamically
const loadModels = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const modelsDir = path.join(__dirname, '../models');
  
  // First, get all model files
  const modelFiles = readdirSync(modelsDir)
    .filter((file) => {
      return (
        file.indexOf('.') !== 0 &&
        file !== 'index.js' &&
        file.slice(-9) === '.model.js' &&
        file.indexOf('.test.js') === -1
      );
    });

  // Sort model files according to our load order
  const sortedModelFiles = [
    ...modelFiles.filter(file => modelLoadOrder.includes(file)),
    ...modelFiles.filter(file => !modelLoadOrder.includes(file))
  ];

  // Load all models
  for (const file of sortedModelFiles) {
    const modelPath = `../models/${file}`;
    try {
      const modelModule = await import(new URL(modelPath, import.meta.url));
      const model = modelModule.default(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    } catch (error) {
      logger.error(`Error loading model ${file}:`, error);
      throw error;
    }
  }
};

// Test the database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    logger.error('Database connection error:', error.message);
    throw error;
  }
};

/**
 * Initialize database connection and load models
 * @returns {Promise<Object>} The database object with models and sequelize instance
 */
const initializeDatabase = async () => {
  try {
    await testConnection();
    
    // Initialize models
    await loadModels();
    
    // Set up associations in a specific order
    const modelNames = Object.keys(db);
    
    // Set up all associations
    modelNames.forEach(modelName => {
      if (db[modelName].associate) {
        db[modelName].associate(db);
      }
    });
    
    // Add sequelize instance to the db object for easier access
    db.sequelize = sequelize;
    db.Sequelize = Sequelize;
    
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

// Handle database connection errors
sequelize.addHook('afterBulkSync', (options) => {
  logger.info('Database synchronized', { options });
});

// Graceful shutdown
const shutdown = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error closing database connection:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Export the sequelize instance and functions
export { 
  sequelize as default,
  sequelize,
  testConnection, 
  initializeDatabase,
  Sequelize
};
