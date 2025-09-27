require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/database');
const config = require('./config/config');
const {
  handleUnhandledRejection,
  handleUncaughtException,
  handleSIGTERM,
  handleDBConnectionError,
} = require('./middleware/errorHandler');

// Handle uncaught exceptions
process.on('uncaughtException', handleUncaughtException);

// Connect to database
connectDB().catch(handleDBConnectionError);

// Start server
const server = app.listen(config.PORT, () => {
  console.log(`
🚀 Library Management System Server Started!
📍 Environment: ${config.NODE_ENV}
🌐 Server running on port ${config.PORT}
📊 Database: ${config.MONGODB_URI.includes('localhost') ? 'Local MongoDB' : 'Remote MongoDB'}
📧 Email Service: ${config.EMAIL.USER ? 'Configured' : 'Not Configured'}
🔐 JWT Secret: ${config.JWT_SECRET !== 'fallback_secret_key' ? 'Configured' : 'Using Fallback (Not Secure!)'}

📋 Available Endpoints:
   GET  /                     - API Information
   GET  /health              - Health Check
   GET  /api/status          - API Status
   
   🔐 Authentication:
   POST /api/auth/register   - Register User
   POST /api/auth/login      - Login User
   GET  /api/auth/profile    - Get Profile
   
   📚 Books:
   GET  /api/books           - Get All Books
   GET  /api/books/search    - Search Books
   POST /api/books           - Create Book (Admin/Librarian)
   
   👥 Users:
   GET  /api/users           - Get All Users (Admin/Librarian)
   POST /api/users           - Create User (Admin)
   
   📖 Transactions:
   POST /api/transactions/borrow  - Borrow Book
   PUT  /api/transactions/:id/return - Return Book
   
   📋 Reservations:
   GET  /api/reservations    - Get Reservations
   POST /api/reservations    - Create Reservation
   
   🏷️  Categories & Authors:
   GET  /api/categories      - Get Categories
   GET  /api/authors         - Get Authors

${config.NODE_ENV === 'development' ? `
🔧 Development Mode:
   - Detailed error messages enabled
   - CORS configured for localhost
   - Morgan logging enabled
   
⚠️  Remember to:
   - Set up your .env file with proper values
   - Configure email service for notifications
   - Set strong JWT secrets for production
` : ''}
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  handleUnhandledRejection(err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => handleSIGTERM(server));

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT. Shutting down gracefully...');
  server.close(() => {
    console.log('💥 Process terminated!');
    process.exit(0);
  });
});

// Schedule periodic tasks (if needed)
if (config.NODE_ENV === 'production') {
  const cron = require('node-cron');
  const FineService = require('./services/fineService');
  const NotificationService = require('./services/notificationService');
  const Reservation = require('./models/Reservation');

  // Update overdue fines every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly fine update...');
    await FineService.updateOverdueFines();
  });

  // Send daily notifications at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily notifications...');
    await NotificationService.runDailyNotifications();
  });

  // Expire old reservations daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Expiring old reservations...');
    await Reservation.expireOldReservations();
  });

  console.log('📅 Scheduled tasks configured for production environment');
}

module.exports = server;
