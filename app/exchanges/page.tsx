"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import Image from "next/image";
import { toast } from "react-hot-toast";

type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  ownerId?: string;
};

type Exchange = {
  id: string;
  userId: string;
  contactId: string;
  status: "pending" | "completed" | "declined";
  statusDate?: Date;
  userBooks: string[];
  contactBooks: string[];
  createdAt: Date;
  userName?: string;
  userPhotoURL?: string;
  userBooksDetails?: Book[];
  contactBooksDetails?: Book[];
};

// Custom tab components
function TabsList({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex space-x-1 rounded-lg bg-[var(--secondaryColorLight)] p-1 ${className}`}
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  className,
  onClick,
  isActive,
  children,
}: {
  value: string;
  className?: string;
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
        isActive
          ? "bg-white shadow text-foreground"
          : "text-foreground/60 hover:text-foreground/80"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  activeValue,
  children,
}: {
  value: string;
  activeValue: string;
  children: React.ReactNode;
}) {
  if (value !== activeValue) return null;
  return <div className="mt-2">{children}</div>;
}

// Custom spinner component
function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={`${sizeClasses[size]} text-[var(--primaryColor)] animate-spin`}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
}

export default function ExchangesPage() {
  const { user } = useAuth();
  const [incomingExchanges, setIncomingExchanges] = useState<Exchange[]>([]);
  const [outgoingExchanges, setOutgoingExchanges] = useState<Exchange[]>([]);
  const [completedExchanges, setCompletedExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("incoming");

  useEffect(() => {
    if (!user) return;

    // Add a small delay to ensure Firebase Auth is fully initialized
    const timer = setTimeout(() => {
      fetchExchanges();
    }, 500);

    return () => clearTimeout(timer);
  }, [user]);

  const fetchExchanges = async () => {
    setLoading(true);

    if (!user) {
      console.error("User is not authenticated");
      setLoading(false);
      return;
    }

    try {
      // Fetch incoming exchanges (where I'm the contactId)
      const incomingQuery = query(
        collection(db, "bookExchanges"),
        where("contactId", "==", user.uid)
      );

      // Fetch outgoing exchanges (where I'm the userId)
      const outgoingQuery = query(
        collection(db, "bookExchanges"),
        where("userId", "==", user.uid)
      );

      const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
        getDocs(incomingQuery),
        getDocs(outgoingQuery),
      ]);

      // Process incoming exchanges
      const incomingData: Exchange[] = [];
      for (const docSnap of incomingSnapshot.docs) {
        const data = docSnap.data();
        const exchangeData = {
          id: docSnap.id,
          userId: data.userId,
          contactId: data.contactId,
          status: data.status,
          statusDate: data.statusDate?.toDate(),
          userBooks: data.userBooks || [],
          contactBooks: data.contactBooks || [],
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Exchange;

        // Get user info
        const userDoc = await getDoc(doc(db, "users", exchangeData.userId));
        if (userDoc.exists()) {
          exchangeData.userName = userDoc.data().displayName;
          exchangeData.userPhotoURL = userDoc.data().photoURL;
        }

        // Get book details
        exchangeData.userBooksDetails = await fetchBooksDetails(
          exchangeData.userBooks
        );
        exchangeData.contactBooksDetails = await fetchBooksDetails(
          exchangeData.contactBooks
        );

        incomingData.push(exchangeData);
      }

      // Process outgoing exchanges
      const outgoingData: Exchange[] = [];
      for (const docSnap of outgoingSnapshot.docs) {
        const data = docSnap.data();
        const exchangeData = {
          id: docSnap.id,
          userId: data.userId,
          contactId: data.contactId,
          status: data.status,
          statusDate: data.statusDate?.toDate(),
          userBooks: data.userBooks || [],
          contactBooks: data.contactBooks || [],
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Exchange;

        // Get book details
        exchangeData.userBooksDetails = await fetchBooksDetails(
          exchangeData.userBooks
        );
        exchangeData.contactBooksDetails = await fetchBooksDetails(
          exchangeData.contactBooks
        );

        outgoingData.push(exchangeData);
      }

      // Split exchanges by status
      const incoming = incomingData.filter((ex) => ex.status === "pending");
      const outgoing = outgoingData.filter((ex) => ex.status === "pending");
      const completed = [...incomingData, ...outgoingData]
        .filter((ex) => ex.status === "completed" || ex.status === "declined")
        .sort((a, b) => {
          const dateA = a.statusDate || a.createdAt;
          const dateB = b.statusDate || b.createdAt;
          return dateB.getTime() - dateA.getTime();
        });

      setIncomingExchanges(incoming);
      setOutgoingExchanges(outgoing);
      setCompletedExchanges(completed);
    } catch (error) {
      console.error("Error fetching exchanges:", error);
      toast.error("Nie udało się pobrać wymian");
    } finally {
      setLoading(false);
    }
  };

  const fetchBooksDetails = async (bookIds: any): Promise<Book[]> => {
    if (!bookIds || bookIds.length === 0) return [];

    // Normalize book IDs - handling different data formats
    let normalizedBookIds: string[] = [];

    if (Array.isArray(bookIds)) {
      normalizedBookIds = bookIds
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            return item.id || item.bookId || "";
          }
          return "";
        })
        .filter(Boolean);
    } else if (typeof bookIds === "object" && bookIds !== null) {
      normalizedBookIds = Object.values(bookIds)
        .filter(
          (val) => val && (typeof val === "string" || typeof val === "object")
        )
        .map((val: any) =>
          typeof val === "string" ? val : val.id || val.bookId || ""
        )
        .filter(Boolean);
    }

    if (normalizedBookIds.length === 0) return [];

    const bookDetails: Book[] = [];
    const promises = normalizedBookIds.map(async (bookId) => {
      try {
        const bookDoc = await getDoc(doc(db, "books", bookId));
        if (bookDoc.exists()) {
          bookDetails.push({
            id: bookDoc.id,
            ...bookDoc.data(),
          } as Book);
        }
      } catch (error) {
        console.error(`Error fetching book ${bookId}:`, error);
      }
    });

    // Wait for all promises to resolve but don't fail if some fail
    await Promise.allSettled(promises);
    return bookDetails;
  };

  // Update the handleAcceptExchange function
  const handleAcceptExchange = async (exchange: Exchange) => {
    try {
      // First update the exchange status
      await updateDoc(doc(db, "bookExchanges", exchange.id), {
        status: "completed",
        statusDate: new Date(),
      });

      // Update local state first to provide immediate feedback
      setIncomingExchanges((prev) =>
        prev.filter((ex) => ex.id !== exchange.id)
      );
      setCompletedExchanges((prev) => [
        { ...exchange, status: "completed", statusDate: new Date() },
        ...prev,
      ]);

      toast.success("Wymiana zaakceptowana");

      // Then attempt to transfer book ownership
      try {
        // For each book in userBooks (sender's books), change the ownerId to contactId (current user)
        if (exchange.userBooksDetails) {
          for (const book of exchange.userBooksDetails) {
            await updateDoc(doc(db, "books", book.id), {
              ownerId: user?.uid, // Current user gets the sender's books
            });
          }
        }

        // For each book in contactBooks (current user's books), change the ownerId to userId (sender)
        if (exchange.contactBooksDetails) {
          for (const book of exchange.contactBooksDetails) {
            await updateDoc(doc(db, "books", book.id), {
              ownerId: exchange.userId, // Sender gets the current user's books
            });
          }
        }
      } catch (transferError) {
        console.error("Error transferring book ownership:", transferError);
        toast.error(
          "Wymiana została zaakceptowana, ale wystąpił problem z przeniesieniem własności książek"
        );
      }
    } catch (error) {
      console.error("Error accepting exchange:", error);
      toast.error("Nie udało się zaakceptować wymiany");
    }
  };

  const handleDeclineExchange = async (exchange: Exchange) => {
    try {
      // Update with statusDate field
      await updateDoc(doc(db, "bookExchanges", exchange.id), {
        status: "declined",
        statusDate: new Date(), // Add current timestamp
      });

      // Update local state
      setIncomingExchanges((prev) =>
        prev.filter((ex) => ex.id !== exchange.id)
      );
      setCompletedExchanges((prev) => [
        { ...exchange, status: "declined", statusDate: new Date() },
        ...prev,
      ]);

      toast.success("Wymiana odrzucona");
    } catch (error) {
      console.error("Error declining exchange:", error);
      toast.error("Nie udało się odrzucić wymiany");
    }
  };

  const handleCancelExchange = async (exchange: Exchange) => {
    try {
      await deleteDoc(doc(db, "bookExchanges", exchange.id));

      // Update local state
      setOutgoingExchanges((prev) =>
        prev.filter((ex) => ex.id !== exchange.id)
      );

      toast.success("Wymiana anulowana");
    } catch (error) {
      console.error("Error canceling exchange:", error);
      toast.error("Nie udało się anulować wymiany");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mt-16">
          <h1 className="text-2xl md:text-3xl font-semibold mb-4">
            Musisz być zalogowany, aby przeglądać wymiany
          </h1>
          <p className="text-[var(--gray-600)]">
            Zaloguj się, aby zobaczyć swoje wymiany książek
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 md:px-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">
        Wymiany książek
      </h1>

      <div className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger
            value="incoming"
            onClick={() => setActiveTab("incoming")}
            isActive={activeTab === "incoming"}
            className="relative"
          >
            Przychodzące
            {incomingExchanges.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {incomingExchanges.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="outgoing"
            onClick={() => setActiveTab("outgoing")}
            isActive={activeTab === "outgoing"}
          >
            Wychodzące
            {outgoingExchanges.length > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {outgoingExchanges.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            onClick={() => setActiveTab("history")}
            isActive={activeTab === "history"}
          >
            Historia
            {completedExchanges.length > 0 && (
              <span className="ml-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                {completedExchanges.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <TabsContent value="incoming" activeValue={activeTab}>
              {incomingExchanges.length === 0 ? (
                <div className="text-center py-12 text-[var(--gray-500)]">
                  <p>Nie masz żadnych propozycji wymiany</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {incomingExchanges.map((exchange) => (
                    <ExchangeCard
                      key={exchange.id}
                      exchange={exchange}
                      type="incoming"
                      onAccept={() => handleAcceptExchange(exchange)}
                      onDecline={() => handleDeclineExchange(exchange)}
                      onCancel={() => {}}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="outgoing" activeValue={activeTab}>
              {outgoingExchanges.length === 0 ? (
                <div className="text-center py-12 text-[var(--gray-500)]">
                  <p>Nie masz żadnych wysłanych propozycji wymiany</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {outgoingExchanges.map((exchange) => (
                    <ExchangeCard
                      key={exchange.id}
                      exchange={exchange}
                      type="outgoing"
                      onAccept={() => {}}
                      onDecline={() => {}}
                      onCancel={() => handleCancelExchange(exchange)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" activeValue={activeTab}>
              {completedExchanges.length === 0 ? (
                <div className="text-center py-12 text-[var(--gray-500)]">
                  <p>Historia wymian jest pusta</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {completedExchanges.map((exchange) => (
                    <ExchangeCard
                      key={exchange.id}
                      exchange={exchange}
                      type="history"
                      onAccept={() => {}}
                      onDecline={() => {}}
                      onCancel={() => {}}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </div>
    </div>
  );
}

function ExchangeCard({
  exchange,
  type,
  onAccept,
  onDecline,
  onCancel,
}: {
  exchange: Exchange;
  type: "incoming" | "outgoing" | "history";
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
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

  return (
    <div className="bg-[var(--card-background)] shadow rounded-xl p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between mb-4">
        <div className="flex items-center mb-4 sm:mb-0">
          {type === "incoming" && exchange.userPhotoURL && (
            <div className="mr-3 relative w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={exchange.userPhotoURL}
                alt="User avatar"
                fill
                className="object-cover"
              />
            </div>
          )}
          <div>
            <h3 className="font-medium">
              {type === "incoming" &&
                `Propozycja od ${exchange.userName || "użytkownika"}`}
              {type === "outgoing" && "Wysłana propozycja wymiany"}
              {type === "history" &&
                (exchange.status === "completed"
                  ? "Wymiana zakończona"
                  : "Wymiana odrzucona")}
            </h3>
            <div className="text-sm text-[var(--gray-500)] flex flex-col">
              <span>Utworzono: {formatDate(exchange.createdAt)}</span>
              {exchange.statusDate && type === "history" && (
                <span>
                  {exchange.status === "completed"
                    ? "Zaakceptowano: "
                    : "Odrzucono: "}
                  {formatDate(exchange.statusDate)}
                </span>
              )}
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

        {type === "history" && (
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
        <div className="flex-1">
          <p className="font-medium mb-2 text-sm text-[var(--gray-600)]">
            {type === "incoming" ? "Oferowane książki:" : "Twoje książki:"}
          </p>
          <div className="flex flex-wrap gap-3">
            {exchange.userBooksDetails &&
            exchange.userBooksDetails.length > 0 ? (
              exchange.userBooksDetails.map((book) => (
                <div
                  key={book.id}
                  className="relative w-16 h-24 md:w-20 md:h-28 group"
                >
                  <Image
                    src={book.coverUrl || "/book-placeholder.png"}
                    alt={book.title}
                    fill
                    className="object-cover rounded shadow"
                    sizes="80px"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <div className="text-white text-xs text-center p-1">
                      {book.title}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--gray-500)]">Brak książek</p>
            )}
          </div>
        </div>

        <div className="hidden md:block">
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
          <p className="font-medium mb-2 text-sm text-[var(--gray-600)]">
            {type === "incoming"
              ? "Książki, które chce od ciebie:"
              : "Książki, które chcesz:"}
          </p>
          <div className="flex flex-wrap gap-3">
            {exchange.contactBooksDetails &&
            exchange.contactBooksDetails.length > 0 ? (
              exchange.contactBooksDetails.map((book) => (
                <div
                  key={book.id}
                  className="relative w-16 h-24 md:w-20 md:h-28 group"
                >
                  <Image
                    src={book.coverUrl || "/book-placeholder.png"}
                    alt={book.title}
                    fill
                    className="object-cover rounded shadow"
                    sizes="80px"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <div className="text-white text-xs text-center p-1">
                      {book.title}
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
