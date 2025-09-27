const Transaction = require('../models/Transaction');
const Book = require('../models/Book');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError, createErrorResponse } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private (Admin/Librarian)
const getTransactions = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'borrowDate',
    sortOrder = 'desc',
    status,
    userId,
    bookId,
    startDate,
    endDate,
  } = req.query;

  const query = {};
  
  // Filter by status
  if (status && Object.values(config.TRANSACTION_STATUS).includes(status)) {
    query.status = status;
  }
  
  // Filter by user
  if (userId) {
    query.userId = userId;
  }
  
  // Filter by book
  if (bookId) {
    query.bookId = bookId;
  }
  
  // Filter by date range
  if (startDate && endDate) {
    query.borrowDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const transactions = await Transaction.find(query)
    .populate('userId', 'name email phone')
    .populate('bookId', 'title isbn authors')
    .populate({
      path: 'bookId',
      populate: {
        path: 'authors',
        select: 'name',
      },
    })
    .populate('issuedBy', 'name')
    .populate('returnedBy', 'name')
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Transaction.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private (Admin/Librarian or Own Transaction)
const getTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.id)
    .populate('userId', 'name email phone')
    .populate('bookId', 'title isbn authors')
    .populate({
      path: 'bookId',
      populate: {
        path: 'authors',
        select: 'name',
      },
    })
    .populate('issuedBy', 'name')
    .populate('returnedBy', 'name');

  if (!transaction) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Transaction not found'));
  }

  // Check permissions
  const isOwnTransaction = req.user._id.toString() === transaction.userId._id.toString();
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnTransaction && !isStaff) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  res.status(200).json({
    success: true,
    data: {
      transaction,
    },
  });
});

// @desc    Borrow a book
// @route   POST /api/transactions/borrow
// @access  Private
const borrowBook = asyncHandler(async (req, res, next) => {
  const { userId, bookId, dueDate } = req.body;

  // Validate user exists and is active
  const user = await User.findById(userId);
  if (!user || user.status !== config.USER_STATUS.ACTIVE) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found or inactive'));
  }

  // Check if user can borrow (only members can borrow, or staff can borrow for members)
  const canBorrow = req.user._id.toString() === userId || 
                   [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);
  
  if (!canBorrow) {
    return next(createErrorResponse('ACCESS_DENIED_TRANSACTION'));
  }

  // Validate book exists and is available
  const book = await Book.findById(bookId);
  if (!book || !book.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Book not found'));
  }

  if (!book.isAvailable) {
    return next(createErrorResponse('BOOK_NOT_AVAILABLE'));
  }

  // Check if user already has this book borrowed
  const existingTransaction = await Transaction.findOne({
    userId,
    bookId,
    status: { $in: [config.TRANSACTION_STATUS.BORROWED, config.TRANSACTION_STATUS.OVERDUE] },
  });

  if (existingTransaction) {
    return next(createErrorResponse('BOOK_ALREADY_BORROWED'));
  }

  // Check if user has outstanding fines
  const unpaidFines = await Transaction.findOne({
    userId,
    fineAmount: { $gt: 0 },
    finePaid: false,
  });

  if (unpaidFines) {
    return next(createErrorResponse('OUTSTANDING_FINES'));
  }

  // Check borrowing limits (e.g., max 5 books per user)
  const activeBorrowings = await Transaction.countDocuments({
    userId,
    status: { $in: [config.TRANSACTION_STATUS.BORROWED, config.TRANSACTION_STATUS.OVERDUE] },
  });

  const maxBorrowLimit = 5; // This could be configurable
  if (activeBorrowings >= maxBorrowLimit) {
    return next(new AppError(`Maximum borrowing limit of ${maxBorrowLimit} books reached`, 400));
  }

  // Create transaction
  const transactionData = {
    userId,
    bookId,
    issuedBy: req.user._id,
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + config.LOAN_PERIOD_DAYS * 24 * 60 * 60 * 1000),
  };

  const transaction = new Transaction(transactionData);
  await transaction.save();

  // Update book availability
  await book.borrowBook();

  // Check if there's a reservation for this book by this user
  const reservation = await Reservation.findOne({
    userId,
    bookId,
    status: config.RESERVATION_STATUS.PENDING,
  });

  if (reservation) {
    await Reservation.fulfillReservation(reservation._id);
  }

  // Populate transaction for response
  await transaction.populate('userId', 'name email');
  await transaction.populate('bookId', 'title isbn authors');
  await transaction.populate('issuedBy', 'name');

  res.status(201).json({
    success: true,
    message: 'Book borrowed successfully',
    data: {
      transaction,
    },
  });
});

// @desc    Return a book
// @route   PUT /api/transactions/:id/return
// @access  Private (Admin/Librarian)
const returnBook = asyncHandler(async (req, res, next) => {
  const { returnDate, notes } = req.body;

  const transaction = await Transaction.findById(req.params.id)
    .populate('bookId')
    .populate('userId', 'name email');

  if (!transaction) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Transaction not found'));
  }

  if (transaction.status === config.TRANSACTION_STATUS.RETURNED) {
    return next(new AppError('Book is already returned', 400));
  }

  // Return the book
  if (returnDate) {
    transaction.returnDate = new Date(returnDate);
  }
  if (notes) {
    transaction.notes = notes;
  }

  // Return the book
  await transaction.returnBook(req.user._id);

  // Update book availability
  await transaction.bookId.returnBook();

  // Check if there are pending reservations for this book
  const nextReservation = await Reservation.getNextInQueue(transaction.bookId._id);
  if (nextReservation) {
    // Notify user about book availability
    console.log(`Notify user ${nextReservation.userId.email} that book ${nextReservation.bookId.title} is available`);
    await nextReservation.notifyUser();
  }

  await transaction.populate('returnedBy', 'name');

  res.status(200).json({
    success: true,
    message: 'Book returned successfully',
    data: {
      transaction,
    },
  });
});

// @desc    Renew a book
// @route   PUT /api/transactions/:id/renew
// @access  Private
const renewBook = asyncHandler(async (req, res, next) => {
  const { newDueDate } = req.body;

  const transaction = await Transaction.findById(req.params.id)
    .populate('bookId')
    .populate('userId', 'name email');

  if (!transaction) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Transaction not found'));
  }

  // Check permissions
  const isOwnTransaction = req.user._id.toString() === transaction.userId._id.toString();
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnTransaction && !isStaff) {
    return next(new AppError('Access denied. Insufficient permissions', 403));
  }

  if (!transaction.canRenew) {
    if (transaction.renewalCount >= config.MAX_RENEWAL_COUNT) {
      return next(createErrorResponse('MAXIMUM_RENEWALS_REACHED'));
    }
    if (transaction.fineAmount > 0) {
      return next(createErrorResponse('OUTSTANDING_FINES'));
    }
    return next(new AppError('Book cannot be renewed', 400));
  }

  // Check if there are pending reservations for this book
  const pendingReservations = await Reservation.countDocuments({
    bookId: transaction.bookId._id,
    status: config.RESERVATION_STATUS.PENDING,
  });

  if (pendingReservations > 0) {
    return next(new AppError('Book cannot be renewed due to pending reservations', 400));
  }

  // Renew the transaction
  await transaction.renew(req.user._id);

  if (newDueDate) {
    transaction.dueDate = new Date(newDueDate);
    await transaction.save();
  }

  res.status(200).json({
    success: true,
    message: 'Book renewed successfully',
    data: {
      transaction,
    },
  });
});

// @desc    Pay fine
// @route   PUT /api/transactions/:id/pay-fine
// @access  Private
const payFine = asyncHandler(async (req, res, next) => {
  const { paymentAmount, paymentMethod = 'cash' } = req.body;

  const transaction = await Transaction.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('bookId', 'title isbn');

  if (!transaction) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Transaction not found'));
  }

  // Check permissions
  const isOwnTransaction = req.user._id.toString() === transaction.userId._id.toString();
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnTransaction && !isStaff) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  if (transaction.fineAmount === 0) {
    return next(new AppError('No fine to pay for this transaction', 400));
  }

  if (transaction.finePaid) {
    return next(new AppError('Fine is already paid', 400));
  }

  if (paymentAmount < transaction.fineAmount) {
    return next(new AppError('Payment amount is less than fine amount', 400));
  }

  await transaction.payFine(paymentAmount);

  res.status(200).json({
    success: true,
    message: 'Fine paid successfully',
    data: {
      transaction,
      paymentAmount,
      paymentMethod,
    },
  });
});

// @desc    Get overdue transactions
// @route   GET /api/transactions/overdue
// @access  Private (Admin/Librarian)
const getOverdueTransactions = asyncHandler(async (req, res, next) => {
  const overdueTransactions = await Transaction.findOverdue();

  res.status(200).json({
    success: true,
    data: {
      transactions: overdueTransactions,
      count: overdueTransactions.length,
    },
  });
});

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private (Admin/Librarian)
const getTransactionStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const stats = await Transaction.getStatistics(startDate, endDate);

  res.status(200).json({
    success: true,
    data: {
      stats,
    },
  });
});

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private (Admin/Librarian)
const updateTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Transaction not found'));
  }

  const allowedFields = ['dueDate', 'notes', 'fineAmount'];
  const updates = {};

  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key) && req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  });

  const updatedTransaction = await Transaction.findByIdAndUpdate(
    req.params.id,
    updates,
    {
      new: true,
      runValidators: true,
    }
  )
  .populate('userId', 'name email')
  .populate('bookId', 'title isbn authors')
  .populate('issuedBy', 'name')
  .populate('returnedBy', 'name');

  res.status(200).json({
    success: true,
    message: 'Transaction updated successfully',
    data: {
      transaction: updatedTransaction,
    },
  });
});

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private (Admin)
const deleteTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Transaction not found'));
  }

  // Only allow deletion of returned transactions
  if (transaction.status !== config.TRANSACTION_STATUS.RETURNED) {
    return next(new AppError('Only returned transactions can be deleted', 400));
  }

  await Transaction.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Transaction deleted successfully',
  });
});

// @desc    Get user's active transactions
// @route   GET /api/transactions/user/:userId/active
// @access  Private (Admin/Librarian or Own Transactions)
const getUserActiveTransactions = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  // Check permissions
  const isOwnTransactions = req.user._id.toString() === userId;
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnTransactions && !isStaff) {
    return next(new AppError('Access denied. Insufficient permissions', 403));
  }

  const activeTransactions = await Transaction.find({
    userId,
    status: { $in: [config.TRANSACTION_STATUS.BORROWED, config.TRANSACTION_STATUS.OVERDUE] },
  })
  .populate('bookId', 'title isbn authors coverImage')
  .populate({
    path: 'bookId',
    populate: {
      path: 'authors',
      select: 'name',
    },
  })
  .sort({ borrowDate: -1 });

  res.status(200).json({
    success: true,
    data: {
      transactions: activeTransactions,
      count: activeTransactions.length,
    },
  });
});

module.exports = {
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
};
