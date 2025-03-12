import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

interface ItemCount {
  item: string;
  count: number;
}

async function fetchSimilarBooks(params: {
  author?: string;
  genre?: string;
  language?: string;
  decade?: string;
  limit?: number;
}) {
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
  return data.bibs || [];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
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
      const paddedId = bookId.padStart(14, "0");
      const url = `https://data.bn.org.pl/api/institutions/bibs.json?id=${paddedId}`;

      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      if (!data.bibs?.[0]) return null;

      return {
        id: bookId,
        ...data.bibs[0],
      };
    });

    const books = await Promise.all(bookDetailsPromises);
    const validBooks = books.filter((book) => book !== null);

    // Helper function to count and sort items
    const getTopItems = (
      books: any[],
      key: string,
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
    const getTopDecades = (books: any[]): ItemCount[] => {
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
            limit: Math.ceil(count * 2), // Fetch more books for genres with higher counts
          });
          return { category: item, books };
        })
      ),
      byAuthor: Promise.all(
        topAuthors.map(async ({ item, count }) => {
          const books = await fetchSimilarBooks({
            author: item,
            limit: Math.ceil(count * 2),
          });
          return { category: item, books };
        })
      ),
      byLanguage: Promise.all(
        topLanguages.map(async ({ item, count }) => {
          const books = await fetchSimilarBooks({
            language: item,
            limit: Math.ceil(count * 2),
          });
          return { category: item, books };
        })
      ),
      byDecade: Promise.all(
        topDecades.map(async ({ item, count }) => {
          const decade = parseInt(item.replace("s", ""));
          const books = await fetchSimilarBooks({
            decade: decade.toString(),
            limit: Math.ceil(count * 2),
          });
          return { category: item, books };
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
