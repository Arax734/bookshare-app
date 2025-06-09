import { NextRequest } from "next/server";
import { GET as getBooksAPI } from "@/app/api/books/route";
import { GET as getBookByIdAPI } from "@/app/api/books/[id]/route";
import { GET as getRecommendationsAPI } from "@/app/api/recommendations/route";
import {
  POST as postSessionAPI,
  DELETE as deleteSessionAPI,
} from "@/app/api/auth/session/route";
import {
  createMockRequest,
  mockSuccessfulFetch,
  mockFailedFetch,
  generateMockBooks,
  expectSuccessResponse,
  expectErrorResponse,
} from "./test-utils";

// Mock fetch and Firebase
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
}));

describe("API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Books API Flow", () => {
    it("should search books and then get details for a specific book", async () => {
      const mockBooks = generateMockBooks(3);
      const searchResponse = { bibs: mockBooks };
      const bookDetailsResponse = { bibs: [mockBooks[0]] };

      // Mock search request
      mockFetch
        .mockResolvedValueOnce(mockSuccessfulFetch(searchResponse) as any)
        .mockResolvedValueOnce(mockSuccessfulFetch(bookDetailsResponse) as any);

      // First, search for books
      const searchRequest = createMockRequest(
        "http://localhost:3000/api/books?search=Harry Potter&searchType=title&limit=3"
      );
      const searchResponseObj = await getBooksAPI(searchRequest);
      const searchData = await expectSuccessResponse(searchResponseObj);

      expect(searchData.bibs).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("title=Harry%20Potter")
      );

      // Then, get details for the first book
      const bookId = searchData.bibs[0].id;
      const detailsRequest = createMockRequest(
        `http://localhost:3000/api/books/${bookId}`
      );
      const params = Promise.resolve({ id: bookId });
      const detailsResponseObj = await getBookByIdAPI(detailsRequest, {
        params,
      });
      const detailsData = await expectSuccessResponse(detailsResponseObj);

      expect(detailsData.id).toBe(bookId);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://data.bn.org.pl/api/networks/bibs.json?id=${bookId}`
      );
    });

    it("should handle search with no results and then fail to get book details", async () => {
      const emptySearchResponse = { bibs: [] };

      // Mock search with no results
      mockFetch
        .mockResolvedValueOnce(mockSuccessfulFetch(emptySearchResponse) as any)
        .mockResolvedValueOnce(mockSuccessfulFetch({ bibs: [] }) as any);

      // Search for books (no results)
      const searchRequest = createMockRequest(
        "http://localhost:3000/api/books?search=NonexistentBook"
      );
      const searchResponseObj = await getBooksAPI(searchRequest);
      const searchData = await expectSuccessResponse(searchResponseObj);

      expect(searchData.bibs).toHaveLength(0);

      // Try to get details for a non-existent book
      const detailsRequest = createMockRequest(
        "http://localhost:3000/api/books/99999"
      );
      const params = Promise.resolve({ id: "99999" });
      const detailsResponseObj = await getBookByIdAPI(detailsRequest, {
        params,
      });

      await expectErrorResponse(detailsResponseObj, 404, "Book not found");
    });
  });

  describe("Authentication Flow", () => {
    it("should create and delete session successfully", async () => {
      const mockToken = "firebase-token-12345";

      // Create session
      const createRequest = createMockRequest(
        "http://localhost:3000/api/auth/session",
        {
          method: "POST",
          body: { token: mockToken },
        }
      );

      const createResponse = await postSessionAPI(createRequest);
      const createData = await expectSuccessResponse(createResponse);
      expect(createData).toEqual({ success: true });

      // Delete session
      const deleteResponse = await deleteSessionAPI();
      const deleteData = await expectSuccessResponse(deleteResponse);
      expect(deleteData).toEqual({ success: true });
    });

    it("should handle invalid session creation and deletion", async () => {
      // Try to create session with invalid data
      const invalidRequest = createMockRequest(
        "http://localhost:3000/api/auth/session",
        {
          method: "POST",
          body: "invalid-json",
        }
      );

      const createResponse = await postSessionAPI(invalidRequest);
      await expectErrorResponse(createResponse, 500, "Failed to set session");

      // Delete should still work
      const deleteResponse = await deleteSessionAPI();
      const deleteData = await expectSuccessResponse(deleteResponse);
      expect(deleteData).toEqual({ success: true });
    });
  });

  describe("Error Handling Across APIs", () => {
    it("should handle API service errors consistently", async () => {
      // Mock service errors
      mockFetch.mockResolvedValue(mockFailedFetch(503) as any);

      // Test books API
      const booksRequest = createMockRequest("http://localhost:3000/api/books");
      const booksResponse = await getBooksAPI(booksRequest);
      await expectErrorResponse(booksResponse, 503, "API error: 503");

      // Test book details API
      const bookRequest = createMockRequest(
        "http://localhost:3000/api/books/123"
      );
      const params = Promise.resolve({ id: "123" });
      const bookResponse = await getBookByIdAPI(bookRequest, { params });
      await expectErrorResponse(bookResponse, 503, "API error: 503");
    });
  });

  describe("Parameter Validation", () => {
    it("should validate required parameters across APIs", async () => {
      // Test recommendations without userId
      const recRequest = createMockRequest(
        "http://localhost:3000/api/recommendations"
      );
      const recResponse = await getRecommendationsAPI(recRequest);
      await expectErrorResponse(recResponse, 400, "User ID is required");
    });

    it("should handle optional parameters correctly", async () => {
      const mockBooks = generateMockBooks(2);
      mockFetch.mockResolvedValue(
        mockSuccessfulFetch({ bibs: mockBooks }) as any
      );

      // Test books API with minimal parameters
      const minimalRequest = createMockRequest(
        "http://localhost:3000/api/books"
      );
      const minimalResponse = await getBooksAPI(minimalRequest);
      await expectSuccessResponse(minimalResponse);

      // Test books API with all parameters
      const fullRequest = createMockRequest(
        "http://localhost:3000/api/books?search=test&searchType=title&limit=5&sinceId=123"
      );
      const fullResponse = await getBooksAPI(fullRequest);
      await expectSuccessResponse(fullResponse);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
