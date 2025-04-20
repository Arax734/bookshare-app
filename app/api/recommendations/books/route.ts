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

  if (params.author) url += `&author=${encodeURIComponent(params.author)}`;
  if (params.genre) url += `&genre=${encodeURIComponent(params.genre)}`;
  if (params.language)
    url += `&language=${encodeURIComponent(params.language)}`;
  if (params.limit) url += `&limit=${params.limit}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();

  const booksWithRatings = await Promise.all(
    (data.bibs || []).map(async (book: any) => {
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

async function getUserReviewedBookIds(userId: string): Promise<Set<string>> {
  const userReviewsQuery = query(
    collection(db, "reviews"),
    where("userId", "==", userId)
  );
  const userReviews = await getDocs(userReviewsQuery);
  return new Set(userReviews.docs.map((doc) => doc.data().bookId));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const type = searchParams.get("type");
  const category = searchParams.get("category");

  if (!userId || !type || !category) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    const reviewedBookIds = await getUserReviewedBookIds(userId);

    // Determine which parameter to use based on type
    const params: any = { limit: 10 };
    if (type === "genre") params.genre = category;
    else if (type === "author") params.author = category;
    else if (type === "language") params.language = category;
    else {
      return NextResponse.json(
        { error: "Invalid category type" },
        { status: 400 }
      );
    }

    const books = await fetchSimilarBooks(params);
    const filteredBooks = books.filter((book) => !reviewedBookIds.has(book.id));

    return NextResponse.json({ books: filteredBooks });
  } catch (error) {
    console.error("Error in recommendations API:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}
