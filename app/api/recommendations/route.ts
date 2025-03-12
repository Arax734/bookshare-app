import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

interface ItemCount {
  item: string;
  count: number;
}

// Update the Book interface
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

// Update the helper function to handle both string and number IDs
function padBookId(id: string | number): string {
  const idString = String(id);
  return idString.padStart(14, "0");
}

// Add this helper function to fetch and calculate ratings
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

// Modify the fetchSimilarBooks function
async function fetchSimilarBooks(params: {
  author?: string;
  genre?: string;
  language?: string;
  decade?: string;
  limit?: number;
}): Promise<Book[]> {
  const baseUrl = "https://data.bn.org.pl/api/networks/bibs.json";
  let url = `${baseUrl}?formOfWork=Książki`;

  if (params.author) url += `&author=${encodeURIComponent(params.author)}`;
  if (params.genre) url += `&genre=${encodeURIComponent(params.genre)}`;
  if (params.language)
    url += `&language=${encodeURIComponent(params.language)}`;
  if (params.decade) {
    const startYear = parseInt(params.decade);
    url += `&yearFrom=${startYear}&yearTo=${startYear + 9}`;
  }
  if (params.limit) url += `&limit=${params.limit}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();

  // Add ratings to each book
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

// Add this helper function after the existing imports
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

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // Get user's reviewed books first
    const reviewedBookIds = await getUserReviewedBookIds(userId);
    const reviewsQuery = query(
      collection(db, "reviews"),
      where("userId", "==", userId),
      where("rating", ">=", 7)
    );

    const reviewsSnapshot = await getDocs(reviewsQuery);
    const highlyRatedBooks = reviewsSnapshot.docs.map((doc) => ({
      bookId: doc.data().bookId,
      rating: doc.data().rating,
    }));
    const bookDetailsPromises = highlyRatedBooks.map(async ({ bookId }) => {
      const paddedId = padBookId(bookId || "");
      const url = `https://data.bn.org.pl/api/institutions/bibs.json?id=${paddedId}`;

      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      if (!data.bibs?.[0]) return null;

      const ratings = await getBookRatings(paddedId);

      return {
        id: paddedId,
        ...data.bibs[0],
        averageRating: ratings?.average || null,
        totalReviews: ratings?.total || 0,
      };
    });

    const books = await Promise.all(bookDetailsPromises);
    const validBooks = books.filter((book) => book !== null);

    // Helper function to count and sort items
    const getTopItems = (
      books: Book[],
      key: keyof Book,
      limit: number = 3
    ): ItemCount[] => {
      const counts: { [key: string]: number } = {};
      books.forEach((book) => {
        if (book?.[key]) {
          counts[book[key]] = (counts[book[key]] || 0) + 1;
        }
      });

      return Object.entries(counts)
        .map(([item, count]) => ({ item, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    };

    // Group books by decades
    const getTopDecades = (books: Book[]): ItemCount[] => {
      const decades: { [key: string]: number } = {};
      books.forEach((book) => {
        if (book?.publicationYear) {
          const decade = Math.floor(book.publicationYear / 10) * 10;
          const decadeLabel = `${decade}s`;
          decades[decadeLabel] = (decades[decadeLabel] || 0) + 1;
        }
      });

      return Object.entries(decades)
        .map(([item, count]) => ({ item, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    };

    // Get top items for each category
    const topGenres = getTopItems(validBooks, "genre");
    const topAuthors = getTopItems(validBooks, "author");
    const topLanguages = getTopItems(validBooks, "language");
    const topDecades = getTopDecades(validBooks);

    const similarBooksPromises = {
      byGenre: Promise.all(
        topGenres.map(async ({ item, count }) => {
          const books = await fetchSimilarBooks({
            genre: item,
            limit: Math.ceil(count * 4), // Increased limit to account for filtering
          });
          // Filter out reviewed books
          const filteredBooks = books.filter(
            (book: Book) => !reviewedBookIds.has(book.id)
          );
          return {
            category: item,
            books: filteredBooks.slice(0, Math.ceil(count * 2)), // Keep original desired amount
          };
        })
      ),
      byAuthor: Promise.all(
        topAuthors.map(async ({ item, count }) => {
          const books = await fetchSimilarBooks({
            author: item,
            limit: Math.ceil(count * 4),
          });
          const filteredBooks = books.filter(
            (book: Book) => !reviewedBookIds.has(book.id)
          );
          return {
            category: item,
            books: filteredBooks.slice(0, Math.ceil(count * 2)),
          };
        })
      ),
      byLanguage: Promise.all(
        topLanguages.map(async ({ item, count }) => {
          const books = await fetchSimilarBooks({
            language: item,
            limit: Math.ceil(count * 4),
          });
          const filteredBooks = books.filter(
            (book: Book) => !reviewedBookIds.has(book.id)
          );
          return {
            category: item,
            books: filteredBooks.slice(0, Math.ceil(count * 2)),
          };
        })
      ),
      byDecade: Promise.all(
        topDecades.map(async ({ item, count }) => {
          const decade = parseInt(item.replace("s", ""));
          const books = await fetchSimilarBooks({
            decade: decade.toString(),
            limit: Math.ceil(count * 4),
          });
          const filteredBooks = books.filter(
            (book: Book) => !reviewedBookIds.has(book.id)
          );
          return {
            category: item,
            books: filteredBooks.slice(0, Math.ceil(count * 2)),
          };
        })
      ),
    };

    // Wait for all similar books to be fetched
    const [genreBooks, authorBooks, languageBooks, decadeBooks] =
      await Promise.all([
        similarBooksPromises.byGenre,
        similarBooksPromises.byAuthor,
        similarBooksPromises.byLanguage,
        similarBooksPromises.byDecade,
      ]);

    return NextResponse.json({
      recommendations: {
        byGenre: genreBooks,
        byAuthor: authorBooks,
        byLanguage: languageBooks,
        byDecade: decadeBooks,
      },
      stats: {
        genres: topGenres,
        authors: topAuthors,
        languages: topLanguages,
        decades: topDecades,
      },
    });
  } catch (error) {
    console.error("Error in recommendations API:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
