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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { toast } from "react-hot-toast";
import { useNotifications } from "../contexts/NotificationsContext";

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
  const {
    refreshPendingExchanges,
    incrementHistoryCount,
    refreshHistoryExchangesCount,
  } = useNotifications();

  useEffect(() => {
    if (!user) return;

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
      const incomingQuery = query(
        collection(db, "bookExchanges"),
        where("contactId", "==", user.uid)
      );

      const outgoingQuery = query(
        collection(db, "bookExchanges"),
        where("userId", "==", user.uid)
      );

      const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
        getDocs(incomingQuery),
        getDocs(outgoingQuery),
      ]);

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

        const userDoc = await getDoc(doc(db, "users", exchangeData.userId));
        if (userDoc.exists()) {
          exchangeData.userName = userDoc.data().displayName;
          exchangeData.userPhotoURL = userDoc.data().photoURL;
        }

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

        const contactDoc = await getDoc(
          doc(db, "users", exchangeData.contactId)
        );
        if (contactDoc.exists()) {
          exchangeData.contactName = contactDoc.data().displayName;
          exchangeData.contactPhotoURL = contactDoc.data().photoURL;
        }

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

      let transferErrors = 0;

      if (exchange.userBooksDetails && exchange.userBooksDetails.length > 0) {
        for (const book of exchange.userBooksDetails) {
          try {
            const ownershipQuery = query(
              collection(db, "bookOwnership"),
              where("bookId", "==", book.bookId || book.id),
              where("userId", "==", exchange.userId)
            );

            const ownershipSnapshot = await getDocs(ownershipQuery);

            if (!ownershipSnapshot.empty) {
              await updateDoc(
                doc(db, "bookOwnership", ownershipSnapshot.docs[0].id),
                {
                  userId: user?.uid,
                  status: null,
                  exchangeId: exchange.id,
                }
              );
            } else {
              console.warn(`Book ownership record not found for ${book.title}`);
              transferErrors++;
            }
          } catch (err) {
            console.error(`Error transferring book ${book.title}:`, err);
            transferErrors++;
          }
        }
      }

      if (
        exchange.contactBooksDetails &&
        exchange.contactBooksDetails.length > 0
      ) {
        for (const book of exchange.contactBooksDetails) {
          try {
            const ownershipQuery = query(
              collection(db, "bookOwnership"),
              where("bookId", "==", book.bookId || book.id),
              where("userId", "==", user?.uid)
            );

            const ownershipSnapshot = await getDocs(ownershipQuery);

            if (!ownershipSnapshot.empty) {
              await updateDoc(
                doc(db, "bookOwnership", ownershipSnapshot.docs[0].id),
                {
                  userId: exchange.userId,
                  status: null,
                  exchangeId: exchange.id,
                }
              );
            } else {
              console.warn(`Book ownership record not found for ${book.title}`);
              transferErrors++;
            }
          } catch (err) {
            console.error(`Error transferring book ${book.title}:`, err);
            transferErrors++;
          }
        }
      }

      if (transferErrors > 0) {
        toast.success(
          "Wymiana zaakceptowana, ale wystąpiły problemy z transferem niektórych książek"
        );
      } else {
        toast.success("Wymiana zaakceptowana");
      }
      refreshPendingExchanges();
      incrementHistoryCount();
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
      refreshPendingExchanges();
      incrementHistoryCount();
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
        updatedAt: serverTimestamp(),
      });

      setExchanges((prev) => prev.filter((ex) => ex.id !== exchange.id));
      toast.success("Wymiana anulowana");
      incrementHistoryCount();
      refreshHistoryExchangesCount();
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
