"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import { CalendarIcon } from "../components/svg-icons/CalendarIcon";
import Link from "next/link";
import { BookOpenIcon } from "../components/svg-icons/BookOpenIcon";
import { LanguageIcon } from "../components/svg-icons/LanguageIcon";
import { TagIcon } from "../components/svg-icons/TagIcon";

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

export default function Home() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendationGroups>({
    byGenre: [],
    byAuthor: [],
    byLanguage: [],
    byDecade: [],
  });

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

  const renderBookCard = (book: Book) => (
    <div
      key={book.id}
      className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
    >
      {/* Book card header with title */}
      <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4 text-white">
        <h2 className="text-xl font-bold line-clamp-2" title={book.title}>
          {book.title || "Tytuł niedostępny"}
        </h2>
      </div>

      {/* Main content */}
      <div className="p-5">
        {/* Author and year section with ratings */}
        <div className="flex items-start mb-4 pb-4 border-b border-gray-100">
          <div className="flex-1">
            <p className="font-semibold text-[var(--gray-800)] mb-1">
              {book.author || "Nieznany autor"}
            </p>
            <div className="flex items-center text-[var(--gray-700)]">
              <CalendarIcon className="h-4 w-4 mr-1" />
              <span>{book.publicationYear || "Rok nieznany"}</span>
            </div>

            {/* Add rating display */}
            <div className="flex items-center mt-2 gap-2">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="ml-1 text-sm font-medium text-[var(--gray-700)]">
                  {book.averageRating
                    ? `${book.averageRating}/10`
                    : "Brak ocen"}
                </span>
              </div>
              {book.totalReviews ? (
                <span className="text-sm text-[var(--gray-500)]">
                  ({book.totalReviews}{" "}
                  {book.totalReviews === 1 ? "opinia" : "opinii"})
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 gap-3">
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

          {/* Genre */}
          <div className="flex items-start">
            <TagIcon className="h-5 w-5 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-800 font-medium dark:text-gray-200">
                Gatunek
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
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <main className="container mx-auto px-4 py-8 bg-[var(--background)] min-h-screen">
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

        {recommendations.byGenre.length > 0 && (
          <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              Polecane w Twoich ulubionych gatunkach
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.byGenre.map((group) => (
                <div key={group.category}>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    {group.category}
                  </h3>
                  <div className="space-y-4">
                    {group.books.map((book) => renderBookCard(book))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {recommendations.byAuthor.length > 0 && (
          <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              Więcej od Twoich ulubionych autorów
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.byAuthor.map((group) => (
                <div key={group.category}>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    {group.category}
                  </h3>
                  <div className="space-y-4">
                    {group.books.map((book) => renderBookCard(book))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {recommendations.byLanguage.length > 0 && (
          <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              Książki w preferowanych językach
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.byLanguage.map((group) => (
                <div key={group.category}>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    {group.category}
                  </h3>
                  <div className="space-y-4">
                    {group.books.map((book) => renderBookCard(book))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {recommendations.byDecade.length > 0 && (
          <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              Z okresu, który Cię interesuje
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.byDecade.map((group) => (
                <div key={group.category}>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    {group.category}
                  </h3>
                  <div className="space-y-4">
                    {group.books.map((book) => renderBookCard(book))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!recommendations.byGenre.length && (
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
