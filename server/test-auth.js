require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/database');

async function testAuth() {
  try {
    console.log('🔍 Testing database connection and authentication...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully');
    
    // Find admin user
    const adminUser = await User.findByEmail('admin@library.com').select('+password');
    console.log('👤 Admin user found:', adminUser ? 'Yes' : 'No');
    
    if (adminUser) {
      console.log('📧 Admin email:', adminUser.email);
      console.log('🔑 Admin role:', adminUser.role);
      console.log('📊 Admin status:', adminUser.status);
      console.log('🔒 Password hash exists:', adminUser.password ? 'Yes' : 'No');
      
      // Test password comparison
      const isPasswordValid = await adminUser.comparePassword('Admin@123456');
      console.log('🔐 Password validation:', isPasswordValid ? 'Valid' : 'Invalid');
    }
    
    // List all users
    const allUsers = await User.find({});
    console.log('👥 Total users in database:', allUsers.length);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAuth();
