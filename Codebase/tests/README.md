# IUTverse Test Suite

This directory contains all test-related files for the IUTverse project.

## Directory Structure

```
tests/
├── README.md           # This file - documentation for the test suite
├── server/            # Server-side tests
│   ├── test-auth.js   # Node.js authentication test script
│   ├── test-auth.ps1  # PowerShell authentication test script
│   ├── test-routes.ps1 # PowerShell API routes test script
│   └── test-simple.ps1 # Simple PowerShell authentication test
└── client/            # Client-side tests (future)
    └── (client tests will go here)
```

## Server Tests

### Prerequisites
- Server should be running on `http://localhost:3000`
- For Node.js tests: `npm install node-fetch` (if not already installed)

### Running Tests

#### Using the Test Runner (Recommended)
```powershell
# Run all tests
.\run-tests.ps1

# Run specific test types
.\run-tests.ps1 -TestType auth     # Authentication tests only
.\run-tests.ps1 -TestType routes   # Routes tests only  
.\run-tests.ps1 -TestType simple   # Simple tests only
.\run-tests.ps1 -TestType node     # Node.js tests only
```

#### Running Individual Tests

##### Node.js Authentication Test
```bash
cd tests/server
node test-auth.js
```

##### PowerShell Tests
```powershell
# Authentication test (detailed)
powershell -ExecutionPolicy Bypass -File tests/server/test-auth.ps1

# Simple authentication test
powershell -ExecutionPolicy Bypass -File tests/server/test-simple.ps1

# API routes test
powershell -ExecutionPolicy Bypass -File tests/server/test-routes.ps1
```

### Test Descriptions

- **test-auth.js**: Comprehensive Node.js script for testing authentication endpoints (signup/login)
- **test-auth.ps1**: PowerShell script for testing authentication with detailed output
- **test-simple.ps1**: Simplified PowerShell authentication test
- **test-routes.ps1**: PowerShell script for testing various API endpoints and routes

## Future Test Structure

As the project grows, consider organizing tests as follows:

```
tests/
├── server/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── e2e/          # End-to-end tests
├── client/
│   ├── unit/         # Component unit tests
│   ├── integration/  # Client integration tests
│   └── e2e/         # End-to-end UI tests
└── shared/          # Shared test utilities and fixtures
```

## Adding New Tests

1. Place server tests in `tests/server/`
2. Place client tests in `tests/client/`
3. Follow naming convention: `test-[feature].js` or `test-[feature].ps1`
4. Update this README when adding new test categories
