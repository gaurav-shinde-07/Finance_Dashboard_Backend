// api/index.js
// ============================================================
// Application Entry Point
//
// This file is the single entry point for both:
// - Local development (nodemon api/index.js)
// - Vercel serverless deployment (vercel.json points here)
//
// Order of middleware matters in Express:
// 1. Security headers (helmet)
// 2. CORS
// 3. Request logging
// 4. Rate limiting
// 5. Body parsing
// 6. Routes
// 7. 404 handler
// 8. Global error handler (must be last, must have 4 params)
// ============================================================

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
// swagger-ui-express no longer needed — we serve UI via CDN now
// import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from '../src/config/swagger.js';
import { apiLimiter } from '../src/middleware/rateLimiter.js';
import { globalErrorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';

// Route modules
import authRoutes from '../src/modules/auth/auth.routes.js';
import usersRoutes from '../src/modules/users/users.routes.js';
import recordsRoutes from '../src/modules/records/records.routes.js';
import dashboardRoutes from '../src/modules/dashboard/dashboard.routes.js';

const app = express();

// ── Security ──────────────────────────────────────────────
// helmet sets security-focused HTTP response headers
// Helps protect against well-known web vulnerabilities
app.use(helmet({
  // Allow Swagger UI to load its assets from CDN
  contentSecurityPolicy: false,
}));

// CORS — restrict in production to your actual frontend domain
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.ALLOWED_ORIGIN || '*']  // Set ALLOWED_ORIGIN env var to your frontend URL
    : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Logging ───────────────────────────────────────────────
// 'dev' format: colorized, short — great for development
// In production, use 'combined' format and pipe to a log service
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate Limiting ─────────────────────────────────────────
// Applied to all /api/* routes
app.use('/api', apiLimiter);

// ── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Reject payloads over 10KB
app.use(express.urlencoded({ extended: true }));

// ── API Documentation ─────────────────────────────────────
// Available at /api-docs — no auth required
// Serve the raw OpenAPI JSON spec — Swagger UI will fetch this
app.get('/api-docs/spec.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Serve Swagger UI using CDN assets — avoids Vercel static file MIME issues
app.get('/api-docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Finance Dashboard API Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function () {
          SwaggerUIBundle({
            url: '/api-docs/spec.json',
            dom_id: '#swagger-ui',
            presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
            layout: 'StandaloneLayout',
            persistAuthorization: true,
          });
        };
      </script>
    </body>
    </html>
  `);
});

// ── Health Check ──────────────────────────────────────────
// Simple endpoint for Vercel and uptime monitoring to ping
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Finance Dashboard API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Catch-all for undefined routes ────────────────────────
app.use(notFoundHandler);

// ── Global Error Handler ──────────────────────────────────
// MUST be registered last and MUST have exactly 4 parameters
// Express identifies error-handling middleware by the 4th `err` param
app.use(globalErrorHandler);

// ── Server Start ──────────────────────────────────────────
// In Vercel serverless environment, the app is exported (not .listen())
// Locally, we start the server normally
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Finance Dashboard API running at http://localhost:${PORT}`);
    console.log(`📚 Swagger Docs available at http://localhost:${PORT}/api-docs`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

// Export for Vercel serverless
export default app;