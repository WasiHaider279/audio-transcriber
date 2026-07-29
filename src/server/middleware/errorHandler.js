import logger from '../../utils/logger.js';

/**
 * Custom error class for API errors with HTTP status codes.
 */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Express error-handling middleware.
 * Catches all errors and returns a consistent JSON response.
 */
export function errorHandler(err, req, res, _next) {
  // Multer file-size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Uploaded file exceeds the maximum allowed size.',
      },
    });
  }

  // Multer unexpected field
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FIELD',
        message: 'Unexpected file field. Use "audio" as the form field name.',
      },
    });
  }

  // Known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.statusCode === 400 ? 'BAD_REQUEST' : 'SERVER_ERROR',
        message: err.message,
      },
    });
  }

  // Unknown errors
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
  });
}
