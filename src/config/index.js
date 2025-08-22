import config from './config.js';
import logger from './logger.js';
import { sequelize, testConnection } from './database.js';
import * as tokens from './tokens.js';

export {
  config,
  logger,
  sequelize,
  testConnection,
  tokens,
};

export default {
  config,
  logger,
  sequelize,
  testConnection,
  ...tokens,
};
