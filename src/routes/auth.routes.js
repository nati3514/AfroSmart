import express from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import refreshToken from '../middleware/refreshToken.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

router.use(authLimiter);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *             example:
 *               name: John Doe
 *               email: john@example.com
 *               password: password123
 *     responses:
 *       "201":
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tokens:
 *                   $ref: '#/components/schemas/AuthTokens'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "409":
 *         description: Email already taken
 */
router.post(
  '/register',
  validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
  ]),
  (req, res, next) => {
    // Get models from the app and attach to request
    req.models = req.app.get('db');
    authController.register(req, res, next);
  }
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *             example:
 *               email: john@example.com
 *               password: password123
 *     responses:
 *       "200":
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tokens:
 *                   $ref: '#/components/schemas/AuthTokens'
 *       "400":
 *         description: Bad request - missing or invalid parameters
 *       "401":
 *         description: Unauthorized - incorrect email or password
 *       "403":
 *         description: Forbidden - account is deactivated
 *       "500":
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 401
 *               message: Incorrect email or password
 */
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  (req, res, next) => {
    // Get models from the app and attach to request
    req.models = req.app.get('db');
    authController.login(req, res, next);
  }
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate the refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *             example:
 *               refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       "204":
 *         description: Successfully logged out
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/logout',
  auth,
  (req, res, next) => {
    // Get models from the app and attach to request
    req.models = req.app.get('db');
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'No refresh token found in cookies',
      });
    }
    
    // Add refresh token to request body for the controller
    req.body.refreshToken = refreshToken;
    
    // Call the logout controller
    return authController.logout(req, res, next);
  }
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token (can also be sent via cookie or Authorization header)
 *     responses:
 *       "200":
 *         description: New access token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       "401":
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       "403":
 *         description: Refresh token is blacklisted or user is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh-token', (req, res, next) => {
  return refreshToken(req, res, next);
});

export default router;
