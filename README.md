# Express.js Authentication & Authorization System

A complete authentication and authorization system built with Express.js, Sequelize, and PostgreSQL. This system provides user registration, login, JWT authentication, role-based access control, and a protected todo list feature.

## Features

- **User Management**
  - User registration and login with JWT
  - Email verification
  - Password reset functionality
  - Profile management

- **Security**
  - Role-based access control (RBAC)
  - Refresh token functionality with rotation
  - Secure password hashing with bcrypt
  - Rate limiting and security headers
  - Input validation and sanitization
  - CORS protection
  - CSRF protection

- **Activity Logging**
  - Comprehensive request/response logging
  - User action tracking
  - Sensitive data redaction
  - Performance metrics
  - Search and filter capabilities
  - Automatic log cleanup

- **Todo Management**
  - Protected todo list with CRUD operations
  - User-specific todo items
  - Filtering and pagination

- **API Documentation**
  - Interactive Swagger UI
  - Detailed endpoint documentation
  - Request/response examples
  - Authentication examples

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v10 or higher)
- npm (v6 or higher) or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nati3514/AfroSmart.git
   cd afrosmart
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your database credentials and other settings.

5. Create a PostgreSQL database and update the `.env` file with the database name.

## Database Setup

1. Make sure PostgreSQL is running
2. Create a new database:
   ```sql
   CREATE DATABASE afrosmart;
   ```
3. Run migrations:
   ```bash
   npx sequelize-cli db:migrate
   ```
4. (Optional) Seed the database with test data:
   ```bash
   npx sequelize-cli db:seed:all
   ```

## Running the Application

### Development

```bash
npm run dev
# or
yarn dev
```

The server will start on `http://localhost:3000` by default.

### Production

```bash
npm run build
npm start
```

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: `http://localhost:3000/api-docs`
- API JSON: `http://localhost:3000/api-docs.json`

## Project Structure

```
src/
├── config/            # Configuration files
├── controllers/       # Route controllers
├── middleware/        # Custom middleware
├── models/            # Database models
├── routes/            # API routes
├── services/          # Business logic
├── utils/             # Utility functions
├── validations/       # Request validation schemas
├── app.js             # Express application
└── server.js          # Server entry point
```

## Environment Variables

See `.env.example` for all available environment variables.

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Linting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Security

- Uses Helmet.js for setting secure HTTP headers
- Implements rate limiting
- Input validation and sanitization
- CSRF protection
- XSS protection
- Secure HTTP headers
- JWT with access and refresh tokens
- Password hashing with bcrypt

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express.js](https://expressjs.com/)
- [Sequelize](https://sequelize.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [JWT](https://jwt.io/)
- [Winston](https://github.com/winstonjs/winston)
- [Joi](https://joi.dev/)
