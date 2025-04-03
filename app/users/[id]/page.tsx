"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import Image from "next/image";
import defaultAvatar from "@/public/images/default-avatar.png";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import { EnvelopeIcon } from "@/app/components/svg-icons/EnvelopeIcon";
import { PhoneIcon } from "@/app/components/svg-icons/PhoneIcon";
import { parsePhoneNumber } from "libphonenumber-js";
import { useAuth } from "@/app/hooks/useAuth";
import { useNotifications } from "@/app/contexts/NotificationsContext";

interface Review {
  id: string;
  userId: string;
  bookId: string;
  rating: number;
  comment: string;
  userEmail: string;
  userDisplayName?: string;
  userPhotoURL?: string;
  createdAt: any;
  bookTitle?: string;
  bookAuthor?: string;
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  reviewsCount: number;
  averageRating: number;
  phoneNumber?: string;
  creationTime?: string;
  bio?: string;
  booksCount: number;
  favoriteBooks: {
    id: string;
    title: string;
    author: string;
    createdAt: Date;
  }[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const fetchBookDetails = async (bookId: string) => {
  const paddedId = bookId.padStart(14, "0");
  const response = await fetch(`/api/books/${paddedId}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data;
};

const getHighResProfileImage = (photoURL: string | undefined) => {
  if (!photoURL) return defaultAvatar;

  if (photoURL.includes("googleusercontent.com")) {
    return photoURL.replace(/=s\d+-c/, "=s400-c");
  }

  return photoURL;
};

export default function UserProfile({ params }: PageProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayedReviews, setDisplayedReviews] = useState<Review[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isContact, setIsContact] = useState(false);
  const [contactDocId, setContactDocId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const { user: currentUser } = useAuth();
  const [displayedFavoriteBooks, setDisplayedFavoriteBooks] = useState<
    UserProfile["favoriteBooks"]
  >([]);
  const [isLoadingMoreFavorites, setIsLoadingMoreFavorites] = useState(false);
  const [totalFavoriteBooks, setTotalFavoriteBooks] = useState(0);
  const [invitationDirection, setInvitationDirection] = useState<
    "sent" | "received" | null
  >(null);
  const { pendingInvites, setPendingInvites } = useNotifications();
  const [displayedDesiredBooks, setDisplayedDesiredBooks] = useState<
    {
      id: string;
      title: string;
      author: string;
      createdAt: Date;
    }[]
  >([]);
  const [displayedExchangeBooks, setDisplayedExchangeBooks] = useState<
    {
      id: string;
      title: string;
      author: string;
      createdAt: Date;
    }[]
  >([]);
  const [totalExchangeBooks, setTotalExchangeBooks] = useState(0);
  const [totalOwnedBooks, setTotalOwnedBooks] = useState(0);

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

  const checkContactStatus = async (profileUserId: string) => {
    if (!currentUser) return;

    try {
      const contactAsUserQuery = query(
        collection(db, "userContacts"),
        where("userId", "==", currentUser.uid),
        where("contactId", "==", profileUserId)
      );

      const contactAsContactQuery = query(
        collection(db, "userContacts"),
        where("userId", "==", profileUserId),
        where("contactId", "==", currentUser.uid)
      );

      const [userQuerySnapshot, contactQuerySnapshot] = await Promise.all([
        getDocs(contactAsUserQuery),
        getDocs(contactAsContactQuery),
      ]);

      if (!userQuerySnapshot.empty) {
        const userContact = userQuerySnapshot.docs[0].data();
        if (userContact.status === "accepted") {
          setIsContact(true);
          setContactDocId(userQuerySnapshot.docs[0].id);
          setIsPending(false);
          setInvitationDirection(null);
        } else if (userContact.status === "pending") {
          setIsContact(false);
          setIsPending(true);
          setInvitationDirection("sent");
        }
      } else if (!contactQuerySnapshot.empty) {
        const profileContact = contactQuerySnapshot.docs[0].data();
        if (profileContact.status === "accepted") {
          setIsContact(true);
          setContactDocId(contactQuerySnapshot.docs[0].id);
          setIsPending(false);
          setInvitationDirection(null);
        } else if (profileContact.status === "pending") {
          setIsContact(false);
          setIsPending(true);
          setContactDocId(contactQuerySnapshot.docs[0].id);
          setInvitationDirection("received");
        }
      } else {
        setIsContact(false);
        setIsPending(false);
        setInvitationDirection(null);
      }
    } catch (error) {
      console.error("Error checking contact status:", error);
      setIsContact(false);
      setIsPending(false);
      setInvitationDirection(null);
    }
  };

  const handleAddContact = async () => {
    if (!currentUser || !user) return;

    try {
      await addDoc(collection(db, "userContacts"), {
        userId: currentUser.uid,
        contactId: user.id,
        createdAt: new Date(),
        status: "pending",
      });
      setIsPending(true);
    } catch (error) {
      console.error("Error adding contact:", error);
    }
  };

  const handleRemoveContact = async () => {
    if (!contactDocId) return;

    try {
      await deleteDoc(doc(db, "userContacts", contactDocId));
      setIsContact(false);
      setContactDocId(null);
    } catch (error) {
      console.error("Error removing contact:", error);
    }
  };

  const handleAcceptInvite = async () => {
    if (!contactDocId) return;

    try {
      await updateDoc(doc(db, "userContacts", contactDocId), {
        status: "accepted",
      });
      setIsContact(true);
      setIsPending(false);
      setPendingInvites(Math.max(0, pendingInvites - 1));
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const handleRejectInvite = async () => {
    if (!contactDocId) return;

    try {
      await deleteDoc(doc(db, "userContacts", contactDocId));
      setIsContact(false);
      setContactDocId(null);
      setIsPending(false);
      setPendingInvites(Math.max(0, pendingInvites - 1));
    } catch (error) {
      console.error("Error rejecting invite:", error);
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const unwrappedParams = await params;
        const userDocRef = doc(db, "users", unwrappedParams.id);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          setError("Nie znaleziono użytkownika");
          return;
        }

        const userData = userDoc.data();

        const bookDesireQuery = query(
          collection(db, "bookDesire"),
          where("userId", "==", unwrappedParams.id)
        );
        const bookDesireSnapshot = await getDocs(bookDesireQuery);
        const booksCount = bookDesireSnapshot.size;

        const DesiredBooksQuery = query(
          collection(db, "bookDesire"),
          where("userId", "==", unwrappedParams.id),
          orderBy("createdAt", "desc"),
          limit(3)
        );

        const DesiredBooksSnapshot = await getDocs(DesiredBooksQuery);
        const DesiredBookIds = DesiredBooksSnapshot.docs.map((doc) => ({
          id: doc.data().bookId,
          createdAt: doc.data().createdAt.toDate(),
        }));

        const ownedBooks = await Promise.all(
          DesiredBookIds.map(async ({ id, createdAt }) => {
            const bookDetails = await fetchBookDetails(id);
            return {
              id,
              title: bookDetails?.title || "Książka niedostępna",
              author: bookDetails?.author || "Autor nieznany",
              createdAt,
            };
          })
        );

        setDisplayedDesiredBooks(ownedBooks);
        setTotalOwnedBooks(booksCount);

        const favoriteBooksQuery = query(
          collection(db, "bookFavorites"),
          where("userId", "==", unwrappedParams.id),
          orderBy("createdAt", "desc"),
          limit(3)
        );

        const totalFavoriteBooksQuery = query(
          collection(db, "bookFavorites"),
          where("userId", "==", unwrappedParams.id)
        );
        const totalFavoriteBooksSnapshot = await getDocs(
          totalFavoriteBooksQuery
        );
        const totalFavoriteBooks = totalFavoriteBooksSnapshot.size;

        const favoriteBooksSnapshot = await getDocs(favoriteBooksQuery);
        const favoriteBookIds = favoriteBooksSnapshot.docs.map((doc) => ({
          id: doc.data().bookId,
          createdAt: doc.data().createdAt.toDate(),
        }));

        const favoriteBooks = await Promise.all(
          favoriteBookIds.map(async ({ id, createdAt }) => {
            const bookDetails = await fetchBookDetails(id);
            return {
              id,
              title: bookDetails?.title || "Książka niedostępna",
              author: bookDetails?.author || "Autor nieznany",
              createdAt,
            };
          })
        );

        setDisplayedFavoriteBooks(favoriteBooks);
        setTotalFavoriteBooks(totalFavoriteBooks);

        const exchangeBooksQuery = query(
          collection(db, "bookOwnership"),
          where("userId", "==", unwrappedParams.id),
          where("status", "==", "forExchange"),
          orderBy("createdAt", "desc"),
          limit(3)
        );

        const totalExchangeQuery = query(
          collection(db, "bookOwnership"),
          where("userId", "==", unwrappedParams.id),
          where("status", "==", "forExchange")
        );
        const totalExchangeSnapshot = await getDocs(totalExchangeQuery);
        const exchangeBooksSnapshot = await getDocs(exchangeBooksQuery);
        const exchangeBookIds = exchangeBooksSnapshot.docs.map((doc) => ({
          id: doc.data().bookId,
          createdAt: doc.data().createdAt.toDate(),
        }));

        const exchangeBooks = await Promise.all(
          exchangeBookIds.map(async ({ id, createdAt }) => {
            const bookDetails = await fetchBookDetails(id);
            return {
              id,
              title: bookDetails?.title || "Książka niedostępna",
              author: bookDetails?.author || "Autor nieznany",
              createdAt,
            };
          })
        );

        setDisplayedExchangeBooks(exchangeBooks);
        setTotalExchangeBooks(totalExchangeSnapshot.size);

        const userProfile = {
          id: unwrappedParams.id,
          email: userData.email,
          displayName: userData.displayName || "Użytkownik anonimowy",
          photoURL: userData.photoURL,
          reviewsCount: userData.reviewsCount || 0,
          averageRating: userData.averageRating || 0.0,
          phoneNumber: userData.phoneNumber,
          creationTime: userData.createdAt?.toDate()?.toISOString(),
          bio: userData.bio,
          booksCount: booksCount,
          favoriteBooks: favoriteBooks,
        };

        setUser(userProfile);

        if (currentUser && currentUser.uid !== unwrappedParams.id) {
          await checkContactStatus(unwrappedParams.id);
        }

        const reviewsQuery = query(
          collection(db, "reviews"),
          where("userId", "==", unwrappedParams.id),
          orderBy("createdAt", "desc"),
          limit(3)
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Review[];

        const reviewsWithBooks = await Promise.all(
          reviewsData.map(async (review) => {
            const bookDetails = await fetchBookDetails(review.bookId);
            return {
              ...review,
              bookTitle: bookDetails?.title || "Książka niedostępna",
              bookAuthor: bookDetails?.author || "Autor nieznany",
            };
          })
        );

        setReviews(reviewsData);
        setDisplayedReviews(reviewsWithBooks);

        if (currentUser && user && currentUser.uid !== user.id) {
          await checkContactStatus(user.id);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setError("Nie udało się załadować profilu użytkownika");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [params, currentUser]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!user) return <div>Nie znaleziono użytkownika</div>;

  return (
    <main className="mx-auto px-4 pb-8 bg-[var(--background)] w-full h-full transition-all duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column - user profile and statistics */}
          <div className="lg:w-1/3 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto hide-scrollbar pb-10 px-1">
            {/* User profile card */}
            <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200 mb-8">
              <div className="bg-gradient-to-r from-[var(--primaryColor)] to-[var(--primaryColorLight)] p-4 text-white relative">
                <h2 className="text-xl font-bold flex items-center">
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profil użytkownika
                </h2>
              </div>
              <div className="p-6">
                <div className="flex flex-col space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    {/* Profile photo */}
                    <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow">
                      <Image
                        src={getHighResProfileImage(user.photoURL)}
                        alt="Profile"
                        fill
                        className="object-cover transition-shadow duration-200"
                        quality={100}
                      />
                    </div>

                    {/* User name and join date */}
                    <div className="text-center space-y-1">
                      <h1 className="text-2xl font-bold text-[var(--gray-800)] transition-colors duration-200">
                        {user.displayName}
                      </h1>
                      <p className="text-[var(--gray-500)] text-sm font-medium transition-colors duration-200">
                        Dołączył(a):{" "}
                        {user.creationTime
                          ? format(new Date(user.creationTime), "d MMMM yyyy", {
                              locale: pl,
                            })
                          : "Data niedostępna"}
                      </p>
                    </div>
                  </div>

                  {/* Contact buttons */}
                  {currentUser && currentUser.uid !== user.id && (
                    <div className="flex justify-center gap-2">
                      {/* Existing contact buttons */}
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="mt-4 space-y-2 border-t border-[var(--gray-200)] pt-4">
                    <div className="flex items-center text-[var(--gray-500)]">
                      <EnvelopeIcon className="w-5 h-5 mr-2" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center text-[var(--gray-500)]">
                      <PhoneIcon className="w-5 h-5 mr-2" />
                      <span>{formatPhoneNumber(user.phoneNumber)}</span>
                    </div>
                  </div>

                  {/* Bio - if exists */}
                  {user.bio && (
                    <div className="relative mt-2 w-full">
                      <div className="bg-[var(--background)] rounded-xl p-4 shadow-sm border border-[var(--gray-200)]">
                        <h3 className="text-sm font-medium text-[var(--gray-700)] mb-2 flex items-center">
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
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          O mnie
                        </h3>
                        <p className="text-sm leading-relaxed text-[var(--gray-600)] italic relative">
                          {user.bio}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics card */}
            <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200">
              <div className="bg-gradient-to-r from-[var(--primaryColor)] to-[var(--primaryColorLight)] p-4 text-white">
                <h2 className="text-xl font-bold flex items-center">
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Statystyki
                </h2>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Książek",
                      value: user.booksCount,
                      icon: (
                        <svg
                          className="w-5 h-5 text-blue-500"
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
                      value: user.reviewsCount,
                      icon: (
                        <svg
                          className="w-5 h-5 text-amber-500"
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
                      label: "Średnia ocen",
                      value: user.averageRating.toFixed(1),
                      icon: (
                        <svg
                          className="w-5 h-5 text-green-500"
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
                      className="flex flex-col items-center p-2 bg-[var(--background)] rounded-lg border border-[var(--gray-200)] shadow-sm hover:shadow transition-all duration-200"
                    >
                      <div className="mb-1">{stat.icon}</div>
                      <p className="text-base font-bold text-[var(--gray-800)] transition-colors duration-200">
                        {stat.value}
                      </p>
                      <p className="text-xs text-[var(--gray-500)] transition-colors duration-200">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column - book collections in 2 columns */}
          <div className="lg:w-2/3">
            <div className="flex flex-wrap gap-6">
              {/* Left book column */}
              <div className="flex-1 min-w-[280px]">
                {/* Want to read books */}
                <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200 mb-6">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-4 text-white">
                    <h2 className="text-xl font-bold flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Chcę przeczytać
                    </h2>
                  </div>
                  <div className="p-5">
                    <div className="space-y-4">
                      {displayedDesiredBooks.length > 0 ? (
                        <>
                          {displayedDesiredBooks.map((book) => (
                            <div
                              key={book.id}
                              className="bg-[var(--background)] p-3 rounded-xl border border-[var(--gray-200)] hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow"
                            >
                              <Link
                                href={`/books/${book.id}`}
                                className="flex flex-col space-y-1 hover:text-purple-600 transition-colors"
                              >
                                <span className="font-medium text-[var(--gray-800)]">
                                  {book.title}
                                </span>
                                <span className="text-sm text-[var(--gray-500)]">
                                  {book.author}
                                </span>
                                <span className="text-xs text-[var(--gray-400)]">
                                  Dodano:{" "}
                                  {format(book.createdAt, "d MMMM yyyy", {
                                    locale: pl,
                                  })}
                                </span>
                              </Link>
                            </div>
                          ))}
                          {totalOwnedBooks > 3 && (
                            <div className="text-center">
                              <button
                                className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                                onClick={() => {
                                  /* Implement loading more */
                                }}
                              >
                                Zobacz więcej ({totalOwnedBooks - 3})
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-[var(--gray-500)] py-6">
                          Ten użytkownik nie dodał jeszcze książek, które chce
                          przeczytać.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Favorite books */}
                <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200">
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 p-4 text-white">
                    <h2 className="text-xl font-bold flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Ulubione książki
                    </h2>
                  </div>
                  <div className="p-5">
                    <div className="space-y-4">
                      {displayedFavoriteBooks.length > 0 ? (
                        <>
                          {displayedFavoriteBooks.map((book) => (
                            <div
                              key={book.id}
                              className="bg-[var(--background)] p-3 rounded-xl border border-[var(--gray-200)] hover:border-yellow-400 transition-all duration-200 shadow-sm hover:shadow"
                            >
                              <Link
                                href={`/books/${book.id}`}
                                className="flex flex-col space-y-1 hover:text-yellow-600 transition-colors"
                              >
                                <span className="font-medium text-[var(--gray-800)]">
                                  {book.title}
                                </span>
                                <span className="text-sm text-[var(--gray-500)]">
                                  {book.author}
                                </span>
                                <span className="text-xs text-[var(--gray-400)]">
                                  Dodano:{" "}
                                  {format(book.createdAt, "d MMMM yyyy", {
                                    locale: pl,
                                  })}
                                </span>
                              </Link>
                            </div>
                          ))}
                          {totalFavoriteBooks > 3 && (
                            <div className="text-center">
                              <button
                                className="px-4 py-2 text-sm text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
                                onClick={() => {
                                  /* Implement loading more */
                                }}
                              >
                                Zobacz więcej ({totalFavoriteBooks - 3})
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-[var(--gray-500)] py-6">
                          Ten użytkownik nie dodał jeszcze ulubionych książek.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right book column */}
              <div className="flex-1 min-w-[280px]">
                {/* Exchange books */}
                <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden mb-6 transition-all duration-200">
                  <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 text-white">
                    <h2 className="text-xl font-bold flex items-center">
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
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                      Książki do wymiany
                    </h2>
                  </div>
                  <div className="p-5">
                    <div className="space-y-4">
                      {displayedExchangeBooks.length > 0 ? (
                        <>
                          {displayedExchangeBooks.map((book) => (
                            <div
                              key={book.id}
                              className="bg-[var(--background)] p-3 rounded-xl border border-[var(--gray-200)] hover:border-green-400 transition-all duration-200 shadow-sm hover:shadow"
                            >
                              <Link
                                href={`/books/${book.id}`}
                                className="flex flex-col space-y-1 hover:text-green-600 transition-colors"
                              >
                                <span className="font-medium text-[var(--gray-800)]">
                                  {book.title}
                                </span>
                                <span className="text-sm text-[var(--gray-500)]">
                                  {book.author}
                                </span>
                                <span className="text-xs text-[var(--gray-400)]">
                                  Dodano:{" "}
                                  {format(book.createdAt, "d MMMM yyyy", {
                                    locale: pl,
                                  })}
                                </span>
                              </Link>
                            </div>
                          ))}
                          {totalExchangeBooks > 3 && (
                            <div className="text-center">
                              <button
                                className="px-4 py-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                                onClick={() => {
                                  /* Implement loading more */
                                }}
                              >
                                Zobacz więcej ({totalExchangeBooks - 3})
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-[var(--gray-500)] py-6">
                          Ten użytkownik nie ma książek do wymiany.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reviews */}
                <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200">
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-4 text-white">
                    <h2 className="text-xl font-bold flex items-center">
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
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      Opinie użytkownika
                    </h2>
                  </div>
                  <div className="p-5">
                    <div className="space-y-5">
                      {displayedReviews.length > 0 ? (
                        <>
                          {displayedReviews.map((review) => (
                            <div
                              key={review.id}
                              className="bg-[var(--background)] p-4 rounded-xl border border-[var(--gray-200)] shadow-sm hover:shadow hover:border-indigo-400 transition-all duration-200"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <Link
                                  href={`/books/${review.bookId}`}
                                  className="font-medium text-[var(--gray-800)] hover:text-indigo-600 transition-colors"
                                >
                                  {review.bookTitle}
                                </Link>
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <svg
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < review.rating
                                          ? "text-amber-400"
                                          : "text-gray-300"
                                      }`}
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-[var(--gray-500)] mb-2">
                                {review.bookAuthor}
                              </p>
                              <p className="text-sm italic text-[var(--gray-700)] pb-2 border-b border-[var(--gray-100)]">
                                "{review.comment}"
                              </p>
                              <p className="text-xs text-[var(--gray-400)] mt-2">
                                {format(
                                  review.createdAt.toDate(),
                                  "d MMMM yyyy",
                                  {
                                    locale: pl,
                                  }
                                )}
                              </p>
                            </div>
                          ))}
                          {user.reviewsCount > 3 && (
                            <div className="text-center">
                              <button
                                className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                                onClick={() => {
                                  /* Implement loading more */
                                }}
                              >
                                Zobacz więcej ({user.reviewsCount - 3})
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-[var(--gray-500)] py-6">
                          Ten użytkownik nie dodał jeszcze opinii.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
