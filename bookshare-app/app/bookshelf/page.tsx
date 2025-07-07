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
  startAfter,
  limit,
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

  const [booksPerPage] = useState(6);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<{
    owned: any | null;
    exchange: any | null;
    desired: any | null;
  }>({ owned: null, exchange: null, desired: null });
  const [hasMoreBooks, setHasMoreBooks] = useState({
    owned: false,
    exchange: false,
    desired: false,
  });
  const [loadingMore, setLoadingMore] = useState({
    owned: false,
    exchange: false,
    desired: false,
  });

  const [searchParams, setSearchParams] = useState({
    title: "",
    author: "",
  });
  const [isSearchActive, setIsSearchActive] = useState(false);

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
        orderBy("createdAt", "desc"),
        limit(booksPerPage * 2)
      );

      const desiresQuery = query(
        collection(db, "bookDesire"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(booksPerPage)
      );

      const [ownershipsSnapshot, desiresSnapshot] = await Promise.all([
        getDocs(ownershipsQuery),
        getDocs(desiresQuery),
      ]);

      const lastVisible = {
        owned:
          ownershipsSnapshot.docs.length > 0
            ? ownershipsSnapshot.docs[ownershipsSnapshot.docs.length - 1]
            : null,
        desired:
          desiresSnapshot.docs.length > 0
            ? desiresSnapshot.docs[desiresSnapshot.docs.length - 1]
            : null,
      };
      setLastVisibleDoc({
        ...lastVisibleDoc,
        owned: lastVisible.owned,
        desired: lastVisible.desired,
      });

      setHasMoreBooks({
        owned: ownershipsSnapshot.docs.length >= booksPerPage,
        exchange: ownershipsSnapshot.docs.length >= booksPerPage,
        desired: desiresSnapshot.docs.length >= booksPerPage,
      });

      const processBooks = async (docs: any[], _isDesired = false) => {
        return Promise.all(
          docs.map(async (doc) => {
            const bookDetails = await fetchBookDetails(doc.data().bookId);
            return {
              id: doc.id,
              bookId: doc.data().bookId,
              userId: doc.data().userId,
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

      const owned = ownerships.filter((book) => !book.status);
      const exchange = ownerships.filter(
        (book) => book.status === "forExchange"
      );

      setOwnedBooks(owned.slice(0, booksPerPage));
      setExchangeBooks(exchange.slice(0, booksPerPage));
      setDesiredBooks(desires);

      if (exchange.length > 0) {
        const lastExchangeDoc = ownershipsSnapshot.docs.find(
          (doc) => doc.data().status === "forExchange"
        );
        setLastVisibleDoc((prev) => ({
          ...prev,
          exchange: lastExchangeDoc || null,
        }));
      }
    } catch (error) {
      console.error("Error fetching books:", error);
      setError("Wystąpił błąd podczas ładowania książek");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBooksWithSearch = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      setOwnedBooks([]);
      setExchangeBooks([]);
      setDesiredBooks([]);

      const normalizedTitle = searchParams.title.toLowerCase().trim();
      const normalizedAuthor = searchParams.author.toLowerCase().trim();

      const ownedQuery = query(
        collection(db, "bookOwnership"),
        where("userId", "==", user.uid),
        where("status", "==", null),
        orderBy("createdAt", "desc"),
        limit(booksPerPage * 2)
      );

      const exchangeQuery = query(
        collection(db, "bookOwnership"),
        where("userId", "==", user.uid),
        where("status", "==", "forExchange"),
        orderBy("createdAt", "desc"),
        limit(booksPerPage * 2)
      );

      const desiredQuery = query(
        collection(db, "bookDesire"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(booksPerPage * 2)
      );

      const [ownedSnapshot, exchangeSnapshot, desiredSnapshot] =
        await Promise.all([
          getDocs(ownedQuery),
          getDocs(exchangeQuery),
          getDocs(desiredQuery),
        ]);

      setLastVisibleDoc({
        owned:
          ownedSnapshot.docs.length > 0
            ? ownedSnapshot.docs[ownedSnapshot.docs.length - 1]
            : null,
        exchange:
          exchangeSnapshot.docs.length > 0
            ? exchangeSnapshot.docs[exchangeSnapshot.docs.length - 1]
            : null,
        desired:
          desiredSnapshot.docs.length > 0
            ? desiredSnapshot.docs[desiredSnapshot.docs.length - 1]
            : null,
      });

      setHasMoreBooks({
        owned: ownedSnapshot.docs.length >= booksPerPage,
        exchange: exchangeSnapshot.docs.length >= booksPerPage,
        desired: desiredSnapshot.docs.length >= booksPerPage,
      });

      const processBooks = async (docs: any[]) => {
        return Promise.all(
          docs.map(async (doc) => {
            const bookDetails = await fetchBookDetails(doc.data().bookId);
            return {
              id: doc.id,
              bookId: doc.data().bookId,
              userId: doc.data().userId,
              ...doc.data(),
              createdAt: doc.data().createdAt.toDate(),
              bookTitle: bookDetails?.title || "Książka niedostępna",
              bookAuthor: bookDetails?.author || "Autor nieznany",
            };
          })
        );
      };

      const [ownedBooks, exchangeBooks, desiredBooks] = await Promise.all([
        processBooks(ownedSnapshot.docs),
        processBooks(exchangeSnapshot.docs),
        processBooks(desiredSnapshot.docs),
      ]);

      let filteredOwnedBooks = ownedBooks;
      let filteredExchangeBooks = exchangeBooks;
      let filteredDesiredBooks = desiredBooks;

      if (normalizedTitle && normalizedAuthor) {
        filteredOwnedBooks = ownedBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            (formattedTitle.includes(normalizedTitle) ||
              book.bookTitle?.toLowerCase().includes(normalizedTitle)) &&
            book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
          );
        });

        filteredExchangeBooks = exchangeBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            (formattedTitle.includes(normalizedTitle) ||
              book.bookTitle?.toLowerCase().includes(normalizedTitle)) &&
            book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
          );
        });

        filteredDesiredBooks = desiredBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            (formattedTitle.includes(normalizedTitle) ||
              book.bookTitle?.toLowerCase().includes(normalizedTitle)) &&
            book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
          );
        });
      } else if (normalizedTitle) {
        filteredOwnedBooks = ownedBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            formattedTitle.includes(normalizedTitle) ||
            book.bookTitle?.toLowerCase().includes(normalizedTitle)
          );
        });

        filteredExchangeBooks = exchangeBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            formattedTitle.includes(normalizedTitle) ||
            book.bookTitle?.toLowerCase().includes(normalizedTitle)
          );
        });

        filteredDesiredBooks = desiredBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            formattedTitle.includes(normalizedTitle) ||
            book.bookTitle?.toLowerCase().includes(normalizedTitle)
          );
        });
      } else if (normalizedAuthor) {
        filteredOwnedBooks = ownedBooks.filter((book) =>
          book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
        );

        filteredExchangeBooks = exchangeBooks.filter((book) =>
          book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
        );

        filteredDesiredBooks = desiredBooks.filter((book) =>
          book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
        );
      }

      setOwnedBooks(filteredOwnedBooks.slice(0, booksPerPage));
      setExchangeBooks(filteredExchangeBooks.slice(0, booksPerPage));
      setDesiredBooks(filteredDesiredBooks.slice(0, booksPerPage));
    } catch (error) {
      console.error("Error searching books:", error);
      setError("Wystąpił błąd podczas wyszukiwania książek");
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    const resetParams = {
      title: "",
      author: "",
    };

    setSearchParams(resetParams);
    setIsSearchActive(false);
    fetchBooks();
  };

  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user]);

  const updateBookStatus = async (
    bookOwnershipId: string,
    newStatus: string | undefined
  ) => {
    if (!user) return;

    try {
      if (newStatus) {
        await updateDoc(doc(db, "bookOwnership", bookOwnershipId), {
          status: newStatus,
        });
      } else {
        await updateDoc(doc(db, "bookOwnership", bookOwnershipId), {
          status: deleteField(),
        });
      }

      if (newStatus === "forExchange") {
        const bookToMove = ownedBooks.find(
          (book) => book.id === bookOwnershipId
        );
        if (bookToMove) {
          setOwnedBooks(
            ownedBooks.filter((book) => book.id !== bookOwnershipId)
          );

          const updatedBook = { ...bookToMove, status: "forExchange" };

          if (isSearchActive && (searchParams.title || searchParams.author)) {
            const normalizedTitle = searchParams.title.toLowerCase().trim();
            const normalizedAuthor = searchParams.author.toLowerCase().trim();

            const formattedTitle = formatBookTitle(
              updatedBook.bookTitle
            ).toLowerCase();
            let meetsSearchCriteria = true;

            if (normalizedTitle && normalizedAuthor) {
              meetsSearchCriteria =
                (formattedTitle.includes(normalizedTitle) ||
                  (updatedBook.bookTitle
                    ?.toLowerCase()
                    .includes(normalizedTitle) ??
                    false)) &&
                (updatedBook.bookAuthor
                  ?.toLowerCase()
                  .includes(normalizedAuthor) ??
                  false);
            } else if (normalizedTitle) {
              meetsSearchCriteria =
                formattedTitle.includes(normalizedTitle) ||
                (updatedBook.bookTitle
                  ?.toLowerCase()
                  .includes(normalizedTitle) ??
                  false);
            } else if (normalizedAuthor) {
              meetsSearchCriteria =
                updatedBook.bookAuthor
                  ?.toLowerCase()
                  .includes(normalizedAuthor) ?? false;
            }

            if (meetsSearchCriteria) {
              setExchangeBooks([...exchangeBooks, updatedBook]);
            }
          } else {
            setExchangeBooks([...exchangeBooks, updatedBook]);
          }
        }
      } else {
        const bookToMove = exchangeBooks.find(
          (book) => book.id === bookOwnershipId
        );
        if (bookToMove) {
          setExchangeBooks(
            exchangeBooks.filter((book) => book.id !== bookOwnershipId)
          );

          const updatedBook = { ...bookToMove, status: undefined };

          if (isSearchActive && (searchParams.title || searchParams.author)) {
            const normalizedTitle = searchParams.title.toLowerCase().trim();
            const normalizedAuthor = searchParams.author.toLowerCase().trim();

            const formattedTitle = formatBookTitle(
              updatedBook.bookTitle
            ).toLowerCase();
            let meetsSearchCriteria = true;

            if (normalizedTitle && normalizedAuthor) {
              meetsSearchCriteria =
                (formattedTitle.includes(normalizedTitle) ||
                  (updatedBook.bookTitle
                    ?.toLowerCase()
                    .includes(normalizedTitle) ??
                    false)) &&
                (updatedBook.bookAuthor
                  ?.toLowerCase()
                  .includes(normalizedAuthor) ??
                  false);
            } else if (normalizedTitle) {
              meetsSearchCriteria =
                formattedTitle.includes(normalizedTitle) ||
                (updatedBook.bookTitle
                  ?.toLowerCase()
                  .includes(normalizedTitle) ??
                  false);
            } else if (normalizedAuthor) {
              meetsSearchCriteria =
                updatedBook.bookAuthor
                  ?.toLowerCase()
                  .includes(normalizedAuthor) ?? false;
            }

            if (meetsSearchCriteria) {
              setOwnedBooks([...ownedBooks, updatedBook]);
            }
          } else {
            setOwnedBooks([...ownedBooks, updatedBook]);
          }
        }
      }
    } catch (error) {
      console.error("Error updating book status:", error);
      setError("Wystąpił błąd podczas aktualizacji statusu książki");
    }
  };

  const deleteDesiredBook = async (bookDesireId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "bookDesire", bookDesireId));

      setDesiredBooks(desiredBooks.filter((book) => book.id !== bookDesireId));
    } catch (error) {
      console.error("Error deleting desired book:", error);
      setError("Wystąpił błąd podczas usuwania książki");
    }
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

  const loadMoreBooks = async (listType: "owned" | "exchange" | "desired") => {
    if (!user || !lastVisibleDoc[listType]) return;

    try {
      setLoadingMore((prev) => ({ ...prev, [listType]: true }));

      let booksQuery;

      if (listType === "desired") {
        booksQuery = query(
          collection(db, "bookDesire"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          startAfter(lastVisibleDoc[listType]),
          limit(booksPerPage * 2)
        );
      } else if (listType === "owned") {
        booksQuery = query(
          collection(db, "bookOwnership"),
          where("userId", "==", user.uid),
          where("status", "==", null),
          orderBy("createdAt", "desc"),
          startAfter(lastVisibleDoc.owned),
          limit(booksPerPage * 2)
        );
      } else {
        booksQuery = query(
          collection(db, "bookOwnership"),
          where("userId", "==", user.uid),
          where("status", "==", "forExchange"),
          orderBy("createdAt", "desc"),
          startAfter(lastVisibleDoc.exchange),
          limit(booksPerPage * 2)
        );
      }

      const booksSnapshot = await getDocs(booksQuery);

      const hasMore = booksSnapshot.docs.length >= booksPerPage;
      setHasMoreBooks((prev) => ({ ...prev, [listType]: hasMore }));

      if (booksSnapshot.docs.length > 0) {
        setLastVisibleDoc((prev) => ({
          ...prev,
          [listType]: booksSnapshot.docs[booksSnapshot.docs.length - 1],
        }));
      }

      const processBooks = async (docs: any[]) => {
        return Promise.all(
          docs.map(async (doc) => {
            const bookDetails = await fetchBookDetails(doc.data().bookId);
            return {
              id: doc.id,
              bookId: doc.data().bookId,
              userId: doc.data().userId,
              ...doc.data(),
              createdAt: doc.data().createdAt.toDate(),
              bookTitle: bookDetails?.title || "Książka niedostępna",
              bookAuthor: bookDetails?.author || "Autor nieznany",
            };
          })
        );
      };

      let newBooks = await processBooks(booksSnapshot.docs);

      if (isSearchActive && (searchParams.title || searchParams.author)) {
        const normalizedTitle = searchParams.title.toLowerCase().trim();
        const normalizedAuthor = searchParams.author.toLowerCase().trim();

        if (normalizedTitle && normalizedAuthor) {
          newBooks = newBooks.filter((book) => {
            const formattedTitle = formatBookTitle(
              book.bookTitle
            ).toLowerCase();
            return (
              (formattedTitle.includes(normalizedTitle) ||
                book.bookTitle?.toLowerCase().includes(normalizedTitle)) &&
              book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
            );
          });
        } else if (normalizedTitle) {
          newBooks = newBooks.filter((book) => {
            const formattedTitle = formatBookTitle(
              book.bookTitle
            ).toLowerCase();
            return (
              formattedTitle.includes(normalizedTitle) ||
              book.bookTitle?.toLowerCase().includes(normalizedTitle)
            );
          });
        } else if (normalizedAuthor) {
          newBooks = newBooks.filter((book) =>
            book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
          );
        }
      }

      if (listType === "owned") {
        setOwnedBooks((prev) => {
          const existingIds = new Set(prev.map((book) => book.id));
          const uniqueNewBooks = newBooks.filter(
            (book) => !existingIds.has(book.id)
          );
          return [...prev, ...uniqueNewBooks];
        });
      } else if (listType === "exchange") {
        setExchangeBooks((prev) => {
          const existingIds = new Set(prev.map((book) => book.id));
          const uniqueNewBooks = newBooks.filter(
            (book) => !existingIds.has(book.id)
          );
          return [...prev, ...uniqueNewBooks];
        });
      } else {
        setDesiredBooks((prev) => {
          const existingIds = new Set(prev.map((book) => book.id));
          const uniqueNewBooks = newBooks.filter(
            (book) => !existingIds.has(book.id)
          );
          return [...prev, ...uniqueNewBooks];
        });
      }
    } catch (error) {
      console.error(`Error loading more ${listType} books:`, error);
      setError(`Wystąpił błąd podczas ładowania dodatkowych książek`);
    } finally {
      setLoadingMore((prev) => ({ ...prev, [listType]: false }));
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
        <div className="space-y-4">
          {books.length > 0 ? (
            books.map((book) => (
              <div
                key={book.id}
                className={`bg-[var(--background)] p-2.5 rounded-lg border border-[var(--gray-200)] transition-all duration-200 shadow-sm hover:shadow ${
                  listType === "owned"
                    ? "hover:border-[var(--primaryColorLighter)]"
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
                        ? "text-[var(--primaryColorLight)] hover:text-[var(--primaryColorLighter)]"
                        : listType === "exchange"
                        ? "text-green-600 hover:text-green-500"
                        : "text-purple-600 hover:text-purple-500"
                    }`}
                    title={book.bookTitle}
                  >
                    {formatBookTitle(book.bookTitle)}
                  </Link>
                  <p className="text-xs text-[var(--gray-500)]">
                    {book.bookAuthor}
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-[var(--gray-400)]">
                      Dodano:{" "}
                      {format(book.createdAt, "d MMM yyyy", { locale: pl })}
                    </p>

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

          {hasMoreBooks[listType] && books.length >= booksPerPage && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => loadMoreBooks(listType)}
                disabled={loadingMore[listType]}
                className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                  listType === "owned"
                    ? "bg-[var(--primaryColorLight)] hover:bg-[var(--primaryColorLighter)] text-white"
                    : listType === "exchange"
                    ? "bg-green-500 hover:bg-green-400 text-white"
                    : "bg-purple-500 hover:bg-purple-400 text-white"
                }`}
              >
                {loadingMore[listType] ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Ładowanie...
                  </span>
                ) : (
                  "Załaduj więcej"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const SearchForm = () => {
    const [localSearchParams, setLocalSearchParams] = useState({
      title: searchParams.title,
      author: searchParams.author,
    });

    const handleSubmitSearch = (e: React.FormEvent) => {
      e.preventDefault();

      const currentSearchParams = {
        title: localSearchParams.title,
        author: localSearchParams.author,
      };

      if (
        !currentSearchParams.title.trim() &&
        !currentSearchParams.author.trim()
      ) {
        clearSearch();
        return;
      }

      setSearchParams(currentSearchParams);
      setIsSearchActive(true);

      setLastVisibleDoc({ owned: null, exchange: null, desired: null });
      setHasMoreBooks({ owned: false, exchange: false, desired: false });

      setOwnedBooks([]);
      setExchangeBooks([]);
      setDesiredBooks([]);

      fetchBooksWithSearchDirect(currentSearchParams);
    };

    return (
      <form
        onSubmit={handleSubmitSearch}
        className="bg-[var(--card-background)] rounded-xl shadow-sm overflow-hidden border border-[var(--gray-100)] mb-6 p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="searchTitle"
              className="block text-sm font-medium mb-1 text-[var(--gray-700)]"
            >
              Szukaj po tytule
            </label>
            <input
              type="text"
              id="searchTitle"
              value={localSearchParams.title}
              onChange={(e) =>
                setLocalSearchParams({
                  ...localSearchParams,
                  title: e.target.value,
                })
              }
              placeholder="Wpisz tytuł książki..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primaryColorLight)]"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="searchAuthor"
              className="block text-sm font-medium mb-1 text-[var(--gray-700)]"
            >
              Szukaj po autorze
            </label>
            <input
              type="text"
              id="searchAuthor"
              value={localSearchParams.author}
              onChange={(e) =>
                setLocalSearchParams({
                  ...localSearchParams,
                  author: e.target.value,
                })
              }
              placeholder="Wpisz autora książki..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primaryColorLight)]"
            />
          </div>

          <div className="flex items-end space-x-2">
            <button
              type="submit"
              className="h-10 px-4 py-2 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-lg transition-colors text-sm font-medium"
            >
              Szukaj
            </button>

            {isSearchActive && (
              <button
                type="button"
                onClick={clearSearch}
                className="h-10 px-4 py-2 border border-[var(--gray-300)] hover:bg-[var(--gray-100)] rounded-lg transition-colors text-sm"
              >
                Wyczyść
              </button>
            )}
          </div>
        </div>

        {isSearchActive && (
          <div className="mt-3 text-sm text-[var(--gray-500)] flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              ></path>
            </svg>
            <span>Aktywne filtry wyszukiwania</span>
          </div>
        )}
      </form>
    );
  };

  const fetchBooksWithSearchDirect = async (searchParamsToUse: {
    title: string;
    author: string;
  }) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      const normalizedTitle = searchParamsToUse.title.toLowerCase().trim();
      const normalizedAuthor = searchParamsToUse.author.toLowerCase().trim();

      const ownedQuery = query(
        collection(db, "bookOwnership"),
        where("userId", "==", user.uid),
        where("status", "==", null),
        orderBy("createdAt", "desc"),
        limit(booksPerPage * 2)
      );

      const exchangeQuery = query(
        collection(db, "bookOwnership"),
        where("userId", "==", user.uid),
        where("status", "==", "forExchange"),
        orderBy("createdAt", "desc"),
        limit(booksPerPage * 2)
      );

      const desiredQuery = query(
        collection(db, "bookDesire"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(booksPerPage * 2)
      );

      const [ownedSnapshot, exchangeSnapshot, desiredSnapshot] =
        await Promise.all([
          getDocs(ownedQuery),
          getDocs(exchangeQuery),
          getDocs(desiredQuery),
        ]);

      setLastVisibleDoc({
        owned:
          ownedSnapshot.docs.length > 0
            ? ownedSnapshot.docs[ownedSnapshot.docs.length - 1]
            : null,
        exchange:
          exchangeSnapshot.docs.length > 0
            ? exchangeSnapshot.docs[exchangeSnapshot.docs.length - 1]
            : null,
        desired:
          desiredSnapshot.docs.length > 0
            ? desiredSnapshot.docs[desiredSnapshot.docs.length - 1]
            : null,
      });

      setHasMoreBooks({
        owned: ownedSnapshot.docs.length >= booksPerPage,
        exchange: exchangeSnapshot.docs.length >= booksPerPage,
        desired: desiredSnapshot.docs.length >= booksPerPage,
      });

      const processBooks = async (docs: any[]) => {
        return Promise.all(
          docs.map(async (doc) => {
            const bookDetails = await fetchBookDetails(doc.data().bookId);
            return {
              id: doc.id,
              bookId: doc.data().bookId,
              userId: doc.data().userId,
              ...doc.data(),
              createdAt: doc.data().createdAt.toDate(),
              bookTitle: bookDetails?.title || "Książka niedostępna",
              bookAuthor: bookDetails?.author || "Autor nieznany",
            };
          })
        );
      };

      const [ownedBooks, exchangeBooks, desiredBooks] = await Promise.all([
        processBooks(ownedSnapshot.docs),
        processBooks(exchangeSnapshot.docs),
        processBooks(desiredSnapshot.docs),
      ]);

      let filteredOwnedBooks = ownedBooks;
      let filteredExchangeBooks = exchangeBooks;
      let filteredDesiredBooks = desiredBooks;

      if (normalizedTitle && normalizedAuthor) {
        filteredOwnedBooks = ownedBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            (formattedTitle.includes(normalizedTitle) ||
              book.bookTitle?.toLowerCase().includes(normalizedTitle)) &&
            book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
          );
        });

        filteredExchangeBooks = exchangeBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            (formattedTitle.includes(normalizedTitle) ||
              book.bookTitle?.toLowerCase().includes(normalizedTitle)) &&
            book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
          );
        });

        filteredDesiredBooks = desiredBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            (formattedTitle.includes(normalizedTitle) ||
              book.bookTitle?.toLowerCase().includes(normalizedTitle)) &&
            book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
          );
        });
      } else if (normalizedTitle) {
        filteredOwnedBooks = ownedBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            formattedTitle.includes(normalizedTitle) ||
            book.bookTitle?.toLowerCase().includes(normalizedTitle)
          );
        });

        filteredExchangeBooks = exchangeBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            formattedTitle.includes(normalizedTitle) ||
            book.bookTitle?.toLowerCase().includes(normalizedTitle)
          );
        });

        filteredDesiredBooks = desiredBooks.filter((book) => {
          const formattedTitle = formatBookTitle(book.bookTitle).toLowerCase();
          return (
            formattedTitle.includes(normalizedTitle) ||
            book.bookTitle?.toLowerCase().includes(normalizedTitle)
          );
        });
      } else if (normalizedAuthor) {
        filteredOwnedBooks = ownedBooks.filter((book) =>
          book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
        );

        filteredExchangeBooks = exchangeBooks.filter((book) =>
          book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
        );

        filteredDesiredBooks = desiredBooks.filter((book) =>
          book.bookAuthor?.toLowerCase().includes(normalizedAuthor)
        );
      }

      setOwnedBooks(filteredOwnedBooks.slice(0, booksPerPage));
      setExchangeBooks(filteredExchangeBooks.slice(0, booksPerPage));
      setDesiredBooks(filteredDesiredBooks.slice(0, booksPerPage));
    } catch (error) {
      console.error("Error searching books:", error);
      setError("Wystąpił błąd podczas wyszukiwania książek");
    } finally {
      setIsLoading(false);
    }
  };

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
        <SearchForm />
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
        {isSearchActive &&
          (searchParams.title || searchParams.author) &&
          ownedBooks.length === 0 &&
          exchangeBooks.length === 0 &&
          desiredBooks.length === 0 && (
            <div className="text-center mt-8 p-6 bg-[var(--card-background)] rounded-xl shadow-sm border border-[var(--gray-100)]">
              <p className="text-[var(--gray-600)]">
                Nie znaleziono książek pasujących do kryteriów wyszukiwania.
              </p>
            </div>
          )}
      </div>
    </main>
  );
}
