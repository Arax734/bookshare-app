"use client";

import { useEffect, useState } from "react";
// Replace the heroicons import with your custom icon imports
import { CalendarIcon } from "../components/svg-icons/CalendarIcon";
import { MapPinIcon } from "../components/svg-icons/MapPinIcon";
import { BookOpenIcon } from "../components/svg-icons/BookOpenIcon";
import { TagIcon } from "../components/svg-icons/TagIcon";
import { LanguageIcon } from "../components/svg-icons/LanguageIcon";
import { HashtagIcon } from "../components/svg-icons/HashtagIcon";

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

        // Construct URL for our API route
        apiUrl = `/api/books?limit=${limit}`;
        if (search) apiUrl += `&search=${encodeURIComponent(search)}`;
        if (sinceId) apiUrl += `&sinceId=${sinceId}`;
      }

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.bibs && Array.isArray(data.bibs)) {
        if (append) {
          setBooks((prevBooks) => [...prevBooks, ...data.bibs]);
        } else {
          setBooks(data.bibs);
        }

        // Update nextPage to use our API instead
        if (data.nextPage) {
          const nextPageUrl = new URL(data.nextPage);
          const sinceId = nextPageUrl.searchParams.get("sinceId");
          setNextPage(
            sinceId ? `/api/books?limit=10&sinceId=${sinceId}` : null
          );
        } else {
          setNextPage(null);
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
        `/api/books?limit=10&search=${encodeURIComponent(searchQuery)}`
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
    return (
      <div className="p-4 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primaryColor)]"></div>
      </div>
    );
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
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
        Biblioteka książek
      </h1>

      {/* Enhanced search form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj według tytułu, autora, ISBN..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--primaryColor)] focus:border-[var(--primaryColor)] focus:outline-none transition-all"
          />
          <button
            type="submit"
            className="px-5 py-3 bg-[var(--primaryColor)] text-white rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors shadow-sm font-medium"
          >
            Szukaj
          </button>
        </div>
      </form>

      {books.length === 0 ? (
        <div className="text-center p-10 bg-gray-50 rounded-xl">
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
              className="bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg border border-gray-100"
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
                    <p className="font-semibold text-gray-800 mb-1">
                      {book.author || "Nieznany autor"}
                    </p>
                    <div className="flex items-center text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span>{book.publicationYear || "Rok nieznany"}</span>
                    </div>
                  </div>
                  {book.isbnIssn && (
                    <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-800">
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
                      <p className="text-sm text-gray-800 font-medium">
                        Wydawca i miejsce
                      </p>
                      <p className="text-sm text-gray-600">
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
                      <p className="text-sm text-gray-800 font-medium">Język</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {book.language || "Nieokreślony"}
                      </p>
                    </div>
                  </div>

                  {/* Genre & subject */}
                  <div className="flex items-start">
                    <TagIcon className="h-5 w-5 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-800 font-medium">
                        Kategorie
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {book.genre && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md">
                            {book.genre}
                          </span>
                        )}
                        {book.subject && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md">
                            {book.subject}
                          </span>
                        )}
                        {book.domain && (
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-md">
                            {book.domain}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-6 flex gap-2">
                  <button className="flex-1 bg-[var(--primaryColor)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors font-medium">
                    Zobacz szczegóły
                  </button>
                  <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    Zapisz
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {nextPage && (
        <div className="mt-10 text-center">
          <button
            className="bg-white border border-gray-300 shadow-sm text-gray-800 font-medium py-3 px-6 rounded-lg transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      )}
    </div>
  );
}
