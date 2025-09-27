const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    const shouldUseMemory = process.env.USE_IN_MEMORY_DB === 'true' || (!uri && process.env.NODE_ENV !== 'production');

    if (shouldUseMemory) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
      process.env.MONGODB_URI = uri;
      console.log(`Using in-memory MongoDB at ${uri}`);
    }

    if (!uri) {
      throw new Error('MONGODB_URI is not set and in-memory DB is not enabled');
    }

    const conn = await mongoose.connect(uri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
};

const createIndexes = async () => {
  try {
    // User indexes
    await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.db.collection('users').createIndex({ role: 1 });
    await mongoose.connection.db.collection('users').createIndex({ status: 1 });

    // Book indexes
    await mongoose.connection.db.collection('books').createIndex({ isbn: 1 }, { unique: true, sparse: true });
    await mongoose.connection.db.collection('books').createIndex({ title: 'text', description: 'text' });
    await mongoose.connection.db.collection('books').createIndex({ genre: 1 });
    await mongoose.connection.db.collection('books').createIndex({ status: 1 });
    await mongoose.connection.db.collection('books').createIndex({ availableCopies: 1 });

    // Transaction indexes
    await mongoose.connection.db.collection('transactions').createIndex({ userId: 1 });
    await mongoose.connection.db.collection('transactions').createIndex({ bookId: 1 });
    await mongoose.connection.db.collection('transactions').createIndex({ status: 1 });
    await mongoose.connection.db.collection('transactions').createIndex({ dueDate: 1 });
    await mongoose.connection.db.collection('transactions').createIndex({ borrowDate: 1 });

    // Author indexes
    await mongoose.connection.db.collection('authors').createIndex({ name: 1 });

    // Category indexes
    await mongoose.connection.db.collection('categories').createIndex({ name: 1 }, { unique: true });

    // Reservation indexes
    await mongoose.connection.db.collection('reservations').createIndex({ userId: 1 });
    await mongoose.connection.db.collection('reservations').createIndex({ bookId: 1 });
    await mongoose.connection.db.collection('reservations').createIndex({ status: 1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }
};

module.exports = connectDB;
