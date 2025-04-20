"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import { CalendarIcon } from "../components/svg-icons/CalendarIcon";
import Link from "next/link";
import { BookOpenIcon } from "../components/svg-icons/BookOpenIcon";
import { LanguageIcon } from "../components/svg-icons/LanguageIcon";
import { UserIcon } from "../components/svg-icons/UserIcon";
import { splitAuthors } from "../utils/stringUtils";
import BookCover from "../components/BookCover"; // Add this import

interface RecommendationItem {
  category: string;
  books: any[];
}

interface RecommendationResponse {
  recommendations: {
    byGenre: RecommendationItem[];
    byAuthor: RecommendationItem[];
    byLanguage: RecommendationItem[];
    byDecade: RecommendationItem[];
  };
  stats: {
    genres: { item: string; count: number }[];
    authors: { item: string; count: number }[];
    languages: { item: string; count: number }[];
    decades: { item: string; count: number }[];
  };
}

interface RecommendationGroups {
  byGenre: RecommendationItem[];
  byAuthor: RecommendationItem[];
  byLanguage: RecommendationItem[];
}

interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  publicationYear: number;
  coverUrl?: string;
  isbn?: string;
  isbnIssn?: string;
  averageRating?: number;
  totalReviews?: number;
}

interface ExpandedSections {
  [key: string]: boolean;
}

// Add this new interface to track which categories have loaded books
interface LoadedCategories {
  [key: string]: boolean;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendationGroups>({
    byGenre: [],
    byAuthor: [],
    byLanguage: [],
  });
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
    {}
  );
  // Track which categories have been loaded
  const [loadedCategories, setLoadedCategories] = useState<LoadedCategories>(
    {}
  );
  // Track categories currently being loaded
  const [loadingCategories, setLoadingCategories] = useState<{
    [key: string]: boolean;
  }>({});

  // Add state to track the active category filter
  const [activeFilter, setActiveFilter] = useState<
    "genre" | "author" | "language"
  >("genre");

  useEffect(() => {
    const fetchRecommendationCategories = async () => {
      if (!user) return;

      try {
        const response = await fetch(
          `/api/recommendations/categories?userId=${user.uid}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch recommendation categories");
        }

        const data = await response.json();
        setRecommendations({
          byGenre: data.categories.byGenre.map((item: any) => ({
            category: item.category,
            books: [],
          })),
          byAuthor: data.categories.byAuthor.map((item: any) => ({
            category: item.category,
            books: [],
          })),
          byLanguage: data.categories.byLanguage.map((item: any) => ({
            category: item.category,
            books: [],
          })),
        });
      } catch (error) {
        console.error("Error fetching recommendation categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendationCategories();
  }, [user]);

  const fetchCategoryBooks = async (categoryType: string, category: string) => {
    const key = `${categoryType}-${category}`;
    setLoadingCategories((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await fetch(
        `/api/recommendations/books?userId=${
          user?.uid
        }&type=${categoryType}&category=${encodeURIComponent(category)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch books for ${category}`);
      }

      const data = await response.json();

      setRecommendations((prev) => {
        const updated = { ...prev };
        const typeKey =
          categoryType === "genre"
            ? "byGenre"
            : categoryType === "author"
            ? "byAuthor"
            : "byLanguage";

        const updatedItems = updated[typeKey].map((group) => {
          if (group.category === category) {
            return { ...group, books: data.books };
          }
          return group;
        });

        updated[typeKey] = updatedItems;
        return updated;
      });

      setLoadedCategories((prev) => ({ ...prev, [key]: true }));
    } catch (error) {
      console.error(`Error fetching books for ${category}:`, error);
    } finally {
      setLoadingCategories((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleSection = (categoryType: string, category: string) => {
    const key = `${categoryType}-${category}`;

    // Toggle expanded state
    setExpandedSections((prev) => {
      const newState = { ...prev };
      newState[key] = !prev[key];

      // If expanding and books not loaded yet, fetch them
      if (newState[key] && !loadedCategories[key]) {
        fetchCategoryBooks(categoryType, category);
      }

      return newState;
    });
  };

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

  // Function to check if book has valid ISBN for cover
  const hasValidCover = (book: Book): boolean => {
    // Check both possible ISBN field names
    const isbn = book.isbn || book.isbnIssn;
    return !!isbn && isbn.trim().length > 0;
  };

  const renderBookCard = (book: Book) => (
    <div
      key={book.id}
      className="bg-[var(--card-background)] rounded-lg shadow-sm overflow-hidden border border-[var(--gray-100)] flex flex-col"
    >
      <div className="bg-[var(--primaryColor)] px-2 sm:px-3 py-2">
        <div className="flex justify-between items-start gap-2">
          <h2
            className="text-xs sm:text-sm font-semibold text-white flex-1"
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

      <div className="p-2 sm:p-3 flex gap-2 sm:gap-3">
        {hasValidCover(book) && (
          <div className="w-16 sm:w-20 h-24 sm:h-28 bg-[var(--gray-50)] flex-shrink-0 shadow-sm">
            <BookCover
              isbn={book.isbn || book.isbnIssn}
              title={book.title}
              size={"M"}
            />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="mb-1 sm:mb-2">
            <div className="flex items-center gap-1 text-xs">
              <UserIcon className="w-3 h-3 text-[var(--primaryColor)]" />
              <span className="text-[var(--gray-700)] font-medium">Autor:</span>
            </div>
            <div className="text-xs text-[var(--gray-600)] line-clamp-3">
              {book.author ? (
                splitAuthors(book.author).length > 2 ? (
                  <div title={book.author}>
                    <div>{splitAuthors(book.author)[0]}</div>
                    <div>{splitAuthors(book.author)[1]}</div>
                    <div className="text-[var(--gray-500)] italic">
                      {`i ${splitAuthors(book.author).length - 2} więcej`}
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

          <div className="flex flex-wrap gap-2 text-xs mb-1 sm:mb-2">
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

          {book.genre && (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                <span className="inline-flex text-xs px-2 py-0.5 bg-[var(--genre-bg)] text-[var(--genre-text)] rounded-full">
                  {book.genre}
                </span>
              </div>
            </div>
          )}

          <div className="mt-auto pt-1 text-right">
            <Link
              href={`/books/${book.id}`}
              className="inline-block text-xs font-medium bg-[var(--primaryColor)] text-white px-2 py-1 rounded hover:bg-[var(--primaryColorLight)] transition-colors"
            >
              Zobacz szczegóły →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  // Create a skeleton loader component for books
  const BookSkeleton = () => (
    <div className="bg-[var(--card-background)] rounded-lg shadow-sm overflow-hidden border border-[var(--gray-100)] flex flex-col animate-pulse">
      {/* Title bar skeleton */}
      <div className="bg-[var(--gray-200)] px-2 sm:px-3 py-5">
        <div className="flex justify-between items-start gap-2">
          <div className="h-3 bg-[var(--gray-300)] rounded w-3/4"></div>
          <div className="h-3 bg-[var(--gray-300)] rounded w-8"></div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-2 sm:p-3 flex gap-2 sm:gap-3">
        {/* Book cover skeleton */}
        <div className="w-16 sm:w-20 h-24 sm:h-28 bg-[var(--gray-200)] flex-shrink-0"></div>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Author skeleton */}
          <div className="mb-1 sm:mb-2">
            <div className="h-2 bg-[var(--gray-300)] rounded w-16 mb-1"></div>
            <div className="h-2 bg-[var(--gray-200)] rounded w-full mb-1"></div>
            <div className="h-2 bg-[var(--gray-200)] rounded w-2/3"></div>
          </div>

          {/* Year and language skeleton */}
          <div className="flex flex-wrap gap-2 mb-2">
            <div className="h-2 bg-[var(--gray-300)] rounded w-12"></div>
            <div className="h-2 bg-[var(--gray-300)] rounded w-16"></div>
          </div>

          {/* Genre skeleton */}
          <div className="mb-2">
            <div className="h-4 bg-[var(--gray-200)] rounded-full w-20"></div>
          </div>

          {/* Button skeleton */}
          <div className="mt-auto pt-1 text-right">
            <div className="h-6 bg-[var(--gray-300)] rounded w-24 ml-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Create a function to render the filter tabs
  const renderCategoryFilters = () => {
    return (
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center mb-6">
        <div className="bg-[var(--card-background)] p-1 rounded-lg shadow-sm flex">
          <button
            onClick={() => setActiveFilter("genre")}
            className={`px-4 py-2 mx-2 rounded-md text-sm font-medium transition-colors flex-1 ${
              activeFilter === "genre"
                ? "bg-[var(--primaryColor)] text-white"
                : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
            }`}
          >
            Gatunki
          </button>
          <button
            onClick={() => setActiveFilter("author")}
            className={`px-4 py-2 mx-2 rounded-md text-sm font-medium transition-colors flex-1 ${
              activeFilter === "author"
                ? "bg-[var(--primaryColor)] text-white"
                : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
            }`}
          >
            Autorzy
          </button>
          <button
            onClick={() => setActiveFilter("language")}
            className={`px-4 py-2 mx-2 rounded-md text-sm font-medium transition-colors flex-1 ${
              activeFilter === "language"
                ? "bg-[var(--primaryColor)] text-white"
                : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
            }`}
          >
            Języki
          </button>
        </div>
      </div>
    );
  };

  // Create a helper function to get the recommendations for the active filter
  // Remove the title property as we don't need it anymore
  const getActiveRecommendations = () => {
    switch (activeFilter) {
      case "genre":
        return {
          recommendations: recommendations.byGenre,
          type: "genre",
        };
      case "author":
        return {
          recommendations: recommendations.byAuthor,
          type: "author",
        };
      case "language":
        return {
          recommendations: recommendations.byLanguage,
          type: "language",
        };
    }
  };

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner />
      </div>
    );
  }

  // Check if there are any recommendations at all
  const hasAnyRecommendations =
    recommendations.byGenre.length > 0 ||
    recommendations.byAuthor.length > 0 ||
    recommendations.byLanguage.length > 0;

  // Get the current active recommendations
  const activeRecommendationsData = getActiveRecommendations();

  return (
    <main className="container pb-8 mx-auto px-4 bg-[var(--background)] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">
            Witaj w BookShare
          </h1>
          <p className="text-[var(--gray-500)] text-sm">
            Odkryj książki dopasowane do Twoich zainteresowań
          </p>
        </div>

        {hasAnyRecommendations && (
          <>
            {/* Add the category filters */}
            {renderCategoryFilters()}

            <section className="bg-[var(--card-background)] rounded-xl p-4 shadow-md">
              <div className="space-y-8">
                {activeRecommendationsData.recommendations.length > 0 ? (
                  activeRecommendationsData.recommendations.map((group) => {
                    const key = `${activeRecommendationsData.type}-${group.category}`;
                    const isExpanded = expandedSections[key] ?? false;
                    const isLoading = loadingCategories[key] ?? false;

                    return (
                      <div
                        key={group.category}
                        className="bg-[var(--background)] rounded-lg p-3 shadow-sm"
                      >
                        <button
                          onClick={() =>
                            toggleSection(
                              activeRecommendationsData.type,
                              group.category
                            )
                          }
                          className="w-full flex items-center justify-between text-left"
                        >
                          <h3 className="text-base font-semibold text-[var(--foreground)] pb-1">
                            {group.category}
                          </h3>
                          <svg
                            className={`w-5 h-5 transform transition-transform duration-300 ease-in-out ${
                              isExpanded ? "rotate-180" : "rotate-0"
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isExpanded
                              ? "max-h-[2000px] opacity-100"
                              : "max-h-0 opacity-0"
                          }`}
                        >
                          {isLoading ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                              {/* Replace LoadingSpinner with book skeletons */}
                              {[1, 2, 3, 4].map((i) => (
                                <BookSkeleton key={i} />
                              ))}
                            </div>
                          ) : group.books.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                              {group.books.map((book) => renderBookCard(book))}
                            </div>
                          ) : (
                            <div className="py-8 text-center text-[var(--gray-500)]">
                              Nie znaleziono książek{" "}
                              {activeFilter === "genre"
                                ? "w tej kategorii"
                                : activeFilter === "author"
                                ? "tego autora"
                                : "w tym języku"}
                              .
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-[var(--gray-500)]">
                    Nie znaleziono rekomendacji dla{" "}
                    {activeFilter === "genre"
                      ? "gatunków"
                      : activeFilter === "author"
                      ? "autorów"
                      : "języków"}
                    .
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {!hasAnyRecommendations && (
          <div className="text-center py-12">
            <BookOpenIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Brak spersonalizowanych rekomendacji
            </h2>
            <p className="text-[var(--gray-500)] max-w-md mx-auto text-sm">
              Aby otrzymać spersonalizowane rekomendacje:
            </p>
            <ul className="text-[var(--gray-500)] mt-2 space-y-1 text-xs">
              <li>• Oceń więcej książek (minimum 7/10 gwiazdek)</li>
              <li>• Przeglądaj i oceniaj książki z różnych gatunków</li>
              <li>• Sprawdź książki różnych autorów</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
