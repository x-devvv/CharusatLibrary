const mongoose = require('mongoose');
const config = require('../config/config');

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book ID is required'],
  },
  reservationDate: {
    type: Date,
    required: [true, 'Reservation date is required'],
    default: Date.now,
  },
  expiryDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: [
      config.RESERVATION_STATUS.PENDING,
      config.RESERVATION_STATUS.FULFILLED,
      config.RESERVATION_STATUS.EXPIRED,
      config.RESERVATION_STATUS.CANCELLED,
    ],
    default: config.RESERVATION_STATUS.PENDING,
  },
  position: {
    type: Number,
    min: [1, 'Position must be at least 1'],
    required: [true, 'Position in queue is required'],
  },
  notificationSent: {
    type: Boolean,
    default: false,
  },
  notificationDate: {
    type: Date,
    default: null,
  },
  fulfilledDate: {
    type: Date,
    default: null,
  },
  cancelledDate: {
    type: Date,
    default: null,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  cancelReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Cancel reason cannot exceed 200 characters'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for days until expiry
reservationSchema.virtual('daysUntilExpiry').get(function() {
  if (this.status !== config.RESERVATION_STATUS.PENDING) return 0;
  
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
});

// Virtual for is expired
reservationSchema.virtual('isExpired').get(function() {
  return new Date() > new Date(this.expiryDate) && 
         this.status === config.RESERVATION_STATUS.PENDING;
});

// Virtual for can be fulfilled
reservationSchema.virtual('canBeFulfilled').get(function() {
  return this.status === config.RESERVATION_STATUS.PENDING && 
         this.position === 1 && 
         !this.isExpired;
});

// Pre-save middleware to set expiry date
reservationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiryDate) {
    const expiryDate = new Date(this.reservationDate || Date.now());
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days to claim
    this.expiryDate = expiryDate;
  }
  next();
});

// Pre-save middleware to update status based on expiry
reservationSchema.pre('save', function(next) {
  if (this.isExpired && this.status === config.RESERVATION_STATUS.PENDING) {
    this.status = config.RESERVATION_STATUS.EXPIRED;
  }
  next();
});

// Pre-save middleware to set fulfilled date
reservationSchema.pre('save', function(next) {
  if (this.status === config.RESERVATION_STATUS.FULFILLED && !this.fulfilledDate) {
    this.fulfilledDate = new Date();
  }
  next();
});

// Pre-save middleware to set cancelled date
reservationSchema.pre('save', function(next) {
  if (this.status === config.RESERVATION_STATUS.CANCELLED && !this.cancelledDate) {
    this.cancelledDate = new Date();
  }
  next();
});

// Static method to find user's active reservations
reservationSchema.statics.findUserActiveReservations = function(userId) {
  return this.find({
    userId,
    status: config.RESERVATION_STATUS.PENDING,
  })
  .populate('bookId', 'title isbn coverImage authors')
  .populate({
    path: 'bookId',
    populate: {
      path: 'authors',
      select: 'name',
    },
  })
  .sort({ position: 1, reservationDate: 1 });
};

// Static method to find book reservations queue
reservationSchema.statics.findBookQueue = function(bookId) {
  return this.find({
    bookId,
    status: config.RESERVATION_STATUS.PENDING,
  })
  .populate('userId', 'name email phone')
  .sort({ position: 1, reservationDate: 1 });
};

// Static method to get next in queue
reservationSchema.statics.getNextInQueue = function(bookId) {
  return this.findOne({
    bookId,
    status: config.RESERVATION_STATUS.PENDING,
    position: 1,
  })
  .populate('userId', 'name email phone')
  .populate('bookId', 'title isbn');
};

// Static method to create reservation
reservationSchema.statics.createReservation = async function(userId, bookId) {
  // Check if user already has a reservation for this book
  const existingReservation = await this.findOne({
    userId,
    bookId,
    status: config.RESERVATION_STATUS.PENDING,
  });

  if (existingReservation) {
    throw new Error('User already has an active reservation for this book');
  }

  // Get the next position in queue
  const lastPosition = await this.findOne({ bookId })
    .sort({ position: -1 })
    .select('position');

  const position = lastPosition ? lastPosition.position + 1 : 1;

  // Create the reservation
  const reservation = new this({
    userId,
    bookId,
    position,
  });

  return await reservation.save();
};

// Static method to fulfill reservation
reservationSchema.statics.fulfillReservation = async function(reservationId) {
  const reservation = await this.findById(reservationId)
    .populate('bookId')
    .populate('userId');

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  if (!reservation.canBeFulfilled) {
    throw new Error('Reservation cannot be fulfilled');
  }

  // Update reservation status
  reservation.status = config.RESERVATION_STATUS.FULFILLED;
  await reservation.save();

  // Update positions for remaining reservations
  await this.updateMany(
    {
      bookId: reservation.bookId._id,
      status: config.RESERVATION_STATUS.PENDING,
      position: { $gt: reservation.position },
    },
    { $inc: { position: -1 } }
  );

  return reservation;
};

// Static method to cancel reservation
reservationSchema.statics.cancelReservation = async function(reservationId, cancelledBy, reason) {
  const reservation = await this.findById(reservationId);

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  if (reservation.status !== config.RESERVATION_STATUS.PENDING) {
    throw new Error('Only pending reservations can be cancelled');
  }

  const originalPosition = reservation.position;

  // Update reservation
  reservation.status = config.RESERVATION_STATUS.CANCELLED;
  reservation.cancelledBy = cancelledBy;
  reservation.cancelReason = reason;
  await reservation.save();

  // Update positions for remaining reservations
  await this.updateMany(
    {
      bookId: reservation.bookId,
      status: config.RESERVATION_STATUS.PENDING,
      position: { $gt: originalPosition },
    },
    { $inc: { position: -1 } }
  );

  return reservation;
};

// Static method to expire old reservations
reservationSchema.statics.expireOldReservations = async function() {
  const expiredReservations = await this.find({
    status: config.RESERVATION_STATUS.PENDING,
    expiryDate: { $lt: new Date() },
  });

  for (const reservation of expiredReservations) {
    reservation.status = config.RESERVATION_STATUS.EXPIRED;
    reservation.cancelReason = 'Automatically expired';
    await reservation.save();
  }

  return expiredReservations.length;
};

// Static method to get reservation statistics
reservationSchema.statics.getStatistics = async function(startDate, endDate) {
  const matchQuery = {};
  
  if (startDate && endDate) {
    matchQuery.reservationDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgPosition: { $avg: '$position' },
      },
    },
  ]);

  const totalReservations = await this.countDocuments(matchQuery);
  const activeReservations = await this.countDocuments({
    ...matchQuery,
    status: config.RESERVATION_STATUS.PENDING,
  });

  const popularBooks = await this.aggregate([
    { $match: matchQuery },
    { $group: { _id: '$bookId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: '_id',
        as: 'book',
      },
    },
    { $unwind: '$book' },
    {
      $project: {
        title: '$book.title',
        isbn: '$book.isbn',
        reservationCount: '$count',
      },
    },
  ]);

  return {
    total: totalReservations,
    active: activeReservations,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        avgPosition: Math.round(stat.avgPosition * 100) / 100,
      };
      return acc;
    }, {}),
    popularBooks,
  };
};

// Instance method to notify user
reservationSchema.methods.notifyUser = function() {
  this.notificationSent = true;
  this.notificationDate = new Date();
  return this.save();
};

// Instance method to update position
reservationSchema.methods.updatePosition = function(newPosition) {
  this.position = newPosition;
  return this.save();
};

// Indexes for better query performance
reservationSchema.index({ userId: 1 });
reservationSchema.index({ bookId: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ position: 1 });
reservationSchema.index({ expiryDate: 1 });
reservationSchema.index({ reservationDate: -1 });

// Compound indexes
reservationSchema.index({ userId: 1, status: 1 });
reservationSchema.index({ bookId: 1, status: 1 });
reservationSchema.index({ bookId: 1, position: 1 });
reservationSchema.index({ status: 1, expiryDate: 1 });

// Unique compound index to prevent duplicate active reservations
reservationSchema.index(
  { userId: 1, bookId: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      status: config.RESERVATION_STATUS.PENDING 
    }
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);
