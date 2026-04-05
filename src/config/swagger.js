// src/config/swagger.js
// ============================================================
// Swagger / OpenAPI 3.0 Configuration
//
// Generates interactive API documentation accessible at /api-docs.
// We use swagger-jsdoc to pull JSDoc annotations from route files,
// keeping docs co-located with the code they describe.
// ============================================================

import swaggerJsDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Dashboard API',
      version: '1.0.0',
      description: `
## Finance Dashboard Backend API

A role-based financial data management system supporting:
- **Viewer** — Read-only access to records and dashboard
- **Analyst** — Read access + insights/summaries
- **Admin** — Full CRUD access to records and user management

### Authentication
All protected routes require a Bearer token in the Authorization header.
Get your token from \`POST /api/auth/login\`.

\`\`\`
Authorization: Bearer <your-supabase-jwt-token>
\`\`\`
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://finance-dashboard-backend-topaz.vercel.app/'   // Replace with your actual Vercel URL after deploy
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    // Reusable components referenced across route docs
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your Supabase JWT token',
        },
      },
      schemas: {
        // Standard API response wrapper
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        // Error response shape
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
        // Financial record shape
        FinancialRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', example: 5000.00 },
            type: { type: 'string', enum: ['income', 'expense'] },
            category: { type: 'string', example: 'Salary' },
            description: { type: 'string', example: 'Monthly salary payment' },
            record_date: { type: 'string', format: 'date', example: '2024-01-15' },
            tags: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        // User profile shape
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            full_name: { type: 'string' },
            role: { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    // Apply BearerAuth globally — all routes need auth unless overridden
    security: [{ BearerAuth: [] }],
  },
  // Where to look for JSDoc annotations
  apis: ['./src/modules/**/*.routes.js'],
};

export const swaggerSpec = swaggerJsDoc(options);