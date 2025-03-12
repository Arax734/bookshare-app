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
} from "firebase/firestore";
import Image from "next/image";
import defaultAvatar from "@/public/images/default-avatar.png";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import { EnvelopeIcon } from "@/app/components/svg-icons/EnvelopeIcon";
import { PhoneIcon } from "@/app/components/svg-icons/PhoneIcon";

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
  reviews?: number;
  phoneNumber?: string;
  creationTime?: string;
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

export default function UserProfile({ params }: PageProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const unwrappedParams = await params;

        // First try to get user data from users collection
        const userDocRef = doc(db, "users", unwrappedParams.id);
        const userDoc = await getDoc(userDocRef);

        // Get reviews
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("userId", "==", unwrappedParams.id)
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Review[];

        const userInfo = reviewsData[0];

        if (!userDoc.exists() && !userInfo) {
          setError("Nie znaleziono użytkownika");
          return;
        }

        const userData = userDoc.data();

        // Fetch book details for each review
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

        setUser({
          id: unwrappedParams.id,
          email: userInfo?.userEmail || userData?.email,
          displayName:
            userInfo?.userDisplayName ||
            userData?.displayName ||
            "Użytkownik anonimowy",
          photoURL: userInfo?.userPhotoURL || userData?.photoURL,
          reviews: reviewsData.length,
          phoneNumber: userData?.phoneNumber,
          creationTime:
            userData?.createdAt?.toDate()?.toISOString() ||
            new Date().toISOString(),
        });

        setReviews(reviewsWithBooks);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setError("Nie udało się załadować profilu użytkownika");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [params]);

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
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              {/* Profile Image */}
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden">
                <Image
                  src={user.photoURL || defaultAvatar}
                  alt="Profile"
                  fill
                  className="object-cover shadow-lg transition-shadow duration-200"
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
                    <span>{user.phoneNumber || "Nie podano"}</span>
                  </div>
                </div>
              </div>
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
                  value: user.reviews || 0,
                },
                {
                  label: "Średnia ocen",
                  value:
                    reviews.length > 0
                      ? (
                          reviews.reduce(
                            (acc, review) => acc + review.rating,
                            0
                          ) / reviews.length
                        ).toFixed(1)
                      : "0.0",
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
              {reviews.map((review) => (
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
              {reviews.length === 0 && (
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
