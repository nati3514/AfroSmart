import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import db from '../models/index.js';
import { tokenTypes, tokenSecrets } from '../config/tokens.js';
import logger from '../utils/logger.js';

const { User, Token } = db;

const authMiddleware = (requiredRoles = []) => {
  return async (req, res, next) => {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
    }
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token missing'));
    }
    
    try {

      try {
        // Verify JWT token
        const payload = jwt.verify(token, tokenSecrets.ACCESS);
        if (!payload) {
          return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
        }
        
        try {
          // Find token in database with user included
          const tokenDoc = await Token.findOne({
            where: { 
              token: token.trim(),
              type: tokenTypes.ACCESS,
              blacklisted: false
            },
            include: [{
              model: User,
              as: 'tokenUser',
              required: true,
              attributes: ['id', 'email', 'role', 'isActive', 'name']
            }]
          });

          if (!tokenDoc) {
            logger.warn('Token not found in database', { 
              tokenStart: token.substring(0, 10) + '...',
              tokenLength: token.length,
              tokenType: tokenTypes.ACCESS
            });
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
          }
          
          // Check if token is expired
          if (new Date(tokenDoc.expires) < new Date()) {
            logger.warn('Token expired', { tokenId: tokenDoc.id });
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token expired'));
          }
          
          // Check if user is active (using tokenUser as per the association alias)
          if (!tokenDoc.tokenUser || !tokenDoc.tokenUser.isActive) {
            logger.warn('User not active or not found', { userId: tokenDoc.tokenUser?.id });
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'User account is not active'));
          }
          
          // Attach user and token to request
          req.user = tokenDoc.tokenUser.get({ plain: true });
          req.token = tokenDoc.get({ plain: true });

          // Update last used timestamp
          await Token.update(
            { lastUsedAt: new Date() },
            { where: { id: tokenDoc.id } }
          );

          logger.info('Authentication successful', { userId: req.user.id });
          
          // Check roles if required
          if (requiredRoles.length && !requiredRoles.includes(req.user.role)) {
            return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
          }
          
        } catch (error) {
          logger.error('Authentication error:', {
            error: error.name,
            message: error.message,
            stack: error.stack,
            ...(error.original && { originalError: error.original }),
            ...(error.sql && { sql: error.sql })
          });
          
          if (error instanceof ApiError) {
            return next(error);
          }
          
          // Handle database errors
          if (error.name === 'SequelizeDatabaseError') {
            return next(new ApiError(
              httpStatus.INTERNAL_SERVER_ERROR, 
              'Database error during authentication'
            ));
          }
          
          // Handle connection errors
          if (error.name === 'SequelizeConnectionError') {
            return next(new ApiError(
              httpStatus.SERVICE_UNAVAILABLE, 
              'Database connection error'
            ));
          }
          
          // Default error response
          return next(new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR, 
            'Authentication failed'
          ));
        }
      } catch (error) {
        const errorDetails = {
          timestamp: new Date().toISOString(),
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error.name === 'JsonWebTokenError' && { jwtError: error }),
          ...(error.name === 'TokenExpiredError' && { expiredAt: error.expiredAt }),
          ...(error.original && { originalError: error.original }),
          ...(error.sql && { sql: error.sql }),
          ...(error.parameters && { parameters: error.parameters }),
          request: {
            method: req.method,
            url: req.originalUrl,
            headers: {
              authorization: req.headers.authorization ? '***' : 'missing',
              'content-type': req.headers['content-type']
            },
            body: req.body
          }
        };

        console.error('\n=== AUTH MIDDLEWARE ERROR ===');
        console.error(JSON.stringify(errorDetails, null, 2));
        console.error('=============================\n');

        // Handle specific error types
        if (error instanceof ApiError) {
          throw error;
        }

        // Handle database errors
        if (error.name === 'SequelizeDatabaseError') {
          console.error('Database error details:', {
            message: error.message,
            sql: error.sql,
            parameters: error.parameters,
            original: error.original
          });
          throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Database error during authentication');
        }

        // Handle validation errors
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
          const errors = error.errors.map(err => ({
            field: err.path,
            message: err.message,
            type: err.type,
            value: err.value
          }));
          console.error('Validation errors:', errors);
          throw new ApiError(httpStatus.BAD_REQUEST, 'Validation failed', errors);
        }

        // Handle connection errors
        if (error.name === 'SequelizeConnectionError') {
          console.error('Database connection error:', error);
          throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Database connection error');
        }

        // Default error response
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Authentication failed',
          process.env.NODE_ENV === 'development' ? error.stack : {}
        );
      }

      // Check if user role is allowed - moved inside the try block where user is defined
      if (requiredRoles.length && !requiredRoles.includes(req.user.role)) {
        return next(new ApiError(
          httpStatus.FORBIDDEN,
          'You do not have permission to access this resource'
        ));
      }

      next();
    } catch (error) {
      logger.error('Auth middleware error:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        ...(error.original && { originalError: error.original }),
        token: token ? `${token.substring(0, 10)}...` : 'No token',
        headers: {
          authorization: req.headers.authorization ? 'Present' : 'Missing',
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent']
        }
      });
      
      if (error.statusCode) {
        return next(error);
      }
      
      // Don't expose internal errors to the client
      const message = process.env.NODE_ENV === 'development' 
        ? `Authentication failed: ${error.message}`
        : 'Authentication failed';
        
      return next(new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR, 
        message,
        process.env.NODE_ENV === 'development' ? error.stack : undefined
      ));
    }
  };
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }
    
    if (!roles.includes(req.user.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to access this resource');
    }
    
    next();
  };
};

// Export the auth middleware as a function
const auth = authMiddleware();

// Export the middleware functions
export {
  auth,
  authMiddleware,
  authorize
};

// Also export auth as default for backward compatibility
export default auth;
