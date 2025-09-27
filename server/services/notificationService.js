const emailService = require('./emailService');
const Reservation = require('../models/Reservation');
const Transaction = require('../models/Transaction');
const config = require('../config/config');

class NotificationService {
  // Send welcome email to new users
  static async sendWelcomeNotification(user) {
    try {
      await emailService.sendWelcomeEmail(user);
      console.log(`Welcome email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send welcome email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Send email verification
  static async sendEmailVerification(user, verificationToken) {
    try {
      await emailService.sendEmailVerification(user, verificationToken);
      console.log(`Email verification sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send email verification to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset email
  static async sendPasswordResetNotification(user, resetToken) {
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
      console.log(`Password reset email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send password reset email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Notify user when reserved book becomes available
  static async notifyBookAvailable(reservation) {
    try {
      const populatedReservation = await Reservation.findById(reservation._id)
        .populate('userId', 'name email')
        .populate('bookId', 'title isbn authors')
        .populate({
          path: 'bookId',
          populate: {
            path: 'authors',
            select: 'name',
          },
        });

      if (!populatedReservation) {
        return { success: false, error: 'Reservation not found' };
      }

      // Add authorNames to book for email template
      populatedReservation.bookId.authorNames = populatedReservation.bookId.authors
        .map(author => author.name)
        .join(', ');

      await emailService.sendReservationNotification(
        populatedReservation.userId,
        populatedReservation.bookId
      );

      // Mark notification as sent
      await populatedReservation.notifyUser();

      console.log(`Book availability notification sent to ${populatedReservation.userId.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send book availability notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send due date reminders
  static async sendDueReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const today = new Date();
      today.setDate(today.getDate() + 1);
      today.setHours(0, 0, 0, 0);

      const dueSoonTransactions = await Transaction.find({
        status: config.TRANSACTION_STATUS.BORROWED,
        returnDate: null,
        dueDate: {
          $gte: today,
          $lte: tomorrow,
        },
      })
      .populate('userId', 'name email')
      .populate('bookId', 'title isbn authors')
      .populate({
        path: 'bookId',
        populate: {
          path: 'authors',
          select: 'name',
        },
      });

      // Group by user
      const userTransactions = {};
      dueSoonTransactions.forEach(transaction => {
        const userId = transaction.userId._id.toString();
        if (!userTransactions[userId]) {
          userTransactions[userId] = {
            user: transaction.userId,
            transactions: [],
          };
        }

        // Calculate days until due
        const daysUntilDue = Math.ceil(
          (new Date(transaction.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        transaction.daysUntilDue = daysUntilDue;

        userTransactions[userId].transactions.push(transaction);
      });

      let remindersSent = 0;
      const errors = [];

      for (const { user, transactions } of Object.values(userTransactions)) {
        try {
          await emailService.sendDueReminderEmail(user, transactions);
          remindersSent++;
        } catch (error) {
          console.error(`Failed to send due reminder to ${user.email}:`, error);
          errors.push({ user: user.email, error: error.message });
        }
      }

      console.log(`Sent due reminders to ${remindersSent} users`);
      return { 
        success: true, 
        remindersSent, 
        errors: errors.length > 0 ? errors : undefined 
      };
    } catch (error) {
      console.error('Error sending due reminders:', error);
      return { success: false, error: error.message };
    }
  }

  // Send overdue notifications
  static async sendOverdueNotifications() {
    try {
      const overdueTransactions = await Transaction.find({
        status: config.TRANSACTION_STATUS.OVERDUE,
        returnDate: null,
        fineAmount: { $gt: 0 },
      })
      .populate('userId', 'name email')
      .populate('bookId', 'title isbn authors')
      .populate({
        path: 'bookId',
        populate: {
          path: 'authors',
          select: 'name',
        },
      });

      // Group by user
      const userTransactions = {};
      overdueTransactions.forEach(transaction => {
        const userId = transaction.userId._id.toString();
        if (!userTransactions[userId]) {
          userTransactions[userId] = {
            user: transaction.userId,
            transactions: [],
          };
        }
        userTransactions[userId].transactions.push(transaction);
      });

      let notificationsSent = 0;
      const errors = [];

      for (const { user, transactions } of Object.values(userTransactions)) {
        try {
          await emailService.sendOverdueNotification(user, transactions);
          notificationsSent++;
        } catch (error) {
          console.error(`Failed to send overdue notification to ${user.email}:`, error);
          errors.push({ user: user.email, error: error.message });
        }
      }

      console.log(`Sent overdue notifications to ${notificationsSent} users`);
      return { 
        success: true, 
        notificationsSent, 
        errors: errors.length > 0 ? errors : undefined 
      };
    } catch (error) {
      console.error('Error sending overdue notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send fine payment confirmation
  static async sendFinePaymentConfirmation(user, transaction, paymentAmount) {
    try {
      await emailService.sendFinePaymentConfirmation(user, transaction, paymentAmount);
      console.log(`Fine payment confirmation sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send fine payment confirmation to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Batch notification for reservation queue updates
  static async notifyReservationQueue(bookId) {
    try {
      const nextReservation = await Reservation.getNextInQueue(bookId);
      
      if (nextReservation) {
        await this.notifyBookAvailable(nextReservation);
        return { success: true, notified: true };
      }

      return { success: true, notified: false };
    } catch (error) {
      console.error('Error notifying reservation queue:', error);
      return { success: false, error: error.message };
    }
  }

  // Send bulk notifications (for admin use)
  static async sendBulkNotification(userIds, subject, message) {
    try {
      const User = require('../models/User');
      const users = await User.find({ 
        _id: { $in: userIds },
        status: config.USER_STATUS.ACTIVE 
      }).select('name email');

      let successCount = 0;
      const errors = [];

      for (const user of users) {
        try {
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${subject}</h2>
              <p>Dear ${user.name},</p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <p>Best regards,<br><strong>Library Management Team</strong></p>
            </div>
          `;

          await emailService.sendEmail(user.email, subject, html);
          successCount++;
        } catch (error) {
          console.error(`Failed to send bulk notification to ${user.email}:`, error);
          errors.push({ user: user.email, error: error.message });
        }
      }

      console.log(`Sent bulk notifications to ${successCount}/${users.length} users`);
      return { 
        success: true, 
        sent: successCount, 
        total: users.length,
        errors: errors.length > 0 ? errors : undefined 
      };
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Schedule daily notifications (to be called by cron job)
  static async runDailyNotifications() {
    console.log('Running daily notifications...');
    
    const results = {
      dueReminders: await this.sendDueReminders(),
      overdueNotifications: await this.sendOverdueNotifications(),
    };

    console.log('Daily notifications completed:', results);
    return results;
  }

  // Get notification statistics
  static async getNotificationStats(startDate = null, endDate = null) {
    try {
      // This would typically track notification history in a separate collection
      // For now, we'll return basic stats based on transactions and reservations
      
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const overdueCount = await Transaction.countDocuments({
        status: config.TRANSACTION_STATUS.OVERDUE,
        ...dateFilter,
      });

      const dueSoonCount = await Transaction.countDocuments({
        status: config.TRANSACTION_STATUS.BORROWED,
        dueDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
        },
        ...dateFilter,
      });

      const pendingReservations = await Reservation.countDocuments({
        status: config.RESERVATION_STATUS.PENDING,
        notificationSent: false,
        ...dateFilter,
      });

      return {
        success: true,
        data: {
          overdueNotificationsPending: overdueCount,
          dueRemindersPending: dueSoonCount,
          reservationNotificationsPending: pendingReservations,
        },
      };
    } catch (error) {
      console.error('Error getting notification statistics:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;
