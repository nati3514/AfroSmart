// Application configuration
export default {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_here',
    accessExpirationMinutes: parseInt(process.env.JWT_ACCESS_EXPIRATION_MINUTES, 10) || 30,
    refreshExpirationDays: parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS, 10) || 30,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  
  // Body parser configuration
  bodyParser: {
    limit: process.env.BODY_PARSER_LIMIT || '10kb',
  },
  
  // Bcrypt configuration
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  },
  
  // API settings
  api: {
    prefix: process.env.API_PREFIX || '/api',
    version: '', // Removed 'v1' from the version
  },
};
