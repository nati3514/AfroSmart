import httpStatus from 'http-status';
import { Op } from 'sequelize';
import db from '../models/index.js';
const { Todo } = db;
import ApiError from '../utils/ApiError.js';

/**
 * Create a todo
 * @param {Object} todoBody - Todo data including userId
 * @returns {Promise<Object>}
 */
const createTodo = async (todoBody) => {
  try {
    const { userId, ...todoData } = todoBody;
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Create the todo
    const todo = await Todo.create({ 
      ...todoData, 
      userId,
      status: todoData.status || 'pending',
      priority: todoData.priority || 'medium'
    });
    
    // Convert to plain object
    return todo.get({ plain: true });
    
  } catch (error) {
    console.error('Error in createTodo:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('Todo already exists');
    }
    throw error;
  }
};

/**
 * Query for todos with pagination
 * @param {Object} filter - Sequelize filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} userId - The ID of the user to get todos for
 * @returns {Promise<{results: Array<Todo>, page: number, limit: number, totalPages: number, totalResults: number}>}
 */
const queryTodos = async (filter, options, userId) => {
  const { sortBy, limit = 10, page = 1 } = options;
  const offset = (page - 1) * limit;
  
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  // Build where clause
  const where = { userId };
  
  if (filter.status) {
    where.status = filter.status;
  }
  
  if (filter.priority) {
    where.priority = filter.priority;
  }
  
  if (filter.search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${filter.search}%` } },
      { description: { [Op.iLike]: `%${filter.search}%` } },
    ];
  }
  
  // Build order
  let order = [];
  if (sortBy && Array.isArray(sortBy)) {
    // If sortBy is an array, use it directly
    order = [sortBy];
  } else if (sortBy) {
    // If sortBy is a string, split it
    const [field, direction] = sortBy.split(':');
    order = [[field, direction || 'ASC']];
  } else {
    // Default order - using 'created_at' to match the database column name
    order = [['created_at', 'DESC']];
  }
  
  const { count, rows } = await Todo.findAndCountAll({
    where,
    order,
    limit,
    offset,
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
 * Get todo by id
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<Todo>}
 */
const getTodoById = async (id, userId) => {
  const todo = await Todo.findOne({
    where: {
      id,
      userId,
    },
  });
  
  if (!todo) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Todo not found');
  }
  
  return todo;
};

/**
 * Update todo by id
 * @param {string} todoId
 * @param {string} userId
 * @param {Object} updateBody
 * @returns {Promise<Todo>}
 */
const updateTodoById = async (todoId, userId, updateBody) => {
  const todo = await getTodoById(todoId, userId);
  
  Object.assign(todo, updateBody);
  await todo.save();
  
  return todo;
};

/**
 * Delete todo by id
 * @param {string} todoId
 * @param {string} userId
 * @returns {Promise<Todo>}
 */
const deleteTodoById = async (todoId, userId) => {
  const todo = await getTodoById(todoId, userId);
  await todo.destroy();
  return todo;
};

/**
 * Toggle todo status
 * @param {string} todoId
 * @param {string} userId
 * @returns {Promise<Todo>}
 */
const toggleTodoStatus = async (todoId, userId) => {
  const todo = await getTodoById(todoId, userId);
  
  // Toggle between pending and completed
  todo.status = todo.status === 'completed' ? 'pending' : 'completed';
  await todo.save();
  
  return todo;
};

export default {
  createTodo,
  queryTodos,
  getTodoById,
  updateTodoById,
  deleteTodoById,
  toggleTodoStatus,
};
