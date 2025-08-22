// JWT configuration
export default {
  secret: process.env.JWT_SECRET || 'your_strong_jwt_secret_key_should_be_at_least_32_chars_long_123',
  accessExpirationMinutes: 15, // 15 minutes
  refreshExpirationDays: 7,    // 7 days
  
  // Ensure consistent secret usage
  get accessSecret() {
    return this.secret;
  },
  
  get refreshSecret() {
    return this.secret;
  }
};
