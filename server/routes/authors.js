const express = require('express');
const {
  getAuthors,
  searchAuthors,
  getAuthor,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  getAuthorStats,
  addAward,
  removeAward,
  getAuthorsByNationality,
  getAuthorsWithCounts,
  getPopularAuthors,
} = require('../controllers/authorController');

const { authenticate, isAdmin, isLibrarian } = require('../middleware/auth');
const { authorValidations, commonValidations, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/authors
// @desc    Get all authors
// @access  Public
router.get(
  '/',
  [
    ...commonValidations.pagination,
    require('express-validator').query('nationality')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Nationality must be between 1 and 50 characters')
      .trim(),
    require('express-validator').query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  handleValidationErrors,
  getAuthors
);

// @route   GET /api/authors/search
// @desc    Search authors
// @access  Public
router.get(
  '/search',
  [
    ...commonValidations.search,
    ...commonValidations.pagination,
    require('express-validator').query('nationality')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Nationality must be between 1 and 50 characters')
      .trim(),
    require('express-validator').query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  handleValidationErrors,
  searchAuthors
);

// @route   GET /api/authors/popular
// @desc    Get popular authors
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
  getPopularAuthors
);

// @route   GET /api/authors/with-counts
// @desc    Get authors with book counts
// @access  Public
router.get('/with-counts', getAuthorsWithCounts);

// @route   GET /api/authors/stats
// @desc    Get author statistics
// @access  Private (Admin/Librarian)
router.get('/stats', authenticate, isLibrarian, getAuthorStats);

// @route   GET /api/authors/nationality/:nationality
// @desc    Get authors by nationality
// @access  Public
router.get(
  '/nationality/:nationality',
  [
    require('express-validator').param('nationality')
      .notEmpty()
      .withMessage('Nationality is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Nationality must be between 1 and 50 characters'),
    ...commonValidations.pagination,
  ],
  handleValidationErrors,
  getAuthorsByNationality
);

// @route   GET /api/authors/:id
// @desc    Get single author
// @access  Public
router.get(
  '/:id',
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid author ID'),
  ],
  handleValidationErrors,
  getAuthor
);

// @route   POST /api/authors
// @desc    Create new author
// @access  Private (Admin/Librarian)
router.post(
  '/',
  authenticate,
  isLibrarian,
  authorValidations.create,
  handleValidationErrors,
  createAuthor
);

// @route   PUT /api/authors/:id
// @desc    Update author
// @access  Private (Admin/Librarian)
router.put(
  '/:id',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid author ID'),
    ...authorValidations.update,
  ],
  handleValidationErrors,
  updateAuthor
);

// @route   DELETE /api/authors/:id
// @desc    Delete author
// @access  Private (Admin)
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid author ID'),
  ],
  handleValidationErrors,
  deleteAuthor
);

// @route   POST /api/authors/:id/awards
// @desc    Add award to author
// @access  Private (Admin/Librarian)
router.post(
  '/:id/awards',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid author ID'),
    require('express-validator').body('name')
      .notEmpty()
      .withMessage('Award name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Award name must be between 1 and 100 characters')
      .trim(),
    require('express-validator').body('year')
      .optional()
      .isInt({ min: 1800, max: new Date().getFullYear() })
      .withMessage(`Year must be between 1800 and ${new Date().getFullYear()}`),
    require('express-validator').body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
      .trim(),
  ],
  handleValidationErrors,
  addAward
);

// @route   DELETE /api/authors/:id/awards/:awardId
// @desc    Remove award from author
// @access  Private (Admin/Librarian)
router.delete(
  '/:id/awards/:awardId',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid author ID'),
    require('express-validator').param('awardId')
      .isMongoId()
      .withMessage('Invalid award ID'),
  ],
  handleValidationErrors,
  removeAward
);

module.exports = router;
