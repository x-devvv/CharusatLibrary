const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true, // Allow null values but ensure uniqueness when present
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  color: {
    type: String,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code'],
    default: '#007bff',
  },
  icon: {
    type: String,
    trim: true,
    default: 'book',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for books count in this category
categorySchema.virtual('booksCount', {
  ref: 'Book',
  localField: '_id',
  foreignField: 'genre',
  count: true,
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory',
});

// Virtual for category path (for breadcrumbs)
categorySchema.virtual('path').get(function() {
  // This would need to be populated with parent categories
  return this.name;
});

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Pre-save middleware to prevent circular references
categorySchema.pre('save', async function(next) {
  if (this.parentCategory && this.parentCategory.toString() === this._id.toString()) {
    return next(new Error('Category cannot be its own parent'));
  }
  
  // Check for circular reference in parent chain
  if (this.parentCategory) {
    let currentParent = this.parentCategory;
    const visited = new Set();
    
    while (currentParent) {
      if (visited.has(currentParent.toString())) {
        return next(new Error('Circular reference detected in category hierarchy'));
      }
      
      if (currentParent.toString() === this._id.toString()) {
        return next(new Error('Circular reference detected in category hierarchy'));
      }
      
      visited.add(currentParent.toString());
      
      const parent = await this.constructor.findById(currentParent);
      currentParent = parent ? parent.parentCategory : null;
    }
  }
  
  next();
});

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .populate('subcategories')
    .exec();

  const buildTree = (parentId = null) => {
    return categories
      .filter(cat => {
        const parent = cat.parentCategory;
        return parent ? parent.toString() === parentId : parentId === null;
      })
      .map(cat => ({
        ...cat.toObject(),
        children: buildTree(cat._id.toString()),
      }));
  };

  return buildTree();
};

// Static method to search categories
categorySchema.statics.searchCategories = function(query, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'name',
    sortOrder = 'asc',
    includeInactive = false,
  } = options;

  const searchQuery = {
    ...(includeInactive ? {} : { isActive: true }),
  };

  if (query) {
    searchQuery.$or = [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(searchQuery)
    .populate('parentCategory', 'name slug')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to get popular categories
categorySchema.statics.getPopularCategories = async function(limit = 10) {
  return await this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: 'genre',
        as: 'books',
      },
    },
    {
      $addFields: {
        booksCount: { $size: '$books' },
      },
    },
    { $sort: { booksCount: -1 } },
    { $limit: limit },
    {
      $project: {
        name: 1,
        description: 1,
        slug: 1,
        color: 1,
        icon: 1,
        booksCount: 1,
      },
    },
  ]);
};

// Static method to get category statistics
categorySchema.statics.getStatistics = async function() {
  const totalCategories = await this.countDocuments({ isActive: true });
  const parentCategories = await this.countDocuments({ 
    isActive: true, 
    parentCategory: null 
  });
  const subcategories = await this.countDocuments({ 
    isActive: true, 
    parentCategory: { $ne: null } 
  });

  const categoriesWithBooks = await this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: 'genre',
        as: 'books',
      },
    },
    {
      $match: {
        'books.0': { $exists: true },
      },
    },
    { $count: 'count' },
  ]);

  return {
    total: totalCategories,
    parent: parentCategories,
    subcategories: subcategories,
    withBooks: categoriesWithBooks[0]?.count || 0,
  };
};

// Instance method to get full category path
categorySchema.methods.getFullPath = async function() {
  const path = [this.name];
  let currentCategory = this;

  while (currentCategory.parentCategory) {
    currentCategory = await this.constructor.findById(currentCategory.parentCategory);
    if (currentCategory) {
      path.unshift(currentCategory.name);
    } else {
      break;
    }
  }

  return path.join(' > ');
};

// Indexes for better query performance
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Category', categorySchema);
