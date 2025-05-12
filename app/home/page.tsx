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
import BookCover from "../components/BookCover";

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
  const [loadedCategories, setLoadedCategories] = useState<LoadedCategories>(
    {}
  );
  const [loadingCategories, setLoadingCategories] = useState<{
    [key: string]: boolean;
  }>({});

  const [selectedFilters, setSelectedFilters] = useState({
    genre: null as string | null,
    author: null as string | null,
    language: null as string | null,
  });

  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

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

  const fetchFilteredBooks = async () => {
    if (!user) return;

    if (
      !selectedFilters.genre &&
      !selectedFilters.author &&
      !selectedFilters.language
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("userId", user.uid);

      if (selectedFilters.genre) {
        params.append("genre", selectedFilters.genre);
      }
      if (selectedFilters.author) {
        params.append("author", selectedFilters.author);
      }
      if (selectedFilters.language) {
        params.append("language", selectedFilters.language);
      }

      const response = await fetch(
        `/api/recommendations/filtered?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch filtered books");
      }

      const data = await response.json();
      setFilteredBooks(data.books);
    } catch (error) {
      console.error("Error fetching filtered books:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredBooks();
  }, [
    selectedFilters.genre,
    selectedFilters.author,
    selectedFilters.language,
    user,
  ]);

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

    setExpandedSections((prev) => {
      const newState = { ...prev };
      newState[key] = !prev[key];

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

  const hasValidCover = (book: Book): boolean => {
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

  const BookSkeleton = () => (
    <div className="bg-[var(--card-background)] rounded-lg shadow-sm overflow-hidden border border-[var(--gray-100)] flex flex-col animate-pulse">
      <div className="bg-[var(--gray-200)] px-2 sm:px-3 py-5">
        <div className="flex justify-between items-start gap-2">
          <div className="h-3 bg-[var(--gray-300)] rounded w-3/4"></div>
          <div className="h-3 bg-[var(--gray-300)] rounded w-8"></div>
        </div>
      </div>

      <div className="p-2 sm:p-3 flex gap-2 sm:gap-3">
        <div className="w-16 sm:w-20 h-24 sm:h-28 bg-[var(--gray-200)] flex-shrink-0"></div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="mb-1 sm:mb-2">
            <div className="h-2 bg-[var(--gray-300)] rounded w-16 mb-1"></div>
            <div className="h-2 bg-[var(--gray-200)] rounded w-full mb-1"></div>
            <div className="h-2 bg-[var(--gray-200)] rounded w-2/3"></div>
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            <div className="h-2 bg-[var(--gray-300)] rounded w-12"></div>
            <div className="h-2 bg-[var(--gray-300)] rounded w-16"></div>
          </div>

          <div className="mb-2">
            <div className="h-4 bg-[var(--gray-200)] rounded-full w-20"></div>
          </div>

          <div className="mt-auto pt-1 text-right">
            <div className="h-6 bg-[var(--gray-300)] rounded w-24 ml-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const selectFilter = (
    type: "genre" | "author" | "language",
    value: string | null
  ) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [type]: prev[type] === value ? null : value,
    }));
  };

  const renderCategoryFilters = () => {
    return (
      <div className="pt-4 pb-3 bg-[var(--background)] mb-6">
        <div className="max-w-5xl mx-auto px-3">
          <h3 className="text-center text-sm font-medium mb-3 text-[var(--gray-700)]">
            Filtruj rekomendacje
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[var(--card-background)] p-3 rounded-lg shadow-sm border border-[var(--gray-100)]">
              <div className="text-xs font-medium mb-2 text-[var(--primaryColor)] flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
                Gatunki
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                {recommendations.byGenre.map((item) => (
                  <button
                    key={item.category}
                    onClick={() => selectFilter("genre", item.category)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                      selectedFilters.genre === item.category
                        ? "bg-[var(--primaryColor)] text-white shadow-sm"
                        : "bg-[var(--gray-50)] text-[var(--gray-700)] hover:bg-[var(--gray-100)] border border-[var(--gray-100)]"
                    }`}
                  >
                    {item.category}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[var(--card-background)] p-3 rounded-lg shadow-sm border border-[var(--gray-100)]">
              <div className="text-xs font-medium mb-2 text-[var(--primaryColor)] flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                Autorzy
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                {recommendations.byAuthor.flatMap((item) => {
                  const authors = splitAuthors(item.category);

                  return authors
                    .map((author, index) => {
                      if (author.length < 4) return null;
                      const cleanAuthor = author
                        .replace(/\(\d{4}-\d{4}\)/g, "")
                        .replace(/\(\d{4}-\s*\)/g, "")
                        .trim();

                      return (
                        <button
                          key={`${item.category}-${index}`}
                          onClick={() => selectFilter("author", cleanAuthor)}
                          className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                            selectedFilters.author === cleanAuthor
                              ? "bg-[var(--primaryColor)] text-white shadow-sm"
                              : "bg-[var(--gray-50)] text-[var(--gray-700)] hover:bg-[var(--gray-100)] border border-[var(--gray-100)]"
                          }`}
                          title={item.category}
                        >
                          {cleanAuthor}
                        </button>
                      );
                    })
                    .filter(Boolean);
                })}
              </div>
            </div>

            <div className="bg-[var(--card-background)] p-3 rounded-lg shadow-sm border border-[var(--gray-100)]">
              <div className="text-xs font-medium mb-2 text-[var(--primaryColor)] flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                    clipRule="evenodd"
                  />
                </svg>
                Języki
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                {recommendations.byLanguage.map((item) => (
                  <button
                    key={item.category}
                    onClick={() => selectFilter("language", item.category)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                      selectedFilters.language === item.category
                        ? "bg-[var(--primaryColor)] text-white shadow-sm"
                        : "bg-[var(--gray-50)] text-[var(--gray-700)] hover:bg-[var(--gray-100)] border border-[var(--gray-100)]"
                    }`}
                  >
                    {item.category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getActiveRecommendations = () => {
    return [
      {
        type: "genre",
        recommendations: recommendations.byGenre,
        title: "Gatunki",
      },
      {
        type: "author",
        recommendations: recommendations.byAuthor,
        title: "Autorzy",
      },
      {
        type: "language",
        recommendations: recommendations.byLanguage,
        title: "Języki",
      },
    ];
  };

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner />
      </div>
    );
  }

  const hasAnyRecommendations =
    recommendations.byGenre.length > 0 ||
    recommendations.byAuthor.length > 0 ||
    recommendations.byLanguage.length > 0;

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
            {renderCategoryFilters()}
            {(selectedFilters.genre ||
              selectedFilters.author ||
              selectedFilters.language) && (
              <div className="sticky top-14 z-10 flex flex-wrap gap-2 justify-center mt-2 bg-[var(--gray-50)] rounded-lg p-2 border border-[var(--gray-100)] shadow-inner">
                <div className="text-xs text-[var(--gray-500)] self-center">
                  Aktywne filtry:
                </div>
                {selectedFilters.genre && (
                  <div className="flex items-center bg-[var(--primaryColor)] text-white text-xs px-3 py-1.5 rounded-full shadow-sm">
                    <svg
                      className="h-3 w-3 mr-1 opacity-70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    <span>{selectedFilters.genre}</span>
                    <button
                      className="ml-1.5 hover:text-gray-200 bg-white/20 rounded-full h-4 w-4 flex items-center justify-center"
                      onClick={() => selectFilter("genre", null)}
                      aria-label="Usuń filtr gatunku"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {selectedFilters.author && (
                  <div className="flex items-center bg-[var(--primaryColor)] text-white text-xs px-3 py-1.5 rounded-full shadow-sm">
                    <svg
                      className="h-3 w-3 mr-1 opacity-70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>{selectedFilters.author}</span>
                    <button
                      className="ml-1.5 hover:text-gray-200 bg-white/20 rounded-full h-4 w-4 flex items-center justify-center"
                      onClick={() => selectFilter("author", null)}
                      aria-label="Usuń filtr autora"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {selectedFilters.language && (
                  <div className="flex items-center bg-[var(--primaryColor)] text-white text-xs px-3 py-1.5 rounded-full shadow-sm">
                    <svg
                      className="h-3 w-3 mr-1 opacity-70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    <span>{selectedFilters.language}</span>
                    <button
                      className="ml-1.5 hover:text-gray-200 bg-white/20 rounded-full h-4 w-4 flex items-center justify-center"
                      onClick={() => selectFilter("language", null)}
                      aria-label="Usuń filtr języka"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Clear all filters button */}
                {(selectedFilters.genre ||
                  selectedFilters.author ||
                  selectedFilters.language) && (
                  <button
                    onClick={() =>
                      setSelectedFilters({
                        genre: null,
                        author: null,
                        language: null,
                      })
                    }
                    className="text-xs bg-[var(--gray-200)] hover:bg-[var(--gray-300)] text-[var(--gray-700)] px-2 py-1 rounded-md ml-1 transition-colors"
                  >
                    Wyczyść wszystkie
                  </button>
                )}
              </div>
            )}
            <section className="bg-[var(--card-background)] rounded-xl p-4 sm:p-6 shadow-md">
              {selectedFilters.genre ||
              selectedFilters.author ||
              selectedFilters.language ? (
                <div>
                  <h2 className="text-lg font-semibold mb-6 text-[var(--foreground)] flex items-center border-b pb-3 border-[var(--gray-100)]">
                    <svg
                      className="w-5 h-5 mr-2 text-[var(--primaryColor)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    Rekomendacje dopasowane do filtrów
                  </h2>
                  {isLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map((i) => (
                        <BookSkeleton key={i} />
                      ))}
                    </div>
                  ) : filteredBooks.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {filteredBooks.map((book) => renderBookCard(book))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-[var(--gray-500)]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 mx-auto mb-3 text-[var(--gray-300)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-base font-medium mb-1">
                        Nie znaleziono książek spełniających wszystkie kryteria
                      </p>
                      <p className="text-sm">
                        Spróbuj użyć mniejszej liczby filtrów lub wybierz inne
                        kategorie
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {getActiveRecommendations().map(
                    ({ type, recommendations, title }) => (
                      <div key={type} className="pb-6">
                        <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)] flex items-center border-b pb-3 border-[var(--gray-100)]">
                          {type === "genre" ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-7 w-7 mr-3 text-[var(--primaryColor)]"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                            </svg>
                          ) : type === "author" ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-7 w-7 mr-3 text-[var(--primaryColor)]"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-7 w-7 mr-3 text-[var(--primaryColor)]"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          {title}
                        </h2>

                        <div className="space-y-4">
                          {recommendations.length > 0 ? (
                            recommendations.map((group) => {
                              const key = `${type}-${group.category}`;
                              const isExpanded = expandedSections[key] ?? false;
                              const isLoading = loadingCategories[key] ?? false;

                              return (
                                <div
                                  key={key}
                                  className={`bg-[var(--background)] rounded-lg overflow-hidden shadow-sm border border-[var(--gray-100)] transition-all duration-300 ${
                                    isExpanded ? "shadow-md" : ""
                                  }`}
                                >
                                  <button
                                    onClick={() =>
                                      toggleSection(type, group.category)
                                    }
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--gray-50)] transition-colors"
                                  >
                                    <h3 className="text-base font-medium text-[var(--foreground)] flex items-center">
                                      {group.category}
                                    </h3>
                                    <div className="flex items-center">
                                      {isExpanded && isLoading && (
                                        <div className="w-4 h-4 mr-2 border-2 border-[var(--gray-300)] border-t-[var(--primaryColor)] rounded-full animate-spin"></div>
                                      )}
                                      <svg
                                        className={`w-5 h-5 text-[var(--gray-400)] transform transition-transform duration-300 ease-in-out ${
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
                                    </div>
                                  </button>
                                  <div
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                      isExpanded ? "block" : "hidden"
                                    }`}
                                  >
                                    <div className="px-4 pb-4">
                                      {isLoading ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                                          {[1, 2, 3, 4].map((i) => (
                                            <BookSkeleton key={i} />
                                          ))}
                                        </div>
                                      ) : group.books.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                                          {group.books.map((book) =>
                                            renderBookCard(book)
                                          )}
                                        </div>
                                      ) : (
                                        <div className="py-8 text-center text-[var(--gray-500)]">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-10 w-10 mx-auto mb-2 text-[var(--gray-300)]"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={1.5}
                                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                            />
                                          </svg>
                                          <p>
                                            Nie znaleziono książek{" "}
                                            {type === "genre"
                                              ? "w tej kategorii"
                                              : type === "author"
                                              ? "tego autora"
                                              : "w tym języku"}
                                            .
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-10 text-center text-[var(--gray-500)] bg-[var(--background)] rounded-lg border border-dashed border-[var(--gray-200)]">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-10 w-10 mx-auto mb-3 text-[var(--gray-300)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                              <p className="font-medium mb-1">
                                Nie znaleziono rekomendacji
                              </p>
                              <p className="text-sm">
                                Brak rekomendacji dla{" "}
                                {type === "genre"
                                  ? "gatunków"
                                  : type === "author"
                                  ? "autorów"
                                  : "języków"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
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
