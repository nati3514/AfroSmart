import { fileURLToPath } from 'url';
import path, { dirname, basename } from 'path';
import { readdirSync } from 'fs';
import { sequelize, Sequelize } from '../config/database.js';
import { DataTypes } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = {};

// Define model loading order to handle dependencies
const modelLoadOrder = [
  'user.model.js',
  'token.model.js',
  'todo.model.js',
  'activityLog.model.js',
];

// Import models in the correct order
const importPromises = modelLoadOrder.map(async (fileName) => {
  try {
    const filePath = `file://${path.join(__dirname, fileName).replace(/\\/g, '/')}`;
    const module = await import(filePath);
    const model = module.default(sequelize, DataTypes);
    db[model.name] = model;
  } catch (error) {
    console.error(`❌ Error importing model ${fileName}:`, error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error(`   - Make sure the file exists and all dependencies are installed`);
    }
  }
});

// Wait for all models to be imported
await Promise.all(importPromises);

// Set up associations if any
Object.values(db).forEach((model) => {
  if (model.associate) {
    model.associate(db);
  }
});

// Initialize model references
db.User = db.User || {};
db.Token = db.Token || {};
db.Todo = db.Todo || {};
db.ActivityLog = db.ActivityLog || {};

// Add sequelize and Sequelize to db object
db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.DataTypes = DataTypes;

// Export individual models for easier imports
export const User = db.User;
export const Token = db.Token;

// Export sequelize and DataTypes
export { sequelize, Sequelize, DataTypes };

// Export all models as default
export default db;

