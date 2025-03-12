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

export default function BookReview({ bookId }: BookReviewProps) {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [userReview, setUserReview] = useState<Review | null>(null);

  const paddedBookId = bookId.padStart(14, "0");

  useEffect(() => {
    if (!paddedBookId || !user) return;
    const q = query(
      collection(db, "reviews"),
      where("bookId", "==", paddedBookId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
      setReviews(reviewsData);

      // Check if current user has already reviewed
      const existingUserReview = reviewsData.find(
        (review) => review.userId === user.uid
      );
      setUserReview(existingUserReview || null);
    });

    return () => unsubscribe();
  }, [paddedBookId, user]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rating) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        bookId: paddedBookId,
        rating,
        comment,
        userId: user.uid,
        userEmail: user.email,
        userPhotoURL: user.photoURL,
        userDisplayName: user.displayName,
        createdAt: serverTimestamp(),
      });

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
      await deleteDoc(doc(db, "reviews", reviewId));
      setUserReview(null);
    } catch (error) {
      console.error("Error deleting review:", error);
    }
  };

  // Add function to calculate average rating
  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  return (
    <div className="border-t border-[var(--gray-200)] pt-6">
      {/* Add average rating section */}
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
              {calculateAverageRating()}
            </span>
            <span className="text-sm text-[var(--gray-500)]">/10</span>
          </div>
          <div className="text-sm text-[var(--gray-500)]">
            ({reviews.length} {reviews.length === 1 ? "opinia" : "opinii"})
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
        {reviews
          .sort((a, b) => (a.userId === user?.uid ? -1 : 1))
          .map((review) => (
            <div
              key={review.id}
              className="bg-[var(--background)] shadow p-4 rounded-lg border border-[var(--gray-200)] relative"
            >
              {/* Add delete button in top-right corner for user's review */}
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
                      src={review.userPhotoURL || defaultAvatar}
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

        {reviews.length === 0 && (
          <p className="text-[var(--gray-500)] text-center">
            Brak opinii dla tej książki
          </p>
        )}
      </div>
    </div>
  );
}
