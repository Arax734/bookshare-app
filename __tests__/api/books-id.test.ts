import { NextRequest } from "next/server";
import { GET } from "@/app/api/books/[id]/route";
import { withSuppressedConsoleError } from "./test-utils";

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("/api/books/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should fetch book details successfully", async () => {
      const mockBook = {
        id: "12345",
        title: "Test Book",
        author: "Test Author",
        isbn: "9781234567890",
        publicationDate: "2023",
      };

      const mockResponse = {
        bibs: [mockBook],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/books/12345");
      const params = Promise.resolve({ id: "12345" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockBook);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://data.bn.org.pl/api/networks/bibs.json?id=12345"
      );
    });

    it("should handle book not found when bibs array is empty", async () => {
      const mockResponse = {
        bibs: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/books/99999");
      const params = Promise.resolve({ id: "99999" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Book not found" });
    });

    it("should handle book not found when bibs is null", async () => {
      const mockResponse = {
        bibs: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/books/99999");
      const params = Promise.resolve({ id: "99999" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Book not found" });
    });

    it("should handle API errors from external service", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/books/12345");
      const params = Promise.resolve({ id: "12345" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "API error: 404" });
    });
    it("should handle network errors", async () => {
      await withSuppressedConsoleError(async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const request = new NextRequest(
          "http://localhost:3000/api/books/12345"
        );
        const params = Promise.resolve({ id: "12345" });
        const response = await GET(request, { params });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to fetch book details" });
      });
    });

    it("should handle different book ID formats", async () => {
      const mockBook = {
        id: "abc123",
        title: "Test Book with String ID",
        author: "Test Author",
      };

      const mockResponse = {
        bibs: [mockBook],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/books/abc123");
      const params = Promise.resolve({ id: "abc123" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockBook);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://data.bn.org.pl/api/networks/bibs.json?id=abc123"
      );
    });

    it("should return first book when multiple books are returned", async () => {
      const mockBooks = [
        {
          id: "12345",
          title: "First Book",
          author: "First Author",
        },
        {
          id: "12345",
          title: "Second Book",
          author: "Second Author",
        },
      ];

      const mockResponse = {
        bibs: mockBooks,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/books/12345");
      const params = Promise.resolve({ id: "12345" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockBooks[0]);
    });
  });
});
