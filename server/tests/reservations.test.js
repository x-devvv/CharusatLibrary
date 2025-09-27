const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Book = require('../models/Book');
const Author = require('../models/Author');
const Category = require('../models/Category');
const Reservation = require('../models/Reservation');
const { generateToken } = require('../config/jwt');
const config = require('../config/config');

describe('Reservation Management Endpoints', () => {
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
      copies: 2,
      availableCopies: 0, // Make book unavailable for reservation testing
      publisher: 'Test Publisher',
    });
    await book.save();
  });

  describe('POST /api/reservations', () => {
    it('should create reservation for unavailable book', async () => {
      const reservationData = {
        userId: memberUser._id,
        bookId: book._id,
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reservationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reservation created successfully');
      expect(response.body.data.reservation.userId._id || response.body.data.reservation.userId).toBe(memberUser._id.toString());
      expect(response.body.data.reservation.bookId._id || response.body.data.reservation.bookId).toBe(book._id.toString());
      expect(response.body.data.reservation.status).toBe(config.RESERVATION_STATUS.PENDING);
      expect(response.body.data.reservation.position).toBe(1);
    });

    it('should allow librarian to create reservation for member', async () => {
      const reservationData = {
        userId: memberUser._id,
        bookId: book._id,
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(reservationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reservation created successfully');
    });

    it('should not create reservation for available book', async () => {
      // Make book available
      book.availableCopies = 1;
      await book.save();

      const reservationData = {
        userId: memberUser._id,
        bookId: book._id,
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Book is currently available. Please borrow it directly instead of making a reservation.');
    });

    it('should not create duplicate reservation', async () => {
      const reservationData = {
        userId: memberUser._id,
        bookId: book._id,
      };

      // Create first reservation
      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reservationData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already has an active reservation for this book');
    });

    it('should assign correct position in queue', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@test.com',
        password: 'Another@123456',
        role: 'member',
        status: 'active',
      });
      await anotherUser.save();

      // Create first reservation
      const firstReservation = {
        userId: memberUser._id,
        bookId: book._id,
      };

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(firstReservation)
        .expect(201);

      // Create second reservation
      const secondReservation = {
        userId: anotherUser._id,
        bookId: book._id,
      };

      const anotherToken = generateToken({
        id: anotherUser._id,
        email: anotherUser.email,
        role: anotherUser.role,
      });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(secondReservation)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservation.position).toBe(2);
    });

    it('should validate required fields', async () => {
      const reservationData = {
        userId: memberUser._id,
        // Missing bookId
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should not allow member to create reservation for another user', async () => {
      const reservationData = {
        userId: adminUser._id, // Different user
        bookId: book._id,
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reservationData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('GET /api/reservations', () => {
    beforeEach(async () => {
      // Create test reservations
      const reservation1 = new Reservation({
        userId: memberUser._id,
        bookId: book._id,
        position: 1,
        status: config.RESERVATION_STATUS.PENDING,
      });

      const reservation2 = new Reservation({
        userId: adminUser._id,
        bookId: book._id,
        position: 2,
        status: config.RESERVATION_STATUS.PENDING,
      });

      await reservation1.save();
      await reservation2.save();
    });

    it('should get all reservations as admin', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservations).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should get all reservations as librarian', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservations).toHaveLength(2);
    });

    it('should not get all reservations as member', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/reservations?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservations).toHaveLength(2);
      expect(response.body.data.reservations[0].status).toBe(config.RESERVATION_STATUS.PENDING);
    });

    it('should support filtering by user', async () => {
      const response = await request(app)
        .get(`/api/reservations?userId=${memberUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservations).toHaveLength(1);
      expect(response.body.data.reservations[0].userId._id || response.body.data.reservations[0].userId).toBe(memberUser._id.toString());
    });

    it('should support filtering by book', async () => {
      const response = await request(app)
        .get(`/api/reservations?bookId=${book._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservations).toHaveLength(2);
    });
  });

  describe('GET /api/reservations/:id', () => {
    let reservation;

    beforeEach(async () => {
      reservation = new Reservation({
        userId: memberUser._id,
        bookId: book._id,
        position: 1,
        status: config.RESERVATION_STATUS.PENDING,
      });
      await reservation.save();
    });

    it('should get own reservation as member', async () => {
      const response = await request(app)
        .get(`/api/reservations/${reservation._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservation._id).toBe(reservation._id.toString());
    });

    it('should get any reservation as librarian', async () => {
      const response = await request(app)
        .get(`/api/reservations/${reservation._id}`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservation._id).toBe(reservation._id.toString());
    });

    it('should not get another user\'s reservation as member', async () => {
      // Create reservation for admin
      const adminReservation = new Reservation({
        userId: adminUser._id,
        bookId: book._id,
        position: 2,
        status: config.RESERVATION_STATUS.PENDING,
      });
      await adminReservation.save();

      const response = await request(app)
        .get(`/api/reservations/${adminReservation._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('DELETE /api/reservations/:id', () => {
    let reservation;

    beforeEach(async () => {
      reservation = new Reservation({
        userId: memberUser._id,
        bookId: book._id,
        position: 1,
        status: config.RESERVATION_STATUS.PENDING,
      });
      await reservation.save();
    });

    it('should cancel own reservation as member', async () => {
      const cancelData = {
        reason: 'No longer needed',
      };

      const response = await request(app)
        .delete(`/api/reservations/${reservation._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reservation cancelled successfully');
      expect(response.body.data.reservation.status).toBe(config.RESERVATION_STATUS.CANCELLED);
    });

    it('should cancel any reservation as librarian', async () => {
      const cancelData = {
        reason: 'Cancelled by librarian',
      };

      const response = await request(app)
        .delete(`/api/reservations/${reservation._id}`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reservation cancelled successfully');
    });

    it('should update queue positions after cancellation', async () => {
      // Create second reservation
      const secondReservation = new Reservation({
        userId: adminUser._id,
        bookId: book._id,
        position: 2,
        status: config.RESERVATION_STATUS.PENDING,
      });
      await secondReservation.save();

      // Cancel first reservation
      await request(app)
        .delete(`/api/reservations/${reservation._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      // Check that second reservation moved to position 1
      const updatedReservation = await Reservation.findById(secondReservation._id);
      expect(updatedReservation.position).toBe(1);
    });

    it('should not cancel already cancelled reservation', async () => {
      // Cancel reservation first
      await request(app)
        .delete(`/api/reservations/${reservation._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      // Try to cancel again
      const response = await request(app)
        .delete(`/api/reservations/${reservation._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only pending reservations can be cancelled');
    });
  });

  describe('GET /api/reservations/book/:bookId/queue', () => {
    beforeEach(async () => {
      // Create reservations queue
      const reservation1 = new Reservation({
        userId: memberUser._id,
        bookId: book._id,
        position: 1,
        status: config.RESERVATION_STATUS.PENDING,
      });

      const reservation2 = new Reservation({
        userId: adminUser._id,
        bookId: book._id,
        position: 2,
        status: config.RESERVATION_STATUS.PENDING,
      });

      await reservation1.save();
      await reservation2.save();
    });

    it('should get book reservation queue as librarian', async () => {
      const response = await request(app)
        .get(`/api/reservations/book/${book._id}/queue`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.queue).toHaveLength(2);
      expect(response.body.data.queue[0].position).toBe(1);
      expect(response.body.data.queue[1].position).toBe(2);
      expect(response.body.data.queueLength).toBe(2);
      expect(response.body.data.book).toBeDefined();
    });

    it('should get book reservation queue as admin', async () => {
      const response = await request(app)
        .get(`/api/reservations/book/${book._id}/queue`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.queue).toHaveLength(2);
    });

    it('should not get book reservation queue as member', async () => {
      const response = await request(app)
        .get(`/api/reservations/book/${book._id}/queue`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('GET /api/reservations/user/:userId', () => {
    beforeEach(async () => {
      const reservation = new Reservation({
        userId: memberUser._id,
        bookId: book._id,
        position: 1,
        status: config.RESERVATION_STATUS.PENDING,
      });
      await reservation.save();
    });

    it('should get own reservations as member', async () => {
      const response = await request(app)
        .get(`/api/reservations/user/${memberUser._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservations).toHaveLength(1);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.count).toBe(1);
    });

    it('should get any user reservations as librarian', async () => {
      const response = await request(app)
        .get(`/api/reservations/user/${memberUser._id}`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservations).toHaveLength(1);
    });

    it('should not get another user\'s reservations as member', async () => {
      const response = await request(app)
        .get(`/api/reservations/user/${adminUser._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('PUT /api/reservations/:id/fulfill', () => {
    let reservation;

    beforeEach(async () => {
      reservation = new Reservation({
        userId: memberUser._id,
        bookId: book._id,
        position: 1,
        status: config.RESERVATION_STATUS.PENDING,
      });
      await reservation.save();
    });

    it('should fulfill reservation as librarian', async () => {
      const response = await request(app)
        .put(`/api/reservations/${reservation._id}/fulfill`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reservation fulfilled successfully');
      expect(response.body.data.reservation.status).toBe(config.RESERVATION_STATUS.FULFILLED);
    });

    it('should fulfill reservation as admin', async () => {
      const response = await request(app)
        .put(`/api/reservations/${reservation._id}/fulfill`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reservation fulfilled successfully');
    });

    it('should not fulfill reservation as member', async () => {
      const response = await request(app)
        .put(`/api/reservations/${reservation._id}/fulfill`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('GET /api/reservations/stats', () => {
    beforeEach(async () => {
      // Create various reservations for statistics
      const reservations = [
        new Reservation({
          userId: memberUser._id,
          bookId: book._id,
          position: 1,
          status: config.RESERVATION_STATUS.PENDING,
        }),
        new Reservation({
          userId: adminUser._id,
          bookId: book._id,
          position: 2,
          status: config.RESERVATION_STATUS.FULFILLED,
          fulfilledDate: new Date(),
        }),
      ];

      await Reservation.insertMany(reservations);
    });

    it('should get reservation statistics as admin', async () => {
      const response = await request(app)
        .get('/api/reservations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.total).toBe(2);
      expect(response.body.data.stats.active).toBe(1);
    });

    it('should get reservation statistics as librarian', async () => {
      const response = await request(app)
        .get('/api/reservations/stats')
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should not get reservation statistics as member', async () => {
      const response = await request(app)
        .get('/api/reservations/stats')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('POST /api/reservations/expire', () => {
    it('should expire old reservations as librarian', async () => {
      // Create expired reservation using direct MongoDB operation
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Expired yesterday
      const reservationDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      
      await Reservation.collection.insertOne({
        userId: memberUser._id,
        bookId: book._id,
        position: 1,
        status: config.RESERVATION_STATUS.PENDING,
        reservationDate: reservationDate,
        expiryDate: expiredDate,
        createdAt: reservationDate,
        updatedAt: reservationDate,
      });

      // Verify the expired reservation exists before expiring
      const expiredReservations = await Reservation.find({
        status: config.RESERVATION_STATUS.PENDING,
        expiryDate: { $lt: new Date() },
      });
      expect(expiredReservations.length).toBe(1);

      const response = await request(app)
        .post('/api/reservations/expire')
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.expiredCount).toBe(1);
    });

    it('should expire old reservations as admin', async () => {
      // Create expired reservation using direct MongoDB operation
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Expired yesterday
      const reservationDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      
      await Reservation.collection.insertOne({
        userId: memberUser._id,
        bookId: book._id,
        position: 1,
        status: config.RESERVATION_STATUS.PENDING,
        reservationDate: reservationDate,
        expiryDate: expiredDate,
        createdAt: reservationDate,
        updatedAt: reservationDate,
      });

      const response = await request(app)
        .post('/api/reservations/expire')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.expiredCount).toBe(1);
    });

    it('should not expire reservations as member', async () => {
      const response = await request(app)
        .post('/api/reservations/expire')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });
});
