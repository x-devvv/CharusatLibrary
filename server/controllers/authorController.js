const Author = require('../models/Author');
const Book = require('../models/Book');
const { asyncHandler, AppError, createErrorResponse } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Get all authors
// @route   GET /api/authors
// @access  Public
const getAuthors = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'name',
    sortOrder = 'asc',
    nationality,
    isActive = true,
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    sortBy,
    sortOrder,
    nationality,
    isActive: isActive === 'true',
  };

  const authors = await Author.searchAuthors('', options);
  const total = await Author.countDocuments({ 
    isActive: options.isActive,
    ...(nationality && { nationality }),
  });

  res.status(200).json({
    success: true,
    data: {
      authors,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    },
  });
});

// @desc    Search authors
// @route   GET /api/authors/search
// @access  Public
const searchAuthors = asyncHandler(async (req, res, next) => {
  const {
    q: query = '',
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'name',
    sortOrder = 'asc',
    nationality,
    isActive = true,
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    sortBy,
    sortOrder,
    nationality,
    isActive: isActive === 'true',
  };

  const authors = await Author.searchAuthors(query, options);
  
  // Get total count for pagination
  const searchQuery = {
    isActive: options.isActive,
    ...(nationality && { nationality }),
  };

  if (query) {
    searchQuery.$or = [
      { name: { $regex: query, $options: 'i' } },
      { biography: { $regex: query, $options: 'i' } },
      { nationality: { $regex: query, $options: 'i' } },
    ];
  }

  const total = await Author.countDocuments(searchQuery);

  res.status(200).json({
    success: true,
    data: {
      authors,
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

// @desc    Get single author
// @route   GET /api/authors/:id
// @access  Public
const getAuthor = asyncHandler(async (req, res, next) => {
  const author = await Author.findById(req.params.id)
    .populate('genres', 'name color')
    .populate('booksCount');

  if (!author || !author.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Author not found'));
  }

  res.status(200).json({
    success: true,
    data: {
      author,
    },
  });
});

// @desc    Create new author
// @route   POST /api/authors
// @access  Private (Admin/Librarian)
const createAuthor = asyncHandler(async (req, res, next) => {
  const {
    name,
    biography,
    birthDate,
    deathDate,
    nationality,
    website,
    imageUrl,
    awards,
    genres,
  } = req.body;

  // Check if author name already exists
  const existingAuthor = await Author.findOne({ 
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    isActive: true,
  });

  if (existingAuthor) {
    return next(createErrorResponse('RESOURCE_ALREADY_EXISTS', 'Author with this name already exists'));
  }

  const authorData = {
    name,
    biography,
    birthDate,
    deathDate,
    nationality,
    website,
    imageUrl,
    awards,
    genres,
  };

  const author = await Author.create(authorData);
  await author.populate('genres', 'name color');

  res.status(201).json({
    success: true,
    message: 'Author created successfully',
    data: {
      author,
    },
  });
});

// @desc    Update author
// @route   PUT /api/authors/:id
// @access  Private (Admin/Librarian)
const updateAuthor = asyncHandler(async (req, res, next) => {
  const author = await Author.findById(req.params.id);

  if (!author || !author.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Author not found'));
  }

  const {
    name,
    biography,
    birthDate,
    deathDate,
    nationality,
    website,
    imageUrl,
    awards,
    genres,
  } = req.body;

  // Check name uniqueness if changed
  if (name && name !== author.name) {
    const existingAuthor = await Author.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true,
      _id: { $ne: author._id },
    });

    if (existingAuthor) {
      return next(createErrorResponse('RESOURCE_ALREADY_EXISTS', 'Author with this name already exists'));
    }
  }

  // Update fields
  const updateFields = {
    name,
    biography,
    birthDate,
    deathDate,
    nationality,
    website,
    imageUrl,
    awards,
    genres,
  };

  Object.keys(updateFields).forEach(key => {
    if (updateFields[key] !== undefined) {
      author[key] = updateFields[key];
    }
  });

  await author.save();
  await author.populate('genres', 'name color');

  res.status(200).json({
    success: true,
    message: 'Author updated successfully',
    data: {
      author,
    },
  });
});

// @desc    Delete author
// @route   DELETE /api/authors/:id
// @access  Private (Admin)
const deleteAuthor = asyncHandler(async (req, res, next) => {
  const author = await Author.findById(req.params.id);

  if (!author || !author.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Author not found'));
  }

  // Check if author has books
  const booksCount = await Book.countDocuments({ authors: author._id, isActive: true });
  if (booksCount > 0) {
    return next(new AppError(`Cannot delete author with ${booksCount} books. Please reassign books to another author first.`, 400));
  }

  // Soft delete - mark as inactive
  author.isActive = false;
  await author.save();

  res.status(200).json({
    success: true,
    message: 'Author deleted successfully',
  });
});

// @desc    Get author statistics
// @route   GET /api/authors/stats
// @access  Private (Admin/Librarian)
const getAuthorStats = asyncHandler(async (req, res, next) => {
  const stats = await Author.getStatistics();

  res.status(200).json({
    success: true,
    data: {
      stats,
    },
  });
});

// @desc    Add award to author
// @route   POST /api/authors/:id/awards
// @access  Private (Admin/Librarian)
const addAward = asyncHandler(async (req, res, next) => {
  const { name, year, description } = req.body;

  const author = await Author.findById(req.params.id);

  if (!author || !author.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Author not found'));
  }

  const award = { name, year, description };
  await author.addAward(award);

  res.status(201).json({
    success: true,
    message: 'Award added successfully',
    data: {
      author,
    },
  });
});

// @desc    Remove award from author
// @route   DELETE /api/authors/:id/awards/:awardId
// @access  Private (Admin/Librarian)
const removeAward = asyncHandler(async (req, res, next) => {
  const { awardId } = req.params;

  const author = await Author.findById(req.params.id);

  if (!author || !author.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Author not found'));
  }

  const award = author.awards.id(awardId);
  if (!award) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Award not found'));
  }

  await author.removeAward(awardId);

  res.status(200).json({
    success: true,
    message: 'Award removed successfully',
    data: {
      author,
    },
  });
});

// @desc    Get authors by nationality
// @route   GET /api/authors/nationality/:nationality
// @access  Public
const getAuthorsByNationality = asyncHandler(async (req, res, next) => {
  const { nationality } = req.params;
  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'name',
    sortOrder = 'asc',
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    sortBy,
    sortOrder,
    nationality,
    isActive: true,
  };

  const authors = await Author.searchAuthors('', options);
  const total = await Author.countDocuments({ nationality, isActive: true });

  res.status(200).json({
    success: true,
    data: {
      authors,
      nationality,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    },
  });
});

// @desc    Get authors with book counts
// @route   GET /api/authors/with-counts
// @access  Public
const getAuthorsWithCounts = asyncHandler(async (req, res, next) => {
  const authors = await Author.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: 'authors',
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
        biography: 1,
        birthDate: 1,
        deathDate: 1,
        nationality: 1,
        imageUrl: 1,
        booksCount: 1,
      },
    },
    { $sort: { name: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      authors,
    },
  });
});

// @desc    Get popular authors (by book borrowing count)
// @route   GET /api/authors/popular
// @access  Public
const getPopularAuthors = asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const popularAuthors = await Author.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: 'authors',
        as: 'books',
      },
    },
    { $unwind: '$books' },
    {
      $lookup: {
        from: 'transactions',
        localField: 'books._id',
        foreignField: 'bookId',
        as: 'transactions',
      },
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        biography: { $first: '$biography' },
        nationality: { $first: '$nationality' },
        imageUrl: { $first: '$imageUrl' },
        booksCount: { $sum: 1 },
        borrowCount: { $sum: { $size: '$transactions' } },
      },
    },
    { $sort: { borrowCount: -1, booksCount: -1 } },
    { $limit: parseInt(limit) },
  ]);

  res.status(200).json({
    success: true,
    data: {
      authors: popularAuthors,
    },
  });
});

module.exports = {
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
};
