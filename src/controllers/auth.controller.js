import httpStatus from 'http-status-codes';
import { Op } from 'sequelize';
import ApiError from '../utils/ApiError.js';
import tokenService from '../services/token.service.js';

/**
 * Get device info from request
 * @param {Object} req - Express request object
 * @returns {Object} Device information
 */
const getDeviceInfo = (req) => {
  const userAgent = req.get('user-agent') || '';
  const deviceId = req.get('x-device-id') || req.ip || 'unknown';
  
  // Simple device detection
  let deviceType = 'web';
  if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(userAgent)) {
    deviceType = 'tablet';
  }
  
  return {
    id: deviceId,
    name: userAgent.substring(0, 255), // Truncate to prevent too long names
    type: deviceType,
    ip: req.ip,
  };
};

/**
 * Generate auth tokens using the token service
 * @param {User} user
 * @param {Object} deviceInfo
 * @param {Object} models - Database models
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user, deviceInfo = {}, models) => {
  return tokenService.generateAuthTokens(user, deviceInfo, models);
};

/**
 * Register a new user
 * @param {Object} userBody
 * @param {Object} models
 * @returns {Promise<User>}
 */
const createUser = async (userBody, models) => {
  const { User } = models;
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email is already taken');
  }
  
  const user = await User.create({
    ...userBody,
    role: userBody.role || 'user',
  });
  
  return user;
};

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const register = async (req, res, next) => {
  try {
    const models = req.models; // Get models from request
    const userBody = req.body;
   // console.log('Request body:', userBody);
    
    if (!userBody || !userBody.email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }
    
   // console.log('Starting user registration for email:', userBody.email);
    //console.log('Checking if email is taken...');
    
    const user = await createUser(userBody, models);
    
    // Generate tokens with device info and models
    const tokens = await generateAuthTokens(user, getDeviceInfo(req), models);
    
    res.status(httpStatus.CREATED).send({ user, tokens });
  } catch (error) {
    next(error);
  }
};

/**
 * Login with email and password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const models = req.models;
    const { User } = models;
    const deviceInfo = getDeviceInfo(req);
    
    if (!email || !password) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email and password are required');
    }
    
   // console.log(`Login attempt for email: ${email} from device: ${deviceInfo.id}`);
    
    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    // Check if user exists and password is correct
    if (!user || !(await user.isPasswordMatch(password))) {
      const isPasswordValid = await user.isPasswordMatch(password);
      if (!isPasswordValid) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
      }
    }
    
    // Check if user account is active
    if (!user.isActive) {
      //console.log(`Login attempt for deactivated account: ${email}`);
      throw new ApiError(httpStatus.FORBIDDEN, 'Account is deactivated. Please contact support.');
    }
    
    // Generate tokens with models
    //console.log(`Generating tokens for user: ${user.id}`);
    const tokens = await generateAuthTokens(user, deviceInfo, models);
    
    // Update last login timestamp
    await user.update({ lastLogin: new Date() });
    
    // Remove sensitive data from response
    const userResponse = user.get();
    delete userResponse.password;
    
    //console.log(`Login successful for user: ${user.id}`);
    
    res.status(httpStatus.OK).json({
      status: 'success',
      data: {
        user: userResponse,
        tokens,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * Logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Refresh token is required');
    }
    
    await tokenService.logout(refreshToken);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh auth tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const refreshAuth = async (req, res, next) => {
  try {
    const models = req.models;
    const { User } = models;
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Refresh token is required');
    }
    
    const deviceInfo = getDeviceInfo(req);
    const tokens = await tokenService.refreshAuth(refreshToken, deviceInfo, models);
    
    // Remove the old refresh token
    await tokenService.removeToken(refreshToken);
    
    res.status(httpStatus.OK).json({
      status: 'success',
      data: {
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  logout,
  refreshAuth,
  generateAuthTokens,
};
