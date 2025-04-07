"use client";

import { db, auth } from "@/firebase/config";
import { pl } from "date-fns/locale";
import {
  query,
  collection,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  deleteField,
  deleteDoc,
} from "firebase/firestore";
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

  // Add function to update book status
  const updateBookStatus = async (
    bookOwnershipId: string,
    newStatus: string | undefined
  ) => {
    if (!user) return;

    try {
      // Update the book status in Firestore
      if (newStatus) {
        await updateDoc(doc(db, "bookOwnership", bookOwnershipId), {
          status: newStatus,
        });
      } else {
        await updateDoc(doc(db, "bookOwnership", bookOwnershipId), {
          status: deleteField(),
        });
      }

      // Update the local state to reflect the change
      if (newStatus === "forExchange") {
        // Moving from "Moje książki" to "Książki do wymiany"
        const bookToMove = ownedBooks.find(
          (book) => book.id === bookOwnershipId
        );
        if (bookToMove) {
          setOwnedBooks(
            ownedBooks.filter((book) => book.id !== bookOwnershipId)
          );
          setExchangeBooks([
            ...exchangeBooks,
            { ...bookToMove, status: "forExchange" },
          ]);
        }
      } else {
        // Moving from "Książki do wymiany" to "Moje książki"
        const bookToMove = exchangeBooks.find(
          (book) => book.id === bookOwnershipId
        );
        if (bookToMove) {
          setExchangeBooks(
            exchangeBooks.filter((book) => book.id !== bookOwnershipId)
          );
          setOwnedBooks([...ownedBooks, { ...bookToMove, status: undefined }]);
        }
      }
    } catch (error) {
      console.error("Error updating book status:", error);
      setError("Wystąpił błąd podczas aktualizacji statusu książki");
    }
  };

  // Add the delete function after the updateBookStatus function
  const deleteDesiredBook = async (bookDesireId: string) => {
    if (!user) return;

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "bookDesire", bookDesireId));

      // Update local state
      setDesiredBooks(desiredBooks.filter((book) => book.id !== bookDesireId));
    } catch (error) {
      console.error("Error deleting desired book:", error);
      setError("Wystąpił błąd podczas usuwania książki");
    }
  };

  const BookList = ({
    books,
    title,
    color,
    listType,
  }: {
    books: Book[];
    title: string;
    color: string;
    listType: "owned" | "exchange" | "desired";
  }) => (
    <div className="bg-[var(--card-background)] rounded-xl shadow-sm overflow-hidden border border-[var(--gray-100)] h-full">
      <div className={`${color} p-3`}>
        <h2 className="text-base font-bold text-white flex items-center">
          {/* Icons based on list type */}
          {listType === "owned" && (
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          )}

          {listType === "exchange" && (
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          )}

          {listType === "desired" && (
            <svg
              className="w-4 h-4 mr-1.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {title}
        </h2>
      </div>
      <div className="p-3">
        <div className="space-y-2">
          {books.length > 0 ? (
            books.map((book) => (
              <div
                key={book.id}
                className={`bg-[var(--background)] p-2.5 rounded-lg border border-[var(--gray-200)] transition-all duration-200 shadow-sm hover:shadow ${
                  listType === "owned"
                    ? "hover:border-[var(--primaryColor)]"
                    : listType === "exchange"
                    ? "hover:border-green-500"
                    : "hover:border-purple-500"
                }`}
              >
                <div className="flex flex-col space-y-1">
                  <Link
                    href={`/books/${book.bookId}`}
                    className={`font-medium transition-colors text-sm ${
                      listType === "owned"
                        ? "text-[var(--primaryColor)] hover:text-[var(--primaryColorLight)]"
                        : listType === "exchange"
                        ? "text-green-600 hover:text-green-500"
                        : "text-purple-600 hover:text-purple-500"
                    }`}
                  >
                    {book.bookTitle}
                  </Link>
                  <p className="text-xs text-[var(--gray-500)]">
                    {book.bookAuthor}
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-[var(--gray-400)]">
                      Dodano:{" "}
                      {format(book.createdAt, "d MMM yyyy", { locale: pl })}
                    </p>

                    {/* Move buttons - only show for owned and exchange lists */}
                    {listType === "owned" && (
                      <button
                        onClick={() => updateBookStatus(book.id, "forExchange")}
                        className="text-xs bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white px-2 py-1 rounded-lg transition-colors"
                        title="Przenieś do wymiany"
                      >
                        Do wymiany →
                      </button>
                    )}

                    {listType === "exchange" && (
                      <button
                        onClick={() => updateBookStatus(book.id, undefined)}
                        className="text-xs bg-green-600 hover:bg-green-500  text-white px-2 py-1 rounded-lg transition-colors"
                        title="Przenieś do moich książek"
                      >
                        ← Do moich
                      </button>
                    )}

                    {/* Delete button for desired books */}
                    {listType === "desired" && (
                      <button
                        onClick={() => deleteDesiredBook(book.id)}
                        className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded-lg transition-colors"
                        title="Usuń z listy"
                      >
                        Usuń
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-[var(--gray-500)] py-2">
              Brak książek
            </p>
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
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6 text-center text-[var(--gray-800)]">
          Moja półka
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BookList
            books={ownedBooks}
            title="Moje książki"
            color="bg-gradient-to-r from-[var(--primaryColor)] to-[var(--primaryColorLight)]"
            listType="owned"
          />
          <BookList
            books={exchangeBooks}
            title="Książki do wymiany"
            color="bg-gradient-to-r from-green-600 to-green-500"
            listType="exchange"
          />
          <BookList
            books={desiredBooks}
            title="Chcę przeczytać"
            color="bg-purple-600"
            listType="desired"
          />
        </div>
      </div>
    </main>
  );
}
