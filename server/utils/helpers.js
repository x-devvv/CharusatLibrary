const crypto = require('crypto');
const config = require('../config/config');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate random number
const generateRandomNumber = (min = 1000, max = 9999) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Format date to readable string
const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  
  return new Date(date).toLocaleDateString('en-US', defaultOptions);
};

// Format date and time
const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calculate days between dates
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  
  return Math.round(Math.abs((firstDate - secondDate) / oneDay));
};

// Check if date is in the past
const isPastDate = (date) => {
  return new Date(date) < new Date();
};

// Check if date is in the future
const isFutureDate = (date) => {
  return new Date(date) > new Date();
};

// Add days to date
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Subtract days from date
const subtractDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number format
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  return phoneRegex.test(phone);
};

// Validate ISBN format
const isValidISBN = (isbn) => {
  const isbnRegex = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;
  return isbnRegex.test(isbn);
};

// Sanitize string for search
const sanitizeSearchString = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Generate slug from string
const generateSlug = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Capitalize first letter
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Capitalize each word
const capitalizeWords = (str) => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Truncate string
const truncateString = (str, length = 100, suffix = '...') => {
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

// Remove HTML tags
const stripHtml = (html) => {
  return html.replace(/<[^>]*>/g, '');
};

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Calculate fine amount
const calculateFine = (daysOverdue, finePerDay = config.FINE_PER_DAY) => {
  return Math.max(0, daysOverdue * finePerDay);
};

// Generate due date
const generateDueDate = (borrowDate = new Date(), loanPeriod = config.LOAN_PERIOD_DAYS) => {
  return addDays(borrowDate, loanPeriod);
};

// Check if user can borrow more books
const canBorrowMoreBooks = (currentBorrowings, maxBorrowings = 5) => {
  return currentBorrowings < maxBorrowings;
};

// Generate pagination info
const generatePaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
};

// Generate search query for MongoDB
const generateSearchQuery = (searchTerm, fields) => {
  if (!searchTerm) return {};
  
  const sanitizedTerm = sanitizeSearchString(searchTerm);
  const regex = new RegExp(sanitizedTerm, 'i');
  
  return {
    $or: fields.map(field => ({ [field]: regex })),
  };
};

// Generate sort object for MongoDB
const generateSortObject = (sortBy = 'createdAt', sortOrder = 'desc') => {
  return { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
};

// Validate ObjectId
const isValidObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

// Generate API response
const generateApiResponse = (success, data = null, message = null, errors = null) => {
  const response = { success };
  
  if (message) response.message = message;
  if (data) response.data = data;
  if (errors) response.errors = errors;
  
  return response;
};

// Generate success response
const successResponse = (data, message = 'Success') => {
  return generateApiResponse(true, data, message);
};

// Generate error response
const errorResponse = (message = 'Error', errors = null) => {
  return generateApiResponse(false, null, message, errors);
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Remove undefined values from object
const removeUndefined = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

// Get file extension
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// Check if file is image
const isImageFile = (filename) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const extension = getFileExtension(filename).toLowerCase();
  return imageExtensions.includes(extension);
};

// Generate random color
const generateRandomColor = () => {
  const colors = [
    '#007bff', '#6c757d', '#28a745', '#dc3545', '#ffc107',
    '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Delay function for testing
const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports = {
  generateRandomString,
  generateRandomNumber,
  formatDate,
  formatDateTime,
  daysBetween,
  isPastDate,
  isFutureDate,
  addDays,
  subtractDays,
  isValidEmail,
  isValidPhone,
  isValidISBN,
  sanitizeSearchString,
  generateSlug,
  capitalize,
  capitalizeWords,
  truncateString,
  stripHtml,
  formatCurrency,
  calculateFine,
  generateDueDate,
  canBorrowMoreBooks,
  generatePaginationInfo,
  generateSearchQuery,
  generateSortObject,
  isValidObjectId,
  generateApiResponse,
  successResponse,
  errorResponse,
  deepClone,
  removeUndefined,
  getFileExtension,
  isImageFile,
  generateRandomColor,
  delay,
};
