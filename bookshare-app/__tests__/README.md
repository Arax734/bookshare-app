# API Tests Documentation

## Overview

Comprehensive test suite for the Bookshare App API endpoints using Jest framework.

## Test Structure

### Test Files

- `books.test.ts` - Tests for `/api/books` endpoint
- `books-id.test.ts` - Tests for `/api/books/[id]` endpoint
- `auth-session.test.ts` - Tests for authentication session endpoints
- `recommendations.test.ts` - Tests for recommendations API
- `integration.test.ts` - Integration tests across multiple APIs
- `edge-cases.test.ts` - Edge cases and performance tests
- `test-utils.ts` - Utility functions for testing

### API Endpoints Tested

#### Books API (`/api/books`)

- ✅ Basic book search functionality
- ✅ Search by title, author, ISBN
- ✅ Pagination with `sinceId` parameter
- ✅ Limit parameter validation
- ✅ Error handling for API failures
- ✅ Network error handling
- ✅ Special characters in search queries

#### Book Details API (`/api/books/[id]`)

- ✅ Fetch individual book details
- ✅ Handle book not found scenarios
- ✅ API error responses
- ✅ Various book ID formats
- ✅ Multiple books in response handling

#### Authentication API (`/api/auth/session`)

- ✅ POST - Create session with Firebase token
- ✅ DELETE - Remove session
- ✅ Cookie security settings (httpOnly, secure, sameSite)
- ✅ Error handling for invalid tokens
- ✅ Environment-based security settings

#### Recommendations API (`/api/recommendations`)

- ✅ Generate recommendations based on user reviews
- ✅ Filter by genre, author, language, decade
- ✅ Exclude already reviewed books
- ✅ Handle users with no reviews
- ✅ Firebase integration for user data
- ✅ Complex recommendation logic

### Test Categories

#### Unit Tests

- Individual API endpoint functionality
- Input validation and sanitization
- Error handling scenarios
- Response format validation

#### Integration Tests

- Multi-API workflows (search → get details)
- Authentication flows
- Cross-API error consistency
- Parameter validation across endpoints

#### Edge Cases & Performance

- Large data handling
- Concurrent requests
- Memory leak prevention
- Timeout scenarios
- Special character handling
- Malformed data handling

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### API Tests Only

```bash
npm run test:api
```

### Coverage Report

```bash
npm run test:coverage
```

### CI Environment

```bash
npm run test:ci
```

## Test Configuration

### Jest Setup

- **Environment**: Node.js for API testing
- **Timeout**: 10 seconds for async operations
- **Coverage**: Focuses on `app/api` directory
- **Mocking**: Firebase, fetch, Next.js headers

### Mocked Dependencies

- `fetch` - HTTP requests to external APIs
- `firebase/firestore` - Database operations
- `next/headers` - Cookie management
- `console.error` - Reduces test noise

## Test Utilities

### `test-utils.ts`

Provides helper functions for:

- Creating mock requests
- Generating mock data
- Asserting responses
- Firebase mock responses

### Mock Data Generators

- `generateMockBook()` - Single book object
- `generateMockBooks()` - Array of books
- `generateMockReview()` - Review object
- `generateMockReviews()` - Array of reviews

## Coverage Goals

### Current Coverage Areas

- ✅ All API route handlers
- ✅ Error handling paths
- ✅ Input validation
- ✅ External API integration
- ✅ Authentication flows
- ✅ Database queries (mocked)

### Coverage Metrics

- **Statements**: Aim for >90%
- **Branches**: Aim for >85%
- **Functions**: Aim for >95%
- **Lines**: Aim for >90%

## Best Practices Implemented

### Test Organization

- Descriptive test names
- Grouped by API endpoint
- Separated concerns (unit/integration/edge cases)
- Clear setup and teardown

### Mocking Strategy

- Mock external dependencies only
- Preserve business logic testing
- Consistent mock implementations
- Realistic mock data

### Error Testing

- Network failures
- API service errors
- Invalid input data
- Edge case scenarios

### Performance Testing

- Large payload handling
- Concurrent request scenarios
- Memory usage patterns
- Timeout handling

## Continuous Integration

### Pre-commit Hooks

Tests should run before commits to ensure code quality.

### CI Pipeline Integration

- Run full test suite on pull requests
- Generate coverage reports
- Fail builds on test failures
- Performance regression detection

## Future Enhancements

### Additional Test Areas

- [ ] WebSocket API testing (if implemented)
- [ ] File upload endpoints
- [ ] Rate limiting behavior
- [ ] Caching layer testing

### Test Infrastructure

- [ ] Visual regression testing
- [ ] API contract testing
- [ ] Load testing integration
- [ ] Security vulnerability testing

## Troubleshooting

### Common Issues

#### Mock Setup Problems

- Ensure all external dependencies are mocked
- Check mock implementation matches actual API

#### Async Test Failures

- Use proper async/await patterns
- Set appropriate timeouts
- Handle Promise rejections

#### Coverage Issues

- Verify all code paths are tested
- Check for untested error conditions
- Review branch coverage reports
