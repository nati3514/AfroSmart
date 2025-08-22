import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { tokenTypes, tokenSecrets, tokenExpiration } from '../config/tokens.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type, models) => {
  const { Token } = models;
  try {
    // Get the correct secret based on token type
    let secret;
    switch (type) {
      case tokenTypes.ACCESS:
        secret = tokenSecrets.ACCESS;
        break;
      case tokenTypes.REFRESH:
        secret = tokenSecrets.REFRESH;
        break;
      case tokenTypes.RESET_PASSWORD:
        secret = tokenSecrets.RESET_PASSWORD;
        break;
      case tokenTypes.VERIFY_EMAIL:
        secret = tokenSecrets.VERIFY_EMAIL;
        break;
      default:
        throw new Error('Invalid token type');
    }
    
    const payload = jwt.verify(token, secret);
    
    // Verify token type matches
    if (payload.type !== type) {
      throw new Error('Invalid token type');
    }
    
    const tokenDoc = await Token.findOne({
      where: {
        token,
        type,
        user_id: payload.sub,
        blacklisted: false,
      },
    });

    if (!tokenDoc) {
      throw new Error('Token not found');
    }
    
    // Update last used timestamp
    await tokenDoc.update({ last_used_at: new Date() });
    
    return tokenDoc;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, error.message || 'Authentication failed');
  }
};

/**
 * Generate auth tokens
 * @param {User} user
 * @param {Object} deviceInfo
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user, deviceInfo, models) => {
  const { Token } = models;
  const accessTokenExpires = Math.floor(Date.now() / 1000) + tokenExpiration.ACCESS;
  const accessToken = jwt.sign(
    { 
      sub: user.id, 
      type: tokenTypes.ACCESS,
      iat: Math.floor(Date.now() / 1000)
    },
    tokenSecrets.ACCESS,
    { expiresIn: tokenExpiration.ACCESS }
  );

  const refreshTokenExpires = new Date();
  refreshTokenExpires.setDate(refreshTokenExpires.getDate() + parseInt(tokenExpiration.REFRESH));
  
  const refreshToken = jwt.sign(
    {
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(refreshTokenExpires.getTime() / 1000),
      type: tokenTypes.REFRESH,
      device: {
        id: deviceInfo.id || 'unknown',
        name: deviceInfo.name || 'unknown',
        os: deviceInfo.os || 'unknown',
        browser: deviceInfo.browser || 'unknown',
        ip: deviceInfo.ip || 'unknown',
      },
    },
    tokenSecrets.REFRESH
  );

  // Save tokens to database
  const accessTokenExpiresDate = new Date(accessTokenExpires * 1000);
  
  try {
    // Save access token
    await Token.create({
      token: accessToken.trim(),
      userId: user.id,
      type: tokenTypes.ACCESS,
      expires: accessTokenExpiresDate,
      device_id: deviceInfo?.id || 'unknown',
      device_name: deviceInfo?.name || 'unknown',
      device_type: deviceInfo?.type || 'web',
      created_by_ip: deviceInfo?.ip || null,
    });
    
    logger.info('Access token saved to database', { 
      userId: user.id,
      tokenStart: accessToken.substring(0, 10) + '...',
      expires: accessTokenExpiresDate
    });
    
    // Save refresh token
    await Token.create({
      token: refreshToken.trim(),
      userId: user.id,
      type: tokenTypes.REFRESH,
      expires: refreshTokenExpires,
      device_id: deviceInfo?.id || 'unknown',
      device_name: deviceInfo?.name || 'unknown',
      device_type: deviceInfo?.type || 'web',
      created_by_ip: deviceInfo?.ip || null,
    });
    
    logger.info('Refresh token saved to database', { 
      userId: user.id,
      tokenStart: refreshToken.substring(0, 10) + '...',
      expires: refreshTokenExpires
    });
  } catch (error) {
    logger.error('Error saving tokens to database', {
      error: error.message,
      stack: error.stack,
      userId: user.id
    });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error generating authentication tokens');
  }

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpiresDate,
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires,
    },
  };
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email, models) => {
  const { User, Token } = models;
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // 1 hour expiration
  
  const resetPasswordToken = jwt.sign(
    { 
      sub: user.id, 
      type: tokenTypes.RESET_PASSWORD,
      iat: Math.floor(Date.now() / 1000)
    },
    tokenSecrets.RESET_PASSWORD,
    { expiresIn: tokenExpiration.RESET_PASSWORD }
  );
  
  await Token.create({
    token: resetPasswordToken,
    user_id: user.id,
    type: tokenTypes.RESET_PASSWORD,
    expires,
  });
  
  return resetPasswordToken;
};

/**
 * Generate verify email token
 * @param {User} user
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (user, models) => {
  const { Token } = models;
  const expires = new Date();
  expires.setHours(expires.getHours() + 24); // 24 hours expiration
  
  const verifyEmailToken = jwt.sign(
    { 
      sub: user.id, 
      type: tokenTypes.VERIFY_EMAIL,
      iat: Math.floor(Date.now() / 1000)
    },
    tokenSecrets.VERIFY_EMAIL,
    { expiresIn: tokenExpiration.VERIFY_EMAIL }
  );
  
  await Token.create({
    token: verifyEmailToken,
    user_id: user.id,
    type: tokenTypes.VERIFY_EMAIL,
    expires,
  });
  
  return verifyEmailToken;
};

/**
 * Logout user by blacklisting the refresh token
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken, models) => {
  const { Token } = models;
  try {
    const refreshTokenDoc = await Token.findOne({
      where: {
        token: refreshToken,
        type: tokenTypes.REFRESH,
        blacklisted: false,
      },
    });

    if (!refreshTokenDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Token not found');
    }

    await refreshTokenDoc.update({ blacklisted: true });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to logout');
  }
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken, deviceInfo, models) => {
  const { Token, User } = models;
  try {
    // Verify the refresh token using the REFRESH secret
    const refreshTokenDoc = await verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await User.findByPk(refreshTokenDoc.user_id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Blacklist the used refresh token
    await refreshTokenDoc.update({ blacklisted: true });
    
    // Generate new tokens
    const tokens = await generateAuthTokens(user, {
      id: refreshTokenDoc.device_id,
      name: refreshTokenDoc.device_name,
      os: refreshTokenDoc.device_os,
      browser: refreshTokenDoc.device_browser,
      ip: refreshTokenDoc.ip_address,
    });
    
    return tokens;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Named exports for better tree-shaking and explicit imports
export {
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  logout,
  refreshAuth,
};

// Default export for backward compatibility
export default {
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  logout,
  refreshAuth,
};
