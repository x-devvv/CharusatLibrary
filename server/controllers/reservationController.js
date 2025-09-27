const Reservation = require('../models/Reservation');
const Book = require('../models/Book');
const User = require('../models/User');
const { asyncHandler, AppError, createErrorResponse } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Get all reservations
// @route   GET /api/reservations
// @access  Private (Admin/Librarian)
const getReservations = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'reservationDate',
    sortOrder = 'desc',
    status,
    userId,
    bookId,
  } = req.query;

  const query = {};
  
  // Filter by status
  if (status && Object.values(config.RESERVATION_STATUS).includes(status)) {
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

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const reservations = await Reservation.find(query)
    .populate('userId', 'name email phone')
    .populate('bookId', 'title isbn authors')
    .populate({
      path: 'bookId',
      populate: {
        path: 'authors',
        select: 'name',
      },
    })
    .populate('cancelledBy', 'name')
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Reservation.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      reservations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// @desc    Get single reservation
// @route   GET /api/reservations/:id
// @access  Private (Admin/Librarian or Own Reservation)
const getReservation = asyncHandler(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id)
    .populate('userId', 'name email phone')
    .populate('bookId', 'title isbn authors')
    .populate({
      path: 'bookId',
      populate: {
        path: 'authors',
        select: 'name',
      },
    })
    .populate('cancelledBy', 'name');

  if (!reservation) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Reservation not found'));
  }

  // Check permissions
  const isOwnReservation = req.user._id.toString() === reservation.userId._id.toString();
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnReservation && !isStaff) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  res.status(200).json({
    success: true,
    data: {
      reservation,
    },
  });
});

// @desc    Create new reservation
// @route   POST /api/reservations
// @access  Private
const createReservation = asyncHandler(async (req, res, next) => {
  const { userId, bookId } = req.body;

  // Validate user exists and is active
  const user = await User.findById(userId);
  if (!user || user.status !== config.USER_STATUS.ACTIVE) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found or inactive'));
  }

  // Check if user can make reservation (only for themselves or staff can make for others)
  const canReserve = req.user._id.toString() === userId || 
                    [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);
  
  if (!canReserve) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  // Validate book exists and is active
  const book = await Book.findById(bookId);
  if (!book || !book.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Book not found'));
  }

  // Check if book is available (if available, user should borrow directly)
  if (book.isAvailable) {
    return next(new AppError('Book is currently available. Please borrow it directly instead of making a reservation.', 400));
  }

  try {
    // Create reservation using static method
    const reservation = await Reservation.createReservation(userId, bookId);
    
    // Populate for response
    await reservation.populate('userId', 'name email');
    await reservation.populate('bookId', 'title isbn authors');

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: {
        reservation,
      },
    });
  } catch (error) {
    if (error.message.includes('already has an active reservation')) {
      return next(createErrorResponse('RESERVATION_EXISTS'));
    }
    throw error;
  }
});

// @desc    Update reservation
// @route   PUT /api/reservations/:id
// @access  Private (Admin/Librarian)
const updateReservation = asyncHandler(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Reservation not found'));
  }

  const { status, notes } = req.body;
  const allowedFields = ['status', 'notes'];
  const updates = {};

  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key) && req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  });

  // Validate status if being updated
  if (updates.status && !Object.values(config.RESERVATION_STATUS).includes(updates.status)) {
    return next(new AppError('Invalid reservation status', 400));
  }

  const updatedReservation = await Reservation.findByIdAndUpdate(
    req.params.id,
    updates,
    {
      new: true,
      runValidators: true,
    }
  )
  .populate('userId', 'name email')
  .populate('bookId', 'title isbn authors')
  .populate('cancelledBy', 'name');

  res.status(200).json({
    success: true,
    message: 'Reservation updated successfully',
    data: {
      reservation: updatedReservation,
    },
  });
});

// @desc    Cancel reservation
// @route   DELETE /api/reservations/:id
// @access  Private (Admin/Librarian or Own Reservation)
const cancelReservation = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  
  const reservation = await Reservation.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('bookId', 'title isbn');

  if (!reservation) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Reservation not found'));
  }

  // Check permissions
  const isOwnReservation = req.user._id.toString() === reservation.userId._id.toString();
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnReservation && !isStaff) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  if (reservation.status !== config.RESERVATION_STATUS.PENDING) {
    return next(new AppError('Only pending reservations can be cancelled', 400));
  }

  try {
    const cancelledReservation = await Reservation.cancelReservation(
      req.params.id,
      req.user._id,
      reason || 'Cancelled by user'
    );

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: {
        reservation: cancelledReservation,
      },
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

// @desc    Get book reservation queue
// @route   GET /api/reservations/book/:bookId/queue
// @access  Private (Admin/Librarian)
const getBookQueue = asyncHandler(async (req, res, next) => {
  const { bookId } = req.params;

  // Validate book exists
  const book = await Book.findById(bookId);
  if (!book || !book.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Book not found'));
  }

  const queue = await Reservation.findBookQueue(bookId);

  res.status(200).json({
    success: true,
    data: {
      book: {
        _id: book._id,
        title: book.title,
        isbn: book.isbn,
        availableCopies: book.availableCopies,
      },
      queue,
      queueLength: queue.length,
    },
  });
});

// @desc    Get user's reservations
// @route   GET /api/reservations/user/:userId
// @access  Private (Admin/Librarian or Own Reservations)
const getUserReservations = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  // Check permissions
  const isOwnReservations = req.user._id.toString() === userId;
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnReservations && !isStaff) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  const reservations = await Reservation.findUserActiveReservations(userId);

  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      reservations,
      count: reservations.length,
    },
  });
});

// @desc    Fulfill reservation (when book becomes available)
// @route   PUT /api/reservations/:id/fulfill
// @access  Private (Admin/Librarian)
const fulfillReservation = asyncHandler(async (req, res, next) => {
  try {
    const reservation = await Reservation.fulfillReservation(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Reservation fulfilled successfully',
      data: {
        reservation,
      },
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

// @desc    Get reservation statistics
// @route   GET /api/reservations/stats
// @access  Private (Admin/Librarian)
const getReservationStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const stats = await Reservation.getStatistics(startDate, endDate);

  res.status(200).json({
    success: true,
    data: {
      stats,
    },
  });
});

// @desc    Expire old reservations
// @route   POST /api/reservations/expire
// @access  Private (Admin/Librarian)
const expireOldReservations = asyncHandler(async (req, res, next) => {
  const expiredCount = await Reservation.expireOldReservations();

  res.status(200).json({
    success: true,
    message: `${expiredCount} reservations expired successfully`,
    data: {
      expiredCount,
    },
  });
});

// @desc    Get next in queue for a book
// @route   GET /api/reservations/book/:bookId/next
// @access  Private (Admin/Librarian)
const getNextInQueue = asyncHandler(async (req, res, next) => {
  const { bookId } = req.params;

  // Validate book exists
  const book = await Book.findById(bookId);
  if (!book || !book.isActive) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Book not found'));
  }

  const nextReservation = await Reservation.getNextInQueue(bookId);

  res.status(200).json({
    success: true,
    data: {
      book: {
        _id: book._id,
        title: book.title,
        isbn: book.isbn,
      },
      nextReservation,
    },
  });
});

// @desc    Notify user about reservation
// @route   PUT /api/reservations/:id/notify
// @access  Private (Admin/Librarian)
const notifyUser = asyncHandler(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('bookId', 'title isbn');

  if (!reservation) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'Reservation not found'));
  }

  if (reservation.status !== config.RESERVATION_STATUS.PENDING) {
    return next(new AppError('Can only notify for pending reservations', 400));
  }

  await reservation.notifyUser();

  // Here you would typically send an email or push notification
  console.log(`Notification sent to ${reservation.userId.email} about book ${reservation.bookId.title}`);

  res.status(200).json({
    success: true,
    message: 'User notified successfully',
    data: {
      reservation,
    },
  });
});

module.exports = {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  getBookQueue,
  getUserReservations,
  fulfillReservation,
  getReservationStats,
  expireOldReservations,
  getNextInQueue,
  notifyUser,
};
