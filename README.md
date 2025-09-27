# 📚 CHARUSAT Library Management System

**A Modern Full-Stack Library Management System for CHARUSAT University**

## 🎯 Project Overview

The CHARUSAT Library Management System is a comprehensive full-stack web application built with the MERN stack (MongoDB, Express.js, React, Node.js) designed specifically for Charotar University of Science and Technology. This system streamlines library operations including book management, user authentication, transaction tracking, and administrative functions through an intuitive and modern interface.

## ✨ Key Features

- 🔐 **Multi-Role Authentication** - Admin, Librarian, Member, and Student access levels
- 📚 **Advanced Book Management** - Complete CRUD operations with search and filtering
- 💳 **Transaction System** - Book borrowing, returning, and automated fine calculations
- 🔍 **Smart Search** - Multi-criteria book discovery with real-time results
- 📱 **Responsive Design** - Mobile-first approach with dark theme support
- 📊 **Analytics Dashboard** - Real-time library statistics and insights
- 📧 **Email Notifications** - Automated alerts for due dates and reservations
- 🎨 **Modern UI/UX** - Built with Tailwind CSS and smooth Framer Motion animations

## 🛠️ Technology Stack

**Frontend:**
- React 18.3.1 with Vite build tool
- Tailwind CSS for styling
- Framer Motion for animations
- React Router v6 for navigation
- Radix UI for accessible components
- Lucide React for icons

**Backend:**
- Node.js with Express.js 4.18.2
- MongoDB with Mongoose ODM
- JWT for authentication
- Bcrypt for password hashing
- Nodemailer for email services
- Helmet for security

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16.0.0 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Quick Start

1. **Clone Repository**
git clone <repository-url>
cd charusat-library-management

2. **Backend Setup**
cd server
npm install
cp .env.example .env
Configure environment variables in .env file

3. **Frontend Setup**
cd ../client
npm install

4. **Environment Configuration**
Create `.env` file in server directory:

5. **Start Development Servers**
Start MongoDB
mongod



6. **Access Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000


Team Leader	Dev Vadariya	Frontend development, UI/UX design, testing Full-stack development
Team Member	Dhyey Thummar	architecture design, project management

Role	      Email	                     Password
Admin	      admin@charusat.ac.in	     Admin@123456
Librarian  	librarian@charusat.ac.in	 Librarian@123456
Student	    student@charusat.ac.in	   Student@123456

