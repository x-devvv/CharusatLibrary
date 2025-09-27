const express = require('express');
const {
  getCategories,
  searchCategories,
  getCategoryTree,
  getPopularCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  getCategoryBySlug,
  reorderCategories,
  getCategoriesWithCounts,
} = require('../controllers/categoryController');

const { authenticate, isAdmin, isLibrarian } = require('../middleware/auth');
const { categoryValidations, commonValidations, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get(
  '/',
  [
    ...commonValidations.pagination,
    require('express-validator').query('includeInactive')
      .optional()
      .isBoolean()
      .withMessage('includeInactive must be a boolean'),
  ],
  handleValidationErrors,
  getCategories
);

// @route   GET /api/categories/search
// @desc    Search categories
// @access  Public
router.get(
  '/search',
  [
    ...commonValidations.search,
    ...commonValidations.pagination,
    require('express-validator').query('includeInactive')
      .optional()
      .isBoolean()
      .withMessage('includeInactive must be a boolean'),
  ],
  handleValidationErrors,
  searchCategories
);

// @route   GET /api/categories/tree
// @desc    Get category tree
// @access  Public
router.get('/tree', getCategoryTree);

// @route   GET /api/categories/popular
// @desc    Get popular categories
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
  getPopularCategories
);

// @route   GET /api/categories/with-counts
// @desc    Get categories with book counts
// @access  Public
router.get('/with-counts', getCategoriesWithCounts);

// @route   GET /api/categories/stats
// @desc    Get category statistics
// @access  Private (Admin/Librarian)
router.get('/stats', authenticate, isLibrarian, getCategoryStats);

// @route   PUT /api/categories/reorder
// @desc    Reorder categories
// @access  Private (Admin)
router.put(
  '/reorder',
  authenticate,
  isAdmin,
  [
    require('express-validator').body('categories')
      .isArray({ min: 1 })
      .withMessage('Categories must be a non-empty array'),
    require('express-validator').body('categories.*.id')
      .isMongoId()
      .withMessage('Invalid category ID'),
    require('express-validator').body('categories.*.sortOrder')
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
  ],
  handleValidationErrors,
  reorderCategories
);

// @route   GET /api/categories/slug/:slug
// @desc    Get category by slug
// @access  Public
router.get(
  '/slug/:slug',
  [
    require('express-validator').param('slug')
      .notEmpty()
      .withMessage('Slug is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Slug must be between 1 and 100 characters'),
  ],
  handleValidationErrors,
  getCategoryBySlug
);

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Public
router.get(
  '/:id',
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid category ID'),
  ],
  handleValidationErrors,
  getCategory
);

// @route   POST /api/categories
// @desc    Create new category
// @access  Private (Admin)
router.post(
  '/',
  authenticate,
  isAdmin,
  categoryValidations.create,
  handleValidationErrors,
  createCategory
);

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private (Admin)
router.put(
  '/:id',
  authenticate,
  isAdmin,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid category ID'),
    ...categoryValidations.update,
  ],
  handleValidationErrors,
  updateCategory
);

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private (Admin)
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid category ID'),
  ],
  handleValidationErrors,
  deleteCategory
);

module.exports = router;
