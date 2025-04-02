"use client";

import { useState, useEffect } from "react";
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

interface ExchangeBook {
  id: string;
  bookId: string;
  userId: string;
  createdAt: Date;
  status: string;
  bookTitle?: string;
  bookAuthor?: string;
  userDisplayName?: string;
}

const fetchBookDetails = async (bookId: string) => {
  const paddedId = bookId.padStart(14, "0");
  const response = await fetch(`/api/books/${paddedId}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data;
};

export default function Exchange() {
  const [books, setBooks] = useState<ExchangeBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [totalBooks, setTotalBooks] = useState(0);

  const fetchExchangeBooks = async () => {
    try {
      setIsLoading(true);

      let exchangeQuery = query(
        collection(db, "bookOwnership"),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      if (lastDoc) {
        exchangeQuery = query(
          collection(db, "bookOwnership"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(5)
        );
      }

      const booksSnapshot = await getDocs(exchangeQuery);

      if (booksSnapshot.empty) {
        setHasMore(false);
        return;
      }

      setLastDoc(booksSnapshot.docs[booksSnapshot.docs.length - 1]);

      const booksData = booksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as ExchangeBook[];

      // Fetch total count
      const totalBooksQuery = query(collection(db, "bookOwnership"));
      const totalBooksSnapshot = await getDocs(totalBooksQuery);
      setTotalBooks(totalBooksSnapshot.size);

      // Fetch book and user details
      const booksWithDetails = await Promise.all(
        booksData.map(async (book) => {
          try {
            const bookDetails = await fetchBookDetails(book.bookId);

            // Fetch user details
            const userQuery = query(
              collection(db, "users"),
              where("uid", "==", book.userId)
            );
            const userSnapshot = await getDocs(userQuery);
            const userData = userSnapshot.docs[0]?.data();

            return {
              ...book,
              bookTitle: bookDetails?.title || "Książka niedostępna",
              bookAuthor: bookDetails?.author || "Autor nieznany",
              userDisplayName: userData?.displayName || "Użytkownik nieznany",
            };
          } catch (error) {
            return {
              ...book,
              bookTitle: "Książka niedostępna",
              bookAuthor: "Autor nieznany",
              userDisplayName: "Użytkownik nieznany",
            };
          }
        })
      );

      setBooks((prev) => {
        const newBooks = [...prev];
        booksWithDetails.forEach((book) => {
          if (!newBooks.some((b) => b.id === book.id)) {
            newBooks.push(book);
          }
        });
        return newBooks;
      });
    } catch (error) {
      console.error("Error fetching exchange books:", error);
      setError("Wystąpił błąd podczas ładowania książek");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeBooks();
  }, []);

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  return (
    <main className="min-h-screen pb-8 bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4">
        {/* Exchange Books Section */}
        <div className="bg-[var(--card-background)] rounded-xl shadow-sm overflow-hidden border border-[var(--gray-100)] mt-8">
          <div className="bg-[var(--primaryColor)] p-4">
            <h1 className="text-xl font-bold text-white">Książki do wymiany</h1>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              {books
                .filter((book) => book.status === "forExchange")
                .map((book) => (
                  <div
                    key={book.id}
                    className="bg-[var(--background)] p-4 rounded-xl border border-[var(--gray-200)] transition-all duration-200 shadow"
                  >
                    <div className="flex flex-col space-y-2">
                      <Link
                        href={`/books/${book.bookId}`}
                        className="text-[var(--primaryColor)] hover:text-[var(--primaryColorLight)] font-medium transition-colors"
                      >
                        {book.bookTitle}
                      </Link>
                      <p className="text-sm text-[var(--gray-500)]">
                        {book.bookAuthor}
                      </p>
                      <div className="flex justify-between items-center text-xs text-[var(--gray-500)]">
                        <Link
                          href={`/users/${book.userId}`}
                          className="hover:text-[var(--primaryColor)] transition-colors"
                        >
                          {book.userDisplayName}
                        </Link>
                        <span>
                          {format(book.createdAt, "d MMMM yyyy", {
                            locale: pl,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Available Books Section */}
        <div className="bg-[var(--card-background)] rounded-xl shadow-sm overflow-hidden border border-[var(--gray-100)] mt-8">
          <div className="bg-[var(--secondaryColor)] p-4">
            <h1 className="text-xl font-bold text-white">Dostępne książki</h1>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              {books
                .filter((book) => book.status === null)
                .map((book) => (
                  <div
                    key={book.id}
                    className="bg-[var(--background)] p-4 rounded-xl border border-[var(--gray-200)] transition-all duration-200 shadow"
                  >
                    <div className="flex flex-col space-y-2">
                      <Link
                        href={`/books/${book.bookId}`}
                        className="text-[var(--primaryColor)] hover:text-[var(--primaryColorLight)] font-medium transition-colors"
                      >
                        {book.bookTitle}
                      </Link>
                      <p className="text-sm text-[var(--gray-500)]">
                        {book.bookAuthor}
                      </p>
                      <div className="flex justify-between items-center text-xs text-[var(--gray-500)]">
                        <Link
                          href={`/users/${book.userId}`}
                          className="hover:text-[var(--primaryColor)] transition-colors"
                        >
                          {book.userDisplayName}
                        </Link>
                        <span>
                          {format(book.createdAt, "d MMMM yyyy", {
                            locale: pl,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {hasMore && (
          <button
            onClick={fetchExchangeBooks}
            disabled={isLoading}
            className="w-full mt-4 py-3 px-4 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] 
              text-white rounded-xl transition-colors duration-200 font-medium shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              "Załaduj więcej"
            )}
          </button>
        )}
      </div>
    </main>
  );
}
