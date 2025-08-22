const express = require('express');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const config = require('../../config');
const packageJson = require('../../package.json');

const router = express.Router();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express Auth API',
      version: packageJson.version,
      description: 'Authentication and Authorization API with Express and PostgreSQL',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'API Support',
        url: 'https://github.com/yourusername/express-auth-system',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: 'Development server',
      },
      {
        url: 'https://api.example.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The auto-generated id of the user',
            },
            name: {
              type: 'string',
              description: 'The name of the user',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'The email of the user',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              default: 'user',
              description: 'The role of the user',
            },
            isEmailVerified: {
              type: 'boolean',
              default: false,
              description: 'Whether the user has verified their email',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'The date the user was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'The date the user was last updated',
            },
          },
        },
        ActivityLog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The auto-generated id of the activity log',
            },
            action: {
              type: 'string',
              description: 'The action performed (e.g., POST /api/users)',
            },
            entityType: {
              type: 'string',
              description: 'The type of entity the action was performed on (e.g., users, todos)',
            },
            entityId: {
              type: 'string',
              description: 'The ID of the entity the action was performed on',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'The ID of the user who performed the action',
            },
            ipAddress: {
              type: 'string',
              description: 'The IP address of the client',
            },
            userAgent: {
              type: 'string',
              description: 'The user agent of the client',
            },
            statusCode: {
              type: 'integer',
              description: 'The HTTP status code of the response',
            },
            duration: {
              type: 'integer',
              description: 'The duration of the request in milliseconds',
            },
            requestId: {
              type: 'string',
              description: 'A unique identifier for the request',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata about the request/response',
            },
            previousState: {
              type: 'object',
              description: 'The state of the resource before the action',
            },
            newState: {
              type: 'object',
              description: 'The state of the resource after the action',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'The date the activity was logged',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'The date the activity log was last updated',
            },
          },
        },
        Todo: {
          type: 'object',
          required: ['title', 'userId'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The auto-generated id of the todo',
            },
            title: {
              type: 'string',
              description: 'The title of the todo',
            },
            description: {
              type: 'string',
              description: 'A detailed description of the todo',
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              default: 'pending',
              description: 'The status of the todo',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              default: 'medium',
              description: 'The priority of the todo',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'The due date of the todo',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'The ID of the user who owns the todo',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'The date the todo was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'The date the todo was last updated',
            },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            access: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'The JWT access token',
                },
                expires: {
                  type: 'string',
                  format: 'date-time',
                  description: 'The expiration date of the access token',
                },
              },
            },
            refresh: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'The JWT refresh token',
                },
                expires: {
                  type: 'string',
                  format: 'date-time',
                  description: 'The expiration date of the refresh token',
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              format: 'int32',
              description: 'The HTTP status code',
            },
            message: {
              type: 'string',
              description: 'The error message',
            },
            stack: {
              type: 'string',
              description: 'The error stack trace (only in development)',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 401,
                message: 'Please authenticate',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have permission to access this resource',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 403,
                message: 'Forbidden',
              },
            },
          },
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 404,
                message: 'Not found',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 400,
                message: 'Validation error: "email" must be a valid email',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

let specs;
try {
  // Generate the Swagger specification
  specs = swaggerJSDoc(options);

  // Serve Swagger UI
  router.use('/', swaggerUi.serve);
  router.get(
    '/',
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Express Auth API Documentation',
      customfavIcon: '/favicon.ico',
    })
  );

  // Serve Swagger JSON
  router.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
} catch (error) {
  console.error('Error setting up Swagger:', error);
  router.get('/', (req, res) => {
    res.status(500).json({
      message: 'Error generating API documentation',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  });
}

module.exports = router;
