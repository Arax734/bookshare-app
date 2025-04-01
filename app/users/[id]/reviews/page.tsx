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
} from "firebase/firestore";
import Link from "next/link";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { StarIcon } from "@/app/components/svg-icons/StarIcon";

const REVIEWS_PER_PAGE = 10;

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
}

export default function Reviews({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [reviews, setReviews] = useState<ReviewWithBookDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [itemsPerPage, setItemsPerPage] = useState(5); // Default value
  const containerRef = useRef<HTMLDivElement>(null);
  const unwrappedParams = use(params);
  const observer = useRef<IntersectionObserver | null>(null);

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
        const containerHeight = window.innerHeight - 200; // Subtract header/margins
        const itemHeight = 200; // Approximate height of a review card
        const itemsFit = Math.ceil(containerHeight / itemHeight);
        setItemsPerPage(itemsFit);
      }
    };

    calculateItemsPerPage();
    window.addEventListener("resize", calculateItemsPerPage);

    return () => {
      window.removeEventListener("resize", calculateItemsPerPage);
    };
  }, []);

  const fetchMoreReviews = async () => {
    try {
      setIsLoading(true);
      let reviewsQuery = query(
        collection(db, "reviews"),
        where("userId", "==", unwrappedParams.id),
        orderBy("createdAt", "desc"),
        limit(itemsPerPage) // Use dynamic page size
      );

      if (lastDoc) {
        reviewsQuery = query(
          collection(db, "reviews"),
          where("userId", "==", unwrappedParams.id),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(itemsPerPage) // Use dynamic page size
        );
      }

      const reviewsSnapshot = await getDocs(reviewsQuery);

      if (reviewsSnapshot.docs.length < itemsPerPage) {
        setHasMore(false);
      }

      setLastDoc(reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1]);

      const reviewsData = reviewsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Review[];

      const reviewsWithBooks = await Promise.all(
        reviewsData.map(async (review) => {
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
            };
          } catch (error) {
            return {
              ...review,
              bookTitle: "Książka niedostępna",
              bookAuthor: "Autor nieznany",
            };
          }
        })
      );

      setReviews((prev) => [...prev, ...reviewsWithBooks]);
    } catch (error) {
      console.error("Error fetching more reviews:", error);
      setError("Wystąpił błąd podczas ładowania recenzji");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setReviews([]);
    setHasMore(true);
    setLastDoc(null);
    fetchMoreReviews();
  }, [unwrappedParams.id]);

  if (isLoading && reviews.length === 0) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <main className="mx-auto px-4 pb-8 bg-[var(--background)] min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4 text-white">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">Wszystkie recenzje</h1>
              <Link
                href={`/users/${unwrappedParams.id}`}
                className="text-white hover:text-gray-200 transition-colors"
              >
                Powrót do profilu
              </Link>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4" ref={containerRef}>
              {reviews.length > 0 ? (
                <>
                  {reviews.map((review, index) => (
                    <div
                      key={review.id}
                      ref={
                        index === reviews.length - 1
                          ? lastReviewElementRef
                          : undefined
                      }
                      className="bg-[var(--background)] p-4 rounded-xl border border-[var(--gray-200)] transition-all duration-200 shadow"
                    >
                      <div className="flex flex-col space-y-2">
                        <Link
                          href={`/books/${review.bookId}`}
                          className="text-[var(--primaryColor)] hover:text-[var(--primaryColorLight)] font-medium transition-colors"
                        >
                          {review.bookTitle}
                        </Link>
                        <p className="text-sm text-[var(--gray-500)]">
                          {review.bookAuthor}
                        </p>
                        <div className="flex items-center space-x-1">
                          {[...Array(10)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`h-5 w-5 ${
                                i < review.rating
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[var(--gray-700)] mt-2">
                          {review.content}
                        </p>
                        <p className="text-xs text-[var(--gray-500)] mt-2">
                          {format(review.createdAt, "d MMMM yyyy", {
                            locale: pl,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-center text-[var(--gray-500)]">
                  Brak recenzji do wyświetlenia
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
