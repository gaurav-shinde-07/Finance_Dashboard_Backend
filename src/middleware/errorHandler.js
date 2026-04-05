// src/middleware/errorHandler.js
// ============================================================
// Global Error Handler
//
// Express calls this middleware when next(error) is called
// anywhere in the application, or when an unhandled error occurs.
//
// This is the last line of defense — it catches anything that
// slipped through controller try/catch blocks and returns a
// clean, consistent error response instead of crashing the server
// or leaking stack traces to clients.
// ============================================================

export const globalErrorHandler = (err, req, res, next) => {
  // Log the full error server-side for debugging
  console.error('💥 Unhandled Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : '[hidden in production]',
    url: req.url,
    method: req.method,
    userId: req.user?.id || 'unauthenticated',
  });

  // Handle specific known error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // Supabase-specific errors often have a code field
  if (err.code === 'PGRST116') {
    // PostgREST error: "no rows returned" — treat as 404
    return res.status(404).json({
      success: false,
      message: 'Resource not found',
    });
  }

  // Default: Internal server error
  // Never expose raw error details in production
  return res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong on the server. Please try again.',
  });
};

/**
 * Handle 404 for routes that don't exist
 * Registered before globalErrorHandler in the main app
 */
export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
};