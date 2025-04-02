"use client";

import { db, auth } from "@/firebase/config";
import { pl } from "date-fns/locale";
import { query, collection, where, orderBy, getDocs } from "firebase/firestore";
import Link from "next/link";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

interface Book {
  id: string;
  bookId: string;
  userId: string;
  createdAt: Date;
  status?: string;
  bookTitle?: string;
  bookAuthor?: string;
}

const fetchBookDetails = async (bookId: string) => {
  try {
    const paddedId = bookId.padStart(14, "0");
    const response = await fetch(`/api/books/${paddedId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching book details:", error);
    return null;
  }
};

export default function Bookshelf() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ownedBooks, setOwnedBooks] = useState<Book[]>([]);
  const [exchangeBooks, setExchangeBooks] = useState<Book[]>([]);
  const [desiredBooks, setDesiredBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchBooks = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const ownershipsQuery = query(
        collection(db, "bookOwnership"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const desiresQuery = query(
        collection(db, "bookDesire"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const [ownershipsSnapshot, desiresSnapshot] = await Promise.all([
        getDocs(ownershipsQuery),
        getDocs(desiresQuery),
      ]);

      const processBooks = async (docs: any[], isDesired = false) => {
        return Promise.all(
          docs.map(async (doc) => {
            const bookDetails = await fetchBookDetails(doc.data().bookId);
            return {
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt.toDate(),
              bookTitle: bookDetails?.title || "Książka niedostępna",
              bookAuthor: bookDetails?.author || "Autor nieznany",
            };
          })
        );
      };

      const ownerships = await processBooks(ownershipsSnapshot.docs);
      const desires = await processBooks(desiresSnapshot.docs);

      setOwnedBooks(ownerships.filter((book) => !book.status));
      setExchangeBooks(
        ownerships.filter((book) => book.status === "forExchange")
      );
      setDesiredBooks(desires);
    } catch (error) {
      console.error("Error fetching books:", error);
      setError("Wystąpił błąd podczas ładowania książek");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user]);

  const BookList = ({
    books,
    title,
    color,
  }: {
    books: Book[];
    title: string;
    color: string;
  }) => (
    <div className="bg-[var(--card-background)] rounded-xl shadow-sm overflow-hidden border border-[var(--gray-100)] mt-8">
      <div className={`${color} p-4`}>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="p-4">
        <div className="space-y-4">
          {books.length > 0 ? (
            books.map((book) => (
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
                  <p className="text-xs text-[var(--gray-500)]">
                    Dodano:{" "}
                    {format(book.createdAt, "d MMMM yyyy", { locale: pl })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[var(--gray-500)]">Brak książek</p>
          )}
        </div>
      </div>
    </div>
  );

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-8 bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4">
        <BookList
          books={ownedBooks}
          title="Moje książki"
          color="bg-[var(--primaryColor)]"
        />
        <BookList
          books={exchangeBooks}
          title="Książki do wymiany"
          color="bg-[var(--secondaryColor)]"
        />
        <BookList
          books={desiredBooks}
          title="Chcę przeczytać"
          color="bg-purple-600"
        />
      </div>
    </main>
  );
}
