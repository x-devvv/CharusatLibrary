const mongoose = require('mongoose');
const config = require('../config/config');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  authors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Author',
    required: [true, 'At least one author is required'],
  }],
  isbn: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [
      /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/,
      'Please enter a valid ISBN',
    ],
  },
  genre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Book genre is required'],
  },
  publishDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value <= new Date();
      },
      message: 'Publish date cannot be in the future',
    },
  },
  publisher: {
    type: String,
    trim: true,
    maxlength: [100, 'Publisher name cannot exceed 100 characters'],
  },
  edition: {
    type: String,
    trim: true,
    maxlength: [50, 'Edition cannot exceed 50 characters'],
  },
  language: {
    type: String,
    trim: true,
    default: 'English',
    maxlength: [30, 'Language cannot exceed 30 characters'],
  },
  pages: {
    type: Number,
    min: [1, 'Pages must be at least 1'],
    max: [10000, 'Pages cannot exceed 10000'],
  },
  copies: {
    type: Number,
    required: [true, 'Number of copies is required'],
    min: [0, 'Copies cannot be negative'],
    default: 1,
  },
  availableCopies: {
    type: Number,
    min: [0, 'Available copies cannot be negative'],
    default: function() {
      return this.copies || 0;
    },
    validate: {
      validator: function(value) {
        return value <= this.copies;
      },
      message: 'Available copies cannot exceed total copies',
    },
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  coverImage: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: [config.BOOK_STATUS.AVAILABLE, config.BOOK_STATUS.UNAVAILABLE],
    default: config.BOOK_STATUS.AVAILABLE,
  },
  location: {
    shelf: {
      type: String,
      trim: true,
      maxlength: [20, 'Shelf location cannot exceed 20 characters'],
    },
    section: {
      type: String,
      trim: true,
      maxlength: [20, 'Section cannot exceed 20 characters'],
    },
    floor: {
      type: Number,
      min: [0, 'Floor cannot be negative'],
    },
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  rating: {
    average: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
      default: 0,
    },
    count: {
      type: Number,
      min: [0, 'Rating count cannot be negative'],
      default: 0,
    },
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  acquisitionDate: {
    type: Date,
    default: Date.now,
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for availability status
bookSchema.virtual('isAvailable').get(function() {
  return this.availableCopies > 0 && this.status === config.BOOK_STATUS.AVAILABLE;
});

// Virtual for borrowed copies count
bookSchema.virtual('borrowedCopies').get(function() {
  return this.copies - this.availableCopies;
});

// Virtual for author names
bookSchema.virtual('authorNames').get(function() {
  if (this.authors && this.authors.length > 0) {
    return this.authors.map(author => 
      typeof author === 'object' ? author.name : author
    ).join(', ');
  }
  return '';
});

// Virtual for current borrowings
bookSchema.virtual('currentBorrowings', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'bookId',
  match: { status: config.TRANSACTION_STATUS.BORROWED },
});

// Virtual for reservations
bookSchema.virtual('reservations', {
  ref: 'Reservation',
  localField: '_id',
  foreignField: 'bookId',
  match: { status: config.RESERVATION_STATUS.PENDING },
});

// Pre-save middleware to set availableCopies if not provided
bookSchema.pre('save', function(next) {
  if (this.isNew && (this.availableCopies === undefined || this.availableCopies === null)) {
    this.availableCopies = this.copies || 0;
  }
  next();
});

// Pre-save middleware to update availability status
bookSchema.pre('save', function(next) {
  if (this.availableCopies === 0) {
    this.status = config.BOOK_STATUS.UNAVAILABLE;
  } else if (this.status === config.BOOK_STATUS.UNAVAILABLE && this.availableCopies > 0) {
    this.status = config.BOOK_STATUS.AVAILABLE;
  }
  next();
});

// Pre-save middleware to validate available copies
bookSchema.pre('save', function(next) {
  if (this.availableCopies > this.copies) {
    return next(new Error('Available copies cannot exceed total copies'));
  }
  next();
});

// Static method to search books
bookSchema.statics.searchBooks = function(query, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'title',
    sortOrder = 'asc',
    genre,
    author,
    availability,
    language,
    minRating,
  } = options;

  const searchQuery = { isActive: true };

  // Text search
  if (query) {
    searchQuery.$or = [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { isbn: { $regex: query, $options: 'i' } },
      { publisher: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ];
  }

  // Filters
  if (genre) searchQuery.genre = genre;
  if (author) searchQuery.authors = { $in: [author] };
  if (availability === 'available') searchQuery.availableCopies = { $gt: 0 };
  if (availability === 'unavailable') searchQuery.availableCopies = 0;
  if (language) searchQuery.language = language;
  if (minRating) searchQuery['rating.average'] = { $gte: minRating };

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(searchQuery)
    .populate('authors', 'name')
    .populate('genre', 'name color')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to get popular books
bookSchema.statics.getPopularBooks = async function(limit = 10) {
  return await this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'bookId',
        as: 'transactions',
      },
    },
    {
      $addFields: {
        borrowCount: { $size: '$transactions' },
      },
    },
    { $sort: { borrowCount: -1, 'rating.average': -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'authors',
        localField: 'authors',
        foreignField: '_id',
        as: 'authors',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'genre',
        foreignField: '_id',
        as: 'genre',
      },
    },
    { $unwind: '$genre' },
  ]);
};

// Static method to get book statistics
bookSchema.statics.getStatistics = async function() {
  const totalBooks = await this.countDocuments({ isActive: true });
  const availableBooks = await this.countDocuments({ 
    isActive: true, 
    availableCopies: { $gt: 0 } 
  });
  const borrowedBooks = await this.countDocuments({ 
    isActive: true, 
    availableCopies: 0 
  });

  const totalCopies = await this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$copies' } } },
  ]);

  const availableCopies = await this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$availableCopies' } } },
  ]);

  const genreStats = await this.aggregate([
    { $match: { isActive: true } },
    { $lookup: { from: 'categories', localField: 'genre', foreignField: '_id', as: 'genre' } },
    { $unwind: '$genre' },
    { $group: { _id: '$genre.name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return {
    totalBooks,
    availableBooks,
    borrowedBooks,
    totalCopies: totalCopies[0]?.total || 0,
    availableCopies: availableCopies[0]?.total || 0,
    byGenre: genreStats,
  };
};

// Instance method to borrow book
bookSchema.methods.borrowBook = function() {
  if (this.availableCopies > 0) {
    this.availableCopies -= 1;
    return this.save();
  }
  throw new Error('No copies available for borrowing');
};

// Instance method to return book
bookSchema.methods.returnBook = function() {
  if (this.availableCopies < this.copies) {
    this.availableCopies += 1;
    return this.save();
  }
  throw new Error('All copies are already available');
};

// Instance method to add review
bookSchema.methods.addReview = function(userId, rating, comment) {
  // Remove existing review from same user
  this.reviews = this.reviews.filter(review => 
    review.userId.toString() !== userId.toString()
  );

  // Add new review
  this.reviews.push({ userId, rating, comment });

  // Update average rating
  this.updateRating();

  return this.save();
};

// Instance method to update rating
bookSchema.methods.updateRating = function() {
  if (this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
  } else {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating.average = Math.round((totalRating / this.reviews.length) * 10) / 10;
    this.rating.count = this.reviews.length;
  }
};

// Indexes for better query performance
bookSchema.index({ title: 1 });
bookSchema.index({ isbn: 1 });
bookSchema.index({ authors: 1 });
bookSchema.index({ genre: 1 });
bookSchema.index({ status: 1 });
bookSchema.index({ availableCopies: 1 });
bookSchema.index({ 'rating.average': -1 });
bookSchema.index({ publishDate: -1 });
bookSchema.index({ title: 'text', description: 'text', publisher: 'text' });

module.exports = mongoose.model('Book', bookSchema);
