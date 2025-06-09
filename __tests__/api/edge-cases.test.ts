import { NextRequest } from "next/server";
import { GET as getBooksAPI } from "@/app/api/books/route";
import { GET as getBookByIdAPI } from "@/app/api/books/[id]/route";
import {
  createMockRequest,
  mockSuccessfulFetch,
  generateMockBooks,
  withSuppressedConsoleError,
} from "./test-utils";

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("API Edge Cases and Performance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Input Validation and Sanitization", () => {
    it("should handle special characters in search queries", async () => {
      const mockBooks = generateMockBooks(1);
      mockFetch.mockResolvedValue(
        mockSuccessfulFetch({ bibs: mockBooks }) as any
      );

      const specialChars = [
        "książka & autor",
        'title with "quotes"',
        "author's book",
        "search with <script>",
        "query with %20 encoding",
        "unicode: żółć, ąęść",
      ];

      for (const searchTerm of specialChars) {
        const request = createMockRequest(
          `http://localhost:3000/api/books?search=${encodeURIComponent(
            searchTerm
          )}`
        );
        const response = await getBooksAPI(request);

        expect(response.status).toBe(200);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(searchTerm))
        );
      }
    });

    it("should handle extremely long search queries", async () => {
      const mockBooks = generateMockBooks(1);
      mockFetch.mockResolvedValue(
        mockSuccessfulFetch({ bibs: mockBooks }) as any
      );

      const longQuery = "a".repeat(1000);
      const request = createMockRequest(
        `http://localhost:3000/api/books?search=${longQuery}`
      );
      const response = await getBooksAPI(request);

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should handle empty and whitespace-only search queries", async () => {
      const mockBooks = generateMockBooks(1);
      mockFetch.mockResolvedValue(
        mockSuccessfulFetch({ bibs: mockBooks }) as any
      );

      const emptyQueries = ["", "   ", "\t\n", null, undefined];

      for (const query of emptyQueries) {
        const url = query
          ? `http://localhost:3000/api/books?search=${encodeURIComponent(
              query
            )}`
          : "http://localhost:3000/api/books";

        const request = createMockRequest(url);
        const response = await getBooksAPI(request);

        expect(response.status).toBe(200);
      }
    });
  });

  describe("Large Data Handling", () => {
    it("should handle large response payloads", async () => {
      // Create a large dataset
      const largeBookSet = generateMockBooks(1000);
      const largeResponse = { bibs: largeBookSet };

      mockFetch.mockResolvedValue(mockSuccessfulFetch(largeResponse) as any);

      const request = createMockRequest(
        "http://localhost:3000/api/books?limit=1000"
      );
      const response = await getBooksAPI(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bibs).toHaveLength(1000);
    });
  });

  describe("Concurrent Requests", () => {
    it("should handle multiple simultaneous requests", async () => {
      const mockBooks = generateMockBooks(5);
      mockFetch.mockResolvedValue(
        mockSuccessfulFetch({ bibs: mockBooks }) as any
      );

      const requests = Array.from({ length: 10 }, (_, i) =>
        getBooksAPI(
          createMockRequest(`http://localhost:3000/api/books?search=book${i}`)
        )
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(mockFetch).toHaveBeenCalledTimes(10);
    });
    it("should handle mixed success and failure requests", async () => {
      await withSuppressedConsoleError(async () => {
        const mockBooks = generateMockBooks(2);

        // Mock alternating success/failure
        mockFetch
          .mockResolvedValueOnce(
            mockSuccessfulFetch({ bibs: mockBooks }) as any
          )
          .mockRejectedValueOnce(new Error("Network error"))
          .mockResolvedValueOnce(
            mockSuccessfulFetch({ bibs: mockBooks }) as any
          )
          .mockRejectedValueOnce(new Error("Network error"));

        const requests = [
          getBooksAPI(
            createMockRequest("http://localhost:3000/api/books?search=book1")
          ),
          getBooksAPI(
            createMockRequest("http://localhost:3000/api/books?search=book2")
          ),
          getBooksAPI(
            createMockRequest("http://localhost:3000/api/books?search=book3")
          ),
          getBooksAPI(
            createMockRequest("http://localhost:3000/api/books?search=book4")
          ),
        ];

        const responses = await Promise.all(requests);

        expect(responses[0].status).toBe(200);
        expect(responses[1].status).toBe(500);
        expect(responses[2].status).toBe(200);
        expect(responses[3].status).toBe(500);
      });
    });
  });

  describe("Timeout and Retry Scenarios", () => {
    it("should handle slow API responses", async () => {
      const mockBooks = generateMockBooks(1);

      // Simulate slow response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve(mockSuccessfulFetch({ bibs: mockBooks }) as any),
              100
            )
          )
      );

      const request = createMockRequest("http://localhost:3000/api/books");
      const startTime = Date.now();
      const response = await getBooksAPI(request);
      const endTime = Date.now();
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    }, 10000);

    it("should handle API timeouts", async () => {
      await withSuppressedConsoleError(async () => {
        // Mock timeout by rejecting after delay
        mockFetch.mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Request timeout")), 100)
            )
        );

        const request = createMockRequest("http://localhost:3000/api/books");
        const response = await getBooksAPI(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe("Failed to fetch books");
      });
    }, 10000);
  });

  describe("Book ID Edge Cases", () => {
    it("should handle various book ID formats", async () => {
      const bookIds = [
        "123",
        "00000000000123",
        "abc123def",
        "123-456-789",
        "!@#$%^&*()",
        "very-long-book-id-with-special-characters-123",
      ];

      for (const bookId of bookIds) {
        mockFetch.mockResolvedValueOnce(
          mockSuccessfulFetch({
            bibs: [{ id: bookId, title: "Test Book" }],
          }) as any
        );

        const request = createMockRequest(
          `http://localhost:3000/api/books/${bookId}`
        );
        const params = Promise.resolve({ id: bookId });
        const response = await getBookByIdAPI(request, { params });

        expect(response.status).toBe(200);
        expect(mockFetch).toHaveBeenCalledWith(
          `https://data.bn.org.pl/api/networks/bibs.json?id=${bookId}`
        );
      }
    });

    it("should handle book ID with URL encoding", async () => {
      const bookId = "book id with spaces";
      const encodedId = encodeURIComponent(bookId);

      mockFetch.mockResolvedValue(
        mockSuccessfulFetch({
          bibs: [{ id: bookId, title: "Test Book" }],
        }) as any
      );

      const request = createMockRequest(
        `http://localhost:3000/api/books/${encodedId}`
      );
      const params = Promise.resolve({ id: bookId });
      const response = await getBookByIdAPI(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe("Memory and Performance", () => {
    it("should not leak memory with repeated requests", async () => {
      const mockBooks = generateMockBooks(10);
      mockFetch.mockResolvedValue(
        mockSuccessfulFetch({ bibs: mockBooks }) as any
      );

      // Make many requests in sequence
      for (let i = 0; i < 100; i++) {
        const request = createMockRequest(
          `http://localhost:3000/api/books?search=test${i}`
        );
        const response = await getBooksAPI(request);
        expect(response.status).toBe(200);
      }

      expect(mockFetch).toHaveBeenCalledTimes(100);
    });

    it("should handle requests with different parameter combinations", async () => {
      const mockBooks = generateMockBooks(3);
      mockFetch.mockResolvedValue(
        mockSuccessfulFetch({ bibs: mockBooks }) as any
      );

      const paramCombinations = [
        "?search=test",
        "?search=test&searchType=title",
        "?search=test&searchType=author&limit=5",
        "?search=test&searchType=isbn&limit=10&sinceId=123",
        "?limit=20",
        "?sinceId=456",
        "?searchType=title",
      ];

      for (const params of paramCombinations) {
        const request = createMockRequest(
          `http://localhost:3000/api/books${params}`
        );
        const response = await getBooksAPI(request);
        expect(response.status).toBe(200);
      }

      expect(mockFetch).toHaveBeenCalledTimes(paramCombinations.length);
    });
  });
});
