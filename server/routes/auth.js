const express = require('express');
const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');

const { authenticate, optionalAuth } = require('../middleware/auth');
const { userValidations, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  userValidations.register,
  handleValidationErrors,
  optionalAuth, // Optional auth to allow admin to set role
  register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  userValidations.login,
  handleValidationErrors,
  login
);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', refreshToken);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, logout);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticate, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  authenticate,
  userValidations.updateProfile,
  handleValidationErrors,
  updateProfile
);

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put(
  '/change-password',
  authenticate,
  userValidations.changePassword,
  handleValidationErrors,
  changePassword
);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post(
  '/forgot-password',
  [
    require('express-validator').body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
  ],
  handleValidationErrors,
  forgotPassword
);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post(
  '/reset-password/:token',
  [
    require('express-validator').param('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    require('express-validator').body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],
  handleValidationErrors,
  resetPassword
);

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email
// @access  Public
router.get(
  '/verify-email/:token',
  [
    require('express-validator').param('token')
      .notEmpty()
      .withMessage('Verification token is required'),
  ],
  handleValidationErrors,
  verifyEmail
);

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Private
router.post('/resend-verification', authenticate, resendVerification);

module.exports = router;
