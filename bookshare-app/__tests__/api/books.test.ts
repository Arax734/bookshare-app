import { NextRequest } from "next/server";
import { GET } from "@/app/api/books/route";

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("/api/books", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should fetch books successfully with default parameters", async () => {
      const mockResponse = {
        bibs: [
          {
            id: "1",
            title: "Test Book",
            author: "Test Author",
            isbn: "1234567890",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/books");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /https:\/\/data\.bn\.org\.pl\/api\/institutions\/bibs\.json\?limit=10&kind=książka/
        )
      );
    });

    it("should handle search by title", async () => {
      const mockResponse = {
        bibs: [
          {
            id: "1",
            title: "Harry Potter",
            author: "J.K. Rowling",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/books?search=Harry Potter&searchType=title&limit=5"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("title=Harry%20Potter")
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=5")
      );
    });

    it("should handle search by author", async () => {
      const mockResponse = {
        bibs: [
          {
            id: "1",
            title: "Test Book",
            author: "Stephen King",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/books?search=Stephen King&searchType=author"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("author=Stephen%20King")
      );
    });

    it("should handle search by ISBN", async () => {
      const mockResponse = {
        bibs: [
          {
            id: "1",
            title: "Test Book",
            isbn: "9781234567890",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/books?search=9781234567890&searchType=isbn"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("isbnIssn=9781234567890")
      );
    });

    it("should handle sinceId parameter for pagination", async () => {
      const mockResponse = {
        bibs: [
          {
            id: "2",
            title: "Next Book",
            author: "Next Author",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/books?sinceId=12345"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sinceId=12345")
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/books");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "API error: 400" });
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const request = new NextRequest("http://localhost:3000/api/books");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch books" });
    });

    it("should handle unknown search types", async () => {
      const mockResponse = {
        bibs: [
          {
            id: "1",
            title: "Test Book",
            author: "Test Author",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/books?search=test&searchType=unknown"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("search=test")
      );
    });
  });
});
