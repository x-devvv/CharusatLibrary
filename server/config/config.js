module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/library_management',
  MONGODB_TEST_URI: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/library_management_test',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',

  // Email Configuration
  EMAIL: {
    HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: process.env.EMAIL_PORT || 587,
    USER: process.env.EMAIL_USER,
    PASS: process.env.EMAIL_PASS,
    FROM: process.env.EMAIL_FROM || 'noreply@library.com',
  },

  // Fine Configuration
  FINE_PER_DAY: parseFloat(process.env.FINE_PER_DAY) || 2.00,
  MAX_RENEWAL_COUNT: parseInt(process.env.MAX_RENEWAL_COUNT) || 2,
  LOAN_PERIOD_DAYS: parseInt(process.env.LOAN_PERIOD_DAYS) || 14,

  // File Upload Configuration
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',

  // Security Configuration
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // Admin Configuration
  ADMIN: {
    EMAIL: process.env.ADMIN_EMAIL || 'admin@library.com',
    PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@123456',
  },

  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,

  // User Roles
  USER_ROLES: {
    ADMIN: 'admin',
    LIBRARIAN: 'librarian',
    MEMBER: 'member',
  },

  // Transaction Status
  TRANSACTION_STATUS: {
    BORROWED: 'borrowed',
    RETURNED: 'returned',
    OVERDUE: 'overdue',
  },

  // Book Status
  BOOK_STATUS: {
    AVAILABLE: 'available',
    UNAVAILABLE: 'unavailable',
  },

  // User Status
  USER_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
  },

  // Reservation Status
  RESERVATION_STATUS: {
    PENDING: 'pending',
    FULFILLED: 'fulfilled',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
  },
};
