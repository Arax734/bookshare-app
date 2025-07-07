import { NextRequest } from "next/server";
import { GET } from "@/app/api/recommendations/books/route";
import { collection, query, where, getDocs } from "firebase/firestore";

// Mock Firebase Firestore
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock Firebase config
jest.mock("@/firebase/config", () => ({
  db: {},
}));

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;

describe("/api/recommendations/books", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserReviews = [
    {
      data: () => ({
        bookId: "00000000000001",
        userId: "user123",
      }),
    },
  ];

  const mockSimilarBooks = {
    bibs: [
      {
        id: "2",
        title: "Similar Book 1",
        author: "Test Author",
        genre: "Fiction",
        language: "English",
        publicationYear: 2021,
      },
      {
        id: "3",
        title: "Similar Book 2",
        author: "Test Author",
        genre: "Fiction",
        language: "English",
        publicationYear: 2020,
      },
    ],
  };

  const setupMocks = () => {
    // Mock user reviews query
    mockGetDocs
      .mockResolvedValueOnce({
        docs: mockUserReviews,
      } as any)
      // Mock book ratings queries
      .mockResolvedValue({
        docs: [],
      } as any);

    // Mock external API call
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSimilarBooks,
    } as Response);
  };

  describe("GET", () => {
    it("should return books by genre successfully", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=genre&category=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("books");
      expect(Array.isArray(data.books)).toBe(true);
      expect(data.books).toHaveLength(2);
      expect(data.books[0]).toHaveProperty("id");
      expect(data.books[0]).toHaveProperty("title");
      expect(data.books[0]).toHaveProperty("author");
    });

    it("should return books by author successfully", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=author&category=Test%20Author"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("books");
      expect(Array.isArray(data.books)).toBe(true);
    });

    it("should return books by language successfully", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=language&category=English"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("books");
      expect(Array.isArray(data.books)).toBe(true);
    });

    it("should return 400 when userId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?type=genre&category=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing required parameters" });
    });

    it("should return 400 when type is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&category=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing required parameters" });
    });

    it("should return 400 when category is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=genre"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing required parameters" });
    });

    it("should return 400 for invalid category type", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=invalid&category=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid category type" });
    });

    it("should exclude already reviewed books", async () => {
      const userReviewedBooks = [
        {
          data: () => ({
            bookId: "00000000000002", // This book should be excluded
          }),
        },
      ];

      mockGetDocs
        .mockResolvedValueOnce({
          docs: userReviewedBooks,
        } as any)
        .mockResolvedValue({
          docs: [],
        } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSimilarBooks,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=genre&category=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books).toHaveLength(1); // One book filtered out
      expect(data.books[0].id).toBe("00000000000003"); // Only the second book remains
    });

    it("should handle external API errors", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=genre&category=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books).toEqual([]); // Empty array when external API fails
    });

    it("should handle Firestore errors", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore error"));

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=genre&category=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch books" });
    });

    it("should include ratings when available", async () => {
      const mockRatings = [
        {
          data: () => ({ rating: 8 }),
        },
        {
          data: () => ({ rating: 9 }),
        },
      ];

      mockGetDocs
        .mockResolvedValueOnce({
          docs: [],
        } as any)
        .mockResolvedValue({
          docs: mockRatings,
        } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSimilarBooks,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=genre&category=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books[0]).toHaveProperty("averageRating");
      expect(data.books[0]).toHaveProperty("totalReviews");
      expect(data.books[0].averageRating).toBe(8.5);
      expect(data.books[0].totalReviews).toBe(2);
    });

    it("should handle empty external API response", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bibs: [] }),
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=genre&category=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books).toEqual([]);
    });
    it("should properly encode category parameters", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/books?userId=user123&type=genre&category=Science%20Fiction"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("genre=Science%20Fiction")
      );
    });
  });
});
