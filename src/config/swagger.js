import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EVE Healthcare API',
      version: '1.0.0',
      description: `
## EVE Healthcare Diagnostic Booking API

A RESTful backend for managing diagnostic centres, tests, and patient bookings.

### Authentication
Most mutation endpoints require a Bearer JWT. Obtain a token via \`POST /api/auth/login\`.

### Idempotency
The \`POST /api/payments/webhook\` endpoint is fully idempotent - sending the same \`eventId\` multiple times is safe.

### Pagination
Collection endpoints support \`?page=1&limit=10\` query parameters.
      `,
      contact: {
        name: 'EVE Healthcare',
      },
    },
    servers: [
      { url: '/api', description: 'API Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      parameters: {
        Id: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Resource UUID',
        },
        Page: {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1, minimum: 1 },
          description: 'Page number',
        },
        Limit: {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
          description: 'Items per page',
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
            },
          },
        },
        Forbidden: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } },
            },
          },
        },
        Conflict: {
          description: 'Conflict with existing resource',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
            },
          },
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        SignupRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Jane Doe', minLength: 2 },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            password: { type: 'string', example: 'SecurePass1', minLength: 8, description: 'Min 8 chars, one uppercase, one number' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            password: { type: 'string', example: 'SecurePass1' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        DiagnosticCentre: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            location: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateCentreRequest: {
          type: 'object',
          required: ['name', 'location'],
          properties: {
            name: { type: 'string', example: 'City Diagnostic Lab' },
            location: { type: 'string', example: '123 Main St, Mumbai' },
          },
        },
        UpdateCentreRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            location: { type: 'string' },
          },
        },
        DiagnosticTest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            price: { type: 'number', format: 'decimal' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTestRequest: {
          type: 'object',
          required: ['name', 'price'],
          properties: {
            name: { type: 'string', example: 'Complete Blood Count' },
            description: { type: 'string', example: 'Full haematology panel' },
            price: { type: 'number', example: 499.99 },
          },
        },
        UpdateTestRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            testId: { type: 'string', format: 'uuid' },
            centreId: { type: 'string', format: 'uuid' },
            appointmentDate: { type: 'string', format: 'date-time' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateBookingRequest: {
          type: 'object',
          required: ['testId', 'centreId', 'appointmentDate'],
          properties: {
            testId: { type: 'string', format: 'uuid' },
            centreId: { type: 'string', format: 'uuid' },
            appointmentDate: { type: 'string', format: 'date-time', example: '2027-01-15T10:00:00.000Z' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            bookingId: { type: 'string', format: 'uuid' },
            provider: { type: 'string' },
            providerPaymentId: { type: 'string', nullable: true },
            eventId: { type: 'string', nullable: true },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        InitiatePaymentRequest: {
          type: 'object',
          required: ['bookingId'],
          properties: {
            bookingId: { type: 'string', format: 'uuid' },
          },
        },
        WebhookPayload: {
          type: 'object',
          required: ['eventId', 'bookingId', 'providerPaymentId', 'status', 'amount'],
          properties: {
            eventId: { type: 'string', example: 'evt_abc123', description: 'Unique event ID from provider. Used for idempotency.' },
            bookingId: { type: 'string', format: 'uuid' },
            providerPaymentId: { type: 'string', example: 'pay_xyz789' },
            status: { type: 'string', enum: ['SUCCESS', 'FAILED'] },
            amount: { type: 'number', example: 499.99 },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Centres', description: 'Diagnostic centre management' },
      { name: 'Tests', description: 'Diagnostic test management' },
      { name: 'Bookings', description: 'Booking management' },
      { name: 'Payments', description: 'Payment processing and webhooks' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
