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
  const REVIEWS_PER_PAGE = 5;

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

        // In the fetchUserProfile function, update the setUser call:
        setUser({
          id: unwrappedParams.id,
          email: userData.email,
          displayName: userData.displayName || "Użytkownik anonimowy",
          photoURL: userData.photoURL,
          reviewsCount: userData.reviewsCount || 0,
          averageRating: userData.averageRating || 0.0,
          phoneNumber: userData.phoneNumber,
          creationTime: userData.createdAt?.toDate()?.toISOString(),
          bio: userData.bio,
        });

        setReviews(reviewsData); // Store all fetched reviews
        setDisplayedReviews(reviewsWithBooks); // Show only loaded reviews
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setError("Nie udało się załadować profilu użytkownika");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [params]);

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

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!user) return <div>Nie znaleziono użytkownika</div>;

  return (
    <main className="mx-auto px-4 py-8 bg-[var(--background)] w-full h-full transition-all duration-200">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200">
          <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4 text-white">
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
          <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4 text-white">
            <h2 className="text-xl font-bold">Statystyki</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
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

        {/* Reviews Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden mt-8 transition-all duration-200">
          <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4 text-white">
            <h2 className="text-xl font-bold">Opinie użytkownika</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {displayedReviews.map((review) => (
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
                        format(review.createdAt.toDate(), "d MMMM yyyy", {
                          locale: pl,
                        })}
                    </p>
                  </div>
                </div>
              ))}
              {user?.reviewsCount &&
                displayedReviews.length < user.reviewsCount && (
                  <button
                    onClick={loadMoreReviews}
                    disabled={isLoadingMore}
                    className="w-full py-3 px-4 bg-[var(--primaryColorLight)] hover:bg-[var(--primaryColor)] 
    text-white rounded-xl transition-colors duration-200 font-medium shadow-sm
    disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span>Ładowanie...</span>
                      </>
                    ) : (
                      `Załaduj więcej opinii (${displayedReviews.length} z ${user.reviewsCount})`
                    )}
                  </button>
                )}
              {displayedReviews.length === 0 && (
                <p className="text-center text-[var(--gray-500)]">
                  Brak opinii do wyświetlenia
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
