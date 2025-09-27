const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!config.EMAIL.USER || !config.EMAIL.PASS) {
      console.warn('Email credentials not configured. Email service will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host: config.EMAIL.HOST,
      port: config.EMAIL.PORT,
      secure: config.EMAIL.PORT === 465, // true for 465, false for other ports
      auth: {
        user: config.EMAIL.USER,
        pass: config.EMAIL.PASS,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service configuration error:', error);
      } else {
        console.log('Email service is ready to send messages');
      }
    });
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.transporter) {
      console.log('Email service not configured. Email not sent.');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: config.EMAIL.FROM,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Welcome email for new users
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Library Management System';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Our Library!</h2>
        <p>Dear ${user.name},</p>
        <p>Welcome to our Library Management System! Your account has been successfully created.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Account Details:</h3>
          <p><strong>Name:</strong> ${user.name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role}</p>
          <p><strong>Member Since:</strong> ${new Date(user.membershipDate).toLocaleDateString()}</p>
        </div>
        
        <p>You can now:</p>
        <ul>
          <li>Browse our extensive book collection</li>
          <li>Borrow books and manage your reading list</li>
          <li>Reserve books that are currently unavailable</li>
          <li>Track your borrowing history</li>
        </ul>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our library staff.</p>
        
        <p>Happy reading!</p>
        <p><strong>Library Management Team</strong></p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Email verification
  async sendEmailVerification(user, verificationToken) {
    const subject = 'Verify Your Email Address';
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Dear ${user.name},</p>
        <p>Thank you for registering with our Library Management System. Please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
        
        <p>This verification link will expire in 24 hours.</p>
        
        <p>If you didn't create an account with us, please ignore this email.</p>
        
        <p>Best regards,<br><strong>Library Management Team</strong></p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const subject = 'Reset Your Password';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Dear ${user.name},</p>
        <p>We received a request to reset your password for your Library Management System account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
        
        <p>This password reset link will expire in 10 minutes for security reasons.</p>
        
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        
        <p>Best regards,<br><strong>Library Management Team</strong></p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Book due reminder
  async sendDueReminderEmail(user, transactions) {
    const subject = 'Book Due Reminder';
    
    const booksList = transactions.map(transaction => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${transaction.bookId.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(transaction.dueDate).toLocaleDateString()}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${transaction.daysUntilDue} days</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Book Due Reminder</h2>
        <p>Dear ${user.name},</p>
        <p>This is a friendly reminder that you have books due soon:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Book Title</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Due Date</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Days Left</th>
            </tr>
          </thead>
          <tbody>
            ${booksList}
          </tbody>
        </table>
        
        <p>Please return these books on time to avoid late fees. You can also renew them if needed (subject to availability and renewal limits).</p>
        
        <p>Thank you for using our library services!</p>
        <p><strong>Library Management Team</strong></p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Overdue book notification
  async sendOverdueNotification(user, transactions) {
    const subject = 'Overdue Books - Action Required';
    
    const booksList = transactions.map(transaction => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${transaction.bookId.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(transaction.dueDate).toLocaleDateString()}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${transaction.daysOverdue} days</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${transaction.fineAmount.toFixed(2)}</td>
      </tr>
    `).join('');

    const totalFine = transactions.reduce((sum, t) => sum + t.fineAmount, 0);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Overdue Books - Immediate Action Required</h2>
        <p>Dear ${user.name},</p>
        <p>You have overdue books that need to be returned immediately:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Book Title</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Due Date</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Days Overdue</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Fine Amount</th>
            </tr>
          </thead>
          <tbody>
            ${booksList}
          </tbody>
        </table>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Total Fine Amount: $${totalFine.toFixed(2)}</strong></p>
        </div>
        
        <p><strong>Please return these books immediately to avoid additional fines.</strong></p>
        <p>Late fees are charged at $${config.FINE_PER_DAY} per day per book.</p>
        
        <p>If you have any questions or need to discuss payment arrangements, please contact the library immediately.</p>
        
        <p><strong>Library Management Team</strong></p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Book reservation notification
  async sendReservationNotification(user, book) {
    const subject = 'Book Available - Your Reservation is Ready';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Your Reserved Book is Available!</h2>
        <p>Dear ${user.name},</p>
        <p>Great news! The book you reserved is now available for pickup:</p>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">${book.title}</h3>
          <p style="margin: 5px 0;"><strong>Authors:</strong> ${book.authorNames}</p>
          <p style="margin: 5px 0;"><strong>ISBN:</strong> ${book.isbn}</p>
        </div>
        
        <p><strong>Important:</strong> Please pick up your reserved book within 7 days, or your reservation will expire and the book will be made available to the next person in the queue.</p>
        
        <p>Library Hours:</p>
        <ul>
          <li>Monday - Friday: 9:00 AM - 8:00 PM</li>
          <li>Saturday: 9:00 AM - 6:00 PM</li>
          <li>Sunday: 12:00 PM - 5:00 PM</li>
        </ul>
        
        <p>Thank you for using our reservation system!</p>
        <p><strong>Library Management Team</strong></p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Fine payment confirmation
  async sendFinePaymentConfirmation(user, transaction, paymentAmount) {
    const subject = 'Fine Payment Confirmation';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Payment Confirmation</h2>
        <p>Dear ${user.name},</p>
        <p>Thank you for your payment. We have successfully received your fine payment:</p>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">Payment Details</h3>
          <p><strong>Book:</strong> ${transaction.bookId.title}</p>
          <p><strong>Fine Amount:</strong> $${transaction.fineAmount.toFixed(2)}</p>
          <p><strong>Amount Paid:</strong> $${paymentAmount.toFixed(2)}</p>
          <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Transaction ID:</strong> ${transaction._id}</p>
        </div>
        
        <p>Your account is now in good standing. You can continue borrowing books from our library.</p>
        
        <p>Thank you for using our library services!</p>
        <p><strong>Library Management Team</strong></p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }
}

module.exports = new EmailService();
