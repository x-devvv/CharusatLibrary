require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Category = require('../models/Category');
const Author = require('../models/Author');
const Book = require('../models/Book');

// Import config
const config = require('../config/config');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Sample data
const sampleCategories = [
  {
    name: 'Fiction',
    description: 'Fictional literature including novels and short stories',
    color: '#007bff',
    icon: 'book',
    sortOrder: 1,
  },
  {
    name: 'Non-Fiction',
    description: 'Factual books including biographies, history, and science',
    color: '#28a745',
    icon: 'book-open',
    sortOrder: 2,
  },
  {
    name: 'Science',
    description: 'Scientific literature and research',
    color: '#17a2b8',
    icon: 'flask',
    sortOrder: 3,
  },
  {
    name: 'Technology',
    description: 'Books about technology, programming, and computers',
    color: '#6c757d',
    icon: 'laptop',
    sortOrder: 4,
  },
  {
    name: 'History',
    description: 'Historical books and documentaries',
    color: '#ffc107',
    icon: 'clock',
    sortOrder: 5,
  },
  {
    name: 'Biography',
    description: 'Life stories of notable people',
    color: '#dc3545',
    icon: 'user',
    sortOrder: 6,
  },
];

const sampleAuthors = [
  {
    name: 'J.K. Rowling',
    biography: 'British author best known for the Harry Potter series',
    birthDate: new Date('1965-07-31'),
    nationality: 'British',
  },
  {
    name: 'George Orwell',
    biography: 'English novelist and essayist, known for 1984 and Animal Farm',
    birthDate: new Date('1903-06-25'),
    deathDate: new Date('1950-01-21'),
    nationality: 'British',
  },
  {
    name: 'Stephen King',
    biography: 'American author of horror, supernatural fiction, and fantasy novels',
    birthDate: new Date('1947-09-21'),
    nationality: 'American',
  },
  {
    name: 'Agatha Christie',
    biography: 'English writer known for detective novels featuring Hercule Poirot',
    birthDate: new Date('1890-09-15'),
    deathDate: new Date('1976-01-12'),
    nationality: 'British',
  },
  {
    name: 'Isaac Asimov',
    biography: 'American writer and professor of biochemistry, known for science fiction',
    birthDate: new Date('1920-01-02'),
    deathDate: new Date('1992-04-06'),
    nationality: 'American',
  },
];

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@library.com',
    password: 'Admin@123456',
    role: 'admin',
    phone: '+1-555-0001',
    address: {
      street: '123 Library St',
      city: 'Booktown',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
    },
    status: 'active',
    emailVerified: true,
  },
  {
    name: 'John Librarian',
    email: 'librarian@library.com',
    password: 'Librarian@123456',
    role: 'librarian',
    phone: '+1-555-0002',
    address: {
      street: '456 Book Ave',
      city: 'Booktown',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
    },
    status: 'active',
    emailVerified: true,
  },
  {
    name: 'Jane Member',
    email: 'member@library.com',
    password: 'Member@123456',
    role: 'member',
    phone: '+1-555-0003',
    address: {
      street: '789 Reader Rd',
      city: 'Booktown',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
    },
    status: 'active',
    emailVerified: true,
  },
];

// Seed functions
const seedCategories = async () => {
  try {
    await Category.deleteMany({});
    const categories = await Category.insertMany(sampleCategories);
    console.log(`✅ Seeded ${categories.length} categories`);
    return categories;
  } catch (error) {
    console.error('Error seeding categories:', error);
    throw error;
  }
};

const seedAuthors = async () => {
  try {
    await Author.deleteMany({});
    const authors = await Author.insertMany(sampleAuthors);
    console.log(`✅ Seeded ${authors.length} authors`);
    return authors;
  } catch (error) {
    console.error('Error seeding authors:', error);
    throw error;
  }
};

const seedUsers = async () => {
  try {
    await User.deleteMany({});
    
    // Hash passwords
    const usersWithHashedPasswords = await Promise.all(
      sampleUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, config.BCRYPT_SALT_ROUNDS),
      }))
    );
    
    const users = await User.insertMany(usersWithHashedPasswords);
    console.log(`✅ Seeded ${users.length} users`);
    return users;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

const seedBooks = async (categories, authors) => {
  try {
    await Book.deleteMany({});
    
    const sampleBooks = [
      {
        title: "Harry Potter and the Philosopher's Stone",
        authors: [authors.find(a => a.name === 'J.K. Rowling')._id],
        isbn: '9780747532699',
        genre: categories.find(c => c.name === 'Fiction')._id,
        publishDate: new Date('1997-06-26'),
        publisher: 'Bloomsbury',
        language: 'English',
        pages: 223,
        copies: 5,
        availableCopies: 5,
        description: 'The first book in the Harry Potter series about a young wizard.',
        location: {
          shelf: 'A1',
          section: 'Fiction',
          floor: 1,
        },
        tags: ['fantasy', 'magic', 'wizard', 'young adult'],
        price: 12.99,
      },
      {
        title: '1984',
        authors: [authors.find(a => a.name === 'George Orwell')._id],
        isbn: '9780451524935',
        genre: categories.find(c => c.name === 'Fiction')._id,
        publishDate: new Date('1949-06-08'),
        publisher: 'Secker & Warburg',
        language: 'English',
        pages: 328,
        copies: 3,
        availableCopies: 3,
        description: 'A dystopian social science fiction novel about totalitarian control.',
        location: {
          shelf: 'B2',
          section: 'Fiction',
          floor: 1,
        },
        tags: ['dystopian', 'political', 'classic'],
        price: 13.99,
      },
      {
        title: 'The Shining',
        authors: [authors.find(a => a.name === 'Stephen King')._id],
        isbn: '9780307743657',
        genre: categories.find(c => c.name === 'Fiction')._id,
        publishDate: new Date('1977-01-28'),
        publisher: 'Doubleday',
        language: 'English',
        pages: 447,
        copies: 2,
        availableCopies: 2,
        description: 'A horror novel about a family isolated in a haunted hotel.',
        location: {
          shelf: 'C3',
          section: 'Fiction',
          floor: 1,
        },
        tags: ['horror', 'psychological', 'thriller'],
        price: 14.99,
      },
      {
        title: 'Murder on the Orient Express',
        authors: [authors.find(a => a.name === 'Agatha Christie')._id],
        isbn: '9780062693662',
        genre: categories.find(c => c.name === 'Fiction')._id,
        publishDate: new Date('1934-01-01'),
        publisher: 'Collins Crime Club',
        language: 'English',
        pages: 256,
        copies: 4,
        availableCopies: 4,
        description: 'A detective novel featuring Hercule Poirot solving a murder mystery.',
        location: {
          shelf: 'D1',
          section: 'Fiction',
          floor: 1,
        },
        tags: ['mystery', 'detective', 'classic'],
        price: 11.99,
      },
      {
        title: 'Foundation',
        authors: [authors.find(a => a.name === 'Isaac Asimov')._id],
        isbn: '9780553293357',
        genre: categories.find(c => c.name === 'Science')._id,
        publishDate: new Date('1951-05-01'),
        publisher: 'Gnome Press',
        language: 'English',
        pages: 244,
        copies: 3,
        availableCopies: 3,
        description: 'A science fiction novel about the fall and rise of a galactic empire.',
        location: {
          shelf: 'E2',
          section: 'Science Fiction',
          floor: 2,
        },
        tags: ['science fiction', 'space', 'empire'],
        price: 15.99,
      },
    ];
    
    const books = await Book.insertMany(sampleBooks);
    console.log(`✅ Seeded ${books.length} books`);
    return books;
  } catch (error) {
    console.error('Error seeding books:', error);
    throw error;
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    // Seed in order due to dependencies
    const categories = await seedCategories();
    const authors = await seedAuthors();
    const users = await seedUsers();
    const books = await seedBooks(categories, authors);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Seeded Data Summary:');
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Authors: ${authors.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Books: ${books.length}`);
    
    console.log('\n👤 Default User Accounts:');
    console.log('   Admin: admin@library.com / Admin@123456');
    console.log('   Librarian: librarian@library.com / Librarian@123456');
    console.log('   Member: member@library.com / Member@123456');
    
    console.log('\n🚀 You can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📝 Database connection closed');
    process.exit(0);
  }
};

// Clear database function
const clearDatabase = async () => {
  try {
    console.log('🧹 Clearing database...');
    
    await connectDB();
    
    await Promise.all([
      User.deleteMany({}),
      Book.deleteMany({}),
      Author.deleteMany({}),
      Category.deleteMany({}),
      // Add other collections if needed
    ]);
    
    console.log('✅ Database cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
};

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'seed':
    seedDatabase();
    break;
  case 'clear':
    clearDatabase();
    break;
  default:
    console.log('Usage:');
    console.log('  npm run seed        - Seed the database with sample data');
    console.log('  npm run seed:clear  - Clear all data from the database');
    process.exit(1);
}

module.exports = {
  seedDatabase,
  clearDatabase,
};
