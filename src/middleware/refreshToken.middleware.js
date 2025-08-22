import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { tokenTypes } from '../config/tokens.js';
import tokenService from '../services/token.service.js';
import db from '../models/index.js';
const { Token, User } = db;

/**
 * Middleware to refresh access token using refresh token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const refreshToken = async (req, res, next) => {
  try {
    // Get refresh token from request body, cookies, or headers
    const refreshToken =
      req.body.refreshToken ||
      req.cookies.refreshToken ||
      req.headers['x-refresh-token'] ||
      req.get('Authorization')?.replace('Bearer ', '');

    if (!refreshToken) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token is required');
    }

    // Verify refresh token
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    
    // Get user associated with the token
    const user = await User.findByPk(refreshTokenDoc.user_id);
    
    if (!user || !user.isActive) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found or inactive');
    }

    // Generate new tokens with the same device info
    const deviceInfo = {
      id: refreshTokenDoc.device_id,
      name: refreshTokenDoc.device_name,
      type: refreshTokenDoc.device_type,
      ip: req.ip,
    };

    // Generate new tokens
    const tokens = await tokenService.generateAuthTokens(user, deviceInfo);

    // Mark old refresh token as blacklisted
    await refreshTokenDoc.update({ blacklisted: true });

    // Send new tokens
    res.status(httpStatus.OK).json({
      status: 'success',
      data: {
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default refreshToken;
