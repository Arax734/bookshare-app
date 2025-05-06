"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpenIcon } from "../../../components/svg-icons/BookOpenIcon";
import { UserIcon } from "../../../components/svg-icons/UserIcon";
import { CalendarIcon } from "../../../components/svg-icons/CalendarIcon";
import { LanguageIcon } from "../../../components/svg-icons/LanguageIcon";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { splitAuthors } from "../../../utils/stringUtils";
import BookCover from "../../../components/BookCover";
import { useAuth } from "../../../hooks/useAuth";

interface BookItem {
  id: number;
  zone: string;
  language: string;
  subject: string;
  author: string;
  title: string;
  publisher: string;
  kind: string;
  publicationYear: string;
  isbnIssn?: string;
  averageRating?: number;
  totalReviews?: number;
}

interface ExchangeBook {
  id: string;
  bookId: string;
  userId: string;
  status: string;
  createdAt: any;
  bookData?: BookItem;
}

export default function UserBooksToExchange() {
  const { id } = useParams();
  const { user } = useAuth();
  const [exchangeBooks, setExchangeBooks] = useState<ExchangeBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<ExchangeBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchType, setSearchType] = useState<"title" | "author">("title");

  const fetchBookDetails = async (bookId: string) => {
    try {
      const apiUrl = `/api/books/${bookId}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Błąd HTTP: ${response.status}`);
      }

      const bookData = await response.json();
      return bookData;
    } catch (error) {
      console.error(
        `Błąd podczas pobierania szczegółów książki ${bookId}:`,
        error
      );
      return null;
    }
  };

  const fetchBookRatings = async (bookId: string) => {
    const q = query(collection(db, "reviews"), where("bookId", "==", bookId));
    const querySnapshot = await getDocs(q);
    const reviews = querySnapshot.docs.map((doc) => doc.data());

    if (reviews.length === 0) return { average: 0, total: 0 };

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
      average: Number((sum / reviews.length).toFixed(1)),
      total: reviews.length,
    };
  };

  useEffect(() => {
    async function fetchExchangeBooks() {
      if (!id) return;

      setLoading(true);
      try {
        const userRef = doc(db, "users", id as string);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          setUsername(userSnapshot.data().displayName);
        }

        const exchangeBooksQuery = query(
          collection(db, "bookOwnership"),
          where("userId", "==", id),
          where("status", "==", "forExchange")
        );

        const exchangeBooksSnapshot = await getDocs(exchangeBooksQuery);

        if (exchangeBooksSnapshot.empty) {
          setExchangeBooks([]);
          setFilteredBooks([]);
          setLoading(false);
          return;
        }

        const books = exchangeBooksSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              bookId: doc.data().bookId,
              userId: doc.data().userId,
              status: doc.data().status,
              createdAt: doc.data().createdAt,
            } as ExchangeBook)
        );

        console.log(
          "Pobrane książki do wymiany ID:",
          books.map((b) => b.bookId)
        );

        const booksWithDetails = await Promise.all(
          books.map(async (book) => {
            try {
              const bookData = await fetchBookDetails(book.bookId);

              if (bookData) {
                const ratings = await fetchBookRatings(book.bookId);

                return {
                  ...book,
                  bookData: {
                    ...bookData,
                    averageRating: ratings.average,
                    totalReviews: ratings.total,
                  },
                };
              }

              return book;
            } catch (error) {
              console.error(
                `Błąd podczas pobierania danych książki ${book.bookId}:`,
                error
              );
              return book;
            }
          })
        );

        const validBooks = booksWithDetails.filter((book) => book.bookData);
        console.log(
          `Znaleziono ${validBooks.length} książek z danymi z ${booksWithDetails.length} książek do wymiany`
        );

        setExchangeBooks(validBooks);
        setFilteredBooks(validBooks);
      } catch (error) {
        console.error("Błąd podczas pobierania książek do wymiany:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchExchangeBooks();
  }, [id]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredBooks(exchangeBooks);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = exchangeBooks.filter((book) => {
      if (!book.bookData) return false;

      if (searchType === "title") {
        return book.bookData.title.toLowerCase().includes(query);
      } else {
        return book.bookData.author.toLowerCase().includes(query);
      }
    });

    setFilteredBooks(filtered);
  }, [searchQuery, searchType, exchangeBooks]);

  const formatBookTitle = (title: string | undefined): string => {
    if (!title) return "Tytuł niedostępny";

    if (title.includes("/")) {
      const firstPart = title.split("/")[0].trim();
      if (firstPart.length > 60) {
        return firstPart.substring(0, 57) + "...";
      }
      return firstPart;
    }

    if (title.length > 60) {
      return title.substring(0, 57) + "...";
    }

    return title;
  };

  const renderBookCover = (book: BookItem) => {
    const hasIsbn = !!book.isbnIssn && book.isbnIssn.trim().length > 0;

    return (
      <div className="w-16 sm:w-20 h-24 sm:h-28 bg-[var(--gray-50)] flex-shrink-0 shadow-sm">
        {hasIsbn ? (
          <BookCover isbn={book.isbnIssn} title={book.title} size="M" />
        ) : (
          <div className="relative aspect-[2/3] h-full bg-[var(--gray-100)] flex items-center justify-center rounded-lg">
            <BookOpenIcon className="w-10 h-10 text-[var(--gray-300)]" />
          </div>
        )}
      </div>
    );
  };

  const isCurrentUser = user && user.uid === id;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-6xl mx-auto pb-8 px-4 sm:px-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-[var(--gray-800)]">
        {isCurrentUser
          ? "Twoje książki do wymiany"
          : username
          ? `Książki do wymiany użytkownika ${username}`
          : "Książki do wymiany"}
      </h1>

      <div className="flex flex-col gap-3 max-w-lg mx-auto mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchType === "title"
                ? "Wyszukaj po tytule..."
                : "Wyszukaj po autorze..."
            }
            className="w-full px-3 py-1.5 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200 text-sm"
          />
        </div>

        <div className="flex justify-center gap-2 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setSearchType("title")}
            className={`px-2 py-1 rounded-lg transition-colors ${
              searchType === "title"
                ? "bg-[var(--primaryColor)] text-white"
                : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
            }`}
          >
            Tytuł
          </button>
          <button
            type="button"
            onClick={() => setSearchType("author")}
            className={`px-2 py-1 rounded-lg transition-colors ${
              searchType === "author"
                ? "bg-[var(--primaryColor)] text-white"
                : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
            }`}
          >
            Autor
          </button>
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center p-10 rounded-xl">
          <BookOpenIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">
            {searchQuery
              ? "Nie znaleziono pasujących książek"
              : isCurrentUser
              ? "Nie masz jeszcze książek do wymiany"
              : "Użytkownik nie ma jeszcze książek do wymiany"}
          </p>
          {searchQuery && (
            <p className="text-gray-400 mt-2">
              Spróbuj zmienić kryteria wyszukiwania
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map(
            (book) =>
              book.bookData && (
                <div
                  key={book.id}
                  className="bg-[var(--card-background)] rounded-lg shadow-sm overflow-hidden border border-[var(--gray-100)] flex flex-col"
                >
                  <div className="bg-[var(--primaryColor)] px-2 sm:px-3 py-2">
                    <div className="flex justify-between items-start gap-2">
                      <h2
                        className="text-xs sm:text-sm font-semibold text-white flex-1"
                        title={book.bookData.title}
                      >
                        {formatBookTitle(book.bookData.title) ||
                          "Tytuł niedostępny"}
                      </h2>
                      <div className="flex items-center bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs shrink-0">
                        <svg
                          className="w-3 h-3 text-yellow-300"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="ml-0.5 text-white text-xs font-medium">
                          {book.bookData.averageRating
                            ? book.bookData.averageRating
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 sm:p-3 flex gap-2 sm:gap-3">
                    {renderBookCover(book.bookData)}

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="mb-1 sm:mb-2">
                        <div className="flex items-center gap-1 text-xs">
                          <UserIcon className="w-3 h-3 text-[var(--primaryColor)]" />
                          <span className="text-[var(--gray-700)] font-medium">
                            Autor:
                          </span>
                        </div>
                        <div className="text-xs text-[var(--gray-600)] line-clamp-3">
                          {book.bookData.author ? (
                            splitAuthors(book.bookData.author).length > 2 ? (
                              <div title={book.bookData.author}>
                                <div>
                                  {splitAuthors(book.bookData.author)[0]}
                                </div>
                                <div>
                                  {splitAuthors(book.bookData.author)[1]}
                                </div>
                                <div className="text-[var(--gray-500)] italic">
                                  {`i ${
                                    splitAuthors(book.bookData.author).length -
                                    2
                                  } więcej`}
                                </div>
                              </div>
                            ) : (
                              splitAuthors(book.bookData.author).map(
                                (author, i) => <div key={i}>{author}</div>
                              )
                            )
                          ) : (
                            "Nieznany autor"
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs mb-1 sm:mb-2">
                        {book.bookData.publicationYear && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 text-[var(--primaryColor)]" />
                            <span className="text-[var(--gray-600)]">
                              {book.bookData.publicationYear || "—"}
                            </span>
                          </div>
                        )}
                        {book.bookData.language && (
                          <div className="flex items-center gap-1">
                            <LanguageIcon className="w-3 h-3 text-[var(--primaryColor)]" />
                            <span className="text-[var(--gray-600)] capitalize">
                              {book.bookData.language}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-1 text-right">
                        <Link
                          href={`/books/${book.bookId}`}
                          className="inline-block text-xs font-medium bg-[var(--primaryColor)] text-white px-2 py-1 rounded hover:bg-[var(--primaryColorLight)] transition-colors"
                        >
                          Zobacz szczegóły →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}
