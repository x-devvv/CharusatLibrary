const mongoose = require('mongoose');
const config = require('../config/config');

const transactionSchema = new mongoose.Schema({
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
  borrowDate: {
    type: Date,
    required: [true, 'Borrow date is required'],
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  returnDate: {
    type: Date,
    default: null,
  },
  actualReturnDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: [
      config.TRANSACTION_STATUS.BORROWED,
      config.TRANSACTION_STATUS.RETURNED,
      config.TRANSACTION_STATUS.OVERDUE,
    ],
    default: config.TRANSACTION_STATUS.BORROWED,
  },
  fineAmount: {
    type: Number,
    min: [0, 'Fine amount cannot be negative'],
    default: 0,
  },
  finePaid: {
    type: Boolean,
    default: false,
  },
  finePaymentDate: {
    type: Date,
    default: null,
  },
  renewalCount: {
    type: Number,
    min: [0, 'Renewal count cannot be negative'],
    max: [config.MAX_RENEWAL_COUNT, `Maximum ${config.MAX_RENEWAL_COUNT} renewals allowed`],
    default: 0,
  },
  renewalHistory: [{
    renewalDate: {
      type: Date,
      required: true,
    },
    previousDueDate: {
      type: Date,
      required: true,
    },
    newDueDate: {
      type: Date,
      required: true,
    },
    renewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for days overdue
transactionSchema.virtual('daysOverdue').get(function() {
  if (this.status !== config.TRANSACTION_STATUS.OVERDUE && !this.returnDate) {
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    if (today > dueDate) {
      return Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
    }
  }
  
  if (this.returnDate && this.returnDate > this.dueDate) {
    return Math.ceil((this.returnDate - this.dueDate) / (1000 * 60 * 60 * 24));
  }
  
  return 0;
});

// Virtual for days borrowed
transactionSchema.virtual('daysBorrowed').get(function() {
  const endDate = this.returnDate || new Date();
  return Math.ceil((endDate - this.borrowDate) / (1000 * 60 * 60 * 24));
});

// Virtual for can renew
transactionSchema.virtual('canRenew').get(function() {
  return this.status === config.TRANSACTION_STATUS.BORROWED && 
         this.renewalCount < config.MAX_RENEWAL_COUNT &&
         this.fineAmount === 0;
});

// Virtual for is overdue
transactionSchema.virtual('isOverdue').get(function() {
  if (this.returnDate) return false;
  return new Date() > new Date(this.dueDate);
});

// Pre-save middleware to set due date
transactionSchema.pre('save', function(next) {
  if (this.isNew && !this.dueDate) {
    const dueDate = new Date(this.borrowDate);
    dueDate.setDate(dueDate.getDate() + config.LOAN_PERIOD_DAYS);
    this.dueDate = dueDate;
  }
  next();
});

// Pre-save middleware to update status based on dates
transactionSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.returnDate) {
    this.status = config.TRANSACTION_STATUS.RETURNED;
    this.actualReturnDate = this.returnDate;
  } else if (now > this.dueDate) {
    this.status = config.TRANSACTION_STATUS.OVERDUE;
  } else {
    this.status = config.TRANSACTION_STATUS.BORROWED;
  }
  
  next();
});

// Pre-save middleware to calculate fine
transactionSchema.pre('save', function(next) {
  if (this.daysOverdue > 0 && !this.finePaid) {
    this.fineAmount = this.daysOverdue * config.FINE_PER_DAY;
  }
  next();
});

// Static method to find overdue transactions
transactionSchema.statics.findOverdue = function() {
  const today = new Date();
  return this.find({
    status: { $in: [config.TRANSACTION_STATUS.BORROWED, config.TRANSACTION_STATUS.OVERDUE] },
    dueDate: { $lt: today },
    returnDate: null,
  })
  .populate('userId', 'name email phone')
  .populate('bookId', 'title isbn')
  .sort({ dueDate: 1 });
};

// Static method to get transaction statistics
transactionSchema.statics.getStatistics = async function(startDate, endDate) {
  const matchQuery = {};
  
  if (startDate && endDate) {
    matchQuery.borrowDate = {
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
        totalFines: { $sum: '$fineAmount' },
        paidFines: {
          $sum: {
            $cond: [{ $eq: ['$finePaid', true] }, '$fineAmount', 0],
          },
        },
      },
    },
  ]);

  const totalTransactions = await this.countDocuments(matchQuery);
  const overdueTransactions = await this.countDocuments({
    ...matchQuery,
    status: config.TRANSACTION_STATUS.OVERDUE,
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
        borrowCount: '$count',
      },
    },
  ]);

  return {
    total: totalTransactions,
    overdue: overdueTransactions,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalFines: stat.totalFines,
        paidFines: stat.paidFines,
      };
      return acc;
    }, {}),
    popularBooks,
  };
};

// Static method to get user borrowing history
transactionSchema.statics.getUserHistory = function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'borrowDate',
    sortOrder = 'desc',
  } = options;

  const query = { userId };
  if (status) query.status = status;

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(query)
    .populate('bookId', 'title isbn coverImage authors')
    .populate({
      path: 'bookId',
      populate: {
        path: 'authors',
        select: 'name',
      },
    })
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Instance method to renew transaction
transactionSchema.methods.renew = function(renewedBy) {
  if (!this.canRenew) {
    throw new Error('Transaction cannot be renewed');
  }

  const previousDueDate = new Date(this.dueDate);
  const newDueDate = new Date(this.dueDate);
  newDueDate.setDate(newDueDate.getDate() + config.LOAN_PERIOD_DAYS);

  this.renewalHistory.push({
    renewalDate: new Date(),
    previousDueDate,
    newDueDate,
    renewedBy,
  });

  this.dueDate = newDueDate;
  this.renewalCount += 1;

  return this.save();
};

// Instance method to return book
transactionSchema.methods.returnBook = function(returnedBy) {
  if (this.status === config.TRANSACTION_STATUS.RETURNED) {
    throw new Error('Book is already returned');
  }

  this.returnDate = new Date();
  this.returnedBy = returnedBy;
  this.status = config.TRANSACTION_STATUS.RETURNED;

  return this.save();
};

// Instance method to pay fine
transactionSchema.methods.payFine = function(paymentAmount) {
  if (paymentAmount < this.fineAmount) {
    throw new Error('Payment amount is less than fine amount');
  }

  this.finePaid = true;
  this.finePaymentDate = new Date();

  return this.save();
};

// Indexes for better query performance
transactionSchema.index({ userId: 1 });
transactionSchema.index({ bookId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ dueDate: 1 });
transactionSchema.index({ borrowDate: -1 });
transactionSchema.index({ returnDate: 1 });
transactionSchema.index({ finePaid: 1 });

// Compound indexes
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ bookId: 1, status: 1 });
transactionSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
