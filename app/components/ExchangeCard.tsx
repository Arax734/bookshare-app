import Link from "next/link";
import Image from "next/image";
import BookCover from "./BookCover";
import { type Exchange } from "../hooks/useExchanges";

interface ExchangeCardProps {
  exchange: Exchange;
  type:
    | "incoming"
    | "outgoing"
    | "history"
    | "history-incoming"
    | "history-outgoing";
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}

export default function ExchangeCard({
  exchange,
  type,
  onAccept,
  onDecline,
  onCancel,
}: ExchangeCardProps) {
  const formatDate = (date: Date | undefined) => {
    if (!date) return "Data niedostępna";
    return new Intl.DateTimeFormat("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Determine if this is a history card
  const isHistory =
    type === "history" ||
    type === "history-incoming" ||
    type === "history-outgoing";

  return (
    <div className="bg-[var(--card-background)] shadow rounded-xl p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between mb-4">
        <div className="flex items-center mb-4 sm:mb-0">
          {/* Show avatar based on exchange type */}
          {(type === "incoming" || type === "history-incoming") &&
            exchange.userPhotoURL && (
              <Link
                href={`/users/${exchange.userId}`}
                className="mr-3 relative w-10 h-10 rounded-full overflow-hidden"
              >
                <Image
                  src={exchange.userPhotoURL}
                  alt="User avatar"
                  fill
                  className="object-cover"
                />
              </Link>
            )}
          {(type === "outgoing" || type === "history-outgoing") &&
            exchange.contactPhotoURL && (
              <Link
                href={`/users/${exchange.contactId}`}
                className="mr-3 relative w-10 h-10 rounded-full overflow-hidden"
              >
                <Image
                  src={exchange.contactPhotoURL}
                  alt="Recipient avatar"
                  fill
                  className="object-cover"
                />
              </Link>
            )}
          <div>
            <h3 className="font-medium">
              {type === "incoming" &&
                `Propozycja od ${exchange.userName || "użytkownika"}`}
              {type === "outgoing" &&
                `Propozycja do ${exchange.contactName || "użytkownika"}`}
              {type === "history-incoming" && (
                <>
                  {exchange.status === "completed"
                    ? "Wymiana zaakceptowana"
                    : "Wymiana odrzucona"}
                  {" - "}
                  <span className="text-[var(--gray-600)]">
                    z użytkownikiem {exchange.userName || "nieznany"}
                  </span>
                </>
              )}
              {type === "history-outgoing" && (
                <>
                  {exchange.status === "completed"
                    ? "Wymiana zaakceptowana"
                    : "Wymiana odrzucona"}
                  {" - "}
                  <span className="text-[var(--gray-600)]">
                    z użytkownikiem {exchange.contactName || "nieznany"}
                  </span>
                </>
              )}
              {type === "history" && (
                <>
                  {exchange.status === "completed"
                    ? "Wymiana zakończona"
                    : "Wymiana odrzucona"}
                </>
              )}
            </h3>
            <div className="text-sm text-[var(--gray-500)] flex flex-col">
              <span>
                {isHistory
                  ? `Data zakończenia: ${formatDate(
                      exchange.statusDate || exchange.createdAt
                    )}`
                  : `Utworzono: ${formatDate(exchange.createdAt)}`}
              </span>
            </div>
          </div>
        </div>

        {type === "incoming" && (
          <div className="flex space-x-2">
            <button
              onClick={onAccept}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Akceptuj
            </button>
            <button
              onClick={onDecline}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Odrzuć
            </button>
          </div>
        )}

        {type === "outgoing" && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Anuluj
          </button>
        )}

        {isHistory && (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              exchange.status === "completed"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {exchange.status === "completed" ? "Zaakceptowano" : "Odrzucono"}
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <p className="font-medium mb-3 text-sm text-[var(--gray-600)]">
            {type === "incoming" || type === "history-incoming"
              ? "Oferowane książki:"
              : "Twoje książki:"}
          </p>
          <div className="grid gap-3 grid-cols-1">
            {exchange.userBooksDetails &&
            exchange.userBooksDetails.length > 0 ? (
              exchange.userBooksDetails.map((book) => (
                <div
                  key={book.id}
                  className="relative flex items-start bg-[var(--background)] p-3 rounded border border-[var(--gray-200)] w-full group"
                >
                  <div className="w-12 h-16 mr-3 flex-shrink-0">
                    <BookCover isbn={book.isbn} title={book.title} size="M" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {book.title}
                    </p>
                    <p className="text-xs text-[var(--gray-500)] mb-1">
                      {book.author}
                    </p>
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/books/${
                          book.bookId || book.id.split("_").pop()
                        }`}
                        className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <svg
                          className="w-3 h-3 mr-0.5"
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
                        Szczegóły
                      </Link>
                      {book.isbn && (
                        <span className="text-[10px] text-[var(--gray-400)]">
                          ISBN: {book.isbn.substring(0, 10)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--gray-500)]">Brak książek</p>
            )}
          </div>
        </div>

        <div className="hidden md:flex md:items-center md:self-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-[var(--gray-400)]"
          >
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </div>

        <div className="flex-1">
          <p className="font-medium mb-3 text-sm text-[var(--gray-600)]">
            {type === "incoming" || type === "history-incoming"
              ? "Książki, które chce od ciebie:"
              : "Książki, które chcesz:"}
          </p>
          <div className="grid gap-3 grid-cols-1">
            {exchange.contactBooksDetails &&
            exchange.contactBooksDetails.length > 0 ? (
              exchange.contactBooksDetails.map((book) => (
                <div
                  key={book.id}
                  className="relative flex items-start bg-[var(--background)] p-3 rounded border border-[var(--gray-200)] w-full group"
                >
                  <div className="w-12 h-16 mr-3 flex-shrink-0">
                    <BookCover isbn={book.isbn} title={book.title} size="M" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {book.title}
                    </p>
                    <p className="text-xs text-[var(--gray-500)] mb-1">
                      {book.author}
                    </p>
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/books/${
                          book.bookId || book.id.split("_").pop()
                        }`}
                        className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <svg
                          className="w-3 h-3 mr-0.5"
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
                        Szczegóły
                      </Link>
                      {book.isbn && (
                        <span className="text-[10px] text-[var(--gray-400)]">
                          ISBN: {book.isbn.substring(0, 10)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--gray-500)]">Brak książek</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
