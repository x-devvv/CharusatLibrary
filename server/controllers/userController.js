const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError, createErrorResponse } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin/Librarian)
const getUsers = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    sortBy = 'name',
    sortOrder = 'asc',
    role,
    status,
    search,
  } = req.query;

  const query = {};
  
  // Filter by role
  if (role && Object.values(config.USER_ROLES).includes(role)) {
    query.role = role;
  }
  
  // Filter by status
  if (status && Object.values(config.USER_STATUS).includes(status)) {
    query.status = status;
  }
  
  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const users = await User.find(query)
    .select('-password -refreshTokens -passwordResetToken -emailVerificationToken')
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .populate('activeBorrowings');

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin/Librarian or Own Profile)
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password -refreshTokens -passwordResetToken -emailVerificationToken')
    .populate('activeBorrowings');

  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  // Check if user can access this profile
  const isOwnProfile = req.user._id.toString() === user._id.toString();
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnProfile && !isStaff) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin)
const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, phone, address, status } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return next(createErrorResponse('RESOURCE_ALREADY_EXISTS', 'User with this email already exists'));
  }

  const userData = {
    name,
    email,
    password,
    role: role || config.USER_ROLES.MEMBER,
    phone,
    address,
    status: status || config.USER_STATUS.ACTIVE,
    emailVerified: true, // Admin created users are pre-verified
  };

  const user = await User.create(userData);

  // Remove sensitive data from response
  user.password = undefined;

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user,
    },
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or Own Profile)
const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  // Check permissions
  const isOwnProfile = req.user._id.toString() === user._id.toString();
  const isAdmin = req.user.role === config.USER_ROLES.ADMIN;

  if (!isOwnProfile && !isAdmin) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  const { name, phone, address, role, status } = req.body;

  // Only admin can change role and status
  const allowedFields = ['name', 'phone', 'address'];
  if (isAdmin) {
    allowedFields.push('role', 'status');
  }

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key) && req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  });

  // Validate role if being updated
  if (updates.role && !Object.values(config.USER_ROLES).includes(updates.role)) {
    return next(new AppError('Invalid role', 400));
  }

  // Validate status if being updated
  if (updates.status && !Object.values(config.USER_STATUS).includes(updates.status)) {
    return next(new AppError('Invalid status', 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    {
      new: true,
      runValidators: true,
    }
  ).select('-password -refreshTokens -passwordResetToken -emailVerificationToken');

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: updatedUser,
    },
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  // Check if user has active transactions
  const activeTransactions = await Transaction.countDocuments({
    userId: user._id,
    status: { $in: [config.TRANSACTION_STATUS.BORROWED, config.TRANSACTION_STATUS.OVERDUE] },
  });

  if (activeTransactions > 0) {
    return next(new AppError('Cannot delete user with active transactions', 400));
  }

  // Check if user has unpaid fines
  const unpaidFines = await Transaction.countDocuments({
    userId: user._id,
    fineAmount: { $gt: 0 },
    finePaid: false,
  });

  if (unpaidFines > 0) {
    return next(new AppError('Cannot delete user with unpaid fines', 400));
  }

  // Cancel any pending reservations
  await Reservation.updateMany(
    { userId: user._id, status: config.RESERVATION_STATUS.PENDING },
    { 
      status: config.RESERVATION_STATUS.CANCELLED,
      cancelReason: 'User account deleted',
      cancelledDate: new Date(),
    }
  );

  // Soft delete - deactivate user
  user.status = config.USER_STATUS.INACTIVE;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

// @desc    Get user borrowing history
// @route   GET /api/users/:id/history
// @access  Private (Admin/Librarian or Own Profile)
const getUserHistory = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  // Check permissions
  const isOwnProfile = req.user._id.toString() === userId;
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnProfile && !isStaff) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  const {
    page = 1,
    limit = config.DEFAULT_PAGE_SIZE,
    status,
    sortBy = 'borrowDate',
    sortOrder = 'desc',
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
    status,
    sortBy,
    sortOrder,
  };

  const transactions = await Transaction.getUserHistory(userId, options);
  const total = await Transaction.countDocuments({ 
    userId,
    ...(status && { status }),
  });

  res.status(200).json({
    success: true,
    data: {
      transactions,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    },
  });
});

// @desc    Get user reservations
// @route   GET /api/users/:id/reservations
// @access  Private (Admin/Librarian or Own Profile)
const getUserReservations = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  // Check permissions
  const isOwnProfile = req.user._id.toString() === userId;
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwnProfile && !isStaff) {
    return next(createErrorResponse('ACCESS_DENIED'));
  }

  const reservations = await Reservation.findUserActiveReservations(userId);

  res.status(200).json({
    success: true,
    data: {
      reservations,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    },
  });
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (Admin/Librarian)
const getUserStats = asyncHandler(async (req, res, next) => {
  const stats = await User.getStatistics();

  res.status(200).json({
    success: true,
    data: {
      stats,
    },
  });
});

// @desc    Update user status
// @route   PATCH /api/users/:id/status
// @access  Private (Admin)
const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  
  if (!Object.values(config.USER_STATUS).includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  user.status = status;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User status updated successfully',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    },
  });
});

// @desc    Get users with overdue books
// @route   GET /api/users/overdue
// @access  Private (Admin/Librarian)
const getUsersWithOverdueBooks = asyncHandler(async (req, res, next) => {
  const overdueTransactions = await Transaction.find({
    status: config.TRANSACTION_STATUS.OVERDUE,
    returnDate: null,
  })
  .populate('userId', 'name email phone')
  .populate('bookId', 'title isbn')
  .sort({ dueDate: 1 });

  // Group by user
  const usersWithOverdue = {};
  overdueTransactions.forEach(transaction => {
    const userId = transaction.userId._id.toString();
    if (!usersWithOverdue[userId]) {
      usersWithOverdue[userId] = {
        user: transaction.userId,
        overdueBooks: [],
        totalFine: 0,
      };
    }
    usersWithOverdue[userId].overdueBooks.push({
      book: transaction.bookId,
      dueDate: transaction.dueDate,
      daysOverdue: transaction.daysOverdue,
      fineAmount: transaction.fineAmount,
    });
    usersWithOverdue[userId].totalFine += transaction.fineAmount;
  });

  const result = Object.values(usersWithOverdue);

  res.status(200).json({
    success: true,
    data: {
      users: result,
      count: result.length,
    },
  });
});

// @desc    Get users with outstanding fines
// @route   GET /api/users/fines
// @access  Private (Admin/Librarian)
const getUsersWithFines = asyncHandler(async (req, res, next) => {
  const usersWithFines = await Transaction.aggregate([
    {
      $match: {
        fineAmount: { $gt: 0 },
        finePaid: false,
      },
    },
    {
      $group: {
        _id: '$userId',
        totalFine: { $sum: '$fineAmount' },
        fineCount: { $sum: 1 },
        transactions: { $push: '$$ROOT' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        user: {
          _id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          phone: '$user.phone',
        },
        totalFine: 1,
        fineCount: 1,
      },
    },
    { $sort: { totalFine: -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      users: usersWithFines,
      count: usersWithFines.length,
    },
  });
});

module.exports = {
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
};
