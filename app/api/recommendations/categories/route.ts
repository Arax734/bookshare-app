import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

interface ItemCount {
  item: string;
  count: number;
}

interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  publicationYear: number;
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
        id: paddedId,
        ...data.bibs[0],
      };
    });

    const books = await Promise.all(bookDetailsPromises);
    const validBooks = books.filter((book) => book !== null);

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

    const topGenres = getTopItems(validBooks, "genre");
    const topAuthors = getTopItems(validBooks, "author");
    const topLanguages = getTopItems(validBooks, "language");

    return NextResponse.json({
      categories: {
        byGenre: topGenres.map((item) => ({ category: item.item })),
        byAuthor: topAuthors.map((item) => ({ category: item.item })),
        byLanguage: topLanguages.map((item) => ({ category: item.item })),
      },
    });
  } catch (error) {
    console.error("Error in recommendations API:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendation categories" },
      { status: 500 }
    );
  }
}
