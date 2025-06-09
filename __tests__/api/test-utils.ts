// Test utilities for API testing
import { NextRequest } from "next/server";

export const createMockRequest = (
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): NextRequest => {
  const { method = "GET", body, headers = {} } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    requestInit.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

export const mockFirestoreResponse = (docs: any[] = []) => ({
  docs: docs.map((data) => ({
    data: () => data,
    id: Math.random().toString(36).substr(2, 9),
  })),
});

export const mockSuccessfulFetch = (data: any) => ({
  ok: true,
  status: 200,
  json: async () => data,
});

export const mockFailedFetch = (status: number = 500) => ({
  ok: false,
  status,
  statusText: `Error ${status}`,
  json: async () => ({ error: `API error: ${status}` }),
});

export const expectSuccessResponse = async (response: Response) => {
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toBeDefined();
  return data;
};

export const expectErrorResponse = async (
  response: Response,
  expectedStatus: number,
  expectedError: string
) => {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data).toEqual({ error: expectedError });
  return data;
};

// Mock data generators
export const generateMockBook = (overrides: any = {}) => ({
  id: Math.random().toString().padStart(14, "0"),
  title: "Mock Book Title",
  author: "Mock Author",
  isbn: "9781234567890",
  genre: "Fiction",
  language: "English",
  publicationYear: 2023,
  ...overrides,
});

export const generateMockBooks = (count: number, overrides: any = {}) =>
  Array.from({ length: count }, (_, i) =>
    generateMockBook({ ...overrides, id: (i + 1).toString().padStart(14, "0") })
  );

export const generateMockReview = (overrides: any = {}) => ({
  bookId: "00000000000001",
  userId: "user123",
  rating: 8,
  comment: "Great book!",
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const generateMockReviews = (count: number, overrides: any = {}) =>
  Array.from({ length: count }, (_, i) =>
    generateMockReview({ ...overrides, id: `review${i + 1}` })
  );

// Utility to suppress console.error during tests
export const suppressConsoleError = () => {
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  return consoleSpy;
};

export const withSuppressedConsoleError = async (
  testFn: () => Promise<void> | void
) => {
  const consoleSpy = suppressConsoleError();
  try {
    await testFn();
  } finally {
    consoleSpy.mockRestore();
  }
};
