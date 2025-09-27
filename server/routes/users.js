const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserHistory,
  getUserReservations,
  getUserStats,
  updateUserStatus,
  getUsersWithOverdueBooks,
  getUsersWithFines,
} = require('../controllers/userController');

const { authenticate, isAdmin, isLibrarian, isOwnerOrStaff } = require('../middleware/auth');
const { userValidations, commonValidations, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin/Librarian)
router.get(
  '/',
  authenticate,
  isLibrarian,
  [
    ...commonValidations.pagination,
    require('express-validator').query('role')
      .optional()
      .isIn(['admin', 'librarian', 'member'])
      .withMessage('Invalid role'),
    require('express-validator').query('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status'),
    require('express-validator').query('search')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .trim(),
  ],
  handleValidationErrors,
  getUsers
);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Admin/Librarian)
router.get('/stats', authenticate, isLibrarian, getUserStats);

// @route   GET /api/users/overdue
// @desc    Get users with overdue books
// @access  Private (Admin/Librarian)
router.get('/overdue', authenticate, isLibrarian, getUsersWithOverdueBooks);

// @route   GET /api/users/fines
// @desc    Get users with outstanding fines
// @access  Private (Admin/Librarian)
router.get('/fines', authenticate, isLibrarian, getUsersWithFines);

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private (Admin/Librarian or Own Profile)
router.get(
  '/:id',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid user ID'),
  ],
  handleValidationErrors,
  isOwnerOrStaff,
  getUser
);

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin)
router.post(
  '/',
  authenticate,
  isAdmin,
  [
    ...userValidations.register,
    require('express-validator').body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status'),
  ],
  handleValidationErrors,
  createUser
);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or Own Profile)
router.put(
  '/:id',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid user ID'),
    require('express-validator').body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .trim(),
    require('express-validator').body('phone')
      .optional()
      .matches(/^\+?[\d\s-()]+$/)
      .withMessage('Please provide a valid phone number'),
    require('express-validator').body('role')
      .optional()
      .isIn(['admin', 'librarian', 'member'])
      .withMessage('Invalid role'),
    require('express-validator').body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status'),
  ],
  handleValidationErrors,
  updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid user ID'),
  ],
  handleValidationErrors,
  deleteUser
);

// @route   GET /api/users/:id/history
// @desc    Get user borrowing history
// @access  Private (Admin/Librarian or Own Profile)
router.get(
  '/:id/history',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid user ID'),
    ...commonValidations.pagination,
    require('express-validator').query('status')
      .optional()
      .isIn(['borrowed', 'returned', 'overdue'])
      .withMessage('Invalid transaction status'),
  ],
  handleValidationErrors,
  getUserHistory
);

// @route   GET /api/users/:id/reservations
// @desc    Get user reservations
// @access  Private (Admin/Librarian or Own Profile)
router.get(
  '/:id/reservations',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid user ID'),
  ],
  handleValidationErrors,
  getUserReservations
);

// @route   PATCH /api/users/:id/status
// @desc    Update user status
// @access  Private (Admin)
router.patch(
  '/:id/status',
  authenticate,
  isAdmin,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid user ID'),
    require('express-validator').body('status')
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status'),
  ],
  handleValidationErrors,
  updateUserStatus
);

module.exports = router;
