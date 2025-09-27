const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { verifyToken, extractTokenFromHeader } = require('../config/jwt');

// Middleware to authenticate user
const authenticate = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password -refreshTokens');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
      });
    }

    if (user.status !== config.USER_STATUS.ACTIVE) {
      return res.status(401).json({
        success: false,
        message: 'Account is not active. Please contact administrator.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

// Middleware to authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

// Middleware to check if user is admin
const isAdmin = authorize(config.USER_ROLES.ADMIN);

// Middleware to check if user is librarian or admin
const isLibrarian = authorize(config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN);

// Middleware to check if user is member, librarian, or admin
const isMember = authorize(
  config.USER_ROLES.ADMIN,
  config.USER_ROLES.LIBRARIAN,
  config.USER_ROLES.MEMBER
);

// Middleware to check if user owns the resource or is admin/librarian
const isOwnerOrStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const userId = req.params.userId || req.params.id;
  const isOwner = req.user._id.toString() === userId;
  const isStaff = [config.USER_ROLES.ADMIN, config.USER_ROLES.LIBRARIAN].includes(req.user.role);

  if (!isOwner && !isStaff) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.',
    });
  }

  next();
};

// Middleware to check if user can perform transaction operations
const canPerformTransaction = (req, res, next) => {
  console.log('🔐 Transaction Permission Check:');
  console.log('- User:', req.user ? req.user.email : 'None');
  console.log('- User Role:', req.user ? req.user.role : 'None');
  console.log('- User ID:', req.user ? req.user._id.toString() : 'None');
  
  if (!req.user) {
    console.log('❌ No user authenticated');
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  // Allow all authenticated users to perform transactions for themselves
  console.log('✅ Authenticated user access granted');
  return next();
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password -refreshTokens');

      if (user && user.status === config.USER_STATUS.ACTIVE) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors in optional auth
    next();
  }
};

// Middleware to check account status
const checkAccountStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  switch (req.user.status) {
    case config.USER_STATUS.INACTIVE:
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.',
      });
    
    case config.USER_STATUS.SUSPENDED:
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact administrator.',
      });
    
    case config.USER_STATUS.ACTIVE:
      return next();
    
    default:
      return res.status(403).json({
        success: false,
        message: 'Invalid account status.',
      });
  }
};

// Middleware to validate API key (for external integrations)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required.',
    });
  }

  // In production, you would validate against stored API keys
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key.',
    });
  }

  next();
};

// Middleware to log user activity
const logActivity = (action) => {
  return (req, res, next) => {
    if (req.user) {
      console.log(`User ${req.user.email} performed action: ${action} at ${new Date().toISOString()}`);
      
      // You could save this to a separate activity log collection
      // ActivityLog.create({
      //   userId: req.user._id,
      //   action,
      //   timestamp: new Date(),
      //   ip: req.ip,
      //   userAgent: req.headers['user-agent'],
      // });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  isAdmin,
  isLibrarian,
  isMember,
  isOwnerOrStaff,
  canPerformTransaction,
  optionalAuth,
  checkAccountStatus,
  validateApiKey,
  logActivity,
};
