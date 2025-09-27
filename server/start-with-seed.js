require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./models/User');
const Category = require('./models/Category');
const Author = require('./models/Author');
const Book = require('./models/Book');

// Import config and database
const config = require('./config/config');
const connectDB = require('./config/database');

// Sample data (simplified version)
const sampleUsers = [
  {
    name: 'System Administrator',
    email: 'admin@library.com',
    password: 'Admin@123456',
    role: 'admin',
    status: 'active',
    emailVerified: true,
  },
  {
    name: 'Library Staff',
    email: 'librarian@library.com',
    password: 'Librarian@123456',
    role: 'librarian',
    status: 'active',
    emailVerified: true,
  },
  {
    name: 'John Doe',
    email: 'member@library.com',
    password: 'Member@123456',
    role: 'member',
    status: 'active',
    emailVerified: true,
  },
];

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');
    
    // Check if users already exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('✅ Database already seeded');
      return;
    }

    // Create users
    for (const userData of sampleUsers) {
      await User.create(userData);
    }
    
    console.log('✅ Database seeded successfully');
    console.log('👤 Default accounts created:');
    console.log('   Admin: admin@library.com / Admin@123456');
    console.log('   Librarian: librarian@library.com / Librarian@123456');
    console.log('   Member: member@library.com / Member@123456');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  }
}

async function startServer() {
  try {
    // Connect to database
    await connectDB();
    
    // Seed database if empty
    await seedDatabase();
    
    // Start the Express server
    const app = require('./app');
    const server = app.listen(config.PORT, () => {
      console.log(`
🚀 Library Management System Server Started!
📍 Environment: ${config.NODE_ENV}
🌐 Server running on port ${config.PORT}
📊 Database: In-Memory MongoDB
🔐 Authentication: Ready

📋 Available Endpoints:
   POST /api/auth/login      - Login User
   GET  /api/books           - Get All Books
   GET  /api/users           - Get All Users
   
🔧 Development Mode:
   - Auto-seeded with sample data
   - CORS configured for localhost
   - Ready for testing!
`);
    });

    // Handle server shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        mongoose.connection.close();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
