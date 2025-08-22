import httpStatus from 'http-status';
import express from 'express';
import validate from '../middleware/validate.js';
import { auth } from '../middleware/auth.middleware.js';
import ApiError from '../utils/ApiError.js';
import { userValidation } from '../validations/index.js';
import userController from '../controllers/user.controller.js';

const router = express.Router();

// All routes in this file require authentication
router.use(auth);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', (req, res, next) => {
  userController.getCurrentUser(req.user.id)
    .then(user => res.send(user))
    .catch(next);
});

/**
 * @swagger
 * /users/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       "200":
 *         description: Password changed successfully
 *       "400":
 *         description: Current password and new password are required
 *       "401":
 *         description: Incorrect current password
 *       "500":
 *         description: Internal server error
 */
router.post('/change-password', async (req, res, next) => {
  try {
    await userController.updatePassword(req, res, next);
  } catch (error) {
    console.error('Error in change password route:', error);
    next(new ApiError(500, 'Failed to update password'));
  }
});

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *             example:
 *               name: John Doe
 *               email: john.doe@example.com
 *     responses:
 *       "200":
 *         description: User profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "409":
 *         description: Email already taken
 */
router.patch(
  '/me',
  validate(userValidation.updateProfile),
  (req, res, next) => {
    userController.updateProfile(req.user.id, req.body)
      .then(user => res.send(user))
      .catch(next);
  }
);

/**
 * @swagger
 * /users/me/password:
 *   patch:
 *     summary: Update current user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *             example:
 *               currentPassword: oldPassword123
 *               newPassword: newPassword123
 *     responses:
 *       "204":
 *         description: Password updated successfully
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         description: Incorrect password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 401
 *               message: Incorrect password
 */
router.patch(
  '/me/password',
  validate(userValidation.updatePassword),
  (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    userController.updatePassword(req.user.id, currentPassword, newPassword)
      .then(() => res.status(204).send())
      .catch(next);
  }
);

// Admin routes - require admin role
router.use((req, res, next) => auth('admin')(req, res, next));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: User name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: User role
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of users
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', (req, res, next) => {
  const { name, role, sortBy, limit, page } = req.query;
  const filter = { name, role };
  const options = { sortBy, limit, page };
  
  userController.queryUsers(filter, options)
    .then(users => res.send(users))
    .catch(next);
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "200":
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', (req, res, next) => {
  userController.getUserById(req.params.id)
    .then(user => {
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }
      res.send(user);
    })
    .catch(next);
});

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *             example:
 *               name: John Doe
 *               email: john.doe@example.com
 *               role: admin
 *     responses:
 *       "200":
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "409":
 *         description: Email already taken
 */
router.patch(
  '/:id',
  validate(userValidation.updateUser),
  (req, res, next) => {
    userController.updateUserById(req.params.id, req.body)
      .then(user => {
        if (!user) {
          throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
        }
        res.send(user);
      })
      .catch(next);
  }
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "204":
 *         description: User deleted successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', (req, res, next) => {
  userController.deleteUserById(req.params.id)
    .then(deletedUser => {
      if (!deletedUser) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }
      res.status(httpStatus.NO_CONTENT).send();
    })
    .catch(next);
});

export default router;
