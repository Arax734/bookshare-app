// Jest setup file

// Mock fetch globally
global.fetch = jest.fn();

// Mock Firebase
jest.mock("./firebase/config", () => ({
  db: {},
  auth: {},
}));

// Mock Next.js cookies
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  })),
}));

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render is no longer supported") ||
        args[0].includes("Error fetching books:") ||
        args[0].includes("Error fetching book details:") ||
        args[0].includes("Error in recommendations API:") ||
        args[0].includes("Error fetching filtered books:") ||
        args[0].includes("Session error:") ||
        args[0].includes("Session deletion error:"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
