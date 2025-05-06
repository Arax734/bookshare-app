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
  const [, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayedReviews, setDisplayedReviews] = useState<Review[]>([]);
  const [isContact, setIsContact] = useState(false);
  const [contactDocId, setContactDocId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const { user: currentUser } = useAuth();
  const [displayedFavoriteBooks, setDisplayedFavoriteBooks] = useState<
    UserProfile["favoriteBooks"]
  >([]);
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

        const allBooksQuery = query(
          collection(db, "bookOwnership"),
          where("userId", "==", unwrappedParams.id)
        );
        const allBooksSnapshot = await getDocs(allBooksQuery);
        const totalBooksCount = allBooksSnapshot.size;

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
          booksCount: totalBooksCount,
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
    <main className="mx-auto px-2 sm:px-4 pb-8 bg-[var(--background)] w-full h-full transition-all duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          <div className="lg:w-1/3 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto hide-scrollbar pb-6 sm:pb-10 px-1">
            <div className="bg-[var(--card-background)] rounded-xl sm:rounded-2xl shadow-md overflow-hidden transition-all duration-200 mb-4 sm:mb-8">
              <div className="bg-gradient-to-r from-[var(--primaryColor)] to-[var(--primaryColorLight)] p-2 sm:p-3 text-white relative">
                <h2 className="text-base sm:text-lg font-bold flex items-center">
                  <svg
                    className="w-4 h-4 mr-1 sm:mr-2"
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
              <div className="p-3 sm:p-5">
                <div className="flex flex-col space-y-4 sm:space-y-5">
                  <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden">
                      <Image
                        src={getHighResProfileImage(user.photoURL)}
                        alt="Profile"
                        fill
                        className="object-cover transition-shadow duration-200"
                        quality={100}
                      />
                    </div>

                    <div className="text-center space-y-1">
                      <h1 className="text-lg sm:text-xl font-bold text-[var(--gray-800)] transition-colors duration-200">
                        {user.displayName}
                      </h1>
                      <p className="text-xs sm:text-sm text-[var(--gray-500)] font-medium transition-colors duration-200">
                        Dołączył(a):{" "}
                        {user.creationTime
                          ? format(new Date(user.creationTime), "d MMMM yyyy", {
                              locale: pl,
                            })
                          : "Data niedostępna"}
                      </p>
                    </div>
                  </div>

                  {currentUser && currentUser.uid !== user.id && (
                    <div className="flex flex-col gap-2">
                      {isContact ? (
                        <div className="flex flex-col gap-2 w-full">
                          <Link
                            href={`/users/${user.id}/exchange`}
                            className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center text-xs sm:text-sm"
                          >
                            <svg
                              className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5"
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
                            Wymiana z użytkownikiem
                          </Link>
                          <button
                            onClick={handleRemoveContact}
                            className="w-full px-3 py-1.5 bg-[var(--gray-200)] hover:bg-[var(--gray-300)] text-[var(--gray-700)] rounded-lg transition-colors duration-200 text-xs sm:text-sm"
                          >
                            Usuń z kontaktów
                          </button>
                        </div>
                      ) : isPending ? (
                        invitationDirection === "received" ? (
                          <div className="flex flex-col gap-2 w-full">
                            <div className="text-xs mb-1 text-center text-[var(--gray-500)]">
                              To osoba wysłała Ci zaproszenie:
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleAcceptInvite}
                                className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm"
                              >
                                Akceptuj
                              </button>
                              <button
                                onClick={handleRejectInvite}
                                className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 text-sm"
                              >
                                Odrzuć
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <button
                              disabled
                              className="w-full px-3 py-1.5 bg-[var(--gray-200)] text-[var(--gray-500)] rounded-lg cursor-not-allowed text-sm"
                            >
                              Zaproszenie wysłane
                            </button>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={handleAddContact}
                          className="w-full px-3 py-1.5 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-lg transition-colors duration-200 shadow-sm hover:shadow text-xs sm:text-sm"
                        >
                          <span className="flex items-center justify-center">
                            <svg
                              className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                              />
                            </svg>
                            Wyślij zaproszenie
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-3 sm:mt-4 space-y-2 border-t border-[var(--gray-200)] pt-3 sm:pt-4">
                    <div className="flex items-center text-[var(--gray-500)] text-xs sm:text-sm">
                      <EnvelopeIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      <span className="break-all">{user.email}</span>
                    </div>
                    <div className="flex items-center text-[var(--gray-500)] text-xs sm:text-sm">
                      <PhoneIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      <span>{formatPhoneNumber(user.phoneNumber)}</span>
                    </div>
                  </div>

                  {user.bio && (
                    <div className="relative mt-2 w-full">
                      <div className="bg-[var(--background)] rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-[var(--gray-200)]">
                        <h3 className="text-xs sm:text-sm font-medium text-[var(--gray-700)] mb-1.5 sm:mb-2 flex items-center">
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
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
                        <p className="text-xs sm:text-sm leading-relaxed text-[var(--gray-600)] italic relative">
                          {user.bio}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="relative mt-2 w-full border-t border-[var(--gray-200)] pt-3 sm:pt-4">
                    <h3 className="text-xs sm:text-sm font-medium text-[var(--gray-700)] mb-2 sm:mb-3 flex items-center">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
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
                    </h3>
                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-1.5">
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
                          className="flex flex-col items-center p-1.5 bg-[var(--background)] rounded-lg border border-[var(--gray-200)] shadow-sm hover:shadow transition-all duration-200"
                        >
                          <div className="mb-0.5">{stat.icon}</div>
                          <p className="text-sm font-bold text-[var(--gray-800)] transition-colors duration-200">
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
            </div>
          </div>

          <div className="lg:w-2/3">
            <div className="flex flex-col md:flex-row md:flex-wrap gap-4 sm:gap-6">
              <div className="w-full md:flex-1 min-w-0 md:min-w-[280px]">
                <div className="bg-[var(--card-background)] rounded-lg sm:rounded-xl shadow-md overflow-hidden mb-4 transition-all duration-200">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-2 sm:p-3 text-white">
                    <h2 className="text-sm sm:text-base font-bold flex items-center">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5"
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
                  <div className="p-3 sm:p-4">
                    <div className="space-y-3">
                      {displayedDesiredBooks.length > 0 ? (
                        <>
                          {displayedDesiredBooks.map((book) => (
                            <div
                              key={book.id}
                              className="bg-[var(--background)] p-2.5 rounded-lg border border-[var(--gray-200)] hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow"
                            >
                              <Link
                                href={`/books/${book.id}`}
                                className="flex flex-col space-y-0.5 hover:text-purple-600 transition-colors"
                              >
                                <span className="font-medium text-sm text-[var(--gray-800)]">
                                  {formatBookTitle(book.title)}
                                </span>
                                <span className="text-xs text-[var(--gray-500)]">
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
                              <Link
                                href={`/users/${user.id}/desires`}
                                className="inline-block px-3 py-1.5 text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
                              >
                                Zobacz więcej ({totalOwnedBooks - 3})
                              </Link>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-sm text-[var(--gray-500)] py-4">
                          Ten użytkownik nie dodał jeszcze książek, które chce
                          przeczytać.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200 mb-4">
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 p-3 text-white">
                    <h2 className="text-base font-bold flex items-center">
                      <svg
                        className="w-4 h-4 mr-1.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Ulubione książki
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {displayedFavoriteBooks.length > 0 ? (
                        <>
                          {displayedFavoriteBooks.map((book) => (
                            <div
                              key={book.id}
                              className="bg-[var(--background)] p-2.5 rounded-lg border border-[var(--gray-200)] hover:border-yellow-400 transition-all duration-200 shadow-sm hover:shadow"
                            >
                              <Link
                                href={`/books/${book.id}`}
                                className="flex flex-col space-y-0.5 hover:text-yellow-600 transition-colors"
                              >
                                <span className="font-medium text-sm text-[var(--gray-800)]">
                                  {formatBookTitle(book.title)}
                                </span>
                                <span className="text-xs text-[var(--gray-500)]">
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
                              <Link
                                href={`/users/${user.id}/favorites`}
                                className="inline-block px-3 py-1.5 text-xs text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
                              >
                                Zobacz więcej ({totalFavoriteBooks - 3})
                              </Link>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-sm text-[var(--gray-500)] py-4">
                          Ten użytkownik nie dodał jeszcze ulubionych książek.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:flex-1 min-w-0 md:min-w-[280px]">
                <div className="bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden mb-4 transition-all duration-200">
                  <div className="bg-gradient-to-r from-green-600 to-green-500 p-3 text-white">
                    <h2 className="text-base font-bold flex items-center">
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
                      Książki do wymiany
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {displayedExchangeBooks.length > 0 ? (
                        <>
                          {displayedExchangeBooks.map((book) => (
                            <div
                              key={book.id}
                              className="bg-[var(--background)] p-2.5 rounded-lg border border-[var(--gray-200)] hover:border-green-400 transition-all duration-200 shadow-sm hover:shadow"
                            >
                              <Link
                                href={`/books/${book.id}`}
                                className="flex flex-col space-y-0.5 hover:text-green-600 transition-colors"
                              >
                                <span className="font-medium text-sm text-[var(--gray-800)]">
                                  {formatBookTitle(book.title)}
                                </span>
                                <span className="text-xs text-[var(--gray-500)]">
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
                              <Link
                                href={`/users/${user.id}/toExchange`}
                                className="inline-block px-3 py-1.5 text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
                              >
                                Zobacz więcej ({totalExchangeBooks - 3})
                              </Link>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-sm text-[var(--gray-500)] py-4">
                          Ten użytkownik nie ma książek do wymiany.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--card-background)] rounded-xl shadow-md overflow-hidden transition-all duration-200">
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-3 text-white">
                    <h2 className="text-base font-bold flex items-center">
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
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      Opinie użytkownika
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {displayedReviews.length > 0 ? (
                        <>
                          {displayedReviews.map((review) => (
                            <div
                              key={review.id}
                              className="bg-[var(--background)] p-2.5 rounded-lg border border-[var(--gray-200)] shadow-sm hover:shadow hover:border-indigo-400 transition-all duration-200"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <Link
                                  href={`/books/${review.bookId}`}
                                  className="font-medium text-sm text-[var(--gray-800)] hover:text-indigo-600 transition-colors"
                                >
                                  {formatBookTitle(review.bookTitle)}
                                </Link>
                                <div className="flex">
                                  {[...Array(10)].map((_, i) => (
                                    <svg
                                      key={i}
                                      className={`w-2 h-2 ${
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
                              <p className="text-xs text-[var(--gray-500)] mb-1">
                                {review.bookAuthor}
                              </p>
                              {review.comment && (
                                <p className="text-xs italic text-[var(--gray-700)] pb-1 border-b border-[var(--gray-100)]">
                                  "{review.comment}"
                                </p>
                              )}
                              <p className="text-xs text-[var(--gray-400)] mt-1">
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
                              <Link
                                href={`/users/${user.id}/reviews`}
                                className="inline-block px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                              >
                                Zobacz więcej ({user.reviewsCount - 3})
                              </Link>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-sm text-[var(--gray-500)] py-4">
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
