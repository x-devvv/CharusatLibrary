const Category = require('../models/Category');
const Book = require('../models/Book');
const { asyncHandler, AppError, createErrorResponse } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'name',
    sortOrder = 'asc',
    includeInactive = false,
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    sortBy,
    sortOrder,
    includeInactive: includeInactive === 'true',
  };

  const categories = await Category.searchCategories('', options);
  const total = await Category.countDocuments({ 
    ...(options.includeInactive ? {} : { isActive: true }) 
  });

  res.status(200).json({
    success: true,
    data: {
      categories,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    },
  });
});

// @desc    Search categories
// @route   GET /api/categories/search
// @access  Public
const searchCategories = asyncHandler(async (req, res, next) => {
  const {
    q: query = '',
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'name',
    sortOrder = 'asc',
    includeInactive = false,
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    sortBy,
    sortOrder,
    includeInactive: includeInactive === 'true',
  };

  const categories = await Category.searchCategories(query, options);
  
  // Get total count for pagination
  const searchQuery = {
    ...(options.includeInactive ? {} : { isActive: true }),
  };

  if (query) {
    searchQuery.$or = [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ];
  }

  const total = await Category.countDocuments(searchQuery);

  res.status(200).json({
    success: true,
    data: {
      categories,
      query,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    },
  });
});

// @desc    Get category tree
// @route   GET /api/categories/tree
// @access  Public
const getCategoryTree = asyncHandler(async (req, res, next) => {
  const categoryTree = await Category.getCategoryTree();

  res.status(200).json({
    success: true,
    data: {
      categories: categoryTree,
    },
  });
});

// @desc    Get popular categories
// @route   GET /api/categories/popular
// @access  Public
const getPopularCategories = asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;
  
  const popularCategories = await Category.getPopularCategories(parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      categories: popularCategories,
    },
  });
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id)
    .populate('parentCategory', 'name slug')
    .populate('subcategories')
    .populate('booksCount');

  if (!category || !category.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Category not found'));
  }

  // Get full path
  const fullPath = await category.getFullPath();

  res.status(200).json({
    success: true,
    data: {
      category: {
        ...category.toObject(),
        fullPath,
      },
    },
  });
});

// @desc    Create new category
// @route   POST /api/categories
// @access  Private (Admin)
const createCategory = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    parentCategory,
    color,
    icon,
    sortOrder,
  } = req.body;

  // Check if category name already exists
  const existingCategory = await Category.findOne({ 
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    isActive: true,
  });

  if (existingCategory) {
    return next(createErrorResponse('RESOURCE_ALREADY_EXISTS', 'Category with this name already exists'));
  }

  // Validate parent category if provided
  if (parentCategory) {
    const parent = await Category.findById(parentCategory);
    if (!parent || !parent.isActive) {
      return next(new AppError('Parent category not found', 400));
    }
  }

  const categoryData = {
    name,
    description,
    parentCategory,
    color,
    icon,
    sortOrder,
  };

  const category = await Category.create(categoryData);
  await category.populate('parentCategory', 'name slug');

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: {
      category,
    },
  });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin)
const updateCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category || !category.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Category not found'));
  }

  const {
    name,
    description,
    parentCategory,
    color,
    icon,
    sortOrder,
  } = req.body;

  // Check name uniqueness if changed
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true,
      _id: { $ne: category._id },
    });

    if (existingCategory) {
      return next(createErrorResponse('RESOURCE_ALREADY_EXISTS', 'Category with this name already exists'));
    }
  }

  // Validate parent category if provided
  if (parentCategory) {
    const parent = await Category.findById(parentCategory);
    if (!parent || !parent.isActive) {
      return next(new AppError('Parent category not found', 400));
    }

    // Prevent setting self as parent
    if (parentCategory === category._id.toString()) {
      return next(new AppError('Category cannot be its own parent', 400));
    }
  }

  // Update fields
  const updateFields = {
    name,
    description,
    parentCategory,
    color,
    icon,
    sortOrder,
  };

  Object.keys(updateFields).forEach(key => {
    if (updateFields[key] !== undefined) {
      category[key] = updateFields[key];
    }
  });

  await category.save();
  await category.populate('parentCategory', 'name slug');

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: {
      category,
    },
  });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
const deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category || !category.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Category not found'));
  }

  // Check if category has books
  const booksCount = await Book.countDocuments({ genre: category._id, isActive: true });
  if (booksCount > 0) {
    return next(new AppError(`Cannot delete category with ${booksCount} books. Please reassign books to another category first.`, 400));
  }

  // Check if category has subcategories
  const subcategoriesCount = await Category.countDocuments({ 
    parentCategory: category._id, 
    isActive: true 
  });
  if (subcategoriesCount > 0) {
    return next(new AppError(`Cannot delete category with ${subcategoriesCount} subcategories. Please reassign subcategories first.`, 400));
  }

  // Soft delete - mark as inactive
  category.isActive = false;
  await category.save();

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
  });
});

// @desc    Get category statistics
// @route   GET /api/categories/stats
// @access  Private (Admin/Librarian)
const getCategoryStats = asyncHandler(async (req, res, next) => {
  const stats = await Category.getStatistics();

  res.status(200).json({
    success: true,
    data: {
      stats,
    },
  });
});

// @desc    Get category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
const getCategoryBySlug = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;

  const category = await Category.findOne({ slug, isActive: true })
    .populate('parentCategory', 'name slug')
    .populate('subcategories')
    .populate('booksCount');

  if (!category) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Category not found'));
  }

  // Get full path
  const fullPath = await category.getFullPath();

  res.status(200).json({
    success: true,
    data: {
      category: {
        ...category.toObject(),
        fullPath,
      },
    },
  });
});

// @desc    Reorder categories
// @route   PUT /api/categories/reorder
// @access  Private (Admin)
const reorderCategories = asyncHandler(async (req, res, next) => {
  const { categories } = req.body; // Array of { id, sortOrder }

  if (!Array.isArray(categories)) {
    return next(new AppError('Categories must be an array', 400));
  }

  // Update sort orders
  const updatePromises = categories.map(({ id, sortOrder }) => 
    Category.findByIdAndUpdate(id, { sortOrder }, { new: true })
  );

  await Promise.all(updatePromises);

  res.status(200).json({
    success: true,
    message: 'Categories reordered successfully',
  });
});

// @desc    Get categories with book counts
// @route   GET /api/categories/with-counts
// @access  Public
const getCategoriesWithCounts = asyncHandler(async (req, res, next) => {
  const categories = await Category.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: 'genre',
        as: 'books',
        pipeline: [{ $match: { isActive: true } }],
      },
    },
    {
      $addFields: {
        booksCount: { $size: '$books' },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        slug: 1,
        color: 1,
        icon: 1,
        parentCategory: 1,
        sortOrder: 1,
        booksCount: 1,
      },
    },
    { $sort: { sortOrder: 1, name: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      categories,
    },
  });
});

module.exports = {
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
};
