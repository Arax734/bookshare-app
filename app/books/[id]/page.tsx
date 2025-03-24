"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoadingSpinner from "../../components/LoadingSpinner";
import { CalendarIcon } from "../../components/svg-icons/CalendarIcon";
import { MapPinIcon } from "../../components/svg-icons/MapPinIcon";
import { BookOpenIcon } from "../../components/svg-icons/BookOpenIcon";
import { TagIcon } from "../../components/svg-icons/TagIcon";
import { LanguageIcon } from "../../components/svg-icons/LanguageIcon";
import BookReview from "@/app/components/BookReview";
import { UserIcon } from "@/app/components/svg-icons/UserIcon";
import { splitAuthors } from "@/app/utils/stringUtils";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

interface BookDetails {
  id: number;
  title: string;
  author: string;
  publicationYear: string;
  publisher: string;
  placeOfPublication: string;
  language: string;
  subject: string;
  genre: string;
  domain: string;
  isbnIssn?: string;
  nationalBibliographyNumber?: string;
  marc: {
    leader: string;
    fields: Array<any>;
  };
  averageRating?: number;
  totalReviews?: number;
  kind: string;
  formOfWork: string;
  subjectPlace: string;
  subjectTime: string;
  languageOfOriginal: string;
  zone: string;
  createdDate: string;
  updatedDate: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BookDetails({ params }: PageProps) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [book, setBook] = useState<BookDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState<number>(0);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Pad the ID with zeros to 14 digits
        const paddedId = unwrappedParams.id.padStart(14, "0");
        const response = await fetch(`/api/books/${paddedId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch book details");
        }

        if (!data) {
          throw new Error("Book not found");
        }

        setBook(data);
      } catch (err) {
        setError("Nie udało się pobrać szczegółów książki");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookDetails();
  }, [unwrappedParams.id]);

  useEffect(() => {
    const fetchReviewsStats = async () => {
      if (!unwrappedParams.id) return;

      try {
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("bookId", "==", unwrappedParams.id)
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviews = reviewsSnapshot.docs.map((doc) => doc.data());

        if (reviews.length > 0) {
          const totalRating = reviews.reduce(
            (sum, review) => sum + (review.rating || 0),
            0
          );
          const average = totalRating / reviews.length;
          setAverageRating(Number(average.toFixed(1)));
        }

        setTotalReviews(reviews.length);
      } catch (error) {
        console.error("Error fetching reviews stats:", error);
      }
    };

    fetchReviewsStats();
  }, [unwrappedParams.id]);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-[var(--primaryColor)] text-white rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors"
            >
              Wróć do listy książek
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6">
            <p className="text-[var(--gray-700)] mb-4">
              Nie znaleziono książki
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-[var(--primaryColor)] text-white rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors"
            >
              Wróć do listy książek
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--card-background)] rounded-xl shadow-sm overflow-hidden border border-[var(--gray-100)]">
          {/* Header with title and rating */}
          <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4">
            <div className="flex justify-between items-start">
              <h1 className="text-xl font-bold text-white">{book.title}</h1>
            </div>
          </div>

          {/* Main content */}
          <div className="p-4 space-y-4">
            {/* Authors section */}
            <div className="bg-[var(--gray-50)] rounded-lg p-3">
              <h3 className="text-[var(--gray-800)] font-semibold mb-2 flex items-center text-sm">
                <UserIcon className="w-4 h-4 mr-2 text-[var(--primaryColor)]" />
                Autorzy
              </h3>
              {book.author ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {splitAuthors(book.author).map((author, index) => (
                    <div
                      key={index}
                      className="flex items-center text-sm text-[var(--gray-700)] truncate"
                      title={author}
                    >
                      <span className="w-1.5 h-1.5 bg-[var(--primaryColor)] rounded-full mr-2 flex-shrink-0"></span>
                      <span className="truncate">{author}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--gray-500)] italic">
                  Nieznany autor
                </p>
              )}
            </div>

            {/* Publication details in compact grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[var(--gray-50)] rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <CalendarIcon className="w-4 h-4 text-[var(--primaryColor)] mr-1" />
                  <h3 className="font-medium text-[var(--gray-800)]">Rok</h3>
                </div>
                <p className="text-[var(--gray-700)]">
                  {book.publicationYear || "—"}
                </p>
              </div>

              <div className="bg-[var(--gray-50)] rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <LanguageIcon className="w-4 h-4 text-[var(--primaryColor)] mr-1" />
                  <h3 className="font-medium text-[var(--gray-800)]">Język</h3>
                </div>
                <p className="text-[var(--gray-700)] capitalize">
                  {book.language || "—"}
                </p>
              </div>
            </div>

            {/* Publisher and Location section */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[var(--gray-50)] rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <BookOpenIcon className="w-4 h-4 text-[var(--primaryColor)] mr-1" />
                  <h3 className="font-medium text-[var(--gray-800)]">
                    Wydawca
                  </h3>
                </div>
                <p className="text-[var(--gray-700)]">
                  {book.publisher || "—"}
                </p>
              </div>

              <div className="bg-[var(--gray-50)] rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <MapPinIcon className="w-4 h-4 text-[var(--primaryColor)] mr-1" />
                  <h3 className="font-medium text-[var(--gray-800)]">
                    Miejsce wydania
                  </h3>
                </div>
                <p className="text-[var(--gray-700)]">
                  {book.placeOfPublication?.split(":")[0].trim() || "—"}
                </p>
              </div>
            </div>

            {/* Categories as compact tags */}
            {(book.genre || book.subject || book.domain) && (
              <div className="flex flex-wrap gap-1">
                {book.genre && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                    {book.genre}
                  </span>
                )}
                {book.subject && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">
                    {book.subject}
                  </span>
                )}
                {book.domain && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                    {book.domain}
                  </span>
                )}
              </div>
            )}

            {/* Additional Details */}
            {(book.isbnIssn || book.nationalBibliographyNumber) && (
              <div className="border-t border-[var(--gray-100)] pt-4 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {book.isbnIssn && (
                    <div className="bg-[var(--gray-50)] rounded-lg p-3">
                      <h3 className="font-medium text-[var(--gray-700)] mb-1">
                        ISBN/ISSN
                      </h3>
                      <p className="text-[var(--gray-800)]">{book.isbnIssn}</p>
                    </div>
                  )}
                  {book.nationalBibliographyNumber && (
                    <div className="bg-[var(--gray-50)] rounded-lg p-3">
                      <h3 className="font-medium text-[var(--gray-700)] mb-1">
                        Nr bibl. narodowej
                      </h3>
                      <p className="text-[var(--gray-800)]">
                        {book.nationalBibliographyNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Metadata */}
            {(book.kind ||
              book.formOfWork ||
              book.subjectPlace ||
              book.subjectTime) && (
              <div className="bg-[var(--gray-50)] rounded-lg p-3">
                <h3 className="text-[var(--gray-800)] font-semibold mb-2 flex items-center text-sm">
                  <TagIcon className="w-4 h-4 mr-2 text-[var(--primaryColor)]" />
                  Dodatkowe informacje
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {book.kind && (
                    <div className="text-sm text-[var(--gray-700)]">
                      <span className="font-medium">Rodzaj: </span>
                      {book.kind}
                    </div>
                  )}
                  {book.formOfWork && (
                    <div className="text-sm text-[var(--gray-700)]">
                      <span className="font-medium">Forma: </span>
                      {book.formOfWork
                        .toLowerCase()
                        .split(" ")
                        .filter((word) => word !== "i")
                        .join(", ")
                        .replace(/,$/, "")}
                    </div>
                  )}
                  {book.subjectPlace && (
                    <div className="text-sm text-[var(--gray-700)]">
                      <span className="font-medium">Zakres terytorialny: </span>
                      {book.subjectPlace}
                    </div>
                  )}
                  {book.subjectTime && (
                    <div className="text-sm text-[var(--gray-700)]">
                      <span className="font-medium">Zakres czasowy: </span>
                      {book.subjectTime}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="border-t border-[var(--gray-100)] p-4">
            <BookReview bookId={unwrappedParams.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
