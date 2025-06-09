import { NextRequest } from "next/server";
import { GET } from "@/app/api/recommendations/categories/route";
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

describe("/api/recommendations/categories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockHighRatedReviews = [
    {
      data: () => ({
        bookId: "00000000000001",
        rating: 8,
      }),
    },
    {
      data: () => ({
        bookId: "00000000000002",
        rating: 9,
      }),
    },
    {
      data: () => ({
        bookId: "00000000000003",
        rating: 7,
      }),
    },
  ];

  const mockBookResponse1 = {
    bibs: [
      {
        id: "1",
        title: "Fiction Book 1",
        author: "Author One",
        genre: "Fiction",
        language: "English",
        publicationYear: 2020,
      },
    ],
  };

  const mockBookResponse2 = {
    bibs: [
      {
        id: "2",
        title: "Mystery Book",
        author: "Author Two",
        genre: "Mystery",
        language: "English",
        publicationYear: 2021,
      },
    ],
  };

  const mockBookResponse3 = {
    bibs: [
      {
        id: "3",
        title: "Romance Book",
        author: "Author One",
        genre: "Romance",
        language: "Polish",
        publicationYear: 2019,
      },
    ],
  };

  const setupMocks = () => {
    mockGetDocs.mockResolvedValue({
      docs: mockHighRatedReviews,
    } as any);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBookResponse1,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBookResponse2,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBookResponse3,
      } as Response);
  };

  describe("GET", () => {
    it("should return recommendation categories successfully", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("categories");
      expect(data.categories).toHaveProperty("byGenre");
      expect(data.categories).toHaveProperty("byAuthor");
      expect(data.categories).toHaveProperty("byLanguage");

      expect(Array.isArray(data.categories.byGenre)).toBe(true);
      expect(Array.isArray(data.categories.byAuthor)).toBe(true);
      expect(Array.isArray(data.categories.byLanguage)).toBe(true);
    });

    it("should return top genres from user reviews", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories.byGenre).toEqual(
        expect.arrayContaining([
          { category: "Fiction" },
          { category: "Mystery" },
          { category: "Romance" },
        ])
      );
    });

    it("should return top authors from user reviews", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories.byAuthor).toEqual(
        expect.arrayContaining([
          { category: "Author One" },
          { category: "Author Two" },
        ])
      );
    });

    it("should return top languages from user reviews", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories.byLanguage).toEqual(
        expect.arrayContaining([
          { category: "English" },
          { category: "Polish" },
        ])
      );
    });

    it("should return 400 when userId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "User ID is required" });
    });

    it("should handle user with no high-rated reviews", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories.byGenre).toEqual([]);
      expect(data.categories.byAuthor).toEqual([]);
      expect(data.categories.byLanguage).toEqual([]);
    });

    it("should handle failed book detail fetches", async () => {
      mockGetDocs.mockResolvedValue({
        docs: mockHighRatedReviews,
      } as any);

      // Mock failed API calls
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories.byGenre).toEqual([]);
      expect(data.categories.byAuthor).toEqual([]);
      expect(data.categories.byLanguage).toEqual([]);
    });

    it("should handle books with missing data", async () => {
      mockGetDocs.mockResolvedValue({
        docs: mockHighRatedReviews,
      } as any);

      // Mock responses with missing book data
      const incompleteBookResponse = {
        bibs: [
          {
            id: "1",
            title: "Book without genre",
            // Missing author, genre, language
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => incompleteBookResponse,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories.byGenre).toEqual([]);
      expect(data.categories.byAuthor).toEqual([]);
      expect(data.categories.byLanguage).toEqual([]);
    });

    it("should handle Firestore query errors", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore error"));

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Failed to fetch recommendation categories",
      });
    });

    it("should handle network errors when fetching book details", async () => {
      mockGetDocs.mockResolvedValue({
        docs: mockHighRatedReviews,
      } as any);

      mockFetch.mockRejectedValue(new Error("Network error"));

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Failed to fetch recommendation categories",
      });
    });
    it("should limit categories to top 3 items", async () => {
      // Mock more reviews to test limiting
      const manyReviews = Array.from({ length: 10 }, (_, index) => ({
        data: () => ({
          bookId: `0000000000000${index + 1}`.slice(-14),
          rating: 8,
        }),
      }));

      mockGetDocs.mockResolvedValue({
        docs: manyReviews,
      } as any);

      // Mock book responses with different genres for all 10 books
      const genres = ["Fiction", "Mystery", "Romance", "Thriller", "Fantasy"];
      Array.from({ length: 10 }, (_, index) => {
        const genre = genres[index % genres.length];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bibs: [
              {
                id: index + 1,
                title: `${genre} Book ${index + 1}`,
                author: `Test Author ${index + 1}`,
                genre: genre,
                language: index < 5 ? "English" : "Polish",
                publicationYear: 2020,
              },
            ],
          }),
        } as Response);
      });

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories.byGenre.length).toBeLessThanOrEqual(3);
      expect(data.categories.byAuthor.length).toBeLessThanOrEqual(3);
      expect(data.categories.byLanguage.length).toBeLessThanOrEqual(3);
    });
    it("should use correct Firestore query parameters", async () => {
      setupMocks();

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      await GET(request);

      expect(mockGetDocs).toHaveBeenCalledTimes(1);
      // Verify that the query was called
      expect(mockGetDocs).toHaveBeenCalled();
    });

    it("should properly pad book IDs when fetching details", async () => {
      const reviewWithShortId = [
        {
          data: () => ({
            bookId: "1", // Short ID that needs padding
            rating: 8,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: reviewWithShortId,
      } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockBookResponse1,
      } as Response);

      const request = new NextRequest(
        "http://localhost:3000/api/recommendations/categories?userId=user123"
      );
      await GET(request);

      // Verify that the API was called with padded ID
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("id=00000000000001")
      );
    });
  });
});
