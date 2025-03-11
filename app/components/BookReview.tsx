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
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import defaultAvatar from "@/public/images/default-avatar.png";

export interface Review {
  id: string; // Firestore document ID
  bookId: string; // ID of the book
  rating: number; // 1-10 rating
  comment: string; // Review text
  userId: string; // Firebase Auth user ID
  userEmail: string; // User's email
  userName?: string; // Optional display name
  createdAt: Timestamp; // Creation date
  userPhotoURL?: string;
  userDisplayName?: string;
}

interface BookReviewProps {
  bookId: string;
}

export default function BookReview({ bookId }: BookReviewProps) {
  const [user] = useAuthState(auth);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Pad the bookId with zeros
  const paddedBookId = bookId.padStart(14, "0");

  useEffect(() => {
    if (!paddedBookId) return;
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
    });

    return () => unsubscribe();
  }, [paddedBookId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rating) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        bookId: paddedBookId, // Use padded bookId when saving
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

  return (
    <div className="border-t border-[var(--gray-200)] pt-6">
      <h2 className="text-xl font-semibold mb-4 text-[var(--gray-800)]">
        Opinie czytelników
      </h2>

      {user ? (
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
      ) : (
        <p className="text-[var(--gray-700)] mb-4">
          Zaloguj się, aby dodać opinię
        </p>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-[var(--background)] p-4 rounded-lg border border-[var(--gray-200)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={review.userPhotoURL || defaultAvatar}
                    alt="User avatar"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-[var(--gray-800)]">
                    {review.userDisplayName || "Użytkownik anonimowy"}
                  </p>
                  <p className="text-sm text-[var(--gray-500)]">
                    {review.userEmail}
                  </p>
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
              <p className="text-[var(--gray-800)] ml-13">{review.comment}</p>
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
