"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit,
  orderBy,
  startAfter,
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
  createdAt: any; // You can use Timestamp from firebase if needed
  bookTitle?: string;
  bookAuthor?: string;
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  reviewsCount: number; // Changed from reviews
  averageRating: number; // Added field
  phoneNumber?: string;
  creationTime?: string;
  bio?: string;
  booksCount: number;
  favoriteBooks: {
    id: string;
    title: string;
    author: string;
    addedAt: Date;
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

  // Handle Google Photos URL
  if (photoURL.includes("googleusercontent.com")) {
    // Remove =s96-c parameter and add =s400-c for higher resolution
    return photoURL.replace(/=s\d+-c/, "=s400-c");
  }

  // Handle other providers or return original URL
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
  const REVIEWS_PER_PAGE = 3;
  const [invitationDirection, setInvitationDirection] = useState<
    "sent" | "received" | null
  >(null);
  const { pendingInvites, setPendingInvites } = useNotifications();

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
      // Check if current user initiated the contact
      const contactAsUserQuery = query(
        collection(db, "userContacts"),
        where("userId", "==", currentUser.uid),
        where("contactId", "==", profileUserId)
      );

      // Check if profile user initiated the contact
      const contactAsContactQuery = query(
        collection(db, "userContacts"),
        where("userId", "==", profileUserId),
        where("contactId", "==", currentUser.uid)
      );

      const [userQuerySnapshot, contactQuerySnapshot] = await Promise.all([
        getDocs(contactAsUserQuery),
        getDocs(contactAsContactQuery),
      ]);

      // Check user-initiated contacts first
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
      }
      // Then check profile user-initiated contacts
      else if (!contactQuerySnapshot.empty) {
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
      }
      // No contacts found
      else {
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
      // Optionally show success message
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
      // Update with direct value instead of function
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
      // Update with direct value instead of function
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

        // Get books count
        const bookOwnershipQuery = query(
          collection(db, "bookOwnership"),
          where("userId", "==", unwrappedParams.id)
        );
        const bookOwnershipSnapshot = await getDocs(bookOwnershipQuery);
        const booksCount = bookOwnershipSnapshot.size;

        // Get favorite books
        const favoriteBooksQuery = query(
          collection(db, "bookFavorites"),
          where("userId", "==", unwrappedParams.id),
          orderBy("createdAt", "desc"),
          limit(REVIEWS_PER_PAGE)
        );

        // Get total count of favorite books
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
          addedAt: doc.data().createdAt.toDate(),
        }));

        // Fetch book details for favorite books
        const favoriteBooks = await Promise.all(
          favoriteBookIds.map(async ({ id, addedAt }) => {
            const bookDetails = await fetchBookDetails(id);
            return {
              id,
              title: bookDetails?.title || "Książka niedostępna",
              author: bookDetails?.author || "Autor nieznany",
              addedAt,
            };
          })
        );

        setDisplayedFavoriteBooks(favoriteBooks);
        setTotalFavoriteBooks(totalFavoriteBooks);

        // Set user data first
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
          booksCount: booksCount, // Add this line
          favoriteBooks: favoriteBooks, // Add this line
        };

        setUser(userProfile);

        // Check contact status after setting user data
        if (currentUser && currentUser.uid !== unwrappedParams.id) {
          await checkContactStatus(unwrappedParams.id);
        }

        // Get reviews with ordering
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("userId", "==", unwrappedParams.id),
          orderBy("createdAt", "desc"), // Add ordering
          limit(REVIEWS_PER_PAGE)
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Review[];

        // Get total count separately
        const totalReviewsQuery = query(
          collection(db, "reviews"),
          where("userId", "==", unwrappedParams.id)
        );
        const totalReviewsSnapshot = await getDocs(totalReviewsQuery);

        // Fetch book details for initial reviews
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

        setReviews(reviewsData); // Store all fetched reviews
        setDisplayedReviews(reviewsWithBooks); // Show only loaded reviews

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

  const loadMoreReviews = async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const unwrappedParams = await params;
      const lastReview = reviews[reviews.length - 1];

      const nextReviewsQuery = query(
        collection(db, "reviews"),
        where("userId", "==", unwrappedParams.id),
        orderBy("createdAt", "desc"),
        startAfter(lastReview.createdAt),
        limit(REVIEWS_PER_PAGE)
      );

      const nextReviewsSnapshot = await getDocs(nextReviewsQuery);
      const nextReviewsData = nextReviewsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];

      // Fetch book details for new reviews
      const nextReviewsWithBooks = await Promise.all(
        nextReviewsData.map(async (review) => {
          const bookDetails = await fetchBookDetails(review.bookId);
          return {
            ...review,
            bookTitle: bookDetails?.title || "Książka niedostępna",
            bookAuthor: bookDetails?.author || "Autor nieznany",
          };
        })
      );

      setReviews([...reviews, ...nextReviewsWithBooks]);
      setDisplayedReviews([...displayedReviews, ...nextReviewsWithBooks]);
      setCurrentPage(currentPage + 1);
    } catch (error) {
      console.error("Error loading more reviews:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMoreFavoriteBooks = async () => {
    if (isLoadingMoreFavorites) return;

    setIsLoadingMoreFavorites(true);
    try {
      const unwrappedParams = await params;
      const lastBook =
        displayedFavoriteBooks[displayedFavoriteBooks.length - 1];

      const nextBooksQuery = query(
        collection(db, "bookFavorites"),
        where("userId", "==", unwrappedParams.id),
        orderBy("createdAt", "desc"),
        startAfter(lastBook.addedAt),
        limit(REVIEWS_PER_PAGE)
      );

      const nextBooksSnapshot = await getDocs(nextBooksQuery);
      const nextBookIds = nextBooksSnapshot.docs.map((doc) => ({
        id: doc.data().bookId,
        addedAt: doc.data().createdAt.toDate(),
      }));

      const nextBooks = await Promise.all(
        nextBookIds.map(async ({ id, addedAt }) => {
          const bookDetails = await fetchBookDetails(id);
          return {
            id,
            title: bookDetails?.title || "Książka niedostępna",
            author: bookDetails?.author || "Autor nieznany",
            addedAt,
          };
        })
      );

      setDisplayedFavoriteBooks([...displayedFavoriteBooks, ...nextBooks]);
    } catch (error) {
      console.error("Error loading more favorite books:", error);
    } finally {
      setIsLoadingMoreFavorites(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!user) return <div>Nie znaleziono użytkownika</div>;

  return (
    <main className="mx-auto px-4 py-8 bg-[var(--background)] w-full h-full transition-all duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-8">
          {/* Left Column */}
          <div className="flex-1 min-w-[300px]">
            {/* Profile Header Card */}
            <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200">
              <div className="bg-[var(--primaryColor)] p-4 text-white">
                <h2 className="text-xl font-bold">Profil użytkownika</h2>
              </div>
              <div className="p-6">
                <div className="flex flex-col space-y-6">
                  {/* Profile Image and Info */}
                  <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                    {/* Profile Image */}
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden">
                      <Image
                        src={getHighResProfileImage(user.photoURL)}
                        alt="Profile"
                        fill
                        className="object-cover shadow-lg transition-shadow duration-200"
                        quality={100}
                      />
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 text-center md:text-left space-y-3 transition-all duration-200">
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
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center text-[var(--gray-500)]">
                          <EnvelopeIcon className="w-5 h-5 mr-2" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center text-[var(--gray-500)]">
                          <PhoneIcon className="w-5 h-5 mr-2" />
                          <span>{formatPhoneNumber(user.phoneNumber)}</span>
                        </div>
                      </div>
                    </div>
                    {currentUser && currentUser.uid !== user.id && (
                      <div className="gap-2 flex">
                        {isContact ? (
                          <>
                            <Link
                              href={`/messages/${user.id}`}
                              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                              title="Wymiana"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                />
                              </svg>
                            </Link>
                            <button
                              onClick={handleRemoveContact}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="Usuń kontakt"
                            >
                              <svg
                                className="w-5 h-5"
                                viewBox="0 0 32 32"
                                fill="currentColor"
                              >
                                <path d="M19.72 31H2a1 1 0 0 1-1-1v-2a12.993 12.993 0 0 1 6.61-11.31 10 10 0 0 0 12.8-.01 11.475 11.475 0 0 1 1.46.96A7.989 7.989 0 0 0 19.72 31z" />
                                <circle cx="14" cy="9" r="8" />
                                <path d="M25 19a5.94 5.94 0 0 0-2.126.386A6.007 6.007 0 1 0 25 19zm2 7h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2z" />
                              </svg>
                            </button>
                          </>
                        ) : isPending ? (
                          invitationDirection === "received" ? (
                            <>
                              <button
                                onClick={handleAcceptInvite}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                title="Dodaj do kontaktów"
                              >
                                <svg
                                  className="w-5 h-5"
                                  viewBox="0 0 512 512"
                                  fill="currentColor"
                                >
                                  <path d="M226 232c-63.963 0-116-52.037-116-116S162.037 0 226 0s116 52.037 116 116-52.037 116-116 116zM271 317c0-25.68 7.21-49.707 19.708-70.167C271.193 256.526 249.228 262 226 262c-30.128 0-58.152-9.174-81.429-24.874-28.782 11.157-55.186 28.291-77.669 50.774C24.404 330.397 1 386.899 1 446.999V497c0 8.284 6.716 15 15 15h420c8.284 0 15-6.716 15-15v-50.001c0-.901-.025-1.805-.036-2.708C436.892 449.277 421.759 452 406 452c-74.439 0-135-60.561-135-135z" />
                                  <path d="M406 212c-57.897 0-105 47.103-105 105s47.103 105 105 105 105-47.103 105-105-47.103-105-105-105zm30 120h-15v15c0 8.284-6.716 15-15 15s-15-6.716-15-15v-15h-15c-8.284 0-15-6.716-15-15s6.716-15 15-15h15v-15c0-8.284 6.716-15 15-15s15 6.716 15 15v15h15c8.284 0 15 6.716 15 15s-6.716 15-15 15z" />
                                </svg>
                              </button>
                              <button
                                onClick={handleRejectInvite}
                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                title="Usuń kontakt"
                              >
                                <svg
                                  className="w-5 h-5"
                                  viewBox="0 0 32 32"
                                  fill="currentColor"
                                >
                                  <path d="M19.72 31H2a1 1 0 0 1-1-1v-2a12.993 12.993 0 0 1 6.61-11.31 10 10 0 0 0 12.8-.01 11.475 11.475 0 0 1 1.46.96A7.989 7.989 0 0 0 19.72 31z" />
                                  <circle cx="14" cy="9" r="8" />
                                  <path d="M25 19a5.94 5.94 0 0 0-2.126.386A6.007 6.007 0 1 0 25 19zm2 7h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2z" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <button
                              disabled
                              className="p-2 bg-green-400 opacity-75 cursor-not-allowed text-white rounded-lg"
                              title="Oczekuje na akceptację"
                            >
                              <svg
                                className="w-5 h-5"
                                viewBox="0 0 512 512"
                                fill="currentColor"
                              >
                                <path d="M226 232c-63.963 0-116-52.037-116-116S162.037 0 226 0s116 52.037 116 116-52.037 116-116 116zM271 317c0-25.68 7.21-49.707 19.708-70.167C271.193 256.526 249.228 262 226 262c-30.128 0-58.152-9.174-81.429-24.874-28.782 11.157-55.186 28.291-77.669 50.774C24.404 330.397 1 386.899 1 446.999V497c0 8.284 6.716 15 15 15h420c8.284 0 15-6.716 15-15v-50.001c0-.901-.025-1.805-.036-2.708C436.892 449.277 421.759 452 406 452c-74.439 0-135-60.561-135-135z" />
                                <path d="M406 212c-57.897 0-105 47.103-105 105s47.103 105 105 105 105-47.103 105-105-47.103-105-105-105zm30 120h-15v15c0 8.284-6.716 15-15 15s-15-6.716-15-15v-15h-15c-8.284 0-15-6.716-15-15s6.716-15 15-15h15v-15c0-8.284 6.716-15 15-15s15 6.716 15 15v15h15c8.284 0 15 6.716 15 15s-6.716 15-15 15z" />
                              </svg>
                            </button>
                          )
                        ) : (
                          <button
                            onClick={handleAddContact}
                            disabled={isPending}
                            className={`p-2 ${
                              isPending
                                ? "bg-green-400 opacity-75 cursor-not-allowed"
                                : "bg-green-500 hover:bg-green-600"
                            } text-white rounded-lg transition-colors`}
                            title={
                              isPending
                                ? "Oczekuje na akceptację"
                                : "Dodaj do kontaktów"
                            }
                          >
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 512 512"
                              fill="currentColor"
                            >
                              <path d="M226 232c-63.963 0-116-52.037-116-116S162.037 0 226 0s116 52.037 116 116-52.037 116-116 116zM271 317c0-25.68 7.21-49.707 19.708-70.167C271.193 256.526 249.228 262 226 262c-30.128 0-58.152-9.174-81.429-24.874-28.782 11.157-55.186 28.291-77.669 50.774C24.404 330.397 1 386.899 1 446.999V497c0 8.284 6.716 15 15 15h420c8.284 0 15-6.716 15-15v-50.001c0-.901-.025-1.805-.036-2.708C436.892 449.277 421.759 452 406 452c-74.439 0-135-60.561-135-135z" />
                              <path d="M406 212c-57.897 0-105 47.103-105 105s47.103 105 105 105 105-47.103 105-105-47.103-105-105-105zm30 120h-15v15c0 8.284-6.716 15-15 15s-15-6.716-15-15v-15h-15c-8.284 0-15-6.716-15-15s6.716-15 15-15h15v-15c0-8.284 6.716-15 15-15s15 6.716 15 15v15h15c8.284 0 15 6.716 15 15s-6.716 15-15 15z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bio Section */}
                  {user.bio && (
                    <div className="relative mt-4 w-full">
                      <div className="bg-[var(--background)] rounded-xl p-4 shadow-sm border border-[var(--gray-200)]">
                        <h3 className="text-sm font-medium text-[var(--gray-700)] mb-2">
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

            {/* Statistics Card */}
            <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden mt-8 transition-all duration-200">
              <div className="bg-gradient-to-r bg-[var(--primaryColor)] p-4 text-white">
                <h2 className="text-xl font-bold">Statystyki</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Książek",
                      value: user.booksCount,
                    },
                    {
                      label: "Opinii",
                      value: user.reviewsCount,
                    },
                    {
                      label: "Średnia ocen",
                      value: user.averageRating.toFixed(1),
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex flex-col items-center justify-center text-center p-4 bg-[var(--secondaryColorLight)] rounded-xl transition-all duration-200"
                    >
                      <p className="text-2xl font-bold text-[var(--primaryColor)] transition-colors duration-200">
                        {stat.value}
                      </p>
                      <p className="text-sm font-semibold text-[var(--gray-800)] transition-colors duration-200">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 min-w-[300px]">
            {/* Favorite Books Card */}
            <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden mb-8 transition-all duration-200">
              <div className="bg-gradient-to-r bg-[var(--primaryColor)] p-4 text-white">
                <h2 className="text-xl font-bold">Ulubione książki</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {user.favoriteBooks?.length > 0 ? (
                    <>
                      {displayedFavoriteBooks.slice(0, 5).map((book) => (
                        <div
                          key={book.id}
                          className="bg-[var(--background)] p-4 rounded-xl border border-[var(--gray-200)] transition-all duration-200 shadow"
                        >
                          <div className="flex flex-col space-y-2">
                            <Link
                              href={`/books/${book.id}`}
                              className="text-[var(--primaryColor)] hover:text-[var(--primaryColorLight)] font-medium transition-colors"
                            >
                              {book.title}
                            </Link>
                            <p className="text-sm text-[var(--gray-500)]">
                              {book.author}
                            </p>
                            <p className="text-xs text-[var(--gray-500)] mt-2">
                              {format(book.addedAt, "d MMMM yyyy", {
                                locale: pl,
                              })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {totalFavoriteBooks > 5 && (
                        <Link
                          href={`/users/${user.id}/favorites`}
                          className="w-full py-3 px-4 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] 
                        text-white rounded-xl transition-colors duration-200 font-medium shadow-sm
                        text-center block"
                        >
                          Pokaż wszystkie ({totalFavoriteBooks})
                        </Link>
                      )}
                    </>
                  ) : (
                    <p className="text-center text-[var(--gray-500)]">
                      Brak ulubionych książek
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Reviews Card */}
            <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200">
              <div className="bg-gradient-to-r bg-[var(--primaryColor)] p-4 text-white">
                <h2 className="text-xl font-bold">Opinie użytkownika</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {displayedReviews.length > 0 ? (
                    <>
                      {displayedReviews.slice(0, 5).map((review) => (
                        <div
                          key={review.id}
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
                            <div className="flex items-center gap-2">
                              {[...Array(10)].map((_, index) => (
                                <svg
                                  key={index}
                                  className={`w-4 h-4 ${
                                    index + 1 <= review.rating
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                              <span className="text-[var(--gray-700)] ml-2">
                                {review.rating}/10
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-[var(--gray-800)] mt-2">
                                {review.comment}
                              </p>
                            )}
                            <p className="text-xs text-[var(--gray-500)] mt-2">
                              {review.createdAt &&
                                format(
                                  review.createdAt.toDate(),
                                  "d MMMM yyyy",
                                  {
                                    locale: pl,
                                  }
                                )}
                            </p>
                          </div>
                        </div>
                      ))}

                      {user?.reviewsCount > 5 && (
                        <Link
                          href={`/users/${user.id}/reviews`}
                          className="w-full py-3 px-4 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] 
                        text-white rounded-xl transition-colors duration-200 font-medium shadow-sm
                        text-center block"
                        >
                          Pokaż wszystkie ({user.reviewsCount})
                        </Link>
                      )}
                    </>
                  ) : (
                    <p className="text-center text-[var(--gray-500)]">
                      Brak opinii do wyświetlenia
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
