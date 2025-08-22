import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a new Sequelize instance
const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'postgres',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test the connection
async function testConnection() {
  try {
    console.log('Attempting to connect to PostgreSQL...');
    await sequelize.authenticate();
    console.log('Successfully connected to PostgreSQL!');
    
    // Test a simple query
    const [results] = await sequelize.query('SELECT version()');
    console.log('PostgreSQL Version:', results[0].version);
    
    // List all databases
    const [dbs] = await sequelize.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
    console.log('Available databases:', dbs.map(db => db.datname).join(', '));
    
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error.message);
    console.error('Make sure PostgreSQL is running and the credentials are correct.');
    console.error('You can start PostgreSQL with: pg_ctl -D "C:\\Program Files\\PostgreSQL\\13\\data" start');
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testConnection();
