const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const { generateToken } = require('../config/jwt');

describe('Category Management Endpoints', () => {
  let adminUser, librarianUser, memberUser;
  let adminToken, librarianToken, memberToken;

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
  });

  describe('GET /api/categories', () => {
    beforeEach(async () => {
      // Create test categories
      const categories = [
        { name: 'Fiction', description: 'Fictional literature', color: '#007bff' },
        { name: 'Science', description: 'Scientific literature', color: '#28a745' },
        { name: 'History', description: 'Historical books', color: '#ffc107' },
      ];
      await Category.insertMany(categories);
    });

    it('should get all categories (public access)', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/categories?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/categories?sortBy=name&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories[0].name).toBe('Science');
    });
  });

  describe('GET /api/categories/search', () => {
    beforeEach(async () => {
      const categories = [
        { name: 'Computer Science', description: 'Programming and technology books' },
        { name: 'Natural Science', description: 'Biology, chemistry, physics' },
        { name: 'Fiction', description: 'Novels and stories' },
      ];
      await Category.insertMany(categories);
    });

    it('should search categories by name', async () => {
      const response = await request(app)
        .get('/api/categories/search?q=Science')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(2);
      expect(response.body.data.query).toBe('Science');
    });

    it('should search categories by description', async () => {
      const response = await request(app)
        .get('/api/categories/search?q=programming')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(1);
      expect(response.body.data.categories[0].name).toBe('Computer Science');
    });
  });

  describe('POST /api/categories', () => {
    it('should create category as admin', async () => {
      const categoryData = {
        name: 'Technology',
        description: 'Books about technology and computers',
        color: '#17a2b8',
        icon: 'laptop',
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Category created successfully');
      expect(response.body.data.category.name).toBe(categoryData.name);
      expect(response.body.data.category.slug).toBe('technology');
    });

    it('should not create category as librarian', async () => {
      const categoryData = {
        name: 'Technology',
        description: 'Books about technology',
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(categoryData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not create category as member', async () => {
      const categoryData = {
        name: 'Technology',
        description: 'Books about technology',
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(categoryData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const categoryData = {
        description: 'Missing name field',
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should not create duplicate category names', async () => {
      const categoryData = {
        name: 'Fiction',
        description: 'Fictional literature',
      };

      // Create first category
      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Category with this name already exists');
    });

    it('should validate color format', async () => {
      const categoryData = {
        name: 'Technology',
        description: 'Tech books',
        color: 'invalid-color',
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/categories/:id', () => {
    let category;

    beforeEach(async () => {
      category = new Category({
        name: 'Fiction',
        description: 'Fictional literature',
        color: '#007bff',
      });
      await category.save();
    });

    it('should get single category (public access)', async () => {
      const response = await request(app)
        .get(`/api/categories/${category._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category.name).toBe(category.name);
      expect(response.body.data.category.fullPath).toBeDefined();
    });

    it('should return 404 for non-existent category', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/categories/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Category not found');
    });
  });

  describe('PUT /api/categories/:id', () => {
    let category;

    beforeEach(async () => {
      category = new Category({
        name: 'Fiction',
        description: 'Fictional literature',
        color: '#007bff',
      });
      await category.save();
    });

    it('should update category as admin', async () => {
      const updateData = {
        name: 'Updated Fiction',
        description: 'Updated description',
        color: '#28a745',
      };

      const response = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Category updated successfully');
      expect(response.body.data.category.name).toBe(updateData.name);
      expect(response.body.data.category.description).toBe(updateData.description);
    });

    it('should not update category as librarian', async () => {
      const updateData = {
        name: 'Updated Fiction',
      };

      const response = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate name uniqueness on update', async () => {
      // Create another category
      const anotherCategory = new Category({
        name: 'Science',
        description: 'Scientific literature',
      });
      await anotherCategory.save();

      // Try to update first category with second category's name
      const updateData = { name: 'Science' };

      const response = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Category with this name already exists');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    let category;

    beforeEach(async () => {
      category = new Category({
        name: 'Fiction',
        description: 'Fictional literature',
      });
      await category.save();
    });

    it('should delete category as admin', async () => {
      const response = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Category deleted successfully');

      // Verify category is soft deleted
      const deletedCategory = await Category.findById(category._id);
      expect(deletedCategory.isActive).toBe(false);
    });

    it('should not delete category as librarian', async () => {
      const response = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/categories/tree', () => {
    beforeEach(async () => {
      // Create parent category
      const parentCategory = new Category({
        name: 'Science',
        description: 'Scientific literature',
      });
      await parentCategory.save();

      // Create subcategories
      const subcategories = [
        {
          name: 'Physics',
          description: 'Physics books',
          parentCategory: parentCategory._id,
        },
        {
          name: 'Chemistry',
          description: 'Chemistry books',
          parentCategory: parentCategory._id,
        },
      ];
      await Category.insertMany(subcategories);
    });

    it('should get category tree (public access)', async () => {
      const response = await request(app)
        .get('/api/categories/tree')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toBeDefined();
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });

  describe('GET /api/categories/popular', () => {
    beforeEach(async () => {
      const categories = [
        { name: 'Fiction', description: 'Fictional literature' },
        { name: 'Science', description: 'Scientific literature' },
        { name: 'History', description: 'Historical books' },
      ];
      await Category.insertMany(categories);
    });

    it('should get popular categories (public access)', async () => {
      const response = await request(app)
        .get('/api/categories/popular?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toBeDefined();
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/categories/popular?limit=100')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/categories/stats', () => {
    beforeEach(async () => {
      const categories = [
        { name: 'Fiction', description: 'Fictional literature' },
        { name: 'Science', description: 'Scientific literature' },
      ];
      await Category.insertMany(categories);
    });

    it('should get category statistics as admin', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.total).toBe(2);
    });

    it('should get category statistics as librarian', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should not get category statistics as member', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/categories/with-counts', () => {
    beforeEach(async () => {
      const categories = [
        { name: 'Fiction', description: 'Fictional literature' },
        { name: 'Science', description: 'Scientific literature' },
      ];
      await Category.insertMany(categories);
    });

    it('should get categories with book counts (public access)', async () => {
      const response = await request(app)
        .get('/api/categories/with-counts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toBeDefined();
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      expect(response.body.data.categories[0].booksCount).toBeDefined();
    });
  });
});
