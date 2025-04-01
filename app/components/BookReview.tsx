"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/firebase/config";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  getDocs,
  limit,
  startAfter,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import defaultAvatar from "@/public/images/default-avatar.png";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { useRouter } from "next/navigation";

export interface Review {
  id: string;
  bookId: string;
  rating: number;
  comment: string;
  userId: string;
  userEmail: string;
  userName?: string;
  createdAt: Timestamp;
  userPhotoURL?: string;
  userDisplayName?: string;
}

interface BookReviewProps {
  bookId: string;
}

interface UserData {
  photoURL?: string;
  displayName?: string;
}

export default function BookReview({ bookId }: BookReviewProps) {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [usersData, setUsersData] = useState<{ [key: string]: UserData }>({});
  const [displayedReviews, setDisplayedReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(0);
  const REVIEWS_PER_PAGE = 5;

  const paddedBookId = bookId.padStart(14, "0");

  const calculateNewAverage = (
    currentTotal: number,
    currentCount: number,
    ratingChange: number,
    isAdding: boolean
  ): number => {
    if (isAdding) {
      return (currentTotal + ratingChange) / (currentCount + 1);
    } else {
      return currentCount > 1
        ? (currentTotal - ratingChange) / (currentCount - 1)
        : 0;
    }
  };

  useEffect(() => {
    if (!paddedBookId || !user) return;

    // Get total count first
    const countQuery = query(
      collection(db, "reviews"),
      where("bookId", "==", paddedBookId)
    );

    getDocs(countQuery).then((snapshot) => {
      setTotalReviews(snapshot.size);
    });

    // Get initial reviews with limit
    const q = query(
      collection(db, "reviews"),
      where("bookId", "==", paddedBookId),
      orderBy("createdAt", "desc"),
      limit(REVIEWS_PER_PAGE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];

      // Check if current user has already reviewed
      const existingUserReview = reviewsData.find(
        (review) => review.userId === user.uid
      );
      setUserReview(existingUserReview || null);

      // Sort to show user's review first
      const sortedReviews = reviewsData.sort((a, b) => {
        if (a.userId === user.uid) return -1;
        if (b.userId === user.uid) return 1;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });

      setReviews(sortedReviews);
      setDisplayedReviews(sortedReviews);
    });

    return () => unsubscribe();
  }, [paddedBookId, user]);

  useEffect(() => {
    const fetchUsersData = async () => {
      const userIds = [...new Set(reviews.map((review) => review.userId))];
      const userData: { [key: string]: UserData } = {};

      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            userData[userId] = userDoc.data() as UserData;
          }
        } catch (error) {
          console.error(`Error fetching user data for ${userId}:`, error);
        }
      }

      setUsersData(userData);
    };

    if (reviews.length > 0) {
      fetchUsersData();
    }
  }, [reviews]);

  useEffect(() => {
    if (!paddedBookId) return;

    const calculateStats = async () => {
      try {
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("bookId", "==", paddedBookId)
        );

        const snapshot = await getDocs(reviewsQuery);
        const reviews = snapshot.docs.map((doc) => doc.data());

        if (reviews.length > 0) {
          const totalRating = reviews.reduce(
            (sum, review) => sum + (review.rating || 0),
            0
          );
          const average = totalRating / reviews.length;
          setAverageRating(Number(average.toFixed(1)));
        } else {
          setAverageRating(0);
        }
      } catch (error) {
        console.error("Error calculating average rating:", error);
      }
    };

    calculateStats();
  }, [paddedBookId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rating) return;

    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      await runTransaction(db, async (transaction) => {
        const userData = userDoc.data();
        const currentReviewsCount = userData.reviewsCount || 0;
        const currentTotalRating =
          (userData.averageRating || 0) * currentReviewsCount;

        // Calculate new values
        const newReviewsCount = currentReviewsCount + 1;
        const newAverageRating =
          (currentTotalRating + rating) / newReviewsCount;

        // Update user document
        transaction.update(userRef, {
          reviewsCount: newReviewsCount,
          averageRating: Number(newAverageRating.toFixed(1)),
        });

        // Add new review
        const reviewRef = doc(collection(db, "reviews"));
        transaction.set(reviewRef, {
          bookId: paddedBookId,
          rating,
          comment,
          userId: user.uid,
          userEmail: user.email,
          userPhotoURL: user.photoURL,
          userDisplayName: user.displayName,
          createdAt: serverTimestamp(),
        });
      });

      // After successful transaction, recalculate average from all reviews
      const reviewsQuery = query(
        collection(db, "reviews"),
        where("bookId", "==", paddedBookId)
      );

      const snapshot = await getDocs(reviewsQuery);
      const allReviews = snapshot.docs.map((doc) => doc.data());
      const totalRating = allReviews.reduce(
        (sum, review) => sum + (review.rating || 0),
        0
      );
      const newAverage =
        allReviews.length > 0 ? totalRating / allReviews.length : 0;
      setAverageRating(Number(newAverage.toFixed(1)));
      setTotalReviews(allReviews.length);

      setRating(0);
      setComment("");
    } catch (error) {
      console.error("Error adding review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;

    try {
      const reviewToDelete = reviews.find((r) => r.id === reviewId);
      if (!reviewToDelete) return;

      const userRef = doc(db, "users", user.uid);
      const reviewRef = doc(db, "reviews", reviewId);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const reviewDoc = await transaction.get(reviewRef);

        if (!userDoc.exists() || !reviewDoc.exists()) {
          throw new Error("Document not found");
        }

        const userData = userDoc.data();
        const reviewData = reviewDoc.data();
        const currentReviewsCount = userData.reviewsCount || 0;
        const currentTotalRating =
          (userData.averageRating || 0) * currentReviewsCount;

        // Calculate new values
        const newReviewsCount = currentReviewsCount - 1;
        const newAverageRating =
          newReviewsCount > 0
            ? (currentTotalRating - reviewData.rating) / newReviewsCount
            : 0;

        // Update user document
        transaction.update(userRef, {
          reviewsCount: newReviewsCount,
          averageRating: Number(newAverageRating.toFixed(1)),
        });

        // Delete review
        transaction.delete(reviewRef);
      });

      // After successful transaction, recalculate average from all reviews
      const reviewsQuery = query(
        collection(db, "reviews"),
        where("bookId", "==", paddedBookId)
      );

      const snapshot = await getDocs(reviewsQuery);
      const allReviews = snapshot.docs.map((doc) => doc.data());
      const totalRating = allReviews.reduce(
        (sum, review) => sum + (review.rating || 0),
        0
      );
      const newAverage =
        allReviews.length > 0 ? totalRating / allReviews.length : 0;
      setAverageRating(Number(newAverage.toFixed(1)));
      setTotalReviews(allReviews.length);

      setUserReview(null);
    } catch (error) {
      console.error("Error deleting review:", error);
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  const loadMoreReviews = async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const lastReview = displayedReviews[displayedReviews.length - 1];
      const nextReviewsQuery = query(
        collection(db, "reviews"),
        where("bookId", "==", paddedBookId),
        orderBy("createdAt", "desc"),
        startAfter(lastReview.createdAt),
        limit(REVIEWS_PER_PAGE)
      );

      const snapshot = await getDocs(nextReviewsQuery);
      const newReviews = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];

      // Fetch user data for new reviews
      const newUserIds = newReviews.map((review) => review.userId);
      const newUsersData: { [key: string]: UserData } = { ...usersData };

      for (const userId of newUserIds) {
        if (!newUsersData[userId]) {
          // Only fetch if we don't have the data yet
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              newUsersData[userId] = userDoc.data() as UserData;
            }
          } catch (error) {
            console.error(`Error fetching user data for ${userId}:`, error);
          }
        }
      }

      setUsersData(newUsersData);
      setDisplayedReviews((prev) => [...prev, ...newReviews]);
    } catch (error) {
      console.error("Error loading more reviews:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="border-t border-[var(--gray-200)] pt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[var(--gray-800)]">
          Opinie czytelników
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xl font-bold text-[var(--gray-800)]">
              {averageRating || "0"}
            </span>
            <span className="text-sm text-[var(--gray-500)]">/10</span>
          </div>
          <div className="text-sm text-[var(--gray-500)]">
            ({totalReviews} {totalReviews === 1 ? "opinia" : "opinii"})
          </div>
        </div>
      </div>

      {user ? (
        !userReview ? (
          <form onSubmit={handleSubmitReview} className="mb-8">
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(10)].map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setRating(index + 1)}
                    onMouseEnter={() => setHoveredStar(index + 1)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="focus:outline-none"
                  >
                    <svg
                      className={`w-6 h-6 ${
                        index + 1 <= (hoveredStar || rating)
                          ? "text-yellow-400"
                          : "text-gray-300"
                      } transition-colors`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                <span className="ml-2 text-[var(--gray-700)]">
                  {rating ? `${rating}/10` : "Wybierz ocenę"}
                </span>
              </div>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Napisz swoją opinię..."
              className="w-full px-4 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200 min-h-[100px]"
            />

            <button
              type="submit"
              disabled={!rating || isSubmitting}
              className="mt-4 px-4 py-2 bg-[var(--primaryColor)] text-white rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Dodawanie..." : "Dodaj opinię"}
            </button>
          </form>
        ) : null
      ) : (
        <p className="text-[var(--gray-700)] mb-4">
          Zaloguj się, aby dodać opinię
        </p>
      )}

      <div className="space-y-4">
        {displayedReviews.map((review) => (
          <div
            key={review.id}
            className="bg-[var(--background)] shadow p-4 rounded-lg border border-[var(--gray-200)] relative"
          >
            {review.userId === user?.uid && (
              <button
                onClick={() => handleDeleteReview(review.id)}
                className="absolute bottom-2 right-2 p-2 text-red-500 hover:text-red-600 transition-colors rounded-full hover:bg-[var(--gray-200)]"
                title="Usuń opinię"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleUserClick(review.userId)}
                >
                  <Image
                    src={usersData[review.userId]?.photoURL || defaultAvatar}
                    alt="User avatar"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p
                    className="font-medium text-[var(--gray-800)] hover:text-[var(--primaryColor)] cursor-pointer transition-colors"
                    onClick={() => handleUserClick(review.userId)}
                  >
                    {review.userDisplayName || "Użytkownik anonimowy"}
                  </p>
                  <div className="flex items-center space-x-2 text-sm text-[var(--gray-500)]">
                    <p>{review.userEmail}</p>
                    <span>•</span>
                    <p>
                      {review.createdAt &&
                        formatDistanceToNow(review.createdAt.toDate(), {
                          addSuffix: true,
                          locale: pl,
                        })}
                    </p>
                  </div>
                </div>
              </div>
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
            </div>
            {review.comment && (
              <p className="text-[var(--gray-800)] mt-2">{review.comment}</p>
            )}
          </div>
        ))}

        {displayedReviews.length < totalReviews && (
          <button
            onClick={loadMoreReviews}
            disabled={isLoadingMore}
            className="w-full mt-6 py-3 px-4 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] 
            text-white rounded-xl transition-colors duration-200 font-medium shadow-sm
            disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoadingMore ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Ładowanie...</span>
              </>
            ) : (
              `Załaduj więcej opinii (${displayedReviews.length} z ${totalReviews})`
            )}
          </button>
        )}

        {reviews.length === 0 && (
          <p className="text-[var(--gray-500)] text-center">
            Brak opinii dla tej książki
          </p>
        )}
      </div>
    </div>
  );
}
