const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Book = require('../models/Book');
const Author = require('../models/Author');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { generateToken } = require('../config/jwt');
const config = require('../config/config');

describe('Transaction Management Endpoints', () => {
  let adminUser, librarianUser, memberUser;
  let adminToken, librarianToken, memberToken;
  let category, author, book;

  beforeEach(async () => {
    // Create test users
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'Admin@123456',
      role: 'admin',
      status: 'active',
    });
    await adminUser.save();

    librarianUser = new User({
      name: 'Librarian User',
      email: 'librarian@test.com',
      password: 'Librarian@123456',
      role: 'librarian',
      status: 'active',
    });
    await librarianUser.save();

    memberUser = new User({
      name: 'Member User',
      email: 'member@test.com',
      password: 'Member@123456',
      role: 'member',
      status: 'active',
    });
    await memberUser.save();

    // Generate tokens
    adminToken = generateToken({ id: adminUser._id, email: adminUser.email, role: adminUser.role });
    librarianToken = generateToken({ id: librarianUser._id, email: librarianUser.email, role: librarianUser.role });
    memberToken = generateToken({ id: memberUser._id, email: memberUser.email, role: memberUser.role });

    // Create test data
    category = new Category({
      name: 'Fiction',
      description: 'Fictional literature',
    });
    await category.save();

    author = new Author({
      name: 'Test Author',
      biography: 'A test author',
    });
    await author.save();

    book = new Book({
      title: 'Test Book',
      authors: [author._id],
      isbn: '9780123456789',
      genre: category._id,
      copies: 5,
      availableCopies: 5,
      publisher: 'Test Publisher',
    });
    await book.save();
  });

  describe('POST /api/transactions/borrow', () => {
    it('should allow member to borrow book', async () => {
      const borrowData = {
        userId: memberUser._id,
        bookId: book._id,
      };

      const response = await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(borrowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book borrowed successfully');
      expect(response.body.data.transaction.userId._id || response.body.data.transaction.userId).toBe(memberUser._id.toString());
      expect(response.body.data.transaction.bookId._id || response.body.data.transaction.bookId).toBe(book._id.toString());
      expect(response.body.data.transaction.status).toBe(config.TRANSACTION_STATUS.BORROWED);

      // Verify book availability decreased
      const updatedBook = await Book.findById(book._id);
      expect(updatedBook.availableCopies).toBe(4);
    });

    it('should allow librarian to borrow book for member', async () => {
      const borrowData = {
        userId: memberUser._id,
        bookId: book._id,
      };

      const response = await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(borrowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book borrowed successfully');
    });

    it('should not allow member to borrow book for another user', async () => {
      const borrowData = {
        userId: adminUser._id, // Different user
        bookId: book._id,
      };

      const response = await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(borrowData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions for transaction operations.');
    });

    it('should not allow borrowing unavailable book', async () => {
      // Make book unavailable
      book.availableCopies = 0;
      await book.save();

      const borrowData = {
        userId: memberUser._id,
        bookId: book._id,
      };

      const response = await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(borrowData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Book is not available for borrowing');
    });

    it('should not allow borrowing same book twice', async () => {
      const borrowData = {
        userId: memberUser._id,
        bookId: book._id,
      };

      // First borrow
      await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(borrowData)
        .expect(201);

      // Second borrow attempt
      const response = await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(borrowData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already has this book borrowed');
    });

    it('should not allow borrowing with outstanding fines', async () => {
      // Create a transaction with unpaid fine
      const overdueTransaction = new Transaction({
        userId: memberUser._id,
        bookId: book._id,
        borrowDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days overdue
        status: config.TRANSACTION_STATUS.OVERDUE,
        fineAmount: 12.00,
        finePaid: false,
        issuedBy: librarianUser._id,
      });
      await overdueTransaction.save();

      // Create another book to borrow
      const anotherBook = new Book({
        title: 'Another Book',
        authors: [author._id],
        isbn: '9780987654321',
        genre: category._id,
        copies: 3,
        availableCopies: 3,
        publisher: 'Test Publisher',
      });
      await anotherBook.save();

      const borrowData = {
        userId: memberUser._id,
        bookId: anotherBook._id,
      };

      const response = await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(borrowData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot borrow books with outstanding fines');
    });

    it('should validate required fields', async () => {
      const borrowData = {
        userId: memberUser._id,
        // Missing bookId
      };

      const response = await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(borrowData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate user existence', async () => {
      const borrowData = {
        userId: '507f1f77bcf86cd799439011', // Non-existent user
        bookId: book._id,
      };

      const response = await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(borrowData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found or inactive');
    });

    it('should validate book existence', async () => {
      const borrowData = {
        userId: memberUser._id,
        bookId: '507f1f77bcf86cd799439011', // Non-existent book
      };

      const response = await request(app)
        .post('/api/transactions/borrow')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(borrowData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Book not found');
    });
  });

  describe('PUT /api/transactions/:id/return', () => {
    let transaction;

    beforeEach(async () => {
      // Create a borrowed transaction
      transaction = new Transaction({
        userId: memberUser._id,
        bookId: book._id,
        borrowDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        status: config.TRANSACTION_STATUS.BORROWED,
        issuedBy: librarianUser._id,
      });
      await transaction.save();

      // Update book availability
      book.availableCopies = 4;
      await book.save();
    });

    it('should allow librarian to return book', async () => {
      const returnData = {
        notes: 'Book returned in good condition',
      };

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/return`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(returnData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book returned successfully');
      expect(response.body.data.transaction.status).toBe(config.TRANSACTION_STATUS.RETURNED);
      expect(response.body.data.transaction.returnDate).toBeDefined();

      // Verify book availability increased
      const updatedBook = await Book.findById(book._id);
      expect(updatedBook.availableCopies).toBe(5);
    });

    it('should allow admin to return book', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/return`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book returned successfully');
    });

    it('should not allow member to return book', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/return`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should not return already returned book', async () => {
      // First return
      await request(app)
        .put(`/api/transactions/${transaction._id}/return`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      // Second return attempt
      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/return`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Book is already returned');
    });

    it('should calculate fine for overdue return', async () => {
      // Make transaction overdue
      transaction.dueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days overdue
      transaction.status = config.TRANSACTION_STATUS.OVERDUE;
      await transaction.save();

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/return`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.fineAmount).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/transactions/:id/renew', () => {
    let transaction;

    beforeEach(async () => {
      transaction = new Transaction({
        userId: memberUser._id,
        bookId: book._id,
        borrowDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: config.TRANSACTION_STATUS.BORROWED,
        renewalCount: 0,
        issuedBy: librarianUser._id,
      });
      await transaction.save();
    });

    it('should allow member to renew their own book', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/renew`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book renewed successfully');
      expect(response.body.data.transaction.renewalCount).toBe(1);
    });

    it('should allow librarian to renew book', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/renew`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book renewed successfully');
    });

    it('should not allow renewal beyond maximum limit', async () => {
      // Set renewal count to maximum
      transaction.renewalCount = config.MAX_RENEWAL_COUNT;
      await transaction.save();

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/renew`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Maximum number of renewals reached');
    });

    it('should not allow renewal with outstanding fines', async () => {
      // Add fine to transaction
      transaction.fineAmount = 5.00;
      transaction.finePaid = false;
      await transaction.save();

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/renew`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot borrow books with outstanding fines');
    });

    it('should not allow member to renew another user\'s book', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@test.com',
        password: 'Another@123456',
        role: 'member',
        status: 'active',
      });
      await anotherUser.save();

      const anotherToken = generateToken({
        id: anotherUser._id,
        email: anotherUser.email,
        role: anotherUser.role,
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/renew`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions');
    });
  });

  describe('PUT /api/transactions/:id/pay-fine', () => {
    let transaction;

    beforeEach(async () => {
      transaction = new Transaction({
        userId: memberUser._id,
        bookId: book._id,
        borrowDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        status: config.TRANSACTION_STATUS.OVERDUE,
        fineAmount: 12.00,
        finePaid: false,
        issuedBy: librarianUser._id,
      });
      await transaction.save();
    });

    it('should allow member to pay their own fine', async () => {
      const paymentData = {
        paymentAmount: 12.00,
        paymentMethod: 'cash',
      };

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/pay-fine`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Fine paid successfully');
      expect(response.body.data.transaction.finePaid).toBe(true);
      expect(response.body.data.paymentAmount).toBe(12.00);
    });

    it('should allow librarian to process fine payment', async () => {
      const paymentData = {
        paymentAmount: 12.00,
        paymentMethod: 'card',
      };

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/pay-fine`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Fine paid successfully');
    });

    it('should not allow payment less than fine amount', async () => {
      const paymentData = {
        paymentAmount: 10.00, // Less than fine amount
      };

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/pay-fine`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment amount is less than fine amount');
    });

    it('should not allow payment for already paid fine', async () => {
      // Mark fine as paid
      transaction.finePaid = true;
      await transaction.save();

      const paymentData = {
        paymentAmount: 12.00,
      };

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/pay-fine`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Fine is already paid');
    });

    it('should validate payment amount', async () => {
      const paymentData = {
        paymentAmount: -5.00, // Negative amount
      };

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/pay-fine`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      // Create some test transactions
      const transaction1 = new Transaction({
        userId: memberUser._id,
        bookId: book._id,
        borrowDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: config.TRANSACTION_STATUS.BORROWED,
        issuedBy: librarianUser._id,
      });

      const transaction2 = new Transaction({
        userId: memberUser._id,
        bookId: book._id,
        borrowDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
        returnDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        status: config.TRANSACTION_STATUS.RETURNED,
        issuedBy: librarianUser._id,
        returnedBy: librarianUser._id,
      });

      await transaction1.save();
      await transaction2.save();
    });

    it('should get all transactions as admin', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should get all transactions as librarian', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(2);
    });

    it('should not get all transactions as member', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/transactions?status=borrowed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].status).toBe(config.TRANSACTION_STATUS.BORROWED);
    });

    it('should support filtering by user', async () => {
      const response = await request(app)
        .get(`/api/transactions?userId=${memberUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/transactions?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/transactions/overdue', () => {
    beforeEach(async () => {
      // Create overdue transaction
      const overdueTransaction = new Transaction({
        userId: memberUser._id,
        bookId: book._id,
        borrowDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        status: config.TRANSACTION_STATUS.OVERDUE,
        fineAmount: 12.00,
        issuedBy: librarianUser._id,
      });
      await overdueTransaction.save();
    });

    it('should get overdue transactions as admin', async () => {
      const response = await request(app)
        .get('/api/transactions/overdue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].status).toBe(config.TRANSACTION_STATUS.OVERDUE);
      expect(response.body.data.count).toBe(1);
    });

    it('should get overdue transactions as librarian', async () => {
      const response = await request(app)
        .get('/api/transactions/overdue')
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
    });

    it('should not get overdue transactions as member', async () => {
      const response = await request(app)
        .get('/api/transactions/overdue')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('GET /api/transactions/stats', () => {
    beforeEach(async () => {
      // Create various transactions for statistics
      const transactions = [
        new Transaction({
          userId: memberUser._id,
          bookId: book._id,
          borrowDate: new Date(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: config.TRANSACTION_STATUS.BORROWED,
          issuedBy: librarianUser._id,
        }),
        new Transaction({
          userId: memberUser._id,
          bookId: book._id,
          borrowDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
          returnDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          status: config.TRANSACTION_STATUS.RETURNED,
          issuedBy: librarianUser._id,
        }),
      ];

      await Transaction.insertMany(transactions);
    });

    it('should get transaction statistics as admin', async () => {
      const response = await request(app)
        .get('/api/transactions/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.total).toBe(2);
    });

    it('should get transaction statistics as librarian', async () => {
      const response = await request(app)
        .get('/api/transactions/stats')
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should not get transaction statistics as member', async () => {
      const response = await request(app)
        .get('/api/transactions/stats')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should support date range filtering', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/transactions/stats?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
    });
  });

  describe('GET /api/transactions/user/:userId/active', () => {
    let activeTransaction;

    beforeEach(async () => {
      activeTransaction = new Transaction({
        userId: memberUser._id,
        bookId: book._id,
        borrowDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: config.TRANSACTION_STATUS.BORROWED,
        issuedBy: librarianUser._id,
      });
      await activeTransaction.save();
    });

    it('should get user\'s active transactions as member (own)', async () => {
      const response = await request(app)
        .get(`/api/transactions/user/${memberUser._id}/active`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].status).toBe(config.TRANSACTION_STATUS.BORROWED);
      expect(response.body.data.count).toBe(1);
    });

    it('should get user\'s active transactions as librarian', async () => {
      const response = await request(app)
        .get(`/api/transactions/user/${memberUser._id}/active`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
    });

    it('should not get another user\'s active transactions as member', async () => {
      const response = await request(app)
        .get(`/api/transactions/user/${adminUser._id}/active`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions');
    });
  });
});
