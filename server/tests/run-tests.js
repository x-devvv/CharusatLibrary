#!/usr/bin/env node

/**
 * Test Runner Script for Library Management System
 * 
 * This script provides a comprehensive test runner that:
 * 1. Sets up the test environment
 * 2. Runs all test suites
 * 3. Generates coverage reports
 * 4. Provides detailed test results
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test configuration
const testConfig = {
  testDir: path.join(__dirname),
  coverageDir: path.join(__dirname, '..', 'coverage'),
  testFiles: [
    'auth.test.js',
    'books.test.js',
    'users.test.js',
    'transactions.test.js',
    'reservations.test.js',
    'categories.test.js',
    'integration.test.js',
  ],
};

// Utility functions
const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logHeader = (message) => {
  const border = '='.repeat(60);
  log(`\n${border}`, colors.cyan);
  log(`${message}`, colors.cyan + colors.bright);
  log(`${border}`, colors.cyan);
};

const logSection = (message) => {
  log(`\n${colors.yellow}${colors.bright}📋 ${message}${colors.reset}`);
};

const logSuccess = (message) => {
  log(`${colors.green}✅ ${message}${colors.reset}`);
};

const logError = (message) => {
  log(`${colors.red}❌ ${message}${colors.reset}`);
};

const logWarning = (message) => {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
};

const logInfo = (message) => {
  log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
};

// Check if test files exist
const checkTestFiles = () => {
  logSection('Checking Test Files');
  
  const missingFiles = [];
  testConfig.testFiles.forEach(file => {
    const filePath = path.join(testConfig.testDir, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`Found: ${file}`);
    } else {
      logError(`Missing: ${file}`);
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    logError(`Missing ${missingFiles.length} test files. Please create them before running tests.`);
    return false;
  }

  logSuccess('All test files found!');
  return true;
};

// Run Jest tests
const runTests = (options = {}) => {
  return new Promise((resolve, reject) => {
    logSection('Running Tests');
    
    const jestArgs = [
      '--config', path.join(__dirname, '..', 'jest.config.js'),
      '--verbose',
    ];

    // Add coverage if requested
    if (options.coverage) {
      jestArgs.push('--coverage');
      logInfo('Coverage reporting enabled');
    }

    // Add watch mode if requested
    if (options.watch) {
      jestArgs.push('--watch');
      logInfo('Watch mode enabled');
    }

    // Add specific test pattern if provided
    if (options.testPattern) {
      jestArgs.push('--testNamePattern', options.testPattern);
      logInfo(`Running tests matching: ${options.testPattern}`);
    }

    // Add specific test file if provided
    if (options.testFile) {
      jestArgs.push(path.join(testConfig.testDir, options.testFile));
      logInfo(`Running specific test file: ${options.testFile}`);
    }

    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    jest.on('close', (code) => {
      if (code === 0) {
        logSuccess('All tests passed!');
        resolve(code);
      } else {
        logError(`Tests failed with exit code ${code}`);
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    jest.on('error', (error) => {
      logError(`Failed to start test runner: ${error.message}`);
      reject(error);
    });
  });
};

// Generate test report
const generateReport = () => {
  logSection('Test Report Summary');
  
  const coveragePath = path.join(testConfig.coverageDir, 'lcov-report', 'index.html');
  
  if (fs.existsSync(coveragePath)) {
    logSuccess(`Coverage report generated: ${coveragePath}`);
    logInfo('Open the coverage report in your browser to view detailed results');
  } else {
    logWarning('Coverage report not found. Run tests with --coverage flag to generate it.');
  }

  // Check for test results
  const testResultsPath = path.join(testConfig.coverageDir, 'test-results.json');
  if (fs.existsSync(testResultsPath)) {
    logSuccess('Test results saved');
  }
};

// Main test runner function
const runTestSuite = async (options = {}) => {
  try {
    logHeader('Library Management System - Test Runner');
    
    // Check environment
    logSection('Environment Check');
    logInfo(`Node.js version: ${process.version}`);
    logInfo(`Test directory: ${testConfig.testDir}`);
    logInfo(`Coverage directory: ${testConfig.coverageDir}`);
    
    // Check if all test files exist
    if (!checkTestFiles()) {
      process.exit(1);
    }

    // Run tests
    await runTests(options);
    
    // Generate report
    if (options.coverage) {
      generateReport();
    }

    logHeader('Test Run Complete');
    logSuccess('All tests completed successfully!');
    
    // Additional information
    log('\n📊 Test Coverage Information:');
    log('  • Run with --coverage to generate detailed coverage reports');
    log('  • Coverage reports will be available in the coverage/ directory');
    log('  • Open coverage/lcov-report/index.html in your browser for detailed view');
    
    log('\n🔧 Available Test Commands:');
    log('  • npm test                    - Run all tests');
    log('  • npm run test:coverage       - Run tests with coverage');
    log('  • npm run test:watch          - Run tests in watch mode');
    log('  • node tests/run-tests.js     - Run this test runner');
    
    log('\n📝 Test Files:');
    testConfig.testFiles.forEach(file => {
      log(`  • ${file.padEnd(25)} - ${getTestDescription(file)}`);
    });

  } catch (error) {
    logHeader('Test Run Failed');
    logError(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Get test description based on filename
const getTestDescription = (filename) => {
  const descriptions = {
    'auth.test.js': 'Authentication and authorization tests',
    'books.test.js': 'Book management and CRUD operations',
    'users.test.js': 'User management and profile operations',
    'transactions.test.js': 'Book borrowing, returns, and renewals',
    'reservations.test.js': 'Book reservation system tests',
    'categories.test.js': 'Category management tests',
    'integration.test.js': 'End-to-end workflow tests',
  };
  return descriptions[filename] || 'Test suite';
};

// Parse command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach(arg => {
    switch (arg) {
      case '--coverage':
        options.coverage = true;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--test=')) {
          options.testFile = arg.split('=')[1];
        } else if (arg.startsWith('--pattern=')) {
          options.testPattern = arg.split('=')[1];
        }
    }
  });

  return options;
};

// Show help information
const showHelp = () => {
  logHeader('Library Management System - Test Runner Help');
  
  log('Usage: node tests/run-tests.js [options]');
  log('');
  log('Options:');
  log('  --coverage              Generate coverage reports');
  log('  --watch                 Run tests in watch mode');
  log('  --test=<filename>       Run specific test file');
  log('  --pattern=<pattern>     Run tests matching pattern');
  log('  --help, -h              Show this help message');
  log('');
  log('Examples:');
  log('  node tests/run-tests.js --coverage');
  log('  node tests/run-tests.js --test=auth.test.js');
  log('  node tests/run-tests.js --pattern="should login"');
  log('  node tests/run-tests.js --watch');
};

// Run the test suite if this file is executed directly
if (require.main === module) {
  const options = parseArgs();
  runTestSuite(options);
}

module.exports = {
  runTestSuite,
  checkTestFiles,
  runTests,
  generateReport,
};
