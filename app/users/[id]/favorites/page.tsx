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

interface Favorite {
  id: string;
  bookId: string;
  createdAt: Date;
  userId: string;
}

interface FavoriteWithBookDetails extends Favorite {
  bookTitle: string;
  bookAuthor: string;
}

export default function Favorites({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [favorites, setFavorites] = useState<FavoriteWithBookDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isFetchingBooks, setIsFetchingBooks] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unwrappedParams = use(params);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastFavoriteElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMoreFavorites();
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
        setItemsPerPage(itemsFit);
      }
    };

    calculateItemsPerPage();
    window.addEventListener("resize", calculateItemsPerPage);

    return () => {
      window.removeEventListener("resize", calculateItemsPerPage);
    };
  }, []);

  const fetchMoreFavorites = async () => {
    if (isFetchingBooks) return;

    try {
      setIsLoading(true);
      setIsFetchingBooks(true);

      let favoritesQuery = query(
        collection(db, "bookFavorites"),
        where("userId", "==", unwrappedParams.id),
        orderBy("createdAt", "desc"),
        limit(itemsPerPage)
      );

      if (lastDoc) {
        favoritesQuery = query(
          collection(db, "bookFavorites"),
          where("userId", "==", unwrappedParams.id),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(itemsPerPage)
        );
      }

      const favoritesSnapshot = await getDocs(favoritesQuery);

      if (
        favoritesSnapshot.empty ||
        favoritesSnapshot.docs.length < itemsPerPage
      ) {
        setHasMore(false);
      }

      if (!favoritesSnapshot.empty) {
        setLastDoc(favoritesSnapshot.docs[favoritesSnapshot.docs.length - 1]);
      }

      const favoritesData = favoritesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Favorite[];

      const existingIds = new Set(favorites.map((favorite) => favorite.id));
      const uniqueFavoritesData = favoritesData.filter(
        (favorite) => !existingIds.has(favorite.id)
      );

      if (uniqueFavoritesData.length === 0) {
        setHasMore(false);
        return;
      }

      const favoritesWithBooks = await Promise.all(
        uniqueFavoritesData.map(async (favorite) => {
          try {
            const paddedId = favorite.bookId.padStart(14, "0");
            const response = await fetch(`/api/books/${paddedId}`);
            const bookData = await response.json();

            if (!response.ok) {
              throw new Error(bookData.error || "Failed to fetch book details");
            }

            return {
              ...favorite,
              bookTitle: bookData.title || "Książka niedostępna",
              bookAuthor: bookData.author || "Autor nieznany",
            };
          } catch (error) {
            return {
              ...favorite,
              bookTitle: "Książka niedostępna",
              bookAuthor: "Autor nieznany",
            };
          }
        })
      );

      setFavorites((prev) => {
        const newFavorites = [...prev];
        favoritesWithBooks.forEach((favorite) => {
          if (!newFavorites.some((f) => f.id === favorite.id)) {
            newFavorites.push(favorite);
          }
        });
        return newFavorites;
      });
    } catch (error) {
      console.error("Error fetching more favorites:", error);
      setError("Wystąpił błąd podczas ładowania ulubionych książek");
    } finally {
      setIsLoading(false);
      setIsFetchingBooks(false);
    }
  };

  useEffect(() => {
    setFavorites([]);
    setHasMore(true);
    setLastDoc(null);
    setIsFetchingBooks(false);
    fetchMoreFavorites();

    return () => {
      setFavorites([]);
      setHasMore(true);
      setLastDoc(null);
      setIsFetchingBooks(false);
    };
  }, [unwrappedParams.id]);

  if (isLoading && favorites.length === 0) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <main className="mx-auto px-4 pb-8 bg-[var(--background)] min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r bg-[var(--primaryColor)] p-4 text-white">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">Ulubione książki</h1>
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
              {favorites.length > 0 ? (
                <>
                  {favorites.map((favorite, index) => (
                    <div
                      key={`${favorite.id}_${index}`}
                      ref={
                        index === favorites.length - 1
                          ? lastFavoriteElementRef
                          : undefined
                      }
                      className="bg-[var(--background)] p-4 rounded-xl border border-[var(--gray-200)] transition-all duration-200 shadow"
                    >
                      <div className="flex flex-col space-y-2">
                        <Link
                          href={`/books/${favorite.bookId}`}
                          className="text-[var(--primaryColor)] hover:text-[var(--primaryColorLight)] font-medium transition-colors"
                        >
                          {favorite.bookTitle}
                        </Link>
                        <p className="text-sm text-[var(--gray-500)]">
                          {favorite.bookAuthor}
                        </p>
                        <p className="text-xs text-[var(--gray-500)] mt-2">
                          {format(favorite.createdAt, "d MMMM yyyy", {
                            locale: pl,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-center text-[var(--gray-500)]">
                  Brak ulubionych książek
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
