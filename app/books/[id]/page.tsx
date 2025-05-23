"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
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
import BookOwnershipButton from "@/app/components/BookOwnershipButton";
import BookFavoriteButton from "@/app/components/BookFavoriteButton";
import BookDesireButton from "@/app/components/BookDesireButton";
import BookCover from "@/app/components/BookCover";

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

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

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
    <div className="min-h-screen pb-8 bg-[var(--background)]">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--card-background)] rounded-xl shadow-sm overflow-hidden border border-[var(--gray-100)]">
          <div className="bg-[var(--primaryColor)] p-4">
            <div className="flex flex-col">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-white break-words">
                  {formatBookTitle(book.title)}
                </h1>
                <div className="flex justify-between items-center ml-5 shrink-0">
                  <BookOwnershipButton bookId={unwrappedParams.id} />
                  <BookDesireButton bookId={unwrappedParams.id} />
                  <BookFavoriteButton bookId={unwrappedParams.id} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            {" "}
            <div className="flex flex-col md:flex-row gap-6 mb-5">
              <div className="w-40 md:w-56 flex-shrink-0 self-center md:self-start">
                <div className="rounded-lg overflow-hidden shadow-md">
                  <BookCover
                    isbn={book.isbnIssn}
                    title={book.title}
                    size={"L"}
                  />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="bg-[var(--gray-50)] rounded-lg p-3">
                  <h3 className="text-[var(--gray-800)] font-semibold mb-2 flex items-center text-sm">
                    <UserIcon className="w-4 h-4 mr-2 text-[var(--primaryColor)]" />
                    Autorzy
                  </h3>
                  {book.author ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
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

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[var(--gray-50)] rounded-lg p-3">
                    <div className="flex items-center mb-1">
                      <CalendarIcon className="w-4 h-4 text-[var(--primaryColor)] mr-1" />
                      <h3 className="font-medium text-[var(--gray-800)]">
                        Rok
                      </h3>
                    </div>
                    <p className="text-[var(--gray-700)]">
                      {book.publicationYear || "—"}
                    </p>
                  </div>

                  <div className="bg-[var(--gray-50)] rounded-lg p-3">
                    <div className="flex items-center mb-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="var(--primaryColor)"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <h3 className="font-medium text-[var(--gray-800)]">
                        Język
                      </h3>
                    </div>
                    <p className="text-[var(--gray-700)] capitalize">
                      {book.language || "—"}
                    </p>
                  </div>
                </div>

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

                {(book.genre || book.subject || book.domain) && (
                  <div className="flex flex-wrap gap-1">
                    {book.genre && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--genre-bg)] text-[var(--genre-text)]">
                        {book.genre}
                      </span>
                    )}
                    {book.subject && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--subject-bg)] text-[var(--subject-text)]">
                        {book.subject}
                      </span>
                    )}
                    {book.domain && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--domain-bg)] text-[var(--domain-text)]">
                        {book.domain}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
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
            {(book.kind ||
              book.formOfWork ||
              book.subjectPlace ||
              book.subjectTime) && (
              <div className="bg-[var(--gray-50)] rounded-lg p-3 mt-4">
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

          <div className="border-t border-[var(--gray-100)] p-4">
            <BookReview bookId={unwrappedParams.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
