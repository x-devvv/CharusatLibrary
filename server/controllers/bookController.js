const Book = require('../models/Book');
const Author = require('../models/Author');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError, createErrorResponse } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Get all books
// @route   GET /api/books
// @access  Public
const getBooks = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'title',
    sortOrder = 'asc',
    genre,
    author,
    availability,
    language,
    minRating,
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    sortBy,
    sortOrder,
    genre,
    author,
    availability,
    language,
    minRating: minRating ? parseFloat(minRating) : undefined,
  };

  const books = await Book.searchBooks('', options);
  const total = await Book.countDocuments({ isActive: true });

  res.status(200).json({
    success: true,
    data: {
      books,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    },
  });
});

// @desc    Search books
// @route   GET /api/books/search
// @access  Public
const searchBooks = asyncHandler(async (req, res, next) => {
  const {
    q: query = '',
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'title',
    sortOrder = 'asc',
    genre,
    author,
    availability,
    language,
    minRating,
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    sortBy,
    sortOrder,
    genre,
    author,
    availability,
    language,
    minRating: minRating ? parseFloat(minRating) : undefined,
  };

  const books = await Book.searchBooks(query, options);
  
  // Get total count for pagination
  const searchQuery = { isActive: true };
  if (query) {
    searchQuery.$or = [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { isbn: { $regex: query, $options: 'i' } },
      { publisher: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ];
  }
  if (genre) searchQuery.genre = genre;
  if (author) searchQuery.authors = { $in: [author] };
  if (availability === 'available') searchQuery.availableCopies = { $gt: 0 };
  if (availability === 'unavailable') searchQuery.availableCopies = 0;
  if (language) searchQuery.language = language;
  if (minRating) searchQuery['rating.average'] = { $gte: minRating };

  const total = await Book.countDocuments(searchQuery);

  res.status(200).json({
    success: true,
    data: {
      books,
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

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
const getBook = asyncHandler(async (req, res, next) => {
  const book = await Book.findById(req.params.id)
    .populate('authors', 'name biography nationality')
    .populate('genre', 'name description color')
    .populate('reviews.userId', 'name')
    .populate('currentBorrowings', 'userId borrowDate dueDate')
    .populate('reservations', 'userId reservationDate position');

  if (!book || !book.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Book not found'));
  }

  res.status(200).json({
    success: true,
    data: {
      book,
    },
  });
});

// @desc    Create new book
// @route   POST /api/books
// @access  Private (Admin/Librarian)
const createBook = asyncHandler(async (req, res, next) => {
  const {
    title,
    authors,
    isbn,
    genre,
    publishDate,
    publisher,
    edition,
    language,
    pages,
    copies,
    description,
    location,
    tags,
    price,
  } = req.body;

  // Validate authors exist
  const validAuthors = await Author.find({ _id: { $in: authors }, isActive: true });
  if (validAuthors.length !== authors.length) {
    return next(new AppError('One or more authors not found', 400));
  }

  // Validate genre exists
  const validGenre = await Category.findById(genre);
  if (!validGenre || !validGenre.isActive) {
    return next(new AppError('Genre not found', 400));
  }

  // Check if ISBN already exists
  if (isbn) {
    const existingBook = await Book.findOne({ isbn, isActive: true });
    if (existingBook) {
      return next(createErrorResponse('RESOURCE_ALREADY_EXISTS', 'Book with this ISBN already exists'));
    }
  }

  const bookData = {
    title,
    authors,
    isbn,
    genre,
    publishDate,
    publisher,
    edition,
    language,
    pages,
    copies,
    availableCopies: copies, // Initially all copies are available
    description,
    location,
    tags,
    price,
  };

  const book = await Book.create(bookData);
  await book.populate('authors', 'name');
  await book.populate('genre', 'name color');

  res.status(201).json({
    success: true,
    message: 'Book created successfully',
    data: {
      book,
    },
  });
});

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private (Admin/Librarian)
const updateBook = asyncHandler(async (req, res, next) => {
  const book = await Book.findById(req.params.id);

  if (!book || !book.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Book not found'));
  }

  const {
    title,
    authors,
    isbn,
    genre,
    publishDate,
    publisher,
    edition,
    language,
    pages,
    copies,
    description,
    location,
    tags,
    price,
  } = req.body;

  // Validate authors if provided
  if (authors) {
    const validAuthors = await Author.find({ _id: { $in: authors }, isActive: true });
    if (validAuthors.length !== authors.length) {
      return next(new AppError('One or more authors not found', 400));
    }
  }

  // Validate genre if provided
  if (genre) {
    const validGenre = await Category.findById(genre);
    if (!validGenre || !validGenre.isActive) {
      return next(new AppError('Genre not found', 400));
    }
  }

  // Check ISBN uniqueness if changed
  if (isbn && isbn !== book.isbn) {
    const existingBook = await Book.findOne({ isbn, isActive: true, _id: { $ne: book._id } });
    if (existingBook) {
      return next(createErrorResponse('RESOURCE_ALREADY_EXISTS', 'Book with this ISBN already exists'));
    }
  }

  // Handle copies update carefully
  if (copies !== undefined) {
    const borrowedCopies = book.copies - book.availableCopies;
    if (copies < borrowedCopies) {
      return next(new AppError(`Cannot reduce copies below ${borrowedCopies} (currently borrowed)`, 400));
    }
    book.availableCopies = copies - borrowedCopies;
  }

  // Update fields
  const updateFields = {
    title,
    authors,
    isbn,
    genre,
    publishDate,
    publisher,
    edition,
    language,
    pages,
    copies,
    description,
    location,
    tags,
    price,
  };

  Object.keys(updateFields).forEach(key => {
    if (updateFields[key] !== undefined) {
      book[key] = updateFields[key];
    }
  });

  await book.save();
  await book.populate('authors', 'name');
  await book.populate('genre', 'name color');

  res.status(200).json({
    success: true,
    message: 'Book updated successfully',
    data: {
      book,
    },
  });
});

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Private (Admin)
const deleteBook = asyncHandler(async (req, res, next) => {
  const book = await Book.findById(req.params.id);

  if (!book || !book.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Book not found'));
  }

  // Check if book has active transactions
  const activeTransactions = await Transaction.countDocuments({
    bookId: book._id,
    status: { $in: [config.TRANSACTION_STATUS.BORROWED, config.TRANSACTION_STATUS.OVERDUE] },
  });

  if (activeTransactions > 0) {
    return next(new AppError('Cannot delete book with active transactions', 400));
  }

  // Soft delete - mark as inactive
  book.isActive = false;
  await book.save();

  // Cancel any pending reservations
  await Reservation.updateMany(
    { bookId: book._id, status: config.RESERVATION_STATUS.PENDING },
    { 
      status: config.RESERVATION_STATUS.CANCELLED,
      cancelReason: 'Book deleted from system',
      cancelledDate: new Date(),
    }
  );

  res.status(200).json({
    success: true,
    message: 'Book deleted successfully',
  });
});

// @desc    Get popular books
// @route   GET /api/books/popular
// @access  Public
const getPopularBooks = asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;
  
  const popularBooks = await Book.getPopularBooks(parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      books: popularBooks,
    },
  });
});

// @desc    Add book review
// @route   POST /api/books/:id/reviews
// @access  Private
const addReview = asyncHandler(async (req, res, next) => {
  const { rating, comment } = req.body;
  const bookId = req.params.id;
  const userId = req.user._id;

  const book = await Book.findById(bookId);

  if (!book || !book.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Book not found'));
  }

  // Check if user has borrowed this book before
  const hasBorrowed = await Transaction.findOne({
    userId,
    bookId,
    status: config.TRANSACTION_STATUS.RETURNED,
  });

  if (!hasBorrowed) {
    return next(new AppError('You can only review books you have borrowed', 400));
  }

  await book.addReview(userId, rating, comment);

  res.status(201).json({
    success: true,
    message: 'Review added successfully',
    data: {
      book: await book.populate('reviews.userId', 'name'),
    },
  });
});

// @desc    Get book statistics
// @route   GET /api/books/stats
// @access  Private (Admin/Librarian)
const getBookStats = asyncHandler(async (req, res, next) => {
  const stats = await Book.getStatistics();

  res.status(200).json({
    success: true,
    data: {
      stats,
    },
  });
});

// @desc    Update book availability
// @route   PATCH /api/books/:id/availability
// @access  Private (Admin/Librarian)
const updateAvailability = asyncHandler(async (req, res, next) => {
  const { availableCopies } = req.body;
  const book = await Book.findById(req.params.id);

  if (!book || !book.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Book not found'));
  }

  if (availableCopies < 0 || availableCopies > book.copies) {
    return next(new AppError('Invalid available copies count', 400));
  }

  book.availableCopies = availableCopies;
  await book.save();

  res.status(200).json({
    success: true,
    message: 'Book availability updated successfully',
    data: {
      book,
    },
  });
});

// @desc    Get books by category
// @route   GET /api/books/category/:categoryId
// @access  Public
const getBooksByCategory = asyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;
  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'title',
    sortOrder = 'asc',
  } = req.query;

  const category = await Category.findById(categoryId);
  if (!category || !category.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Category not found'));
  }

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    sortBy,
    sortOrder,
    genre: categoryId,
  };

  const books = await Book.searchBooks('', options);
  const total = await Book.countDocuments({ genre: categoryId, isActive: true });

  res.status(200).json({
    success: true,
    data: {
      books,
      category,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    },
  });
});

// @desc    Get books by author
// @route   GET /api/books/author/:authorId
// @access  Public
const getBooksByAuthor = asyncHandler(async (req, res, next) => {
  const { authorId } = req.params;
  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'title',
    sortOrder = 'asc',
  } = req.query;

  const author = await Author.findById(authorId);
  if (!author || !author.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Author not found'));
  }

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    sortBy,
    sortOrder,
    author: authorId,
  };

  const books = await Book.searchBooks('', options);
  const total = await Book.countDocuments({ authors: authorId, isActive: true });

  res.status(200).json({
    success: true,
    data: {
      books,
      author,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    },
  });
});

module.exports = {
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
};
