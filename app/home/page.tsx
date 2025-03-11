"use client";

import { useEffect, useState } from "react";
import { CalendarIcon } from "../components/svg-icons/CalendarIcon";
import { MapPinIcon } from "../components/svg-icons/MapPinIcon";
import { BookOpenIcon } from "../components/svg-icons/BookOpenIcon";
import { TagIcon } from "../components/svg-icons/TagIcon";
import { LanguageIcon } from "../components/svg-icons/LanguageIcon";
import LoadingSpinner from "../components/LoadingSpinner";
import Link from "next/link";

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
}

interface ApiResponse {
  nextPage: string;
  bibs: BookItem[];
}

export default function Home() {
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

  const fetchBooks = async (url: string, append: boolean = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Extract parameters from URL if it's the BN API URL
      let apiUrl = url;
      if (url.includes("data.bn.org.pl")) {
        const bnUrl = new URL(url);
        const search = bnUrl.searchParams.get("search") || "";
        const limit = bnUrl.searchParams.get("limit") || "10";
        const sinceId = bnUrl.searchParams.get("sinceId") || "";

        // Construct URL for our API route with search parameters
        apiUrl = `/api/books?limit=${limit}`;
        if (search) {
          apiUrl += `&search=${encodeURIComponent(search)}`;
          apiUrl += `&searchType=${searchType}`; // Add search type
        }
        if (sinceId) apiUrl += `&sinceId=${sinceId}`;
      }

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.bibs && Array.isArray(data.bibs)) {
        // Filter only books
        const booksOnly = data.bibs.filter(
          (item) =>
            item.kind?.toLowerCase().includes("książka") ||
            item.kind?.toLowerCase().includes("książki") ||
            item.kind?.toLowerCase() === "book" ||
            item.kind?.toLowerCase() === "books"
        );

        if (append) {
          if (booksOnly.length === 0) {
            setHasMoreResults(false);
            return;
          }
          setBooks((prevBooks) => [...prevBooks, ...booksOnly]);
        } else {
          setBooks(booksOnly);
          setHasMoreResults(booksOnly.length >= 10);
        }

        // Update nextPage while preserving search parameters
        if (data.nextPage) {
          const nextPageUrl = new URL(data.nextPage);
          const sinceId = nextPageUrl.searchParams.get("sinceId");
          let newNextPage = `/api/books?limit=10`;

          if (sinceId) {
            newNextPage += `&sinceId=${sinceId}`;
          }

          // Preserve search parameters in next page URL
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

  // Initial fetch - update URL to use our API
  useEffect(() => {
    fetchBooks("/api/books?limit=10");
  }, []);

  // Handle search - update to use our API
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

  // Load more books
  const loadMoreBooks = () => {
    if (nextPage) {
      fetchBooks(nextPage, true);
    }
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
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center text-[var(--gray-800)]">
        Biblioteka książek
      </h1>

      {/* Updated search form */}
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
              className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-[var(--primaryColor)] text-white rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors shadow-sm font-medium whitespace-nowrap"
            >
              Szukaj
            </button>
          </div>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setSearchType("title")}
              className={`px-4 py-2 rounded-lg transition-colors ${
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
              className={`px-4 py-2 rounded-lg transition-colors ${
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
              className={`px-4 py-2 rounded-lg transition-colors ${
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
        <div className="grid gap-8 md:grid-cols-2">
          {books.map((book) => (
            <div
              key={book.id}
              className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              {/* Book card header with title */}
              <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4 text-white">
                <h2
                  className="text-xl font-bold line-clamp-2"
                  title={book.title}
                >
                  {book.title || "Tytuł niedostępny"}
                </h2>
              </div>

              {/* Main content */}
              <div className="p-5">
                {/* Author and year section */}
                <div className="flex items-start mb-4 pb-4 border-b border-gray-100">
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--gray-800)] mb-1">
                      {book.author || "Nieznany autor"}
                    </p>
                    <div className="flex items-center text-[var(--gray-700)]">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span>{book.publicationYear || "Rok nieznany"}</span>
                    </div>
                  </div>
                  {book.isbnIssn && (
                    <div className="bg-[var(--gray-200)] px-3 py-1 rounded-full text-xs font-medium text-[var(--gray-800)]">
                      ISBN: {book.isbnIssn}
                    </div>
                  )}
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Publication details */}
                  <div className="flex items-start">
                    <MapPinIcon className="h-5 w-5 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--gray-800)] font-medium">
                        Wydawca i miejsce
                      </p>
                      <p className="text-sm text-[var(--gray-700)]">
                        {book.publisher || "Nieznany wydawca"}
                        {book.placeOfPublication &&
                          `, ${book.placeOfPublication}`}
                      </p>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="flex items-start">
                    <LanguageIcon className="h-5 w-5 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--gray-800)] font-medium">
                        Język
                      </p>
                      <p className="text-sm text-[var(--gray-700)] capitalize">
                        {book.language || "Nieokreślony"}
                      </p>
                    </div>
                  </div>

                  {/* Genre & subject */}
                  <div className="flex items-start">
                    <TagIcon className="h-5 w-5 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-800 font-medium dark:text-gray-200">
                        Kategorie
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {book.genre && (
                          <span
                            className="text-xs px-2 py-1 rounded-md"
                            style={{
                              backgroundColor: "var(--genre-bg)",
                              color: "var(--genre-text)",
                            }}
                          >
                            {book.genre}
                          </span>
                        )}
                        {book.subject && (
                          <span
                            className="text-xs px-2 py-1 rounded-md"
                            style={{
                              backgroundColor: "var(--subject-bg)",
                              color: "var(--subject-text)",
                            }}
                          >
                            {book.subject}
                          </span>
                        )}
                        {book.domain && (
                          <span
                            className="text-xs px-2 py-1 rounded-md"
                            style={{
                              backgroundColor: "var(--domain-bg)",
                              color: "var(--domain-text)",
                            }}
                          >
                            {book.domain}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-6 flex gap-2">
                  <Link
                    href={`/books/${book.id}`}
                    className="flex-1 bg-[var(--primaryColor)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors font-medium text-center"
                  >
                    Zobacz szczegóły
                  </Link>
                  <button className="border border-[var(--btn-secondary-border)] text-[var(--btn-secondary-text)] px-4 py-2 rounded-lg hover:bg-[var(--btn-secondary-bg-hover)] transition-colors">
                    Zapisz
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {nextPage && (
        <div className="mt-10 text-center space-y-4">
          {hasMoreResults ? (
            <button
              className="bg-[var(--card-background)] border border-[var(--btn-secondary-border)] shadow-sm text-[var(--btn-secondary-text)] font-medium py-3 px-6 rounded-lg transition-all hover:bg-[var(--btn-secondary-bg-hover)] hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={loadMoreBooks}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin h-5 w-5 mr-2 border-t-2 border-b-2 border-[var(--primaryColor)] rounded-full"></span>
                  Ładowanie...
                </span>
              ) : (
                "Pokaż więcej książek"
              )}
            </button>
          ) : (
            <div className="text-center p-4">
              <p className="text-[var(--gray-700)]">
                Nie znaleziono więcej wyników dla podanych kryteriów
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  fetchBooks("/api/books?limit=10");
                }}
                className="mt-2 text-[var(--primaryColor)] hover:text-[var(--primaryColorLight)] transition-colors"
              >
                Wróć do wszystkich książek
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
