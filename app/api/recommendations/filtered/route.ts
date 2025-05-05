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
    const reviewedBookIds = await getUserReviewedBookIds(userId);

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

async function getUserReviewedBookIds(userId: string): Promise<Set<string>> {
  const userReviewsQuery = query(
    collection(db, "reviews"),
    where("userId", "==", userId)
  );
  const userReviews = await getDocs(userReviewsQuery);
  return new Set(userReviews.docs.map((doc) => doc.data().bookId));
}

function padBookId(id: string | number): string {
  const idString = String(id);
  return idString.padStart(14, "0");
}

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

async function fetchSimilarBooks(params: {
  author?: string;
  genre?: string;
  language?: string;
  limit?: number;
}): Promise<Book[]> {
  const baseUrl = "https://data.bn.org.pl/api/networks/bibs.json";
  let url = `${baseUrl}?formOfWork=Książki`;

  if (params.genre) url += `&genre=${encodeURIComponent(params.genre)}`;
  if (params.language)
    url += `&language=${encodeURIComponent(params.language)}`;

  const fetchLimit = params.author
    ? Math.max(50, params.limit || 20)
    : params.limit || 20;
  url += `&limit=${fetchLimit}`;

  if (params.author)
    url += `&author=${encodeURIComponent(params.author.split(" ")[0])}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  let data = await response.json();
  let books = data.bibs || [];

  if (params.author && params.author.trim()) {
    const authorNameNormalized = normalizeAuthorName(params.author.trim());

    books = books.filter((book: any) => {
      if (!book.author) return false;

      const bookAuthorNormalized = normalizeAuthorName(book.author);

      if (bookAuthorNormalized.includes(authorNameNormalized)) {
        return true;
      }

      const authorParts = bookAuthorNormalized.split(/\s+/);
      const searchTermParts = authorNameNormalized.split(/\s+/);

      return searchTermParts.every(
        (part) =>
          part.length > 2 &&
          authorParts.some(
            (authorPart) =>
              authorPart.includes(part) || part.includes(authorPart)
          )
      );
    });

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

function normalizeAuthorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[.,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
