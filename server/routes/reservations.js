const express = require('express');
const {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  getBookQueue,
  getUserReservations,
  fulfillReservation,
  getReservationStats,
  expireOldReservations,
  getNextInQueue,
  notifyUser,
} = require('../controllers/reservationController');

const { authenticate, isAdmin, isLibrarian } = require('../middleware/auth');
const { reservationValidations, commonValidations, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/reservations
// @desc    Get all reservations
// @access  Private (Admin/Librarian)
router.get(
  '/',
  authenticate,
  isLibrarian,
  [
    ...commonValidations.pagination,
    require('express-validator').query('status')
      .optional()
      .isIn(['pending', 'fulfilled', 'expired', 'cancelled'])
      .withMessage('Invalid reservation status'),
    require('express-validator').query('userId')
      .optional()
      .isMongoId()
      .withMessage('Invalid user ID'),
    require('express-validator').query('bookId')
      .optional()
      .isMongoId()
      .withMessage('Invalid book ID'),
  ],
  handleValidationErrors,
  getReservations
);

// @route   GET /api/reservations/stats
// @desc    Get reservation statistics
// @access  Private (Admin/Librarian)
router.get(
  '/stats',
  authenticate,
  isLibrarian,
  [
    require('express-validator').query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    require('express-validator').query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
  ],
  handleValidationErrors,
  getReservationStats
);

// @route   POST /api/reservations/expire
// @desc    Expire old reservations
// @access  Private (Admin/Librarian)
router.post('/expire', authenticate, isLibrarian, expireOldReservations);

// @route   GET /api/reservations/book/:bookId/queue
// @desc    Get book reservation queue
// @access  Private (Admin/Librarian)
router.get(
  '/book/:bookId/queue',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('bookId')
      .isMongoId()
      .withMessage('Invalid book ID'),
  ],
  handleValidationErrors,
  getBookQueue
);

// @route   GET /api/reservations/book/:bookId/next
// @desc    Get next in queue for a book
// @access  Private (Admin/Librarian)
router.get(
  '/book/:bookId/next',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('bookId')
      .isMongoId()
      .withMessage('Invalid book ID'),
  ],
  handleValidationErrors,
  getNextInQueue
);

// @route   GET /api/reservations/user/:userId
// @desc    Get user's reservations
// @access  Private (Admin/Librarian or Own Reservations)
router.get(
  '/user/:userId',
  authenticate,
  [
    require('express-validator').param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
  ],
  handleValidationErrors,
  getUserReservations
);

// @route   POST /api/reservations
// @desc    Create new reservation
// @access  Private
router.post(
  '/',
  authenticate,
  reservationValidations.create,
  handleValidationErrors,
  createReservation
);

// @route   GET /api/reservations/:id
// @desc    Get single reservation
// @access  Private (Admin/Librarian or Own Reservation)
router.get(
  '/:id',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid reservation ID'),
  ],
  handleValidationErrors,
  getReservation
);

// @route   PUT /api/reservations/:id
// @desc    Update reservation
// @access  Private (Admin/Librarian)
router.put(
  '/:id',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid reservation ID'),
    ...reservationValidations.update,
  ],
  handleValidationErrors,
  updateReservation
);

// @route   DELETE /api/reservations/:id
// @desc    Cancel reservation
// @access  Private (Admin/Librarian or Own Reservation)
router.delete(
  '/:id',
  authenticate,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid reservation ID'),
    require('express-validator').body('reason')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Reason cannot exceed 200 characters')
      .trim(),
  ],
  handleValidationErrors,
  cancelReservation
);

// @route   PUT /api/reservations/:id/fulfill
// @desc    Fulfill reservation
// @access  Private (Admin/Librarian)
router.put(
  '/:id/fulfill',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid reservation ID'),
  ],
  handleValidationErrors,
  fulfillReservation
);

// @route   PUT /api/reservations/:id/notify
// @desc    Notify user about reservation
// @access  Private (Admin/Librarian)
router.put(
  '/:id/notify',
  authenticate,
  isLibrarian,
  [
    require('express-validator').param('id')
      .isMongoId()
      .withMessage('Invalid reservation ID'),
  ],
  handleValidationErrors,
  notifyUser
);

module.exports = router;
