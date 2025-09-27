const express = require('express');
const {
  getBooks,
  searchBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  getPopularBooks,
  addReview,
  getBookStats,
  updateAvailability,
  getBooksByCategory,
  getBooksByAuthor,
} = require('../controllers/bookController');

const { authenticate, isAdmin, isLibrarian, optionalAuth } = require('../middleware/auth');
const { bookValidations, commonValidations, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/books
// @desc    Get all books
// @access  Public
router.get(
  '/',
  commonValidations.pagination,
  handleValidationErrors,
  getBooks
);

// @route   GET /api/books/search
// @desc    Search books
// @access  Public
router.get(
  '/search',
  bookValidations.search,
  handleValidationErrors,
  searchBooks
);

// @route   GET /api/books/popular
// @desc    Get popular books
// @access  Public
router.get(
  '/popular',
  [
    require('express-validator').query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ],
  handleValidationErrors,
  getPopularBooks
);

// @route   GET /api/books/stats
// @desc    Get book statistics
// @access  Private (Admin/Librarian)
router.get('/stats', authenticate, isLibrarian, getBookStats);

// @route   GET /api/books/category/:categoryId
// @desc    Get books by category
// @access  Public
router.get(
  '/category/:categoryId',
  [
    require('express-validator').param('categoryId')
      .isMongoId()
      .withMessage('Invalid category ID'),
    ...commonValidations.pagination,
  ],
  handleValidationErrors,
  getBooksByCategory
);

// @route   GET /api/books/author/:authorId
// @desc    Get books by author
// @access  Public
router.get(
  '/author/:authorId',
  [
    require('express-validator').param('authorId')
      .isMongoId()
      .withMessage('Invalid author ID'),
    ...commonValidations.pagination,
  ],
  handleValidationErrors,
  getBooksByAuthor
);

// @route   GET /api/books/:id
// @desc    Get single book
// @access  Public
router.get(
  '/:id',
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid book ID'),
  ],
  handleValidationErrors,
  optionalAuth,
  getBook
);

// @route   POST /api/books
// @desc    Create new book
// @access  Private (Admin/Librarian)
router.post(
  '/',
  authenticate,
  isLibrarian,
  bookValidations.create,
  handleValidationErrors,
  createBook
);

// @route   PUT /api/books/:id
// @desc    Update book
// @access  Private (Admin/Librarian)
router.put(
  '/:id',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid book ID'),
    ...bookValidations.update,
  ],
  handleValidationErrors,
  updateBook
);

// @route   DELETE /api/books/:id
// @desc    Delete book
// @access  Private (Admin)
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid book ID'),
  ],
  handleValidationErrors,
  deleteBook
);

// @route   PATCH /api/books/:id/availability
// @desc    Update book availability
// @access  Private (Admin/Librarian)
router.patch(
  '/:id/availability',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid book ID'),
    require('express-validator').body('availableCopies')
      .isInt({ min: 0 })
      .withMessage('Available copies must be a non-negative integer'),
  ],
  handleValidationErrors,
  updateAvailability
);

// @route   POST /api/books/:id/reviews
// @desc    Add book review
// @access  Private
router.post(
  '/:id/reviews',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid book ID'),
    require('express-validator').body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    require('express-validator').body('comment')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Comment cannot exceed 1000 characters')
      .trim(),
  ],
  handleValidationErrors,
  addReview
);

module.exports = router;
