🎯 Project Overview
The CHARUSAT Library Management System is a comprehensive full-stack web application built with the MERN stack (MongoDB, Express.js, React, Node.js) designed specifically for Charotar University of Science and Technology. This system streamlines library operations including book management, user authentication, transaction tracking, and administrative functions through an intuitive and modern interface.

✨ Key Features
🔐 Multi-Role Authentication - Admin, Librarian, Member, and Student access levels

📚 Advanced Book Management - Complete CRUD operations with search and filtering

💳 Transaction System - Book borrowing, returning, and automated fine calculations

🔍 Smart Search - Multi-criteria book discovery with real-time results

📱 Responsive Design - Mobile-first approach with dark theme support

📊 Analytics Dashboard - Real-time library statistics and insights

📧 Email Notifications - Automated alerts for due dates and reservations

🎨 Modern UI/UX - Built with Tailwind CSS and smooth Framer Motion animations

🛠️ Technology Stack
Frontend:

React 18.3.1 with Vite build tool

Tailwind CSS for styling

Framer Motion for animations

React Router v6 for navigation

Radix UI for accessible components

Lucide React for icons

Backend:

Node.js with Express.js 4.18.2

MongoDB with Mongoose ODM

JWT for authentication

Bcrypt for password hashing

Nodemailer for email services

Helmet for security

Development Tools:

ESLint & Prettier for code quality

Jest & Supertest for testing

Morgan for request logging

🚀 Installation & Setup
Prerequisites
Node.js (v16.0.0 or higher)

MongoDB (v4.4 or higher)

npm or yarn package manager

Quick Start
Clone Repository

bash
git clone <repository-url>
cd charusat-library-management
Backend Setup

bash
cd server
npm install
cp .env.example .env
# Configure environment variables in .env file
Frontend Setup

bash
cd ../client
npm install
Environment Configuration

Create .env file in server directory:

text
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/charusat_library
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ADMIN_EMAIL=admin@charusat.ac.in
ADMIN_PASSWORD=Admin@123456
FINE_PER_DAY=2.00
LOAN_PERIOD_DAYS=14
Start Development Servers

bash
# Start MongoDB
mongod

# Start backend (Terminal 1)
cd server && npm run dev

# Start frontend (Terminal 2)
cd client && npm run dev
Access Application

Frontend: http://localhost:5173

Backend API: http://localhost:5000

📁 Project Structure
text
CharusatLibrary/
├── client/                 # React Frontend Application
│   ├── src/
│   │   ├── components/     # Reusable UI Components
│   │   ├── pages/         # Route Components
│   │   ├── contexts/      # React Context Providers
│   │   ├── hooks/         # Custom React Hooks
│   │   └── assets/        # Static Assets
│   └── package.json
├── server/                # Node.js Backend Application
│   ├── controllers/       # Route Controllers
│   ├── models/           # Database Models
│   ├── routes/           # API Routes
│   ├── middleware/       # Express Middleware
│   ├── config/           # Configuration Files
│   └── package.json
└── README.md
🔑 Default Login Credentials
Role	Email	Password
Admin	admin@charusat.ac.in	Admin@123456
Librarian	librarian@charusat.ac.in	Librarian@123456
Student	student@charusat.ac.in	Student@123456
📋 API Documentation
Authentication Routes:

POST /api/auth/login - User login

POST /api/auth/register - User registration

GET /api/auth/profile - Get user profile

Book Management:

GET /api/books - Get all books

POST /api/books - Create new book

GET /api/books/search - Search books

PUT /api/books/:id - Update book

Transaction Management:

POST /api/transactions/borrow - Borrow book

PUT /api/transactions/:id/return - Return book

GET /api/transactions - Get user transactions

🧪 Testing
bash
# Run all tests
cd server && npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:auth
npm run test:books
🚢 Deployment
bash
# Build frontend for production
cd client && npm run build

# Start production server
cd ../server && NODE_ENV=production npm start
👥 Development Team
<div align="center">
Role	Name	Contribution
Team Leader	Dev Vadariya	Full-stack development, project architecture, database design, authentication system, project management
Team Member	Dhyey Thummar	Frontend development, UI/UX design, React components, responsive design, testing
</div>