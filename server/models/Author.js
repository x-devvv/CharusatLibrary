const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters'],
  },
  biography: {
    type: String,
    trim: true,
    maxlength: [2000, 'Biography cannot exceed 2000 characters'],
  },
  birthDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value <= new Date();
      },
      message: 'Birth date cannot be in the future',
    },
  },
  deathDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || !this.birthDate || value >= this.birthDate;
      },
      message: 'Death date cannot be before birth date',
    },
  },
  nationality: {
    type: String,
    trim: true,
    maxlength: [50, 'Nationality cannot exceed 50 characters'],
  },
  website: {
    type: String,
    trim: true,
    match: [
      /^https?:\/\/.+/,
      'Please enter a valid website URL',
    ],
  },
  imageUrl: {
    type: String,
    trim: true,
  },
  awards: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      min: 1800,
      max: new Date().getFullYear(),
    },
    description: {
      type: String,
      trim: true,
    },
  }],
  genres: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for author's age
authorSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  
  const endDate = this.deathDate || new Date();
  const age = endDate.getFullYear() - this.birthDate.getFullYear();
  const monthDiff = endDate.getMonth() - this.birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < this.birthDate.getDate())) {
    return age - 1;
  }
  
  return age;
});

// Virtual for books count
authorSchema.virtual('booksCount', {
  ref: 'Book',
  localField: '_id',
  foreignField: 'authors',
  count: true,
});

// Virtual for full name with birth/death years
authorSchema.virtual('displayName').get(function() {
  let name = this.name;
  
  if (this.birthDate) {
    const birthYear = this.birthDate.getFullYear();
    const deathYear = this.deathDate ? this.deathDate.getFullYear() : '';
    name += ` (${birthYear}${deathYear ? `-${deathYear}` : ''})`;
  }
  
  return name;
});

// Pre-save middleware to validate dates
authorSchema.pre('save', function(next) {
  if (this.deathDate && this.birthDate && this.deathDate < this.birthDate) {
    return next(new Error('Death date cannot be before birth date'));
  }
  next();
});

// Static method to search authors
authorSchema.statics.searchAuthors = function(query, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'name',
    sortOrder = 'asc',
    nationality,
    isActive = true,
  } = options;

  const searchQuery = {
    isActive,
    ...(nationality && { nationality }),
  };

  if (query) {
    searchQuery.$or = [
      { name: { $regex: query, $options: 'i' } },
      { biography: { $regex: query, $options: 'i' } },
      { nationality: { $regex: query, $options: 'i' } },
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(searchQuery)
    .populate('genres', 'name')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to get author statistics
authorSchema.statics.getStatistics = async function() {
  const totalAuthors = await this.countDocuments({ isActive: true });
  
  const nationalityStats = await this.aggregate([
    { $match: { isActive: true, nationality: { $exists: true, $ne: null } } },
    { $group: { _id: '$nationality', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const genreStats = await this.aggregate([
    { $match: { isActive: true } },
    { $unwind: '$genres' },
    { $lookup: { from: 'categories', localField: 'genres', foreignField: '_id', as: 'genre' } },
    { $unwind: '$genre' },
    { $group: { _id: '$genre.name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return {
    total: totalAuthors,
    byNationality: nationalityStats,
    byGenre: genreStats,
  };
};

// Instance method to add award
authorSchema.methods.addAward = function(award) {
  this.awards.push(award);
  return this.save();
};

// Instance method to remove award
authorSchema.methods.removeAward = function(awardId) {
  this.awards.id(awardId).remove();
  return this.save();
};

// Indexes for better query performance
authorSchema.index({ name: 1 });
authorSchema.index({ nationality: 1 });
authorSchema.index({ isActive: 1 });
authorSchema.index({ birthDate: 1 });
authorSchema.index({ name: 'text', biography: 'text' });

module.exports = mongoose.model('Author', authorSchema);
