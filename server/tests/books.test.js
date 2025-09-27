const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Book = require('../models/Book');
const Author = require('../models/Author');
const Category = require('../models/Category');
const { generateToken } = require('../config/jwt');

describe('Book Management Endpoints', () => {
  let adminUser, librarianUser, memberUser;
  let adminToken, librarianToken, memberToken;
  let category, author, sampleBook;

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

    // Create test category
    category = new Category({
      name: 'Fiction',
      description: 'Fictional literature',
      color: '#007bff',
    });
    await category.save();

    // Create test author
    author = new Author({
      name: 'Test Author',
      biography: 'A test author for testing purposes',
      nationality: 'American',
    });
    await author.save();

    // Create sample book data
    sampleBook = {
      title: 'Test Book',
      authors: [author._id],
      isbn: '9780123456789',
      genre: category._id,
      publishDate: new Date('2023-01-01'),
      publisher: 'Test Publisher',
      language: 'English',
      pages: 300,
      copies: 5,
      availableCopies: 5,
      description: 'A test book for testing purposes',
      location: {
        shelf: 'A1',
        section: 'Fiction',
        floor: 1,
      },
      tags: ['test', 'fiction'],
      price: 19.99,
    };
  });

  describe('GET /api/books', () => {
    beforeEach(async () => {
      // Create some test books
      const book1 = new Book({ ...sampleBook, title: 'Book 1' });
      const book2 = new Book({ ...sampleBook, title: 'Book 2', isbn: '9780123456790' });
      await book1.save();
      await book2.save();
    });

    it('should get all books (public access)', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.books).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/books?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.books).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.pages).toBe(2);
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/books?sortBy=title&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.books[0].title).toBe('Book 2');
      expect(response.body.data.books[1].title).toBe('Book 1');
    });
  });

  describe('GET /api/books/search', () => {
    beforeEach(async () => {
      const book1 = new Book({ ...sampleBook, title: 'JavaScript Guide', tags: ['programming', 'javascript'] });
      const book2 = new Book({ ...sampleBook, title: 'Python Basics', isbn: '9780123456790', tags: ['programming', 'python'] });
      await book1.save();
      await book2.save();
    });

    it('should search books by title', async () => {
      const response = await request(app)
        .get('/api/books/search?q=JavaScript')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.books).toHaveLength(1);
      expect(response.body.data.books[0].title).toBe('JavaScript Guide');
      expect(response.body.data.query).toBe('JavaScript');
    });

    it('should search books by tags', async () => {
      const response = await request(app)
        .get('/api/books/search?q=programming')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.books).toHaveLength(2);
    });

    it('should filter by genre', async () => {
      const response = await request(app)
        .get(`/api/books/search?genre=${category._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.books).toHaveLength(2);
    });

    it('should filter by author', async () => {
      const response = await request(app)
        .get(`/api/books/search?author=${author._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.books).toHaveLength(2);
    });

    it('should filter by availability', async () => {
      // Create an unavailable book
      const unavailableBook = new Book({ 
        ...sampleBook, 
        title: 'Unavailable Book',
        isbn: '9780123456791',
        availableCopies: 0 
      });
      await unavailableBook.save();

      const response = await request(app)
        .get('/api/books/search?availability=available')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.books).toHaveLength(2); // Only available books
    });
  });

  describe('GET /api/books/:id', () => {
    let book;

    beforeEach(async () => {
      book = new Book(sampleBook);
      await book.save();
    });

    it('should get single book by ID', async () => {
      const response = await request(app)
        .get(`/api/books/${book._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.book.title).toBe(book.title);
      expect(response.body.data.book.authors).toBeDefined();
      expect(response.body.data.book.genre).toBeDefined();
    });

    it('should return 404 for non-existent book', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/books/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Book not found');
    });

    it('should return 400 for invalid book ID', async () => {
      const response = await request(app)
        .get('/api/books/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/books', () => {
    it('should create book as admin', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleBook)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book created successfully');
      expect(response.body.data.book.title).toBe(sampleBook.title);
      expect(response.body.data.book.availableCopies).toBe(sampleBook.copies);
    });

    it('should create book as librarian', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(sampleBook)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book created successfully');
    });

    it('should not create book as member', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(sampleBook)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should not create book without authentication', async () => {
      const response = await request(app)
        .post('/api/books')
        .send(sampleBook)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });

    it('should validate required fields', async () => {
      const invalidBook = { title: 'Test Book' }; // Missing required fields

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBook)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate ISBN format', async () => {
      const invalidBook = { ...sampleBook, isbn: 'invalid-isbn' };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBook)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should not create book with duplicate ISBN', async () => {
      // Create first book
      await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleBook)
        .expect(201);

      // Try to create another book with same ISBN
      const duplicateBook = { ...sampleBook, title: 'Different Title' };
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateBook)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Book with this ISBN already exists');
    });

    it('should validate author existence', async () => {
      const invalidBook = { 
        ...sampleBook, 
        authors: ['507f1f77bcf86cd799439011'] // Non-existent author
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBook)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('One or more authors not found');
    });

    it('should validate genre existence', async () => {
      const invalidBook = { 
        ...sampleBook, 
        genre: '507f1f77bcf86cd799439011' // Non-existent genre
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBook)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Genre not found');
    });
  });

  describe('PUT /api/books/:id', () => {
    let book;

    beforeEach(async () => {
      book = new Book(sampleBook);
      await book.save();
    });

    it('should update book as admin', async () => {
      const updateData = {
        title: 'Updated Book Title',
        pages: 400,
        price: 24.99,
      };

      const response = await request(app)
        .put(`/api/books/${book._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book updated successfully');
      expect(response.body.data.book.title).toBe(updateData.title);
      expect(response.body.data.book.pages).toBe(updateData.pages);
      expect(response.body.data.book.price).toBe(updateData.price);
    });

    it('should update book as librarian', async () => {
      const updateData = { title: 'Updated by Librarian' };

      const response = await request(app)
        .put(`/api/books/${book._id}`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.book.title).toBe(updateData.title);
    });

    it('should not update book as member', async () => {
      const updateData = { title: 'Unauthorized Update' };

      const response = await request(app)
        .put(`/api/books/${book._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should handle copies update carefully', async () => {
      // Set book to have 2 borrowed copies (3 available out of 5 total)
      book.availableCopies = 3;
      await book.save();

      // Try to reduce total copies below borrowed amount
      const updateData = { copies: 1 }; // Would mean -1 available copies

      const response = await request(app)
        .put(`/api/books/${book._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot reduce copies below 2 (currently borrowed)');
    });

    it('should validate ISBN uniqueness on update', async () => {
      // Create another book
      const anotherBook = new Book({ 
        ...sampleBook, 
        title: 'Another Book',
        isbn: '9780987654321' 
      });
      await anotherBook.save();

      // Try to update first book with second book's ISBN
      const updateData = { isbn: '9780987654321' };

      const response = await request(app)
        .put(`/api/books/${book._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Book with this ISBN already exists');
    });
  });

  describe('DELETE /api/books/:id', () => {
    let book;

    beforeEach(async () => {
      book = new Book(sampleBook);
      await book.save();
    });

    it('should delete book as admin', async () => {
      const response = await request(app)
        .delete(`/api/books/${book._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book deleted successfully');

      // Verify book is soft deleted (marked as inactive)
      const deletedBook = await Book.findById(book._id);
      expect(deletedBook.isActive).toBe(false);
    });

    it('should not delete book as librarian', async () => {
      const response = await request(app)
        .delete(`/api/books/${book._id}`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should not delete book as member', async () => {
      const response = await request(app)
        .delete(`/api/books/${book._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('GET /api/books/popular', () => {
    it('should get popular books', async () => {
      // Create some books
      const book1 = new Book({ ...sampleBook, title: 'Popular Book 1' });
      const book2 = new Book({ ...sampleBook, title: 'Popular Book 2', isbn: '9780123456790' });
      await book1.save();
      await book2.save();

      const response = await request(app)
        .get('/api/books/popular?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.books).toBeDefined();
      expect(Array.isArray(response.body.data.books)).toBe(true);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/books/popular?limit=100')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/books/:id/reviews', () => {
    let book;

    beforeEach(async () => {
      book = new Book(sampleBook);
      await book.save();
    });

    it('should add review to book', async () => {
      // First, create a transaction history showing the user borrowed and returned the book
      const Transaction = require('../models/Transaction');
      const transaction = new Transaction({
        userId: memberUser._id,
        bookId: book._id,
        borrowDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        dueDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), // 16 days ago
        returnDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        status: 'returned',
        issuedBy: librarianUser._id,
        returnedBy: librarianUser._id,
      });
      await transaction.save();

      const reviewData = {
        rating: 5,
        comment: 'Excellent book! Highly recommended.',
      };

      const response = await request(app)
        .post(`/api/books/${book._id}/reviews`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review added successfully');
    });

    it('should validate rating range', async () => {
      const reviewData = {
        rating: 6, // Invalid rating
        comment: 'Great book!',
      };

      const response = await request(app)
        .post(`/api/books/${book._id}/reviews`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should require authentication for reviews', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Great book!',
      };

      const response = await request(app)
        .post(`/api/books/${book._id}/reviews`)
        .send(reviewData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/books/stats', () => {
    beforeEach(async () => {
      // Create some test books
      const book1 = new Book({ ...sampleBook, title: 'Book 1' });
      const book2 = new Book({ ...sampleBook, title: 'Book 2', isbn: '9780123456790', availableCopies: 0 });
      await book1.save();
      await book2.save();
    });

    it('should get book statistics as admin', async () => {
      const response = await request(app)
        .get('/api/books/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalBooks).toBe(2);
      expect(response.body.data.stats.availableBooks).toBe(1);
      expect(response.body.data.stats.borrowedBooks).toBe(1);
    });

    it('should get book statistics as librarian', async () => {
      const response = await request(app)
        .get('/api/books/stats')
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should not get book statistics as member', async () => {
      const response = await request(app)
        .get('/api/books/stats')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });
  });
});
