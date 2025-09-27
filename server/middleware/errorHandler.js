const config = require('../config/config');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle CastError (Invalid MongoDB ObjectId)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle Duplicate field error
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field} '${value}' already exists. Please use another value.`;
  return new AppError(message, 400);
};

// Handle Validation Error
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle JWT Error
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

// Handle JWT Expired Error
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// Send error in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Send error in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
    });
  }
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific MongoDB errors
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 Not Found handler
const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

// Rate limiting error handler
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  });
};

// Validation error formatter
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value,
  }));
};

// Database connection error handler
const handleDBConnectionError = (err) => {
  console.error('Database connection error:', err.message);

  if (err.name === 'MongoNetworkError') {
    console.error('MongoDB network error. Please check your connection.');
  } else if (err.name === 'MongooseServerSelectionError') {
    console.error('MongoDB server selection error. Please check if MongoDB is running.');
  } else if (err.name === 'MongoParseError') {
    console.error('MongoDB connection string parse error. Please check your connection string.');
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn('Continuing to run without a database connection (development mode).');
    return;
  }

  process.exit(1);
};

// Unhandled promise rejection handler
const handleUnhandledRejection = (err) => {
  console.error('UNHANDLED PROMISE REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
};

// Uncaught exception handler
const handleUncaughtException = (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
};

// SIGTERM handler for graceful shutdown
const handleSIGTERM = (server) => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
};

// Custom error responses
const errorResponses = {
  // Authentication errors
  INVALID_CREDENTIALS: {
    statusCode: 401,
    message: 'Invalid email or password',
  },
  TOKEN_EXPIRED: {
    statusCode: 401,
    message: 'Token has expired. Please login again',
  },
  ACCESS_DENIED: {
    statusCode: 403,
    message: 'Access denied. Insufficient permissions.',
  },
  ACCESS_DENIED_TRANSACTION: {
    statusCode: 403,
    message: 'Access denied. Insufficient permissions for transaction operations.',
  },
  
  // Resource errors
  RESOURCE_NOT_FOUND: {
    statusCode: 404,
    message: 'Requested resource not found',
  },
  RESOURCE_ALREADY_EXISTS: {
    statusCode: 409,
    message: 'Resource already exists',
  },
  
  // Business logic errors
  BOOK_NOT_AVAILABLE: {
    statusCode: 400,
    message: 'Book is not available for borrowing',
  },
  BOOK_ALREADY_BORROWED: {
    statusCode: 400,
    message: 'User already has this book borrowed',
  },
  MAXIMUM_RENEWALS_REACHED: {
    statusCode: 400,
    message: 'Maximum number of renewals reached',
  },
  OUTSTANDING_FINES: {
    statusCode: 400,
    message: 'Cannot borrow books with outstanding fines',
  },
  RESERVATION_EXISTS: {
    statusCode: 400,
    message: 'User already has an active reservation for this book',
  },
  
  // Validation errors
  INVALID_INPUT: {
    statusCode: 400,
    message: 'Invalid input data provided',
  },
  MISSING_REQUIRED_FIELDS: {
    statusCode: 400,
    message: 'Required fields are missing',
  },
};

// Helper function to create standardized error responses
const createErrorResponse = (errorType, customMessage = null) => {
  const error = errorResponses[errorType];
  if (!error) {
    return new AppError('Internal server error', 500);
  }
  
  return new AppError(customMessage || error.message, error.statusCode);
};

// Middleware to log errors
const errorLogger = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');
  const userId = req.user ? req.user._id : 'Anonymous';

  console.error(`[${timestamp}] ERROR: ${err.message}`);
  console.error(`Request: ${method} ${url}`);
  console.error(`User: ${userId}`);
  console.error(`IP: ${ip}`);
  console.error(`User-Agent: ${userAgent}`);
  console.error(`Stack: ${err.stack}`);

  // In production, you might want to send this to a logging service
  // like Winston, Loggly, or Sentry

  next(err);
};

module.exports = {
  AppError,
  globalErrorHandler,
  asyncHandler,
  notFound,
  rateLimitHandler,
  formatValidationErrors,
  handleDBConnectionError,
  handleUnhandledRejection,
  handleUncaughtException,
  handleSIGTERM,
  errorResponses,
  createErrorResponse,
  errorLogger,
};
