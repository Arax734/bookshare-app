"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { toast } from "react-hot-toast";

export type Book = {
  bookId: string | undefined;
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  ownerId?: string;
  isbn?: string;
};

export type Exchange = {
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
  contactName?: string;
  contactPhotoURL?: string;
  userBooksDetails?: Book[];
  contactBooksDetails?: Book[];
};

export const useExchanges = (type: "incoming" | "outgoing" | "history") => {
  const { user } = useAuth();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Direct assignment of book details if they exist
        if (Array.isArray(data.userBooks) && data.userBooks.length > 0) {
          if (
            typeof data.userBooks[0] === "object" &&
            data.userBooks[0].title
          ) {
            exchangeData.userBooksDetails = data.userBooks;
          } else {
            exchangeData.userBooksDetails = await fetchBooksDetails(
              data.userBooks
            );
          }
        }

        if (Array.isArray(data.contactBooks) && data.contactBooks.length > 0) {
          if (
            typeof data.contactBooks[0] === "object" &&
            data.contactBooks[0].title
          ) {
            exchangeData.contactBooksDetails = data.contactBooks;
          } else {
            exchangeData.contactBooksDetails = await fetchBooksDetails(
              data.contactBooks
            );
          }
        }

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

        // Get contact user info (recipient)
        const contactDoc = await getDoc(
          doc(db, "users", exchangeData.contactId)
        );
        if (contactDoc.exists()) {
          exchangeData.contactName = contactDoc.data().displayName;
          exchangeData.contactPhotoURL = contactDoc.data().photoURL;
        }

        // Get book details
        if (Array.isArray(data.userBooks) && data.userBooks.length > 0) {
          if (
            typeof data.userBooks[0] === "object" &&
            data.userBooks[0].title
          ) {
            exchangeData.userBooksDetails = data.userBooks;
          } else {
            exchangeData.userBooksDetails = await fetchBooksDetails(
              data.userBooks
            );
          }
        }

        if (Array.isArray(data.contactBooks) && data.contactBooks.length > 0) {
          if (
            typeof data.contactBooks[0] === "object" &&
            data.contactBooks[0].title
          ) {
            exchangeData.contactBooksDetails = data.contactBooks;
          } else {
            exchangeData.contactBooksDetails = await fetchBooksDetails(
              data.contactBooks
            );
          }
        }

        outgoingData.push(exchangeData);
      }

      // Filter exchanges based on type
      if (type === "incoming") {
        setExchanges(incomingData.filter((ex) => ex.status === "pending"));
      } else if (type === "outgoing") {
        setExchanges(outgoingData.filter((ex) => ex.status === "pending"));
      } else if (type === "history") {
        const historyExchanges = [...incomingData, ...outgoingData]
          .filter((ex) => ex.status === "completed" || ex.status === "declined")
          .sort((a, b) => {
            const dateA = a.statusDate || a.createdAt;
            const dateB = b.statusDate || b.createdAt;
            return dateB.getTime() - dateA.getTime();
          });
        setExchanges(historyExchanges);
      }
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

    await Promise.allSettled(promises);
    return bookDetails;
  };

  const handleAcceptExchange = async (exchange: Exchange) => {
    try {
      const statusDate = new Date();
      await updateDoc(doc(db, "bookExchanges", exchange.id), {
        status: "completed",
        statusDate: statusDate,
      });

      setExchanges((prev) => prev.filter((ex) => ex.id !== exchange.id));
      toast.success("Wymiana zaakceptowana");

      // Transfer book ownership
      try {
        if (exchange.userBooksDetails) {
          for (const book of exchange.userBooksDetails) {
            await updateDoc(doc(db, "books", book.id), {
              ownerId: user?.uid,
            });
          }
        }

        if (exchange.contactBooksDetails) {
          for (const book of exchange.contactBooksDetails) {
            await updateDoc(doc(db, "books", book.id), {
              ownerId: exchange.userId,
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
      const statusDate = new Date();
      await updateDoc(doc(db, "bookExchanges", exchange.id), {
        status: "declined",
        statusDate: statusDate,
      });

      setExchanges((prev) => prev.filter((ex) => ex.id !== exchange.id));
      toast.success("Wymiana odrzucona");
    } catch (error) {
      console.error("Error declining exchange:", error);
      toast.error("Nie udało się odrzucić wymiany");
    }
  };

  const handleCancelExchange = async (exchange: Exchange) => {
    try {
      const statusDate = new Date();
      await updateDoc(doc(db, "bookExchanges", exchange.id), {
        status: "declined",
        statusDate: statusDate,
      });

      setExchanges((prev) => prev.filter((ex) => ex.id !== exchange.id));
      toast.success("Wymiana anulowana");
    } catch (error) {
      console.error("Error canceling exchange:", error);
      toast.error("Nie udało się anulować wymiany");
    }
  };

  return {
    exchanges,
    loading,
    handleAcceptExchange,
    handleDeclineExchange,
    handleCancelExchange,
  };
};
