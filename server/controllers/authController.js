const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { asyncHandler, AppError, createErrorResponse } = require('../middleware/errorHandler');
const config = require('../config/config');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, address, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return next(createErrorResponse('RESOURCE_ALREADY_EXISTS', 'User with this email already exists'));
  }

  // Create user
  const userData = {
    name,
    email,
    password,
    phone,
    address,
  };

  // Only admin can set role during registration
  if (role && req.user && req.user.role === config.USER_ROLES.ADMIN) {
    userData.role = role;
  }

  const user = await User.create(userData);

  // Generate tokens
  const token = generateToken({ id: user._id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  // Add refresh token to user
  user.addRefreshToken(refreshToken);
  await user.save();

  // Remove password from response
  user.password = undefined;

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token,
      refreshToken,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findByEmail(email).select('+password');
  
  if (!user || !(await user.comparePassword(password))) {
    return next(createErrorResponse('INVALID_CREDENTIALS'));
  }

  // Check if user account is active
  if (user.status !== config.USER_STATUS.ACTIVE) {
    return next(new AppError('Account is not active. Please contact administrator.', 403));
  }

  // Generate tokens
  const token = generateToken({ id: user._id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  // Add refresh token to user and update last login
  user.addRefreshToken(refreshToken);
  user.lastLogin = new Date();
  await user.save();

  // Remove password from response
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token,
      refreshToken,
    },
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return next(new AppError('Refresh token is required', 400));
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(token);
    
    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id).select('+refreshTokens');
    
    if (!user || !user.refreshTokens.some(rt => rt.token === token)) {
      return next(new AppError('Invalid refresh token', 401));
    }

    // Generate new access token
    const newAccessToken = generateToken({ 
      id: user._id, 
      email: user.email, 
      role: user.role 
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newAccessToken,
      },
    });
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401));
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res, next) => {
  const { refreshToken: token } = req.body;

  if (token) {
    // Remove refresh token from user
    const user = await User.findById(req.user._id).select('+refreshTokens');
    if (user) {
      user.removeRefreshToken(token);
      await user.save();
    }
  }

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate('activeBorrowings')
    .select('-refreshTokens');

  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = ['name', 'phone', 'address'];
  const updates = {};

  // Filter allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    {
      new: true,
      runValidators: true,
    }
  ).select('-refreshTokens');

  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user,
    },
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  // Check current password
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 400));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findByEmail(email);
  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User with this email not found'));
  }

  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // Send email with reset token
    // This would typically use an email service
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.status(200).json({
      success: true,
      message: 'Password reset token sent to email',
      // In development, you might want to include the token
      ...(config.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later.', 500));
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash the token and find user
  const hashedToken = require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Generate new tokens
  const newToken = generateToken({ id: user._id, email: user.email, role: user.role });
  const newRefreshToken = generateRefreshToken({ id: user._id });

  // Add refresh token to user
  user.addRefreshToken(newRefreshToken);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
    },
  });
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const user = await User.findOne({
    emailVerificationToken: token,
  });

  if (!user) {
    return next(new AppError('Invalid verification token', 400));
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
});

// @desc    Resend email verification
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(createErrorResponse('RESOURCE_NOT_FOUND', 'User not found'));
  }

  if (user.emailVerified) {
    return next(new AppError('Email is already verified', 400));
  }

  // Generate new verification token
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  user.emailVerificationToken = verificationToken;
  await user.save();

  // Send verification email
  console.log(`Email verification token for ${user.email}: ${verificationToken}`);

  res.status(200).json({
    success: true,
    message: 'Verification email sent',
    ...(config.NODE_ENV === 'development' && { verificationToken }),
  });
});

module.exports = {
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
};
