"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { StarIcon } from "@/app/components/svg-icons/StarIcon";
import { BookOpenIcon } from "@/app/components/svg-icons/BookOpenIcon";
import { UserIcon } from "@/app/components/svg-icons/UserIcon";
import { CalendarIcon } from "@/app/components/svg-icons/CalendarIcon";
import BookCover from "@/app/components/BookCover";
import { useAuth } from "@/app/hooks/useAuth";

interface Review {
  id: string;
  bookId: string;
  content: string;
  rating: number;
  createdAt: Date;
  userId: string;
}

interface ReviewWithBookDetails extends Review {
  bookTitle: string;
  bookAuthor: string;
  bookIsbn?: string;
  bookYear?: string;
}

export default function Reviews({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [reviews, setReviews] = useState<ReviewWithBookDetails[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<
    ReviewWithBookDetails[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [isFetchingBooks, setIsFetchingBooks] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchType, setSearchType] = useState<"title" | "author">("title");
  const containerRef = useRef<HTMLDivElement>(null);
  const unwrappedParams = use(params);
  const observer = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();

  const lastReviewElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMoreReviews();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore]
  );

  useEffect(() => {
    const calculateItemsPerPage = () => {
      if (containerRef.current) {
        const containerHeight = window.innerHeight - 200;
        const itemHeight = 200;
        const itemsFit = Math.ceil(containerHeight / itemHeight);
        setItemsPerPage(Math.max(itemsFit * 2, 6));
      }
    };

    calculateItemsPerPage();
    window.addEventListener("resize", calculateItemsPerPage);

    return () => {
      window.removeEventListener("resize", calculateItemsPerPage);
    };
  }, []);

  useEffect(() => {
    async function fetchUsername() {
      try {
        const userRef = doc(db, "users", unwrappedParams.id);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          setUsername(userSnapshot.data().displayName);
        }
      } catch (error) {
        console.error("Error fetching username:", error);
      }
    }

    fetchUsername();
  }, [unwrappedParams.id]);

  const fetchMoreReviews = async () => {
    if (isFetchingBooks) return;

    try {
      setIsLoading(true);
      setIsFetchingBooks(true);

      let reviewsQuery = query(
        collection(db, "reviews"),
        where("userId", "==", unwrappedParams.id),
        orderBy("createdAt", "desc"),
        limit(itemsPerPage)
      );

      if (lastDoc) {
        reviewsQuery = query(
          collection(db, "reviews"),
          where("userId", "==", unwrappedParams.id),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(itemsPerPage)
        );
      }

      const reviewsSnapshot = await getDocs(reviewsQuery);

      if (reviewsSnapshot.empty || reviewsSnapshot.docs.length < itemsPerPage) {
        setHasMore(false);
      }
      if (!reviewsSnapshot.empty) {
        setLastDoc(reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1]);
      }

      const reviewsData = reviewsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          content: data.comment || "",
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          rating: data.rating || 0,
        };
      }) as Review[];

      const existingIds = new Set(reviews.map((review) => review.id));
      const uniqueReviewsData = reviewsData.filter(
        (review) => !existingIds.has(review.id)
      );

      if (uniqueReviewsData.length === 0) {
        setHasMore(false);
        return;
      }

      const reviewsWithBooks = await Promise.all(
        uniqueReviewsData.map(async (review) => {
          try {
            const paddedId = review.bookId.padStart(14, "0");
            const response = await fetch(`/api/books/${paddedId}`);
            const bookData = await response.json();

            if (!response.ok) {
              throw new Error(bookData.error || "Failed to fetch book details");
            }

            return {
              ...review,
              bookTitle: bookData.title || "Książka niedostępna",
              bookAuthor: bookData.author || "Autor nieznany",
              bookIsbn: bookData.isbnIssn || "",
              bookYear: bookData.publicationYear || "",
            };
          } catch (error) {
            return {
              ...review,
              bookTitle: "Książka niedostępna",
              bookAuthor: "Autor nieznany",
              bookIsbn: "",
              bookYear: "",
            };
          }
        })
      );

      const newReviews = [...reviews];
      reviewsWithBooks.forEach((review) => {
        if (!newReviews.some((r) => r.id === review.id)) {
          newReviews.push(review);
        }
      });

      setReviews(newReviews);
    } catch (error) {
      console.error("Error fetching more reviews:", error);
      setError("Wystąpił błąd podczas ładowania recenzji");
    } finally {
      setIsLoading(false);
      setIsFetchingBooks(false);
    }
  };

  useEffect(() => {
    setReviews([]);
    setFilteredReviews([]);
    setHasMore(true);
    setLastDoc(null);
    setIsFetchingBooks(false);
    fetchMoreReviews();

    return () => {
      setReviews([]);
      setFilteredReviews([]);
      setHasMore(true);
      setLastDoc(null);
      setIsFetchingBooks(false);
    };
  }, [unwrappedParams.id]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredReviews(reviews);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = reviews.filter((review) => {
      if (searchType === "title") {
        return review.bookTitle?.toLowerCase().includes(query);
      } else {
        return review.bookAuthor?.toLowerCase().includes(query);
      }
    });

    setFilteredReviews(filtered);
  }, [searchQuery, searchType, reviews]);

  const isCurrentUser = user && user.uid === unwrappedParams.id;

  const renderBookCover = (review: ReviewWithBookDetails) => {
    const hasIsbn = !!review.bookIsbn && review.bookIsbn.trim().length > 0;

    return (
      <div className="w-16 sm:w-20 h-24 sm:h-28 bg-[var(--gray-50)] flex-shrink-0 shadow-sm">
        {hasIsbn ? (
          <BookCover isbn={review.bookIsbn} title={review.bookTitle} size="M" />
        ) : (
          <div className="relative aspect-[2/3] h-full bg-[var(--gray-100)] flex items-center justify-center rounded-lg">
            <BookOpenIcon className="w-10 h-10 text-[var(--gray-300)]" />
          </div>
        )}
      </div>
    );
  };

  if (isLoading && reviews.length === 0) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto pb-8 px-4 sm:px-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-[var(--gray-800)]">
        {isCurrentUser
          ? "Twoje recenzje"
          : username
          ? `Recenzje użytkownika ${username}`
          : "Recenzje"}
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
            className="w-full px-3 py-1.5 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-[border] duration-200 text-sm"
          />
        </div>

        <div className="flex justify-center gap-2 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setSearchType("title")}
            className={`px-2 py-1 rounded-lg transition-colors ${
              searchType === "title"
                ? "bg-indigo-600 text-white"
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
                ? "bg-indigo-600 text-white"
                : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
            }`}
          >
            Autor
          </button>
        </div>
      </div>

      <div ref={containerRef}>
        {filteredReviews.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
            {filteredReviews.map((review, index) => (
              <div
                key={`${review.id}_${index}`}
                ref={
                  index === filteredReviews.length - 1 &&
                  reviews.length === filteredReviews.length
                    ? lastReviewElementRef
                    : undefined
                }
                className="bg-[var(--card-background)] rounded-lg shadow-sm overflow-hidden border border-[var(--gray-100)] flex flex-col"
              >
                <div className="bg-indigo-600 px-2 sm:px-3 py-2">
                  <div className="flex justify-between items-start gap-2">
                    <Link
                      href={`/books/${review.bookId}`}
                      className="text-xs sm:text-sm font-semibold text-white flex-1 hover:underline"
                      title={review.bookTitle || ""}
                    >
                      {review.bookTitle && review.bookTitle.length > 60
                        ? review.bookTitle.substring(0, 57) + "..."
                        : review.bookTitle || "Książka niedostępna"}
                    </Link>
                    <div className="flex items-center bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs shrink-0">
                      <svg
                        className="w-3 h-3 text-yellow-300"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="ml-0.5 text-white text-xs font-medium">
                        {review.rating ? review.rating : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2 sm:p-3 flex gap-2 sm:gap-3 flex-grow">
                  {renderBookCover(review)}

                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="mb-1">
                      <div className="flex items-center gap-1 text-xs">
                        <UserIcon className="w-3 h-3 text-indigo-600" />
                        <span className="text-[var(--gray-700)] font-medium">
                          Autor:
                        </span>
                      </div>
                      <p className="text-xs text-[var(--gray-600)]">
                        {review.bookAuthor || "Autor nieznany"}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 mb-2">
                      {[...Array(10)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-3 w-3 ${
                            i < review.rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>

                    {review.bookYear && (
                      <div className="flex items-center gap-1 text-xs mb-1">
                        <CalendarIcon className="w-3 h-3 text-indigo-600" />
                        <span className="text-[var(--gray-600)]">
                          {review.bookYear}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-[var(--gray-500)] mt-1">
                      {format(review.createdAt, "d MMMM yyyy", {
                        locale: pl,
                      })}
                    </p>

                    <div className="mt-auto pt-2">
                      {review.content ? (
                        <div className="text-sm text-[var(--gray-800)] font-medium bg-indigo-50 p-2 rounded-md mb-2 line-clamp-3">
                          {review.content.length > 100
                            ? review.content.substring(0, 100) + "..."
                            : review.content}
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--gray-400)] italic mb-2 p-2">
                          Brak treści recenzji
                        </div>
                      )}
                      <div className="text-right">
                        <Link
                          href={`/books/${review.bookId}`}
                          className="inline-block text-xs font-medium bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors"
                        >
                          Zobacz książkę →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-10 rounded-xl">
            <BookOpenIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery
                ? "Nie znaleziono pasujących recenzji"
                : isCurrentUser
                ? "Nie masz jeszcze recenzji"
                : "Użytkownik nie dodał jeszcze recenzji"}
            </p>
            {searchQuery && (
              <p className="text-gray-400 mt-2">
                Spróbuj zmienić kryteria wyszukiwania
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
