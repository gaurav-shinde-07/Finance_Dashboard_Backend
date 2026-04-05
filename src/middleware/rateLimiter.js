// src/middleware/rateLimiter.js
// ============================================================
// Rate Limiting Middleware
//
// Two separate limiters:
// 1. authLimiter — strict limit on login/signup (prevent brute force)
// 2. apiLimiter — general limit on all API routes (prevent abuse)
//
// In production, you'd use Redis as the store so limits persist
// across multiple server instances. For this assignment, the
// in-memory store (default) works correctly on a single instance.
// ============================================================

import rateLimit from 'express-rate-limit';

/**
 * Auth rate limiter — very strict
 * 10 attempts per 15 minutes on auth endpoints
 * Prevents brute force attacks on login
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,  // Include rate limit info in response headers (RateLimit-*)
  legacyHeaders: false,
  // Skip successful requests — only count failures against the limit
  skipSuccessfulRequests: true,
});

/**
 * General API rate limiter
 * Reads from env vars so it can be adjusted per environment
 * Default: 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});