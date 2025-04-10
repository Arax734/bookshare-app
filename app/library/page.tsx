"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { CalendarIcon } from "../components/svg-icons/CalendarIcon";
import { BookOpenIcon } from "../components/svg-icons/BookOpenIcon";
import { LanguageIcon } from "../components/svg-icons/LanguageIcon";
import LoadingSpinner from "../components/LoadingSpinner";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { UserIcon } from "../components/svg-icons/UserIcon";
import { splitAuthors } from "../utils/stringUtils";
import BookCover from "../components/BookCover";

interface Marc {
  leader: string;
  fields: Array<any>;
}

interface BookItem {
  id: number;
  zone: string;
  createdDate: string;
  updatedDate: string;
  deleted: boolean;
  deletedDate: null | string;
  language: string;
  subject: string;
  author: string;
  placeOfPublication: string;
  title: string;
  publisher: string;
  kind: string;
  domain: string;
  formOfWork: string;
  genre: string;
  publicationYear: string;
  marc: Marc;
  isbnIssn?: string;
  nationalBibliographyNumber?: string;
  averageRating?: number;
  totalReviews?: number;
}

interface ApiResponse {
  nextPage: string;
  bibs: BookItem[];
}

export default function Library() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchType, setSearchType] = useState<"title" | "author" | "isbn">(
    "title"
  );
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(true);

  const padBookId = (id: number): string => {
    return id.toString().padStart(14, "0");
  };

  const fetchBooks = async (url: string, append: boolean = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      let apiUrl = url;
      if (url.includes("data.bn.org.pl")) {
        const bnUrl = new URL(url);
        const search = bnUrl.searchParams.get("search") || "";
        const limit = bnUrl.searchParams.get("limit") || "10";
        const sinceId = bnUrl.searchParams.get("sinceId") || "";

        apiUrl = `/api/books?limit=${limit}`;
        if (search) {
          apiUrl += `&search=${encodeURIComponent(search)}`;
          apiUrl += `&searchType=${searchType}`;
        }
        if (sinceId) apiUrl += `&sinceId=${sinceId}`;
      }

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.bibs && Array.isArray(data.bibs)) {
        const booksOnly = data.bibs.filter(
          (item) =>
            item.kind?.toLowerCase().includes("książka") ||
            item.kind?.toLowerCase().includes("książki") ||
            item.kind?.toLowerCase() === "book" ||
            item.kind?.toLowerCase() === "books"
        );

        const booksWithRatings = await Promise.all(
          booksOnly.map(async (book) => {
            const ratings = await fetchBookRatings(book.id);
            return {
              ...book,
              averageRating: ratings.average,
              totalReviews: ratings.total,
            };
          })
        );

        if (append) {
          if (booksWithRatings.length === 0) {
            setHasMoreResults(false);
            return;
          }
          setBooks((prevBooks) => [...prevBooks, ...booksWithRatings]);
        } else {
          setBooks(booksWithRatings);
          setHasMoreResults(booksWithRatings.length >= 10);
        }

        if (data.nextPage) {
          const nextPageUrl = new URL(data.nextPage);
          const sinceId = nextPageUrl.searchParams.get("sinceId");
          let newNextPage = `/api/books?limit=10`;

          if (sinceId) {
            newNextPage += `&sinceId=${sinceId}`;
          }

          if (searchQuery) {
            newNextPage += `&search=${encodeURIComponent(
              searchQuery
            )}&searchType=${searchType}`;
          }

          setNextPage(newNextPage);
        } else {
          setNextPage(null);
          setHasMoreResults(false);
        }
      } else {
        throw new Error("Nieprawidłowy format danych");
      }
    } catch (error) {
      console.error("Błąd pobierania danych:", error);
      setError("Nie udało się pobrać listy książek. Spróbuj ponownie później.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchBookRatings = async (bookId: number) => {
    const paddedId = bookId.toString().padStart(14, "0");
    const q = query(collection(db, "reviews"), where("bookId", "==", paddedId));

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
    fetchBooks("/api/books?limit=10");
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchBooks(
        `/api/books?limit=10&searchType=${searchType}&search=${encodeURIComponent(
          searchQuery
        )}`
      );
    }
  };

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMoreBooks = useCallback(() => {
    if (nextPage && !isLoadingMore) {
      fetchBooks(nextPage, true);
    }
  }, [nextPage, isLoadingMore, fetchBooks]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && nextPage && hasMoreResults) {
          loadMoreBooks();
        }
      },
      { threshold: 0.1 }
    );

    const currentLoadMoreRef = loadMoreRef.current;
    if (currentLoadMoreRef) {
      observerRef.current.observe(currentLoadMoreRef);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreBooks, nextPage, hasMoreResults]);

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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[var(--primaryColor)] text-white rounded-xl hover:bg-[var(--primaryColorLight)] transition-colors"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-8">
      <h1 className="text-2xl font-bold mb-6 text-center text-[var(--gray-800)]">
        Biblioteka książek
      </h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col gap-3 max-w-lg mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchType === "title"
                  ? "Wyszukaj po tytule..."
                  : searchType === "author"
                  ? "Wyszukaj po autorze..."
                  : "Wyszukaj po ISBN..."
              }
              className="w-full px-3 py-1.5 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-[var(--primaryColor)] text-white rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors shadow-sm font-medium whitespace-nowrap text-sm"
            >
              Szukaj
            </button>
          </div>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setSearchType("title")}
              className={`px-3 py-1 rounded-lg transition-colors text-sm ${
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
              className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                searchType === "author"
                  ? "bg-[var(--primaryColor)] text-white"
                  : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
              }`}
            >
              Autor
            </button>
            <button
              type="button"
              onClick={() => setSearchType("isbn")}
              className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                searchType === "isbn"
                  ? "bg-[var(--primaryColor)] text-white"
                  : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
              }`}
            >
              ISBN
            </button>
          </div>
        </div>
      </form>

      {books.length === 0 ? (
        <div className="text-center p-10 rounded-xl">
          <BookOpenIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">Nie znaleziono książek</p>
          <p className="text-gray-400 mt-2">
            Spróbuj zmienić kryteria wyszukiwania
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-[var(--card-background)] rounded-lg shadow-sm overflow-hidden border border-[var(--gray-100)] flex flex-col"
              >
                <div className="bg-[var(--primaryColor)] px-3 py-2">
                  <div className="flex justify-between items-start gap-2">
                    <h2
                      className="text-sm font-semibold text-white flex-1"
                      title={book.title}
                    >
                      {formatBookTitle(book.title) || "Tytuł niedostępny"}
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
                        {book.averageRating ? book.averageRating : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 flex gap-3">
                  <div className="w-20 h-28 bg-[var(--gray-50)] flex-shrink-0">
                    <BookCover isbn={book.isbnIssn} title={book.title} />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="mb-2">
                      <div className="flex items-center gap-1 text-xs">
                        <UserIcon className="w-3 h-3 text-[var(--primaryColor)]" />
                        <span className="text-[var(--gray-700)] font-medium">
                          Autor:
                        </span>
                      </div>
                      <div className="text-xs text-[var(--gray-600)]">
                        {book.author ? (
                          splitAuthors(book.author).length > 2 ? (
                            <div title={book.author}>
                              <div>{splitAuthors(book.author)[0]}</div>
                              <div>{splitAuthors(book.author)[1]}</div>
                              <div className="text-[var(--gray-500)] italic">
                                {`i ${
                                  splitAuthors(book.author).length - 2
                                } więcej`}
                              </div>
                            </div>
                          ) : (
                            splitAuthors(book.author).map((author, i) => (
                              <div key={i}>{author}</div>
                            ))
                          )
                        ) : (
                          "Nieznany autor"
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 text-xs mb-2">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-[var(--primaryColor)]" />
                        <span className="text-[var(--gray-600)]">
                          {book.publicationYear || "—"}
                        </span>
                      </div>
                      {book.language && (
                        <div className="flex items-center gap-1">
                          <LanguageIcon className="w-3 h-3 text-[var(--primaryColor)]" />
                          <span className="text-[var(--gray-600)] capitalize">
                            {book.language}
                          </span>
                        </div>
                      )}
                    </div>

                    {(book.genre || book.kind) && (
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                          {book.genre && (
                            <span className="inline-flex text-xs px-2 py-0.5 bg-[var(--genre-bg)] text-[var(--genre-text)] rounded-full">
                              {book.genre}
                            </span>
                          )}
                          {book.kind && book.genre !== book.kind && (
                            <span className="inline-flex text-xs px-2 py-0.5 bg-[var(--subject-bg)] text-[var(--subject-text)] rounded-full">
                              {book.kind}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-1 text-right">
                      <Link
                        href={`/books/${padBookId(book.id)}`}
                        className="inline-block text-xs font-medium bg-[var(--primaryColor)] text-white px-2 py-1 rounded hover:bg-[var(--primaryColorLight)] transition-colors"
                      >
                        Zobacz szczegóły →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {nextPage && (
            <div ref={loadMoreRef} className="w-full py-8 flex justify-center">
              {isLoadingMore && (
                <div className="flex items-center">
                  <span className="animate-spin h-5 w-5 mr-2 border-t-2 border-b-2 border-[var(--primaryColor)] rounded-full"></span>
                  <span className="text-[var(--gray-700)] text-sm">
                    Ładowanie...
                  </span>
                </div>
              )}

              {!hasMoreResults && nextPage && (
                <div className="text-center p-3">
                  <p className="text-[var(--gray-700)] text-sm">
                    Nie znaleziono więcej wyników dla podanych kryteriów
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      fetchBooks("/api/books?limit=10");
                    }}
                    className="mt-2 text-[var(--primaryColor)] hover:text-[var(--primaryColorLight)] transition-colors text-sm"
                  >
                    Wróć do wszystkich książek
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
