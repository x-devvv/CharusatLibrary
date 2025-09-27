# Library Management System - Test Suite

This directory contains comprehensive tests for the Library Management System backend API, covering all features and requirements specified in the project documentation.

## 🧪 Test Overview

The test suite validates all aspects of the library management system according to the requirements from:
- MERN-Library-Research.md
- library_management_features.csv  
- library_management_tech_stack.csv

### Test Coverage Areas

| Test File | Coverage Area | Description |
|-----------|---------------|-------------|
| `auth.test.js` | Authentication & Authorization | User registration, login, JWT tokens, password management |
| `books.test.js` | Book Management | CRUD operations, ISBN validation, search, reviews |
| `users.test.js` | User Management | User profiles, role management, statistics |
| `transactions.test.js` | Circulation Management | Borrowing, returns, renewals, fine calculation |
| `reservations.test.js` | Reservation System | Queue management, notifications, fulfillment |
| `categories.test.js` | Category Management | Hierarchical categories, CRUD operations |
| `integration.test.js` | End-to-End Workflows | Complete library workflows, business rules |

## 🚀 Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure MongoDB is available (tests use in-memory MongoDB)
```

### Basic Test Commands
```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch

# Run specific test file
npm test -- auth.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should login"
```

### Advanced Test Runner
```bash
# Use the custom test runner
node tests/run-tests.js

# With coverage
node tests/run-tests.js --coverage

# Specific test file
node tests/run-tests.js --test=auth.test.js

# Watch mode
node tests/run-tests.js --watch

# Help
node tests/run-tests.js --help
```

## 📊 Test Results & Coverage

### Expected Coverage Targets
- **Overall Coverage**: >85%
- **Controllers**: >90%
- **Models**: >85%
- **Middleware**: >80%
- **Services**: >75%

### Coverage Reports
After running tests with coverage, reports are available at:
- `coverage/lcov-report/index.html` - Detailed HTML report
- `coverage/lcov.info` - LCOV format for CI/CD
- `coverage/coverage-final.json` - JSON format

## 🔍 Test Structure

### Test Organization
Each test file follows a consistent structure:

```javascript
describe('Feature Name', () => {
  // Setup and teardown
  beforeEach(async () => {
    // Create test data
  });

  describe('Endpoint Group', () => {
    it('should handle success case', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Test implementation
    });

    it('should validate permissions', async () => {
      // Test implementation
    });
  });
});
```

### Test Data Management
- **In-Memory Database**: Tests use MongoDB Memory Server for isolation
- **Clean State**: Each test starts with a clean database
- **Test Users**: Predefined admin, librarian, and member users
- **Sample Data**: Realistic test data matching production scenarios

## 🎯 Feature Testing Coverage

### Authentication & Authorization (auth.test.js)
✅ **High Priority Features Tested:**
- User Registration & Authentication
- Role-based Access Control (Admin/Librarian/Member)
- JWT token management
- Password security (hashing, validation)
- Profile management
- Password reset functionality

✅ **Test Scenarios:**
- Valid/invalid registration attempts
- Login with correct/incorrect credentials
- Token validation and expiration
- Role-based endpoint access
- Profile updates and validation
- Password change workflows

### Book Management (books.test.js)
✅ **High Priority Features Tested:**
- Add/Edit/Delete Books (Admin/Librarian only)
- Book Categorization & ISBN Management
- Inventory Tracking
- Advanced Search Capabilities
- Book reviews and ratings

✅ **Test Scenarios:**
- CRUD operations with proper permissions
- ISBN validation and duplicate prevention
- Search functionality with filters
- Availability tracking
- Review system validation
- Statistics generation

### User Management (users.test.js)
✅ **Features Tested:**
- User profile management
- Role assignment and updates
- User statistics and reporting
- Account status management

✅ **Test Scenarios:**
- Profile CRUD operations
- Permission-based access control
- User search and filtering
- Status updates (active/inactive/suspended)

### Transaction Management (transactions.test.js)
✅ **High Priority Features Tested:**
- Book Borrowing & Return Process
- Renewal Management
- Fine Calculation & Payment
- Overdue tracking and notifications

✅ **Test Scenarios:**
- Complete borrowing workflow
- Return processing with fine calculation
- Renewal limits and validation
- Overdue book handling
- Fine payment processing
- Transaction statistics

### Reservation System (reservations.test.js)
✅ **Features Tested:**
- Reservation creation and management
- Queue position tracking
- Automatic fulfillment
- Expiry handling

✅ **Test Scenarios:**
- Reservation creation for unavailable books
- Queue management and position updates
- Fulfillment when books become available
- Cancellation and expiry workflows

### Category Management (categories.test.js)
✅ **Features Tested:**
- Category CRUD operations
- Hierarchical category structure
- Category statistics and popular categories

✅ **Test Scenarios:**
- Category creation and validation
- Parent-child relationships
- Search and filtering
- Statistics generation

### Integration Testing (integration.test.js)
✅ **Complete Workflows Tested:**
- End-to-end library operations
- Business rule validation
- Cross-feature interactions
- Error handling and edge cases

✅ **Workflow Scenarios:**
- Complete book lifecycle (add → borrow → return → reserve)
- User management workflows
- Overdue handling with fines
- Reservation queue management
- Statistics and reporting

## 🛡️ Security Testing

### Authentication Security
- Password strength validation
- JWT token security
- Session management
- Rate limiting protection

### Authorization Testing
- Role-based access control
- Resource ownership validation
- Permission escalation prevention
- Cross-user data access prevention

### Input Validation
- SQL injection prevention
- XSS protection
- Input sanitization
- Data type validation

## 📈 Performance Testing

### Database Operations
- Query performance validation
- Index usage verification
- Connection pooling
- Transaction efficiency

### API Response Times
- Endpoint response time validation
- Pagination performance
- Search query optimization
- Concurrent request handling

## 🔧 Test Configuration

### Jest Configuration (jest.config.js)
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
```

### Test Environment Setup
- In-memory MongoDB for isolation
- Test-specific environment variables
- Mock external services (email, etc.)
- Consistent test data generation

## 🚨 Common Issues & Troubleshooting

### Database Connection Issues
```bash
# If MongoDB memory server fails to start
npm install mongodb-memory-server --save-dev

# Clear Jest cache
npx jest --clearCache
```

### Test Timeout Issues
```bash
# Increase Jest timeout in jest.config.js
module.exports = {
  testTimeout: 30000, // 30 seconds
};
```

### Coverage Issues
```bash
# Generate detailed coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## 📝 Test Maintenance

### Adding New Tests
1. Create test file following naming convention: `feature.test.js`
2. Follow existing test structure and patterns
3. Include both success and error scenarios
4. Test all permission levels
5. Update this documentation

### Test Data Management
- Use factories for consistent test data
- Clean up after each test
- Avoid test interdependencies
- Use realistic data that matches production

### Continuous Integration
Tests are designed to run in CI/CD environments:
- No external dependencies
- Deterministic results
- Proper cleanup
- Detailed reporting

## 🎯 Quality Metrics

### Test Quality Indicators
- **Test Coverage**: >85% overall
- **Test Speed**: <30 seconds for full suite
- **Test Reliability**: 0% flaky tests
- **Test Maintainability**: Clear, readable test code

### Business Logic Validation
- All user stories covered
- Edge cases handled
- Error conditions tested
- Performance requirements validated

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Note**: This test suite validates all requirements from the project documentation and ensures the library management system meets all specified functional and non-functional requirements.
