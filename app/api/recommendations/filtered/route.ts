import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  publicationYear: number;
  averageRating?: number;
  totalReviews?: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const genre = searchParams.get("genre");
  const author = searchParams.get("author");
  const language = searchParams.get("language");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // Get books user has already reviewed to filter them out
    const reviewedBookIds = await getUserReviewedBookIds(userId);

    // Build filter parameters for API call
    const params: any = { limit: 12 };
    if (genre) params.genre = genre;
    if (author) params.author = author;
    if (language) params.language = language;

    const books = await fetchSimilarBooks(params);
    const filteredBooks = books.filter((book) => !reviewedBookIds.has(book.id));

    return NextResponse.json({ books: filteredBooks });
  } catch (error) {
    console.error("Error fetching filtered books:", error);
    return NextResponse.json(
      { error: "Failed to fetch filtered books" },
      { status: 500 }
    );
  }
}

// Function to get IDs of books the user has already reviewed
async function getUserReviewedBookIds(userId: string): Promise<Set<string>> {
  const userReviewsQuery = query(
    collection(db, "reviews"),
    where("userId", "==", userId)
  );
  const userReviews = await getDocs(userReviewsQuery);
  return new Set(userReviews.docs.map((doc) => doc.data().bookId));
}

// Function to pad book ID to standard format
function padBookId(id: string | number): string {
  const idString = String(id);
  return idString.padStart(14, "0");
}

// Function to fetch book ratings from Firebase
async function getBookRatings(
  bookId: string
): Promise<{ average: number; total: number } | null> {
  try {
    const reviewsQuery = query(
      collection(db, "reviews"),
      where("bookId", "==", bookId)
    );

    const reviewsSnapshot = await getDocs(reviewsQuery);
    const reviews = reviewsSnapshot.docs.map((doc) => doc.data().rating);

    if (reviews.length === 0) return null;

    const average =
      reviews.reduce((sum, rating) => sum + rating, 0) / reviews.length;
    return {
      average: Number(average.toFixed(1)),
      total: reviews.length,
    };
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return null;
  }
}

// Main function to fetch books based on filter parameters
async function fetchSimilarBooks(params: {
  author?: string;
  genre?: string;
  language?: string;
  limit?: number;
}): Promise<Book[]> {
  const baseUrl = "https://data.bn.org.pl/api/networks/bibs.json";
  let url = `${baseUrl}?formOfWork=Książki`;

  // For genre and language, use the normal exact matching
  if (params.genre) url += `&genre=${encodeURIComponent(params.genre)}`;
  if (params.language)
    url += `&language=${encodeURIComponent(params.language)}`;

  // Increase limit when filtering by author to ensure we have enough results after filtering
  const fetchLimit = params.author
    ? Math.max(50, params.limit || 20)
    : params.limit || 20;
  url += `&limit=${fetchLimit}`;

  // We include the author in the URL to help the API narrow results
  if (params.author)
    url += `&author=${encodeURIComponent(params.author.split(" ")[0])}`; // Use first word of author name

  const response = await fetch(url);
  if (!response.ok) return [];

  let data = await response.json();
  let books = data.bibs || [];

  // If author is specified, do more detailed filtering on our side
  if (params.author && params.author.trim()) {
    const authorNameNormalized = normalizeAuthorName(params.author.trim());

    books = books.filter((book: any) => {
      if (!book.author) return false;

      const bookAuthorNormalized = normalizeAuthorName(book.author);

      // Try different matching strategies

      // 1. Direct match with normalized names
      if (bookAuthorNormalized.includes(authorNameNormalized)) {
        return true;
      }

      // 2. Check each component of the author string
      const authorParts = bookAuthorNormalized.split(/\s+/);
      const searchTermParts = authorNameNormalized.split(/\s+/);

      // If all parts of search term appear in the author string
      return searchTermParts.every(
        (part) =>
          part.length > 2 &&
          authorParts.some(
            (authorPart) =>
              authorPart.includes(part) || part.includes(authorPart)
          )
      );
    });

    // Limit the results after filtering
    if (params.limit) {
      books = books.slice(0, params.limit);
    }
  }

  const booksWithRatings = await Promise.all(
    books.map(async (book: any) => {
      const bookId = padBookId(book.id || "");
      const ratings = await getBookRatings(bookId);

      return {
        ...book,
        id: bookId,
        averageRating: ratings?.average || null,
        totalReviews: ratings?.total || 0,
      };
    })
  );

  return booksWithRatings;
}

// Helper function to normalize author names for better matching
function normalizeAuthorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // Remove anything in parentheses (dates, etc.)
    .replace(/[.,;:]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}
