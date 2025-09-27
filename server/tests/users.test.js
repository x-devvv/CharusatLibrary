const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { generateToken } = require('../config/jwt');

describe('User Management Endpoints', () => {
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

  describe('GET /api/users', () => {
    it('should get all users as admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should get all users as librarian', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(3);
    });

    it('should not get all users as member', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should support filtering by role', async () => {
      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].role).toBe('admin');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/users?search=Admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].name).toBe('Admin User');
    });
  });

  describe('POST /api/users', () => {
    it('should create user as admin', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'NewUser@123456',
        role: 'member',
        phone: '+1-555-0123',
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should not create user as librarian', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'NewUser@123456',
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(userData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get own profile as member', async () => {
      const response = await request(app)
        .get(`/api/users/${memberUser._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user._id).toBe(memberUser._id.toString());
    });

    it('should get any user as admin', async () => {
      const response = await request(app)
        .get(`/api/users/${memberUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user._id).toBe(memberUser._id.toString());
    });

    it('should not get another user as member', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update own profile as member', async () => {
      const updateData = {
        name: 'Updated Member',
        phone: '+1-555-9999',
      };

      const response = await request(app)
        .put(`/api/users/${memberUser._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updateData.name);
    });

    it('should update any user as admin', async () => {
      const updateData = {
        name: 'Updated by Admin',
        role: 'librarian',
        status: 'inactive',
      };

      const response = await request(app)
        .put(`/api/users/${memberUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.role).toBe(updateData.role);
    });

    it('should not allow member to change role', async () => {
      const updateData = {
        role: 'admin', // Member trying to become admin
      };

      const response = await request(app)
        .put(`/api/users/${memberUser._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updateData)
        .expect(200);

      // Role should not be changed
      expect(response.body.data.user.role).toBe('member');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${memberUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deactivated
      const deletedUser = await User.findById(memberUser._id);
      expect(deletedUser.status).toBe('inactive');
    });

    it('should not delete user as librarian', async () => {
      const response = await request(app)
        .delete(`/api/users/${memberUser._id}`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/stats', () => {
    it('should get user statistics as admin', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.total).toBe(3);
    });

    it('should not get user statistics as member', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
