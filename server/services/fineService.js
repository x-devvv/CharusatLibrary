const Transaction = require('../models/Transaction');
const User = require('../models/User');
const config = require('../config/config');
const emailService = require('./emailService');

class FineService {
  // Calculate fine for a transaction
  static calculateFine(transaction) {
    if (transaction.returnDate || transaction.status === config.TRANSACTION_STATUS.RETURNED) {
      return 0; // No fine for returned books
    }

    const now = new Date();
    const dueDate = new Date(transaction.dueDate);
    
    if (now <= dueDate) {
      return 0; // No fine if not overdue
    }

    const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
    return daysOverdue * config.FINE_PER_DAY;
  }

  // Update fines for all overdue transactions
  static async updateOverdueFines() {
    try {
      const overdueTransactions = await Transaction.find({
        status: { $in: [config.TRANSACTION_STATUS.BORROWED, config.TRANSACTION_STATUS.OVERDUE] },
        returnDate: null,
        dueDate: { $lt: new Date() },
      }).populate('userId', 'name email').populate('bookId', 'title isbn');

      let updatedCount = 0;

      for (const transaction of overdueTransactions) {
        const newFineAmount = this.calculateFine(transaction);
        
        if (transaction.fineAmount !== newFineAmount) {
          transaction.fineAmount = newFineAmount;
          transaction.status = config.TRANSACTION_STATUS.OVERDUE;
          await transaction.save();
          updatedCount++;
        }
      }

      console.log(`Updated fines for ${updatedCount} transactions`);
      return { success: true, updatedCount };
    } catch (error) {
      console.error('Error updating overdue fines:', error);
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
      .populate('bookId', 'title isbn authors');

      // Group transactions by user
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

      for (const { user, transactions } of Object.values(userTransactions)) {
        try {
          await emailService.sendOverdueNotification(user, transactions);
          notificationsSent++;
        } catch (error) {
          console.error(`Failed to send overdue notification to ${user.email}:`, error);
        }
      }

      console.log(`Sent overdue notifications to ${notificationsSent} users`);
      return { success: true, notificationsSent };
    } catch (error) {
      console.error('Error sending overdue notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send due date reminders (1 day before due)
  static async sendDueReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999); // End of tomorrow

      const today = new Date();
      today.setDate(today.getDate() + 1);
      today.setHours(0, 0, 0, 0); // Start of tomorrow

      const dueSoonTransactions = await Transaction.find({
        status: config.TRANSACTION_STATUS.BORROWED,
        returnDate: null,
        dueDate: {
          $gte: today,
          $lte: tomorrow,
        },
      })
      .populate('userId', 'name email')
      .populate('bookId', 'title isbn authors');

      // Group transactions by user
      const userTransactions = {};
      dueSoonTransactions.forEach(transaction => {
        const userId = transaction.userId._id.toString();
        if (!userTransactions[userId]) {
          userTransactions[userId] = {
            user: transaction.userId,
            transactions: [],
          };
        }
        
        // Add days until due for email template
        const daysUntilDue = Math.ceil((new Date(transaction.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        transaction.daysUntilDue = daysUntilDue;
        
        userTransactions[userId].transactions.push(transaction);
      });

      let remindersSent = 0;

      for (const { user, transactions } of Object.values(userTransactions)) {
        try {
          await emailService.sendDueReminderEmail(user, transactions);
          remindersSent++;
        } catch (error) {
          console.error(`Failed to send due reminder to ${user.email}:`, error);
        }
      }

      console.log(`Sent due reminders to ${remindersSent} users`);
      return { success: true, remindersSent };
    } catch (error) {
      console.error('Error sending due reminders:', error);
      return { success: false, error: error.message };
    }
  }

  // Get fine statistics
  static async getFineStatistics(startDate = null, endDate = null) {
    try {
      const matchQuery = {};
      
      if (startDate && endDate) {
        matchQuery.borrowDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const stats = await Transaction.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalFines: { $sum: '$fineAmount' },
            paidFines: {
              $sum: {
                $cond: [{ $eq: ['$finePaid', true] }, '$fineAmount', 0],
              },
            },
            unpaidFines: {
              $sum: {
                $cond: [{ $eq: ['$finePaid', false] }, '$fineAmount', 0],
              },
            },
            transactionsWithFines: {
              $sum: {
                $cond: [{ $gt: ['$fineAmount', 0] }, 1, 0],
              },
            },
            overdueTransactions: {
              $sum: {
                $cond: [{ $eq: ['$status', config.TRANSACTION_STATUS.OVERDUE] }, 1, 0],
              },
            },
          },
        },
      ]);

      const result = stats[0] || {
        totalFines: 0,
        paidFines: 0,
        unpaidFines: 0,
        transactionsWithFines: 0,
        overdueTransactions: 0,
      };

      // Get top users with highest fines
      const topDebtors = await Transaction.aggregate([
        { $match: { fineAmount: { $gt: 0 }, finePaid: false } },
        {
          $group: {
            _id: '$userId',
            totalUnpaidFines: { $sum: '$fineAmount' },
            overdueCount: { $sum: 1 },
          },
        },
        { $sort: { totalUnpaidFines: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            user: {
              _id: '$user._id',
              name: '$user.name',
              email: '$user.email',
            },
            totalUnpaidFines: 1,
            overdueCount: 1,
          },
        },
      ]);

      return {
        success: true,
        data: {
          ...result,
          topDebtors,
        },
      };
    } catch (error) {
      console.error('Error getting fine statistics:', error);
      return { success: false, error: error.message };
    }
  }

  // Process fine payment
  static async processFinePayment(transactionId, paymentAmount, paymentMethod = 'cash') {
    try {
      const transaction = await Transaction.findById(transactionId)
        .populate('userId', 'name email')
        .populate('bookId', 'title isbn');

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      if (transaction.fineAmount === 0) {
        return { success: false, error: 'No fine to pay for this transaction' };
      }

      if (transaction.finePaid) {
        return { success: false, error: 'Fine is already paid' };
      }

      if (paymentAmount < transaction.fineAmount) {
        return { success: false, error: 'Payment amount is less than fine amount' };
      }

      // Process payment
      await transaction.payFine(paymentAmount);

      // Send confirmation email
      try {
        await emailService.sendFinePaymentConfirmation(
          transaction.userId,
          transaction,
          paymentAmount
        );
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
      }

      return {
        success: true,
        data: {
          transaction,
          paymentAmount,
          paymentMethod,
          changeAmount: paymentAmount - transaction.fineAmount,
        },
      };
    } catch (error) {
      console.error('Error processing fine payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's total unpaid fines
  static async getUserUnpaidFines(userId) {
    try {
      const mongoose = require('mongoose');
      const result = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            fineAmount: { $gt: 0 },
            finePaid: false,
          },
        },
        {
          $group: {
            _id: null,
            totalUnpaidFines: { $sum: '$fineAmount' },
            overdueCount: { $sum: 1 },
          },
        },
      ]);

      return {
        success: true,
        data: result[0] || { totalUnpaidFines: 0, overdueCount: 0 },
      };
    } catch (error) {
      console.error('Error getting user unpaid fines:', error);
      return { success: false, error: error.message };
    }
  }

  // Waive fine (admin only)
  static async waiveFine(transactionId, reason = 'Administrative waiver') {
    try {
      const transaction = await Transaction.findById(transactionId);

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      if (transaction.fineAmount === 0) {
        return { success: false, error: 'No fine to waive for this transaction' };
      }

      if (transaction.finePaid) {
        return { success: false, error: 'Fine is already paid' };
      }

      // Waive the fine
      transaction.fineAmount = 0;
      transaction.finePaid = true;
      transaction.finePaymentDate = new Date();
      transaction.notes = transaction.notes 
        ? `${transaction.notes}\n\nFine waived: ${reason}`
        : `Fine waived: ${reason}`;

      await transaction.save();

      return {
        success: true,
        data: { transaction, reason },
      };
    } catch (error) {
      console.error('Error waiving fine:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = FineService;
