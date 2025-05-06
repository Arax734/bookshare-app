"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
} from "firebase/firestore";
import Image from "next/image";
import defaultAvatar from "@/public/images/default-avatar.png";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { EnvelopeIcon } from "@/app/components/svg-icons/EnvelopeIcon";
import { PhoneIcon } from "@/app/components/svg-icons/PhoneIcon";
import { parsePhoneNumber } from "libphonenumber-js";
import { useAuth } from "@/app/hooks/useAuth";
import { useRouter } from "next/navigation";
import BookCover from "@/app/components/BookCover";
import { BookOpenIcon } from "@/app/components/svg-icons/BookOpenIcon";

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  isForExchange?: boolean;
  description?: string;
  addedAt: Date;
  bookId: string;
}

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  reviewsCount?: number;
  averageRating?: number;
  booksCount?: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const getHighResProfileImage = (photoURL: string | undefined) => {
  if (!photoURL) return defaultAvatar;

  if (photoURL.includes("googleusercontent.com")) {
    return photoURL.replace(/=s\d+-c/, "=s400-c");
  }

  return photoURL;
};

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

const renderBookCover = (book: Book, size: "S" | "M" | "L") => {
  const hasIsbn = !!book.isbn && book.isbn.trim().length > 0;

  return (
    <div className="w-10 h-14 mr-2 flex-shrink-0 bg-[var(--gray-50)] shadow-sm rounded">
      {hasIsbn ? (
        <BookCover isbn={book.isbn} title={book.title} size={size} />
      ) : (
        <div className="relative aspect-[2/3] bg-[var(--gray-100)] flex items-center justify-center rounded-lg">
          <BookOpenIcon
            className={`${
              size === "S"
                ? "w-10 h-10"
                : size === "M"
                ? "w-14 h-14"
                : "w-20 h-20"
            } text-[var(--gray-300)]`}
          />
        </div>
      )}
    </div>
  );
};

const renderSmallBookCover = (book: Book, size: "M") => {
  const hasIsbn = !!book.isbn && book.isbn.trim().length > 0;

  return (
    <div className="w-8 h-12 flex-shrink-0 bg-[var(--gray-50)] shadow-sm rounded">
      {hasIsbn ? (
        <BookCover isbn={book.isbn} title={book.title} size="M" />
      ) : (
        <div className="relative aspect-[2/3] h-full bg-[var(--gray-100)] flex items-center justify-center rounded">
          <BookOpenIcon className="w-6 h-6 text-[var(--gray-300)]" />
        </div>
      )}
    </div>
  );
};

export default function Exchange({ params }: PageProps) {
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { user: currentUser, loading: authLoading } = useAuth();
  const [currentUserData, setCurrentUserData] = useState<UserProfile | null>(
    null
  );

  const [selectedMyBooks, setSelectedMyBooks] = useState<string[]>([]);
  const [selectedUserBooks, setSelectedUserBooks] = useState<string[]>([]);
  const [exchangeModalOpen, setExchangeModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [exchangeSuccess, setExchangeSuccess] = useState<boolean>(false);

  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [userExchangeBooks, setUserExchangeBooks] = useState<Book[]>([]);
  const [userWishlist, setUserWishlist] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const formatPhoneNumber = (phone: string | undefined) => {
    if (!phone) return "Nie podano";
    try {
      const phoneNumber = parsePhoneNumber(phone);
      if (phoneNumber) {
        return phoneNumber.formatInternational();
      }
      return phone;
    } catch {
      return phone;
    }
  };

  useEffect(() => {
    if (authLoading) return;

    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const unwrappedParams = await params;

        const userDocRef = doc(db, "users", unwrappedParams.id);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          setError("Nie znaleziono użytkownika");
          return;
        }

        const userData = userDoc.data();

        const profileBooksQuery = query(
          collection(db, "bookOwnership"),
          where("userId", "==", unwrappedParams.id)
        );
        const profileBooksSnapshot = await getDocs(profileBooksQuery);
        const profileBooksCount = profileBooksSnapshot.size;

        setProfileUser({
          id: unwrappedParams.id,
          displayName: userData.displayName || "Użytkownik anonimowy",
          email: userData.email,
          photoURL: userData.photoURL,
          phoneNumber: userData.phoneNumber,
          bio: userData.bio,
          reviewsCount: userData.reviewsCount || 0,
          averageRating: userData.averageRating || 0,
          booksCount: profileBooksCount,
        });

        if (currentUser) {
          const currentUserDocRef = doc(db, "users", currentUser.uid);
          const currentUserDoc = await getDoc(currentUserDocRef);

          if (currentUserDoc.exists()) {
            const currentData = currentUserDoc.data();

            const currentUserBooksQuery = query(
              collection(db, "bookOwnership"),
              where("userId", "==", currentUser.uid)
            );
            const currentUserBooksSnapshot = await getDocs(
              currentUserBooksQuery
            );
            const currentUserBooksCount = currentUserBooksSnapshot.size;

            setCurrentUserData({
              id: currentUser.uid,
              displayName: currentData.displayName || "Użytkownik",
              email: currentData.email || "",
              photoURL: currentData.photoURL,
              phoneNumber: currentData.phoneNumber,
              bio: currentData.bio,
              reviewsCount: currentData.reviewsCount || 0,
              averageRating: currentData.averageRating || 0,
              booksCount: currentUserBooksCount,
            });

            await fetchBooks(currentUser.uid, unwrappedParams.id);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setError("Nie udało się załadować danych użytkowników");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchUsers();
    } else {
      setIsLoading(false);
      setError("Musisz być zalogowany, aby zobaczyć tę stronę");

      setTimeout(() => {
        const currentPath = window.location.pathname;
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }, 2000);
    }
  }, [params, currentUser, authLoading, router]);

  const fetchBooks = async (currentUserId: string, profileUserId: string) => {
    try {
      setIsLoadingBooks(true);
      console.log("Fetching books for users:", currentUserId, profileUserId);

      const myBooksQuery = query(
        collection(db, "bookOwnership"),
        where("userId", "==", currentUserId),
        where("status", "==", "forExchange"),
        orderBy("createdAt", "desc")
      );

      const myBooksSnapshot = await getDocs(myBooksQuery);
      console.log("My books query results:", myBooksSnapshot.size);

      const myBooksData = await Promise.all(
        myBooksSnapshot.docs.map(async (doc) => {
          try {
            const bookData = doc.data();
            console.log("Processing my book doc:", doc.id, bookData);

            const bookDetails = await fetchBookDetails(bookData.bookId);
            console.log("Book details retrieved:", bookDetails?.title);

            return {
              id: doc.id,
              title: bookDetails?.title || "Brak tytułu",
              author: bookDetails?.author || "Nieznany autor",
              coverUrl: bookDetails?.coverUrl || null,
              isbn: bookDetails?.isbnIssn,
              addedAt: bookData.createdAt?.toDate() || new Date(),
              bookId: bookData.bookId,
            };
          } catch (err) {
            console.error("Error processing book:", err);
            return null;
          }
        })
      );

      console.log("Final my books list:", myBooksData);
      setMyBooks(myBooksData.filter((book) => book !== null) as Book[]);

      const userExchangeBooksQuery = query(
        collection(db, "bookOwnership"),
        where("userId", "==", profileUserId),
        where("status", "==", "forExchange"),
        orderBy("createdAt", "desc")
      );

      console.log("Running exchange books query...");
      const userExchangeBooksSnapshot = await getDocs(userExchangeBooksQuery);
      console.log(
        "Exchange books query results:",
        userExchangeBooksSnapshot.size
      );

      const userExchangeBooksData = await Promise.all(
        userExchangeBooksSnapshot.docs.map(async (doc) => {
          try {
            const bookData = doc.data();
            console.log("Processing book ownership doc:", doc.id, bookData);

            const bookDetails = await fetchBookDetails(bookData.bookId);
            console.log("Book details retrieved:", bookDetails?.title);

            return {
              id: doc.id,
              title: bookDetails?.title || "Brak tytułu",
              author: bookDetails?.author || "Nieznany autor",
              coverUrl: bookDetails?.coverUrl || null,
              isbn: bookDetails?.isbnIssn,
              addedAt: bookData.createdAt?.toDate() || new Date(),
              bookId: bookData.bookId,
            };
          } catch (err) {
            console.error("Error processing exchange book:", err);
            return null;
          }
        })
      );

      const filteredExchangeBooks = userExchangeBooksData.filter(
        (book) => book !== null
      ) as Book[];

      console.log("Final exchange books list:", filteredExchangeBooks);
      setUserExchangeBooks(filteredExchangeBooks);

      const wishlistQuery = query(
        collection(db, "bookDesire"),
        where("userId", "==", profileUserId),
        orderBy("createdAt", "desc")
      );
      const wishlistSnapshot = await getDocs(wishlistQuery);
      const wishlistData = await Promise.all(
        wishlistSnapshot.docs.map(async (doc) => {
          try {
            const wishData = doc.data();
            const bookDetails = await fetchBookDetails(wishData.bookId);

            return {
              id: doc.id,
              title: bookDetails?.title || "Brak tytułu",
              author: bookDetails?.author || "Nieznany autor",
              coverUrl: bookDetails?.coverUrl || null,
              isbn: bookDetails?.isbnIssn,
              addedAt: wishData.createdAt?.toDate() || new Date(),
              bookId: wishData.bookId,
            };
          } catch (err) {
            console.error("Error processing wishlist book:", err);
            return null;
          }
        })
      );
      setUserWishlist(wishlistData.filter((book) => book !== null) as Book[]);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const toggleBookSelection = (bookId: string, listType: "my" | "user") => {
    if (listType === "my") {
      setSelectedMyBooks((prevSelected) => {
        if (prevSelected.includes(bookId)) {
          return prevSelected.filter((id) => id !== bookId);
        }
        if (prevSelected.length >= 5) {
          return prevSelected;
        }
        return [...prevSelected, bookId];
      });
    } else {
      setSelectedUserBooks((prevSelected) => {
        if (prevSelected.includes(bookId)) {
          return prevSelected.filter((id) => id !== bookId);
        }
        if (prevSelected.length >= 5) {
          return prevSelected;
        }
        return [...prevSelected, bookId];
      });
    }
  };

  const getSelectedBooks = (ids: string[], sourceList: Book[]): Book[] => {
    return sourceList.filter((book) => ids.includes(book.id));
  };

  const canProposeExchange = (): boolean => {
    return selectedMyBooks.length > 0 && selectedUserBooks.length > 0;
  };

  const proposeExchange = async () => {
    if (!currentUser || !profileUser) return;

    setIsSubmitting(true);
    setExchangeError(null);

    try {
      const mySelectedBooks = getSelectedBooks(selectedMyBooks, myBooks);
      const userSelectedBooks = getSelectedBooks(
        selectedUserBooks,
        userExchangeBooks
      );

      const userBooksData = mySelectedBooks.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || null,
        isbn: book.isbn || null,
        bookId: book.bookId,
      }));

      const contactBooksData = userSelectedBooks.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || null,
        isbn: book.isbn || null,
        bookId: book.bookId,
      }));

      const bookExchangesRef = collection(db, "bookExchanges");
      const newExchange = {
        userId: currentUser.uid,
        contactId: profileUser.id,
        statusDate: new Date(),
        userBooks: userBooksData,
        contactBooks: contactBooksData,
        status: "pending",
      };

      await addDoc(bookExchangesRef, newExchange);

      setExchangeSuccess(true);

      setTimeout(() => {
        router.push("/exchanges/outgoing");
      }, 500);
    } catch (error) {
      console.error("Error proposing exchange:", error);
      setExchangeError(
        "Wystąpił błąd podczas proponowania wymiany. Spróbuj ponownie."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExchangeStatusText = () => {
    if (selectedMyBooks.length === 0 && selectedUserBooks.length === 0) {
      return "Wybierz książki do wymiany";
    }

    if (selectedMyBooks.length === 0) {
      return "Wybierz swoje książki do wymiany";
    }

    if (selectedUserBooks.length === 0) {
      return "Wybierz książki, które chcesz otrzymać";
    }

    const myCount = selectedMyBooks.length;
    const userCount = selectedUserBooks.length;

    if (myCount === userCount) {
      return `Wymiana równa: ${myCount} za ${userCount}`;
    } else if (myCount > userCount) {
      return `Dajesz więcej: ${myCount} za ${userCount}`;
    } else {
      return `Otrzymujesz więcej: ${userCount} za ${myCount}`;
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!profileUser || !currentUserData)
    return <div className="p-4">Nie znaleziono danych użytkowników</div>;

  return (
    <main className="mx-auto px-2 sm:px-4 pb-8 bg-[var(--background)] w-full h-full transition-all duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6">
          <div className="w-full lg:w-1/2 bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200">
            <div className="bg-gradient-to-r from-[var(--primaryColor)] to-[var(--primaryColorLight)] p-2 text-white">
              <h2 className="text-sm sm:text-base font-bold flex items-center">
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Twój profil
              </h2>
            </div>
            <div className="p-2 sm:p-3">
              <div className="flex items-start space-x-3">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={getHighResProfileImage(currentUserData.photoURL)}
                    alt="Your Profile"
                    fill
                    className="object-cover"
                    quality={90}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-[var(--gray-800)] truncate">
                    {currentUserData.displayName}
                  </h2>

                  <div className="space-y-1 mt-1 text-xs sm:text-sm">
                    <div className="flex items-center text-[var(--gray-500)]">
                      <EnvelopeIcon className="w-3.5 h-3.5 mr-1" />
                      <span className="truncate">{currentUserData.email}</span>
                    </div>
                    <div className="flex items-center text-[var(--gray-500)]">
                      <PhoneIcon className="w-3.5 h-3.5 mr-1" />
                      <span>
                        {formatPhoneNumber(currentUserData.phoneNumber)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[var(--gray-200)]">
                <div className="grid grid-cols-3 gap-1">
                  {[
                    {
                      label: "Książek",
                      value: currentUserData.booksCount || 0,
                      icon: (
                        <svg
                          className="w-4 h-4 text-blue-500"
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
                      ),
                    },
                    {
                      label: "Opinii",
                      value: currentUserData.reviewsCount || 0,
                      icon: (
                        <svg
                          className="w-4 h-4 text-amber-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      ),
                    },
                    {
                      label: "Średnia",
                      value: (currentUserData.averageRating || 0).toFixed(1),
                      icon: (
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 0a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ),
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex flex-col items-center p-1.5 bg-[var(--background)] rounded-lg border border-[var(--gray-200)] shadow-sm"
                    >
                      <div className="mb-1">{stat.icon}</div>
                      <p className="text-xs font-bold text-[var(--gray-800)]">
                        {stat.value}
                      </p>
                      <p className="text-[10px] text-[var(--gray-500)]">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-2 text-white">
              <h2 className="text-sm sm:text-base font-bold flex items-center">
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profil użytkownika
              </h2>
            </div>
            <div className="p-2 sm:p-3">
              <div className="flex items-start space-x-3">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={getHighResProfileImage(profileUser.photoURL)}
                    alt="Profile"
                    fill
                    className="object-cover"
                    quality={90}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-[var(--gray-800)] truncate">
                    {profileUser.displayName}
                  </h2>

                  <div className="space-y-1 mt-1 text-xs sm:text-sm">
                    <div className="flex items-center text-[var(--gray-500)]">
                      <EnvelopeIcon className="w-3.5 h-3.5 mr-1" />
                      <span className="truncate">{profileUser.email}</span>
                    </div>
                    <div className="flex items-center text-[var(--gray-500)]">
                      <PhoneIcon className="w-3.5 h-3.5 mr-1" />
                      <span>{formatPhoneNumber(profileUser.phoneNumber)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[var(--gray-200)]">
                <div className="grid grid-cols-3 gap-1">
                  {[
                    {
                      label: "Książek",
                      value: profileUser.booksCount || 0,
                      icon: (
                        <svg
                          className="w-4 h-4 text-blue-500"
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
                      ),
                    },
                    {
                      label: "Opinii",
                      value: profileUser.reviewsCount || 0,
                      icon: (
                        <svg
                          className="w-3.5 h-3.5 text-amber-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      ),
                    },
                    {
                      label: "Średnia",
                      value: (profileUser.averageRating || 0).toFixed(1),
                      icon: (
                        <svg
                          className="w-3.5 h-3.5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 0a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ),
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex flex-col items-center p-1.5 bg-[var(--background)] rounded-lg border border-[var(--gray-200)] shadow-sm"
                    >
                      <div className="mb-1">{stat.icon}</div>
                      <p className="text-xs font-bold text-[var(--gray-800)]">
                        {stat.value}
                      </p>
                      <p className="text-[10px] text-[var(--gray-500)]">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200">
            <div className="bg-gradient-to-r from-[var(--primaryColor)] to-[var(--primaryColorLight)] p-2 text-white">
              <h2 className="text-sm sm:text-base font-bold flex items-center justify-between">
                <div className="flex items-center">
                  <svg
                    className="w-3.5 h-3.5 mr-1"
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
                  Twoje książki
                </div>
                {selectedMyBooks.length > 0 && (
                  <span
                    className={`bg-white rounded-full px-2 py-0.5 text-xs font-bold ${
                      selectedMyBooks.length === 5
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {selectedMyBooks.length}/5
                    {selectedMyBooks.length === 5 && "🔒"}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-2 sm:p-3 max-h-96 overflow-y-auto">
              {isLoadingBooks ? (
                <div className="flex justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : myBooks.length === 0 ? (
                <p className="text-center text-sm text-[var(--gray-500)] py-6">
                  Nie masz jeszcze żadnych książek
                </p>
              ) : (
                <ul className="space-y-2">
                  {myBooks.map((book) => (
                    <li
                      key={book.id}
                      onClick={() => toggleBookSelection(book.id, "my")}
                      className={`flex items-center p-2 bg-[var(--background)] rounded-lg border 
                        ${
                          selectedMyBooks.includes(book.id)
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-[var(--gray-200)]"
                        } 
                        hover:shadow-md transition-all cursor-pointer`}
                    >
                      <div className="pr-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border 
                          ${
                            selectedMyBooks.includes(book.id)
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedMyBooks.includes(book.id) && (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>

                      {renderBookCover(book, "M")}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {formatBookTitle(book.title)}
                        </p>
                        <p className="text-[10px] text-[var(--gray-500)] truncate">
                          {book.author}
                        </p>
                      </div>
                      <Link
                        href={`/books/${book.bookId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="ml-2 p-1 bg-green-100 hover:bg-green-200 text-green-600 text-[10px] rounded border border-green-300 transition-colors flex items-center"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Szczegóły
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-2 text-white">
              <h2 className="text-sm sm:text-base font-bold flex items-center justify-between">
                <div className="flex items-center">
                  <svg
                    className="w-3.5 h-3.5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                  Książki użytkownika do wymiany
                </div>
                {selectedUserBooks.length > 0 && (
                  <span
                    className={`bg-white rounded-full px-2 py-0.5 text-xs font-bold ${
                      selectedUserBooks.length === 5
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {selectedUserBooks.length}/5
                    {selectedUserBooks.length === 5 && "🔒"}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-2 sm:p-3 max-h-96 overflow-y-auto">
              {isLoadingBooks ? (
                <div className="flex justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : userExchangeBooks.length === 0 ? (
                <p className="text-center text-sm text-[var(--gray-500)] py-6">
                  Ten użytkownik nie ma książek do wymiany
                </p>
              ) : (
                <ul className="space-y-2">
                  {userExchangeBooks.map((book) => (
                    <li
                      key={book.id}
                      onClick={() => toggleBookSelection(book.id, "user")}
                      className={`flex items-center p-2 bg-[var(--background)] rounded-lg border 
                        ${
                          selectedUserBooks.includes(book.id)
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-[var(--gray-200)]"
                        } 
                        hover:shadow-md transition-all cursor-pointer`}
                    >
                      <div className="pr-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border 
                          ${
                            selectedUserBooks.includes(book.id)
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedUserBooks.includes(book.id) && (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>

                      {renderBookCover(book, "M")}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {formatBookTitle(book.title)}
                        </p>
                        <p className="text-[10px] text-[var(--gray-500)] truncate">
                          {book.author}
                        </p>
                      </div>
                      {/* Add details button here */}
                      <Link
                        href={`/books/${book.bookId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="ml-2 p-1 bg-green-100 hover:bg-green-200 text-green-600 text-[10px] rounded border border-green-300 transition-colors flex items-center"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Szczegóły
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-amber-400 p-2 text-white">
              <h2 className="text-sm sm:text-base font-bold flex items-center">
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                Książki, które użytkownik chce przeczytać
              </h2>
            </div>
            <div className="p-2 sm:p-3 max-h-96 overflow-y-auto">
              {isLoadingBooks ? (
                <div className="flex justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : userWishlist.length === 0 ? (
                <p className="text-center text-sm text-[var(--gray-500)] py-6">
                  Ten użytkownik nie ma książek na liście życzeń
                </p>
              ) : (
                <ul className="space-y-2">
                  {userWishlist.map((book) => (
                    <li
                      key={book.id}
                      className="flex items-center p-2 bg-[var(--background)] rounded-lg border border-[var(--gray-200)] transition-all"
                    >
                      {renderBookCover(book, "M")}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {formatBookTitle(book.title)}
                        </p>
                        <p className="text-[10px] text-[var(--gray-500)] truncate">
                          {book.author}
                        </p>
                      </div>
                      <Link
                        href={`/books/${book.bookId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="ml-2 p-1 bg-amber-100 hover:bg-amber-200 text-amber-600 text-[10px] rounded border border-amber-300 transition-colors flex items-center"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Szczegóły
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {(selectedMyBooks.length > 0 || selectedUserBooks.length > 0) && (
          <div className="mt-6 p-4 bg-white rounded-xl shadow-md border border-blue-100">
            <h3 className="text-lg font-bold text-center mb-4 text-blue-700 flex items-center justify-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
              Podsumowanie wymiany
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-white shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-sm text-gray-700 flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-xs mr-2">
                      {selectedMyBooks.length}
                    </span>
                    Twoje książki
                  </h4>
                  {selectedMyBooks.length > 0 && (
                    <button
                      onClick={() => setSelectedMyBooks([])}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-red-500 rounded-full transition-colors"
                    >
                      Wyczyść
                    </button>
                  )}
                </div>

                {selectedMyBooks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm italic">
                    Wybierz książki, które chcesz wymienić
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getSelectedBooks(selectedMyBooks, myBooks).map((book) => (
                      <div
                        key={book.id}
                        className="flex items-center bg-white p-2 rounded border border-gray-100 shadow-sm"
                      >
                        {renderSmallBookCover(book, "M")}
                        <div className="flex-1 min-w-0 ml-2">
                          <p className="text-xs font-bold truncate">
                            {formatBookTitle(book.title)}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {book.author}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookSelection(book.id, "my");
                          }}
                          className="ml-1 text-gray-400 hover:text-red-500"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-white shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-sm text-gray-700 flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-xs mr-2">
                      {selectedUserBooks.length}
                    </span>
                    Książki {profileUser?.displayName}
                  </h4>
                  {selectedUserBooks.length > 0 && (
                    <button
                      onClick={() => setSelectedUserBooks([])}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-red-500 rounded-full transition-colors"
                    >
                      Wyczyść
                    </button>
                  )}
                </div>

                {selectedUserBooks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm italic">
                    Wybierz książki, które chcesz otrzymać
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getSelectedBooks(selectedUserBooks, userExchangeBooks).map(
                      (book) => (
                        <div
                          key={book.id}
                          className="flex items-center bg-white p-2 rounded border border-gray-100 shadow-sm"
                        >
                          {renderSmallBookCover(book, "M")}
                          <div className="flex-1 min-w-0 ml-2">
                            <p className="text-xs font-bold truncate">
                              {formatBookTitle(book.title)}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              {book.author}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookSelection(book.id, "user");
                            }}
                            className="ml-1 text-gray-400 hover:text-red-500"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedMyBooks.length > 0 && selectedUserBooks.length > 0 && (
              <div className="flex justify-center my-3 py-1">
                <div className="relative flex items-center bg-blue-50 px-4 py-2 rounded-lg shadow-sm">
                  <div className="bg-blue-100 px-3 py-1 rounded-lg text-blue-700 text-xs font-bold">
                    TY
                  </div>
                  <div className="w-16 h-1 bg-blue-400 mx-2"></div>
                  <div className="px-2 py-1 bg-blue-500 text-white rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4"
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
                  </div>
                  <div className="w-16 h-1 bg-blue-400 mx-2"></div>
                  <div className="bg-blue-100 px-3 py-1 rounded-lg text-blue-700 text-xs font-bold">
                    {profileUser?.displayName?.split(" ")[0] || "Użytkownik"}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-col items-center">
              {selectedMyBooks.length > 0 && selectedUserBooks.length > 0 ? (
                <div className="text-center mb-2 text-xs">
                  <span
                    className={`font-bold px-2 py-1 rounded-lg ${
                      selectedMyBooks.length === selectedUserBooks.length
                        ? "bg-green-100 text-green-700"
                        : selectedMyBooks.length > selectedUserBooks.length
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {getExchangeStatusText()}
                  </span>
                </div>
              ) : (
                <div className="text-center mb-2 p-2 bg-blue-50 rounded-lg text-xs text-gray-600 max-w-md">
                  Aby zaproponować wymianę, wybierz przynajmniej jedną książkę z
                  każdej listy
                </div>
              )}

              <button
                onClick={() => setExchangeModalOpen(true)}
                disabled={!canProposeExchange()}
                className={`px-4 py-1.5 mt-2 rounded-lg flex items-center font-semibold text-sm shadow-md transform transition-all duration-200
    ${
      canProposeExchange()
        ? "bg-blue-600 hover:bg-blue-700 text-white"
        : "bg-gray-200 text-gray-400 cursor-not-allowed"
    }`}
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
                Zaproponuj wymianę
              </button>
            </div>
          </div>
        )}

        {exchangeModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-3 text-white">
                <h3 className="font-bold text-base">
                  Potwierdź wymianę książek
                </h3>
              </div>

              <div className="p-4">
                <div className="text-center mb-4">
                  <p className="text-gray-700">
                    Czy na pewno chcesz zaproponować wymianę?
                  </p>

                  <div className="mt-3 bg-blue-50 rounded-lg p-2 inline-block">
                    <p className="text-sm font-medium text-blue-700">
                      {selectedMyBooks.length} książek za{" "}
                      {selectedUserBooks.length} książek
                    </p>
                  </div>

                  <div className="flex justify-center mt-4 gap-1">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500">Dajesz</span>
                      <span className="bg-blue-100 text-blue-800 font-bold rounded-full w-8 h-8 flex items-center justify-center">
                        {selectedMyBooks.length}
                      </span>
                    </div>

                    <div className="mx-2 flex items-center">
                      <svg
                        className="w-5 h-5 text-gray-400"
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
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500">Otrzymujesz</span>
                      <span className="bg-green-100 text-green-800 font-bold rounded-full w-8 h-8 flex items-center justify-center">
                        {selectedUserBooks.length}
                      </span>
                    </div>
                  </div>
                </div>

                {exchangeError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                    {exchangeError}
                  </div>
                )}

                {exchangeSuccess && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded mb-4 text-sm">
                    Propozycja wymiany została wysłana pomyślnie!
                  </div>
                )}

                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
                    onClick={() => setExchangeModalOpen(false)}
                  >
                    Anuluj
                  </button>
                  <button
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center font-medium"
                    onClick={proposeExchange}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
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
                        Wysyłanie...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Zatwierdź wymianę
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
