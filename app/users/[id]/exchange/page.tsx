"use client";

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
} from "firebase/firestore";
import Image from "next/image";
import defaultAvatar from "@/public/images/default-avatar.png";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { EnvelopeIcon } from "@/app/components/svg-icons/EnvelopeIcon";
import { PhoneIcon } from "@/app/components/svg-icons/PhoneIcon";
import { parsePhoneNumber } from "libphonenumber-js";
import { useAuth } from "@/app/hooks/useAuth";
import { useRouter } from "next/navigation";

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  isForExchange?: boolean;
  description?: string;
  addedAt: Date;
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

export default function Exchange({ params }: PageProps) {
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { user: currentUser, loading: authLoading } = useAuth();
  const [currentUserData, setCurrentUserData] = useState<UserProfile | null>(
    null
  );

  // Book lists
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [userExchangeBooks, setUserExchangeBooks] = useState<Book[]>([]);
  const [userWishlist, setUserWishlist] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

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

        // Fetch profile user data
        const userDocRef = doc(db, "users", unwrappedParams.id);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          setError("Nie znaleziono użytkownika");
          return;
        }

        const userData = userDoc.data();

        // Count profile user books
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

        // Fetch current user data
        if (currentUser) {
          const currentUserDocRef = doc(db, "users", currentUser.uid);
          const currentUserDoc = await getDoc(currentUserDocRef);

          if (currentUserDoc.exists()) {
            const currentData = currentUserDoc.data();

            // Count current user books
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

            // Now fetch books
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

      // Fetch my books - ONLY books with status "forExchange"
      const myBooksQuery = query(
        collection(db, "bookOwnership"),
        where("userId", "==", currentUserId),
        where("status", "==", "forExchange"), // Added filter for forExchange only
        orderBy("createdAt", "desc")
      );

      const myBooksSnapshot = await getDocs(myBooksQuery);
      console.log("My books query results:", myBooksSnapshot.size);

      // Map the documents to book objects
      const myBooksData = await Promise.all(
        myBooksSnapshot.docs.map(async (doc) => {
          try {
            const bookData = doc.data();
            console.log("Processing my book doc:", doc.id, bookData);

            // Fetch additional details for the book
            const bookDetails = await fetchBookDetails(bookData.bookId);
            console.log("Book details retrieved:", bookDetails?.title);

            return {
              id: doc.id,
              title: bookDetails?.title || "Brak tytułu",
              author: bookDetails?.author || "Nieznany autor",
              coverUrl: bookDetails?.coverUrl || null,
              isForExchange: bookData.status === "forExchange" || false,
              addedAt: bookData.createdAt?.toDate() || new Date(), // Changed from addedAt to createdAt
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

      // Fetch user's exchange books - only books with status "forExchange"
      // Use the same approach as in bookshelf page
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

      // Map the documents to book objects
      const userExchangeBooksData = await Promise.all(
        userExchangeBooksSnapshot.docs.map(async (doc) => {
          try {
            const bookData = doc.data();
            console.log("Processing book ownership doc:", doc.id, bookData);

            // Fetch additional details for the book
            const bookDetails = await fetchBookDetails(bookData.bookId);
            console.log("Book details retrieved:", bookDetails?.title);

            return {
              id: doc.id,
              title: bookDetails?.title || "Brak tytułu",
              author: bookDetails?.author || "Nieznany autor",
              coverUrl: bookDetails?.coverUrl || null,
              addedAt: bookData.createdAt?.toDate() || new Date(),
              bookId: bookData.bookId,
            };
          } catch (err) {
            console.error("Error processing exchange book:", err);
            return null;
          }
        })
      );

      // Filter out null values and set state
      const filteredExchangeBooks = userExchangeBooksData.filter(
        (book) => book !== null
      ) as Book[];

      console.log("Final exchange books list:", filteredExchangeBooks);
      setUserExchangeBooks(filteredExchangeBooks);

      // The wishlist query is working correctly, so keeping it as is
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

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!profileUser || !currentUserData)
    return <div className="p-4">Nie znaleziono danych użytkowników</div>;

  return (
    <main className="mx-auto px-2 sm:px-4 pb-8 bg-[var(--background)] w-full h-full transition-all duration-200">
      <div className="max-w-7xl mx-auto">
        {/* User profiles section */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6">
          {/* Current user card */}
          <div className="w-full lg:w-1/2 bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200">
            {/* Current user header */}
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
              {/* Profile info layout */}
              <div className="flex items-start space-x-3">
                {/* Left column - Photo */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={getHighResProfileImage(currentUserData.photoURL)}
                    alt="Your Profile"
                    fill
                    className="object-cover"
                    quality={90}
                  />
                </div>

                {/* Right column - User info */}
                <div className="flex-1 min-w-0">
                  {/* User name */}
                  <h2 className="text-base sm:text-lg font-bold text-[var(--gray-800)] truncate">
                    {currentUserData.displayName}
                  </h2>

                  {/* Contact info */}
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

              {/* Statistics section - improved icon placement */}
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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

          {/* Profile user card */}
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
              {/* Profile info layout */}
              <div className="flex items-start space-x-3">
                {/* Left column - Photo */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={getHighResProfileImage(profileUser.photoURL)}
                    alt="Profile"
                    fill
                    className="object-cover"
                    quality={90}
                  />
                </div>

                {/* Right column - User info */}
                <div className="flex-1 min-w-0">
                  {/* User name */}
                  <h2 className="text-base sm:text-lg font-bold text-[var(--gray-800)] truncate">
                    {profileUser.displayName}
                  </h2>

                  {/* Contact info */}
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

              {/* Statistics section for profile user */}
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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

        {/* Books section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* My Books */}
          <div className="bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200">
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Twoje książki
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
                      className="flex items-center p-2 bg-[var(--background)] rounded-lg border border-[var(--gray-200)] hover:shadow-md transition-all"
                    >
                      {book.coverUrl ? (
                        <div className="relative w-10 h-14 mr-2 flex-shrink-0">
                          <Image
                            src={book.coverUrl}
                            alt={book.title}
                            fill
                            className="object-cover rounded"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-14 mr-2 flex-shrink-0 bg-gray-200 rounded flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-400"
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
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {book.title}
                        </p>
                        <p className="text-[10px] text-[var(--gray-500)] truncate">
                          {book.author}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* User Exchange Books */}
          <div className="bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200">
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
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
                Książki użytkownika do wymiany
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
                      className="flex items-center p-2 bg-[var(--background)] rounded-lg border border-[var(--gray-200)] hover:shadow-md transition-all"
                    >
                      {book.coverUrl ? (
                        <div className="relative w-10 h-14 mr-2 flex-shrink-0">
                          <Image
                            src={book.coverUrl}
                            alt={book.title}
                            fill
                            className="object-cover rounded"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-14 mr-2 flex-shrink-0 bg-gray-200 rounded flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-400"
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
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {book.title}
                        </p>
                        <p className="text-[10px] text-[var(--gray-500)] truncate">
                          {book.author}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* User Wishlist */}
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
                      className="flex items-center p-2 bg-[var(--background)] rounded-lg border border-[var(--gray-200)] hover:shadow-md transition-all"
                    >
                      {book.coverUrl ? (
                        <div className="relative w-10 h-14 mr-2 flex-shrink-0">
                          <Image
                            src={book.coverUrl}
                            alt={book.title}
                            fill
                            className="object-cover rounded"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-14 mr-2 flex-shrink-0 bg-gray-200 rounded flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-400"
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
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {book.title}
                        </p>
                        <p className="text-[10px] text-[var(--gray-500)] truncate">
                          {book.author}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
