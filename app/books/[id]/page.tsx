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
        {/* Book Header */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">{book.title}</h1>
            <p className="text-lg opacity-90">{book.author}</p>
          </div>

          {/* Book Details */}
          <div className="p-6 space-y-6">
            {/* Main Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem
                icon={<CalendarIcon className="h-5 w-5" />}
                label="Rok wydania"
                value={book.publicationYear}
              />
              <DetailItem
                icon={<MapPinIcon className="h-5 w-5" />}
                label="Wydawca"
                value={`${book.publisher}${
                  book.placeOfPublication ? `, ${book.placeOfPublication}` : ""
                }`}
              />
              <DetailItem
                icon={<LanguageIcon className="h-5 w-5" />}
                label="Język"
                value={book.language}
              />
              <DetailItem
                icon={<TagIcon className="h-5 w-5" />}
                label="Gatunek"
                value={book.genre}
              />
            </div>

            {/* Additional Details */}
            <div className="border-t border-[var(--gray-200)] pt-6">
              <h2 className="text-xl font-semibold mb-4 text-[var(--gray-800)]">
                Dodatkowe informacje
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {book.subject && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-[var(--gray-700)]">
                      Tematyka
                    </h3>
                    <p className="mt-1 text-[var(--gray-800)]">
                      {book.subject}
                    </p>
                  </div>
                )}
                {book.domain && (
                  <div>
                    <h3 className="text-sm font-medium text-[var(--gray-700)]">
                      Dziedzina
                    </h3>
                    <p className="mt-1 text-[var(--gray-800)]">{book.domain}</p>
                  </div>
                )}
                {book.isbnIssn && (
                  <div>
                    <h3 className="text-sm font-medium text-[var(--gray-700)]">
                      ISBN/ISSN
                    </h3>
                    <p className="mt-1 text-[var(--gray-800)]">
                      {book.isbnIssn}
                    </p>
                  </div>
                )}
                {book.nationalBibliographyNumber && (
                  <div>
                    <h3 className="text-sm font-medium text-[var(--gray-700)]">
                      Numer bibliografii narodowej
                    </h3>
                    <p className="mt-1 text-[var(--gray-800)]">
                      {book.nationalBibliographyNumber}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add Reviews Section */}
          <div className="p-6">
            <BookReview bookId={unwrappedParams.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="text-[var(--gray-500)]">{icon}</div>
      <div>
        <p className="text-sm font-medium text-[var(--gray-700)]">{label}</p>
        <p className="text-[var(--gray-800)]">{value || "Brak danych"}</p>
      </div>
    </div>
  );
}
