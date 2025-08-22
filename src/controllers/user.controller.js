import httpStatus from 'http-status';
import { Op } from 'sequelize';
import db from '../models/index.js';
const { User } = db;
import ApiError from '../utils/ApiError.js';

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return User.create(userBody);
};

/**
 * Query for users with pagination
 * @param {Object} filter - Sequelize filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<{results: Array<User>, page: number, limit: number, totalPages: number, totalResults: number}>}
 */
const queryUsers = async (filter, options) => {
  const { sortBy, limit = 10, page = 1 } = options;
  const offset = (page - 1) * limit;
  
  // Build where clause
  const where = {};
  if (filter.name) {
    where.name = { [Op.iLike]: `%${filter.name}%` };
  }
  if (filter.role) {
    where.role = filter.role;
  }
  
  // Build order
  let order = [];
  if (sortBy) {
    const [field, direction] = sortBy.split(':');
    order = [[field, direction || 'ASC']];
  } else {
    order = [['createdAt', 'DESC']];
  }
  
  const { count, rows } = await User.findAndCountAll({
    where,
    order,
    limit,
    offset,
    attributes: { exclude: ['password'] },
  });
  
  const totalPages = Math.ceil(count / limit);
  
  return {
    results: rows,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages,
    totalResults: count,
  };
};

/**
 * Get user by id
 * @param {string} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] },
  });
  
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  return user;
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ where: { email } });
};

/**
 * Update user by id
 * @param {string} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  
  Object.assign(user, updateBody);
  await user.save();
  
  return user;
};

/**
 * Delete user by id
 * @param {string} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  await user.destroy();
  return user;
};

/**
 * Update user profile
 * @param {string} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateProfile = async (userId, updateBody) => {
  const user = await getUserById(userId);
  
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  
  // Prevent role updates through this endpoint
  if (updateBody.role) {
    delete updateBody.role;
  }
  
  Object.assign(user, updateBody);
  await user.save();
  
  return user;
};

/**
 * Update user password
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Current password and new password are required'));
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return next(new ApiError(httpStatus.NOT_FOUND, 'User not found'));
    }
    
    // Verify current password
    const isPasswordValid = await user.isPasswordMatch(currentPassword);
    if (!isPasswordValid) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect current password'));
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Send success response
    return res.status(httpStatus.OK).json({
      success: true,
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    console.error('Error in updatePassword:', error);
    return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update password'));
  }
};

/**
 * Get current user
 * @param {string} userId
 * @returns {Promise<User>}
 */
const getCurrentUser = async (userId) => {
  return getUserById(userId);
};

export default {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  updateProfile,
  updatePassword,
  getCurrentUser,
};
