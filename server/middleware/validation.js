const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const config = require('../config/config');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  
  next();
};

// Common validation rules
const commonValidations = {
  objectId: (field) => [
    param(field).isMongoId().withMessage(`Invalid ${field} format`),
  ],
  
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: config.MAX_PAGE_SIZE })
      .withMessage(`Limit must be between 1 and ${config.MAX_PAGE_SIZE}`),
    query('sortBy')
      .optional()
      .isString()
      .trim()
      .withMessage('Sort by must be a string'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],

  search: [
    query('q')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
  ],
};

// User validation rules
const userValidations = {
  register: [
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .trim(),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail()
      .toLowerCase(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('phone')
      .optional()
      .matches(/^\+?[\d\s-()]+$/)
      .withMessage('Please provide a valid phone number'),
    body('role')
      .optional()
      .isIn(Object.values(config.USER_ROLES))
      .withMessage('Invalid role'),
  ],

  login: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail()
      .toLowerCase(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],

  updateProfile: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .trim(),
    body('phone')
      .optional()
      .matches(/^\+?[\d\s-()]+$/)
      .withMessage('Please provide a valid phone number'),
    body('address.street')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Street address cannot exceed 100 characters')
      .trim(),
    body('address.city')
      .optional()
      .isLength({ max: 50 })
      .withMessage('City cannot exceed 50 characters')
      .trim(),
    body('address.state')
      .optional()
      .isLength({ max: 50 })
      .withMessage('State cannot exceed 50 characters')
      .trim(),
    body('address.zipCode')
      .optional()
      .matches(/^\d{5}(-\d{4})?$/)
      .withMessage('Please provide a valid ZIP code'),
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],
};

// Book validation rules
const bookValidations = {
  create: [
    body('title')
      .notEmpty()
      .withMessage('Book title is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters')
      .trim(),
    body('authors')
      .isArray({ min: 1 })
      .withMessage('At least one author is required')
      .custom((authors) => {
        return authors.every(author => mongoose.Types.ObjectId.isValid(author));
      })
      .withMessage('All author IDs must be valid'),
    body('isbn')
      .optional()
      .matches(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/)
      .withMessage('Please provide a valid ISBN'),
    body('genre')
      .isMongoId()
      .withMessage('Valid genre ID is required'),
    body('publishDate')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid publish date')
      .custom((date) => {
        return new Date(date) <= new Date();
      })
      .withMessage('Publish date cannot be in the future'),
    body('publisher')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Publisher name cannot exceed 100 characters')
      .trim(),
    body('pages')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Pages must be between 1 and 10000'),
    body('copies')
      .isInt({ min: 0 })
      .withMessage('Copies must be a non-negative integer'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters')
      .trim(),
  ],

  update: [
    body('title')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters')
      .trim(),
    body('authors')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one author is required')
      .custom((authors) => {
        return authors.every(author => mongoose.Types.ObjectId.isValid(author));
      })
      .withMessage('All author IDs must be valid'),
    body('isbn')
      .optional()
      .matches(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/)
      .withMessage('Please provide a valid ISBN'),
    body('genre')
      .optional()
      .isMongoId()
      .withMessage('Valid genre ID is required'),
    body('copies')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Copies must be a non-negative integer'),
  ],

  search: [
    ...commonValidations.search,
    ...commonValidations.pagination,
    query('genre')
      .optional()
      .isMongoId()
      .withMessage('Invalid genre ID'),
    query('author')
      .optional()
      .isMongoId()
      .withMessage('Invalid author ID'),
    query('availability')
      .optional()
      .isIn(['available', 'unavailable'])
      .withMessage('Availability must be available or unavailable'),
    query('language')
      .optional()
      .isString()
      .trim()
      .withMessage('Language must be a string'),
    query('minRating')
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage('Minimum rating must be between 0 and 5'),
  ],
};

// Author validation rules
const authorValidations = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('Author name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .trim(),
    body('biography')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Biography cannot exceed 2000 characters')
      .trim(),
    body('birthDate')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid birth date')
      .custom((date) => {
        return new Date(date) <= new Date();
      })
      .withMessage('Birth date cannot be in the future'),
    body('nationality')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Nationality cannot exceed 50 characters')
      .trim(),
    body('website')
      .optional()
      .isURL()
      .withMessage('Please provide a valid website URL'),
  ],

  update: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .trim(),
    body('biography')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Biography cannot exceed 2000 characters')
      .trim(),
    body('birthDate')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid birth date')
      .custom((date) => {
        return new Date(date) <= new Date();
      })
      .withMessage('Birth date cannot be in the future'),
  ],
};

// Category validation rules
const categoryValidations = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('Category name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Name must be between 1 and 50 characters')
      .trim(),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
      .trim(),
    body('parentCategory')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent category ID'),
    body('color')
      .optional()
      .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .withMessage('Please provide a valid hex color code'),
  ],

  update: [
    body('name')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Name must be between 1 and 50 characters')
      .trim(),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
      .trim(),
    body('parentCategory')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent category ID'),
  ],
};

// Transaction validation rules
const transactionValidations = {
  borrow: [
    body('userId')
      .isMongoId()
      .withMessage('Valid user ID is required'),
    body('bookId')
      .isMongoId()
      .withMessage('Valid book ID is required'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid due date')
      .custom((date) => {
        return new Date(date) > new Date();
      })
      .withMessage('Due date must be in the future'),
  ],

  return: [
    body('returnDate')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid return date'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
      .trim(),
  ],

  renew: [
    body('newDueDate')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid due date')
      .custom((date) => {
        return new Date(date) > new Date();
      })
      .withMessage('Due date must be in the future'),
  ],

  payFine: [
    body('paymentAmount')
      .isFloat({ min: 0 })
      .withMessage('Payment amount must be a positive number'),
    body('paymentMethod')
      .optional()
      .isIn(['cash', 'card', 'online'])
      .withMessage('Invalid payment method'),
  ],
};

// Reservation validation rules
const reservationValidations = {
  create: [
    body('userId')
      .isMongoId()
      .withMessage('Valid user ID is required'),
    body('bookId')
      .isMongoId()
      .withMessage('Valid book ID is required'),
  ],

  update: [
    body('status')
      .optional()
      .isIn(Object.values(config.RESERVATION_STATUS))
      .withMessage('Invalid reservation status'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
      .trim(),
  ],
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  userValidations,
  bookValidations,
  authorValidations,
  categoryValidations,
  transactionValidations,
  reservationValidations,
};
