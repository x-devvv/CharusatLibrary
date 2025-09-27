const express = require('express');
const {
  getTransactions,
  getTransaction,
  borrowBook,
  returnBook,
  renewBook,
  payFine,
  getOverdueTransactions,
  getTransactionStats,
  updateTransaction,
  deleteTransaction,
  getUserActiveTransactions,
} = require('../controllers/transactionController');

const { authenticate, isAdmin, isLibrarian, canPerformTransaction } = require('../middleware/auth');
const { transactionValidations, commonValidations, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get all transactions
// @access  Private (Admin/Librarian)
router.get(
  '/',
  authenticate,
  isLibrarian,
  [
    ...commonValidations.pagination,
    require('express-validator').query('status')
      .optional()
      .isIn(['borrowed', 'returned', 'overdue'])
      .withMessage('Invalid transaction status'),
    require('express-validator').query('userId')
      .optional()
      .isMongoId()
      .withMessage('Invalid user ID'),
    require('express-validator').query('bookId')
      .optional()
      .isMongoId()
      .withMessage('Invalid book ID'),
    require('express-validator').query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    require('express-validator').query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
  ],
  handleValidationErrors,
  getTransactions
);

// @route   GET /api/transactions/overdue
// @desc    Get overdue transactions
// @access  Private (Admin/Librarian)
router.get('/overdue', authenticate, isLibrarian, getOverdueTransactions);

// @route   GET /api/transactions/stats
// @desc    Get transaction statistics
// @access  Private (Admin/Librarian)
router.get(
  '/stats',
  authenticate,
  isLibrarian,
  [
    require('express-validator').query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    require('express-validator').query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
  ],
  handleValidationErrors,
  getTransactionStats
);

// @route   GET /api/transactions/user/:userId/active
// @desc    Get user's active transactions
// @access  Private (Admin/Librarian or Own Transactions)
router.get(
  '/user/:userId/active',
  authenticate,
  [
    require('express-validator').param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
  ],
  handleValidationErrors,
  getUserActiveTransactions
);

// @route   POST /api/transactions/borrow
// @desc    Borrow a book
// @access  Private
router.post(
  '/borrow',
  authenticate,
  transactionValidations.borrow,
  handleValidationErrors,
  canPerformTransaction,
  borrowBook
);

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private (Admin/Librarian or Own Transaction)
router.get(
  '/:id',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid transaction ID'),
  ],
  handleValidationErrors,
  getTransaction
);

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private (Admin/Librarian)
router.put(
  '/:id',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid transaction ID'),
    require('express-validator').body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date'),
    require('express-validator').body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
      .trim(),
    require('express-validator').body('fineAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Fine amount must be a non-negative number'),
  ],
  handleValidationErrors,
  updateTransaction
);

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private (Admin)
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid transaction ID'),
  ],
  handleValidationErrors,
  deleteTransaction
);

// @route   PUT /api/transactions/:id/return
// @desc    Return a book
// @access  Private (Admin/Librarian)
router.put(
  '/:id/return',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid transaction ID'),
    ...transactionValidations.return,
  ],
  handleValidationErrors,
  returnBook
);

// @route   PUT /api/transactions/:id/renew
// @desc    Renew a book
// @access  Private
router.put(
  '/:id/renew',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid transaction ID'),
    ...transactionValidations.renew,
  ],
  handleValidationErrors,
  renewBook
);

// @route   PUT /api/transactions/:id/pay-fine
// @desc    Pay fine
// @access  Private
router.put(
  '/:id/pay-fine',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid transaction ID'),
    ...transactionValidations.payFine,
  ],
  handleValidationErrors,
  payFine
);

module.exports = router;
