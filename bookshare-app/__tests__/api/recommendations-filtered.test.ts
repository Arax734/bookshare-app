import { NextRequest } from "next/server";
import { GET } from "@/app/api/recommendations/filtered/route";
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

describe("/api/recommendations/filtered", () => {
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

  const mockFilteredBooks = {
    bibs: [
      {
        id: "2",
        title: "Filtered Book 1",
        author: "Target Author",
        genre: "Fiction",
        language: "English",
        publicationYear: 2021,
      },
      {
        id: "3",
        title: "Filtered Book 2",
        author: "Target Author",
        genre: "Fiction",
        language: "English",
        publicationYear: 2020,
      },
      {
        id: "4",
        title: "Different Genre Book",
        author: "Other Author",
        genre: "Mystery",
        language: "Polish",
        publicationYear: 2019,
      },
    ],
  };

  const setupMocks = () => {
    mockGetDocs
      .mockResolvedValueOnce({
        docs: mockUserReviews,
      } as any)
      .mockResolvedValue({
        docs: [], // No ratings by default
      } as any);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockFilteredBooks,
    } as Response);
  };

  describe("GET", () => {
    it("should filter books by genre successfully", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("books");
      expect(Array.isArray(data.books)).toBe(true);
      expect(data.books.length).toBeGreaterThan(0);
      expect(data.books[0]).toHaveProperty("id");
      expect(data.books[0]).toHaveProperty("title");
      expect(data.books[0]).toHaveProperty("author");
    });

    it("should filter books by author successfully", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&author=Target%20Author"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("books");
      expect(Array.isArray(data.books)).toBe(true);
    });

    it("should filter books by language successfully", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&language=English"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("books");
      expect(Array.isArray(data.books)).toBe(true);
    });

    it("should filter books by multiple criteria", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Fiction&author=Target%20Author&language=English"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("books");
      expect(Array.isArray(data.books)).toBe(true);
    });

    it("should return 400 when userId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?genre=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "User ID is required" });
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
        json: async () => mockFilteredBooks,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should filter out the book with ID '00000000000002'
      expect(
        data.books.find((book: any) => book.id === "00000000000002")
      ).toBeUndefined();
      expect(data.books.length).toBe(2); // Should have 2 books instead of 3
    });

    it("should handle empty filter results", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bibs: [] }),
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Nonexistent"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books).toEqual([]);
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
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books).toEqual([]);
    });

    it("should handle Firestore errors", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore error"));

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch filtered books" });
    });

    it("should handle network errors", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      mockFetch.mockRejectedValue(new Error("Network error"));

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch filtered books" });
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
        json: async () => mockFilteredBooks,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books[0]).toHaveProperty("averageRating");
      expect(data.books[0]).toHaveProperty("totalReviews");
      expect(data.books[0].averageRating).toBe(8.5);
      expect(data.books[0].totalReviews).toBe(2);
    });

    it("should properly encode filter parameters", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Science%20Fiction&author=Arthur%20C.%20Clarke"
      );
      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("genre=Science%20Fiction")
      );
    });

    it("should handle special characters in author names", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&author=José%20Saramago"
      );
      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("author=Jos%C3%A9")
      );
    });

    it("should limit results to 12 books by default", async () => {
      const manyBooks = {
        bibs: Array.from({ length: 20 }, (_, index) => ({
          id: index + 1,
          title: `Book ${index + 1}`,
          author: "Test Author",
          genre: "Fiction",
          language: "English",
          publicationYear: 2020,
        })),
      };

      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => manyBooks,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Fiction"
      );
      await GET(request);

      // Verify that the API was called with limit=12
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=12")
      );
    });

    it("should handle author filtering with partial name matching", async () => {
      const authorSpecificBooks = {
        bibs: [
          {
            id: "5",
            title: "Book by John Smith",
            author: "John Smith",
            genre: "Fiction",
            language: "English",
            publicationYear: 2021,
          },
          {
            id: "6",
            title: "Book by John Doe",
            author: "John Doe",
            genre: "Fiction",
            language: "English",
            publicationYear: 2020,
          },
        ],
      };

      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => authorSpecificBooks,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&author=John"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books).toHaveLength(2);
    });

    it("should handle books with missing or null ratings", async () => {
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [],
        } as any)
        .mockResolvedValue({
          docs: [], // No ratings available
        } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockFilteredBooks,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/filtered?userId=user123&genre=Fiction"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books[0].averageRating).toBeNull();
      expect(data.books[0].totalReviews).toBe(0);
    });
  });
});
