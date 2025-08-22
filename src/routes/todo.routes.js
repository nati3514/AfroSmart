import httpStatus from 'http-status';
import express from 'express';
import validate from '../middleware/validate.js';
import { auth } from '../middleware/auth.middleware.js';
import ApiError from '../utils/ApiError.js';
import { todoValidation } from '../validations/index.js';
import todoController from '../controllers/todo.controller.js';

const router = express.Router();

// All routes in this file require authentication
router.use(auth);

/**
 * @swagger
 * /todos:
 *   post:
 *     summary: Create a new todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *             example:
 *               title: Complete project
 *               description: Finish the Express.js authentication system
 *               status: in_progress
 *               priority: high
 *               dueDate: 2025-12-31T23:59:59Z
 *     responses:
 *       "201":
 *         description: Todo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/',
  validate(todoValidation.createTodo),
  async (req, res, next) => {
    try {
      const todoData = { 
        ...req.body, 
        userId: req.user.id,
        status: req.body.status || 'pending',
        priority: req.body.priority || 'medium'
      };
      
      const todo = await todoController.createTodo(todoData);
      
      // Send the response with the created todo
      res.status(201).send({
        success: true,
        data: todo
      });
      
    } catch (error) {
      console.error('Error in todo creation route:', error);
      if (error.message === 'Todo already exists') {
        return next(new ApiError(400, error.message));
      }
      if (error.message === 'User ID is required') {
        return next(new ApiError(400, error.message));
      }
      next(new ApiError(500, 'Failed to create todo'));
    }
  }
);

/**
 * @swagger
 * /todos:
 *   get:
 *     summary: Get all todos for the authenticated user
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by priority
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt:asc, createdAt:desc, updatedAt:asc, updatedAt:desc, dueDate:asc, dueDate:desc, priority:asc, priority:desc]
 *         description: Sort by field and order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Maximum number of todos per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: A list of todos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Todo'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, priority, search, sortBy, limit = 10, page = 1 } = req.query;
    const filter = { status, priority, search };
    
    // Parse sortBy if provided
    let sortOptions = null;
    if (sortBy) {
      const [field, direction] = sortBy.split(':');
      sortOptions = [field, direction || 'ASC'];
    }
    
    const options = { 
      sortBy: sortOptions,
      limit: parseInt(limit, 10) || 10,
      page: parseInt(page, 10) || 1
    };
    
    const result = await todoController.queryTodos(filter, options, req.user.id);
    
    // Ensure we're returning plain objects, not Sequelize model instances
    const todos = result.results.map(todo => todo.get({ plain: true }));
    
    res.json({
      success: true,
      data: todos,
      meta: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults
      }
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    if (error.message === 'User ID is required' || error.message === 'User authentication required') {
      return next(new ApiError(401, 'Authentication required'));
    }
    next(new ApiError(500, 'Failed to fetch todos'));
  }
});

/**
 * @swagger
 * /todos/{id}:
 *   get:
 *     summary: Get a todo by ID
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Todo id
 *     responses:
 *       "200":
 *         description: The todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', (req, res, next) => {
  todoController.getTodoById(req.params.id, req.user.id)
    .then(todo => {
      if (!todo) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Todo not found');
      }
      res.send(todo);
    })
    .catch(next);
});

/**
 * @swagger
 * /todos/{id}:
 *   patch:
 *     summary: Update a todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Todo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *             example:
 *               title: Updated todo title
 *               status: completed
 *     responses:
 *       "200":
 *         description: Todo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/:id',
  validate(todoValidation.updateTodo),
  (req, res, next) => {
    todoController.updateTodoById(req.params.id, req.user.id, req.body)
      .then(todo => {
        if (!todo) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Todo not found');
        }
        res.send(todo);
      })
      .catch(next);
  }
);

/**
 * @swagger
 * /todos/{id}/toggle:
 *   patch:
 *     summary: Toggle todo status
 *     description: Toggle between pending and completed status
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Todo ID
 *     responses:
 *       "200":
 *         description: Todo status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/:id/toggle',
  (req, res, next) => {
    todoController.toggleTodoStatus(req.params.id, req.user.id)
      .then(todo => {
        if (!todo) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Todo not found');
        }
        res.send(todo);
      })
      .catch(next);
  }
);

/**
 * @swagger
 * /todos/{id}:
 *   delete:
 *     summary: Delete a todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Todo ID
 *     responses:
 *       "204":
 *         description: Todo deleted successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/:id',
  (req, res, next) => {
    todoController.deleteTodoById(req.params.id, req.user.id)
      .then(deletedTodo => {
        if (!deletedTodo) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Todo not found');
        }
        res.status(httpStatus.NO_CONTENT).send();
      })
      .catch(next);
  }
);

export default router;
