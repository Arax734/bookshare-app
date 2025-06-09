module.exports = {
  // API Test Suite Configuration
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  collectCoverageFrom: [
    "app/api/**/*.ts",
    "!app/api/**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 10000,
  verbose: true,
  // Test grouping
  projects: [
    {
      displayName: "API Tests",
      testMatch: ["<rootDir>/__tests__/api/**/*.test.ts"],
      testEnvironment: "node",
    },
  ],
};
