"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import { CalendarIcon } from "../components/svg-icons/CalendarIcon";
import Link from "next/link";
import { BookOpenIcon } from "../components/svg-icons/BookOpenIcon";
import { LanguageIcon } from "../components/svg-icons/LanguageIcon";
import { TagIcon } from "../components/svg-icons/TagIcon";
import { UserIcon } from "../components/svg-icons/UserIcon";
import { splitAuthors } from "../utils/stringUtils";

// Update interfaces
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
  byDecade: RecommendationItem[];
}

interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  publicationYear: number;
  coverUrl?: string;
  averageRating?: number;
  totalReviews?: number;
}

// Add this after other interfaces
interface ExpandedSections {
  [key: string]: boolean;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendationGroups>({
    byGenre: [],
    byAuthor: [],
    byLanguage: [],
    byDecade: [],
  });
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
    () => {
      const initial: ExpandedSections = {};

      // Pre-populate with true values for each section
      recommendations.byGenre.forEach((group) => {
        initial[`genre-${group.category}`] = true;
      });
      recommendations.byAuthor.forEach((group) => {
        initial[`author-${group.category}`] = true;
      });
      recommendations.byLanguage.forEach((group) => {
        initial[`language-${group.category}`] = true;
      });
      recommendations.byDecade.forEach((group) => {
        initial[`decade-${group.category}`] = true;
      });

      return initial;
    }
  );

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/recommendations?userId=${user.uid}`);
        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }

        const data: RecommendationResponse = await response.json();
        setRecommendations(data.recommendations);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  // Update useEffect to reinitialize expandedSections when recommendations change
  useEffect(() => {
    setExpandedSections((prev) => {
      const newState = { ...prev };
      recommendations.byGenre.forEach((group) => {
        if (!(`genre-${group.category}` in newState)) {
          newState[`genre-${group.category}`] = true;
        }
      });
      recommendations.byAuthor.forEach((group) => {
        if (!(`author-${group.category}` in newState)) {
          newState[`author-${group.category}`] = true;
        }
      });
      recommendations.byLanguage.forEach((group) => {
        if (!(`language-${group.category}` in newState)) {
          newState[`language-${group.category}`] = true;
        }
      });
      recommendations.byDecade.forEach((group) => {
        if (!(`decade-${group.category}` in newState)) {
          newState[`decade-${group.category}`] = true;
        }
      });
      return newState;
    });
  }, [recommendations]);

  // Add toggle function
  const toggleSection = (categoryType: string, category: string) => {
    const key = `${categoryType}-${category}`;
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderBookCard = (book: Book) => (
    <div
      key={book.id}
      className="bg-[var(--card-background)] rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md border border-[var(--gray-100)] flex flex-col"
    >
      {/* Header with title and rating */}
      <div className="bg-gradient-to-r bg-[var(--primaryColor)] p-4">
        <div className="flex justify-between items-start gap-2">
          <h2
            className="text-lg font-bold text-white line-clamp-2 flex-1"
            title={book.title}
          >
            {book.title || "Tytuł niedostępny"}
          </h2>
          <div className="flex items-center bg-white/10 backdrop-blur-sm px-2 py-1 rounded-lg shrink-0">
            <svg
              className="w-4 h-4 text-yellow-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="ml-1 text-white text-sm font-medium">
              {book.averageRating ? `${book.averageRating}` : "Brak"}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 space-y-4 flex-1">
        {/* Authors section */}
        <div className="bg-[var(--gray-50)] rounded-lg p-3">
          <h3 className="text-[var(--gray-800)] font-semibold mb-2 flex items-center text-sm">
            <UserIcon className="w-4 h-4 mr-2 text-[var(--primaryColor)]" />
            Autorzy
          </h3>
          {book.author ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {splitAuthors(book.author).map((author, index) => (
                <div
                  key={index}
                  className="flex items-center text-sm text-[var(--gray-700)] truncate"
                  title={author}
                >
                  <span className="w-1.5 h-1.5 bg-[var(--primaryColor)] rounded-full mr-2 flex-shrink-0"></span>
                  <span className="truncate">{author}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--gray-500)] italic">
              Nieznany autor
            </p>
          )}
        </div>

        {/* Publication details in compact grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-[var(--gray-50)] rounded-lg p-3">
            <div className="flex items-center mb-1">
              <CalendarIcon className="w-4 h-4 text-[var(--primaryColor)] mr-1" />
              <h3 className="font-medium text-[var(--gray-800)]">Rok</h3>
            </div>
            <p className="text-[var(--gray-700)]">
              {book.publicationYear || "—"}
            </p>
          </div>

          <div className="bg-[var(--gray-50)] rounded-lg p-3">
            <div className="flex items-center mb-1">
              <LanguageIcon className="w-4 h-4 text-[var(--primaryColor)] mr-1" />
              <h3 className="font-medium text-[var(--gray-800)]">Język</h3>
            </div>
            <p className="text-[var(--gray-700)] capitalize">
              {book.language || "—"}
            </p>
          </div>
        </div>

        {/* Categories as compact tags */}
        {book.genre && (
          <div className="flex flex-wrap gap-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
              {book.genre}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--gray-100)] flex items-center justify-between bg-[var(--gray-50)]">
        <Link
          href={`/books/${book.id}`}
          className="px-3 py-1.5 bg-[var(--primaryColor)] text-white text-sm rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors font-medium ml-auto"
        >
          Zobacz szczegóły
        </Link>
      </div>
    </div>
  );

  // Show loading spinner while authenticating or loading data
  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 bg-[var(--background)] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Witaj w BookShare
          </h1>
          <p className="text-[var(--gray-500)]">
            Odkryj książki dopasowane do Twoich zainteresowań
          </p>
        </div>

        {/* Only render sections that have books */}
        {recommendations.byGenre.filter((group) => group.books.length > 0)
          .length > 0 && (
          <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">
              Polecane w Twoich ulubionych gatunkach
            </h2>
            <div className="space-y-8">
              {recommendations.byGenre
                .filter((group) => group.books.length > 0)
                .map((group) => {
                  const isExpanded =
                    expandedSections[`genre-${group.category}`] ?? true;
                  return (
                    <div
                      key={group.category}
                      className="bg-[var(--background)] rounded-xl p-6 shadow-sm"
                    >
                      <button
                        onClick={() => toggleSection("genre", group.category)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h3 className="text-lg font-semibold text-[var(--foreground)] pb-2">
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                          {group.books.map((book) => renderBookCard(book))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {recommendations.byAuthor.filter((group) => group.books.length > 0)
          .length > 0 && (
          <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">
              Więcej od Twoich ulubionych autorów
            </h2>
            <div className="space-y-8">
              {recommendations.byAuthor
                .filter((group) => group.books.length > 0)
                .map((group) => {
                  const isExpanded =
                    expandedSections[`author-${group.category}`] ?? true;
                  return (
                    <div
                      key={group.category}
                      className="bg-[var(--background)] rounded-xl p-6 shadow-sm"
                    >
                      <button
                        onClick={() => toggleSection("author", group.category)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h3 className="text-lg font-semibold text-[var(--foreground)] pb-2">
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                          {group.books.map((book) => renderBookCard(book))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {recommendations.byLanguage.filter((group) => group.books.length > 0)
          .length > 0 && (
          <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">
              Książki w preferowanych językach
            </h2>
            <div className="space-y-8">
              {recommendations.byLanguage
                .filter((group) => group.books.length > 0)
                .map((group) => {
                  const isExpanded =
                    expandedSections[`language-${group.category}`] ?? true;
                  return (
                    <div
                      key={group.category}
                      className="bg-[var(--background)] rounded-xl p-6 shadow-sm"
                    >
                      <button
                        onClick={() =>
                          toggleSection("language", group.category)
                        }
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h3 className="text-lg font-semibold text-[var(--foreground)] pb-2">
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                          {group.books.map((book) => renderBookCard(book))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {recommendations.byDecade.filter((group) => group.books.length > 0)
          .length > 0 && (
          <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">
              Z okresu, który Cię interesuje
            </h2>
            <div className="space-y-8">
              {recommendations.byDecade
                .filter((group) => group.books.length > 0)
                .map((group) => {
                  const isExpanded =
                    expandedSections[`decade-${group.category}`] ?? true;
                  return (
                    <div
                      key={group.category}
                      className="bg-[var(--background)] rounded-xl p-6 shadow-sm"
                    >
                      <button
                        onClick={() => toggleSection("decade", group.category)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h3 className="text-lg font-semibold text-[var(--foreground)] pb-2">
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                          {group.books.map((book) => renderBookCard(book))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* No recommendations message */}
        {!recommendations.byGenre.some((group) => group.books.length > 0) &&
          !recommendations.byAuthor.some((group) => group.books.length > 0) &&
          !recommendations.byLanguage.some((group) => group.books.length > 0) &&
          !recommendations.byDecade.some((group) => group.books.length > 0) && (
            <div className="text-center py-12">
              <BookOpenIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                Brak spersonalizowanych rekomendacji
              </h2>
              <p className="text-[var(--gray-500)] max-w-md mx-auto">
                Aby otrzymać spersonalizowane rekomendacje:
              </p>
              <ul className="text-[var(--gray-500)] mt-4 space-y-2">
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
