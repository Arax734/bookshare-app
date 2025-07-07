import { NextRequest } from "next/server";
import { GET } from "@/app/api/recommendations/route";
import { collection, query, where, getDocs } from "firebase/firestore";

// Mock Firebase Firestore
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;

describe("/api/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserReviews = [
    {
      data: () => ({
        bookId: "00000000000001",
        userId: "user123",
        rating: 8,
        comment: "Great book!",
      }),
    },
    {
      data: () => ({
        bookId: "00000000000002",
        userId: "user123",
        rating: 9,
        comment: "Amazing!",
      }),
    },
  ];

  const mockHighRatedReviews = [
    {
      data: () => ({
        bookId: "00000000000001",
        userId: "user123",
        rating: 8,
      }),
    },
    {
      data: () => ({
        bookId: "00000000000002",
        userId: "user123",
        rating: 9,
      }),
    },
  ];

  const mockBookDetails = {
    bibs: [
      {
        id: "1",
        title: "Test Book 1",
        author: "Author One",
        genre: "Fiction",
        language: "English",
        publicationYear: 2020,
      },
    ],
  };

  const mockSimilarBooks = {
    bibs: [
      {
        id: "3",
        title: "Similar Book 1",
        author: "Author One",
        genre: "Fiction",
        language: "English",
        publicationYear: 2021,
      },
      {
        id: "4",
        title: "Similar Book 2",
        author: "Author Two",
        genre: "Fiction",
        language: "English",
        publicationYear: 2019,
      },
    ],
  };

  const setupMocks = () => {
    // Mock user reviews query
    mockGetDocs
      .mockResolvedValueOnce({
        docs: mockUserReviews,
      } as any)
      // Mock high-rated reviews query
      .mockResolvedValueOnce({
        docs: mockHighRatedReviews,
      } as any)
      // Mock individual book ratings queries
      .mockResolvedValue({
        docs: [],
      } as any);

    // Mock API calls
    mockFetch
      // Mock book details calls
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBookDetails,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBookDetails,
      } as Response)
      // Mock similar books calls
      .mockResolvedValue({
        ok: true,
        json: async () => mockSimilarBooks,
      } as Response);
  };

  describe("GET", () => {
    it("should return recommendations successfully", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("recommendations");
      expect(data).toHaveProperty("stats");
      expect(data.recommendations).toHaveProperty("byGenre");
      expect(data.recommendations).toHaveProperty("byAuthor");
      expect(data.recommendations).toHaveProperty("byLanguage");
      expect(data.recommendations).toHaveProperty("byDecade");
    });

    it("should return 400 when userId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recommendations"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "User ID is required" });
    });

    it("should handle Firestore errors", async () => {
      mockGetDocs.mockRejectedValueOnce(new Error("Firestore error"));

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch recommendations" });
    });

    it("should handle API fetch errors", async () => {
      // Mock user reviews query
      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockUserReviews,
        } as any)
        .mockResolvedValueOnce({
          docs: mockHighRatedReviews,
        } as any)
        .mockResolvedValue({
          docs: [],
        } as any);

      // Mock failed API call
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch recommendations" });
    });

    it("should handle user with no reviews", async () => {
      // Mock empty reviews
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [],
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recommendations.byGenre).toEqual([]);
      expect(data.recommendations.byAuthor).toEqual([]);
      expect(data.recommendations.byLanguage).toEqual([]);
      expect(data.recommendations.byDecade).toEqual([]);
    });

    it("should exclude already reviewed books from recommendations", async () => {
      const userReviewedBooks = [
        {
          data: () => ({
            bookId: "00000000000003", // This book should be excluded
          }),
        },
      ];

      const highRatedBooks = [
        {
          data: () => ({
            bookId: "00000000000001",
            rating: 8,
          }),
        },
      ];

      mockGetDocs
        .mockResolvedValueOnce({
          docs: userReviewedBooks,
        } as any)
        .mockResolvedValueOnce({
          docs: highRatedBooks,
        } as any)
        .mockResolvedValue({
          docs: [],
        } as any);

      // Mock book details
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bibs: [
              {
                id: "1",
                title: "Test Book",
                author: "Test Author",
                genre: "Fiction",
                language: "English",
                publicationYear: 2020,
              },
            ],
          }),
        } as Response)
        // Mock similar books - including one that should be filtered out
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            bibs: [
              {
                id: "3", // This should be filtered out
                title: "Already Reviewed Book",
                author: "Test Author",
                genre: "Fiction",
              },
              {
                id: "4",
                title: "New Recommendation",
                author: "Test Author",
                genre: "Fiction",
              },
            ],
          }),
        } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Verify that recommendations don't include already reviewed books
      const allRecommendedBooks = [
        ...data.recommendations.byGenre.flatMap((cat: any) => cat.books),
        ...data.recommendations.byAuthor.flatMap((cat: any) => cat.books),
        ...data.recommendations.byLanguage.flatMap((cat: any) => cat.books),
        ...data.recommendations.byDecade.flatMap((cat: any) => cat.books),
      ];

      expect(
        allRecommendedBooks.find((book: any) => book.id === "00000000000003")
      ).toBeUndefined();
    });
  });
});
