import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import {
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";

interface BookOwnershipButtonProps {
  bookId: string;
}

export default function BookOwnershipButton({
  bookId,
}: BookOwnershipButtonProps) {
  const { user: currentUser } = useAuth();
  const [isOwned, setIsOwned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!currentUser) return;

      try {
        const q = query(
          collection(db, "bookOwnership"),
          where("userId", "==", currentUser.uid),
          where("bookId", "==", bookId),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        setIsOwned(!querySnapshot.empty);
      } catch (error) {
        console.error("Error checking ownership:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOwnership();
  }, [currentUser, bookId]);

  const addToOwnership = async () => {
    if (!currentUser) {
      return;
    }

    try {
      await addDoc(collection(db, "bookOwnership"), {
        userId: currentUser.uid,
        bookId,
        createdAt: Timestamp.now(),
      });

      setIsOwned(true);
    } catch (error) {
      console.error("Error adding book to ownership:", error);
    }
  };

  const toggleOwnership = async () => {
    if (!currentUser) {
      return;
    }

    try {
      setIsLoading(true);
      const docRef = doc(db, "bookOwnership", `${currentUser.uid}_${bookId}`);

      if (!isOwned) {
        await setDoc(docRef, {
          userId: currentUser.uid,
          bookId: bookId,
          status: null,
          createdAt: Timestamp.now(),
        });
        setIsOwned(true);
      } else {
        await deleteDoc(docRef);
        setIsOwned(false);
      }
    } catch (error) {
      console.error("Error toggling ownership:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <button
      onClick={toggleOwnership}
      disabled={isLoading}
      title={isOwned ? "Usuń z kolekcji" : "Dodaj do kolekcji"}
      className={`p-2 rounded-lg transition-colors ${
        isOwned
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-blue-500 text-white hover:bg-blue-600"
      } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
    >
      {isLoading ? (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        </div>
      ) : (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          {isOwned ? (
            <path d="M17.5 13c-3.033 0-5.5 2.468-5.5 5.5s2.467 5.5 5.5 5.5 5.5-2.468 5.5-5.5-2.467-5.5-5.5-5.5zm0 10c-2.481 0-4.5-2.019-4.5-4.5s2.019-4.5 4.5-4.5 4.5 2.019 4.5 4.5-2.019 4.5-4.5 4.5zm-6.317-2H3.5c-.827 0-1.5-.673-1.5-1.5V4.487c.419.318.935.513 1.5.513H17v6.5a.5.5 0 0 0 1 0v-7c0-.018-.008-.032-.01-.049-.001-.01-.004-.019-.006-.029a.491.491 0 0 0-.086-.209c-.006-.009-.005-.021-.012-.03-.004-.005-.386-.505-.386-1.683 0-1.175.379-1.675.379-1.675A.498.498 0 0 0 17.5 0h-14A2.503 2.503 0 0 0 1 2.5v17C1 20.879 2.122 22 3.5 22h7.683a.5.5 0 0 0 0-1zM3.5 1h13.209c-.082.26-.139.611-.174 1.007C16.523 2.006 16.513 2 16.5 2h-13a.5.5 0 0 0 0 1h13c.013 0 .023-.006.035-.007.035.396.092.747.174 1.007H3.5C2.673 4 2 3.327 2 2.5S2.673 1 3.5 1zm16 17h-4a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z" />
          ) : (
            <path d="M17.5 13c-3.033 0-5.5 2.468-5.5 5.5s2.467 5.5 5.5 5.5 5.5-2.468 5.5-5.5-2.467-5.5-5.5-5.5zm0 10c-2.481 0-4.5-2.019-4.5-4.5s2.019-4.5 4.5-4.5 4.5 2.019 4.5 4.5-2.019 4.5-4.5 4.5zm2-5H18v-1.5a.5.5 0 0 0-1 0V18h-1.5a.5.5 0 0 0 0 1H17v1.5a.5.5 0 0 0 1 0V19h1.5a.5.5 0 0 0 0-1zm-8.317 3H3.5c-.827 0-1.5-.673-1.5-1.5V4.487c.419.318.935.513 1.5.513H17v6.5a.5.5 0 0 0 1 0v-7c0-.018-.008-.032-.01-.049-.001-.01-.004-.019-.006-.029a.491.491 0 0 0-.086-.209c-.006-.009-.005-.021-.012-.03-.004-.005-.386-.505-.386-1.683 0-1.175.379-1.675.379-1.675A.498.498 0 0 0 17.5 0h-14A2.503 2.503 0 0 0 1 2.5v17C1 20.879 2.122 22 3.5 22h7.683a.5.5 0 0 0 0-1zM3.5 1h13.209c-.082.26-.139.611-.174 1.007C16.523 2.006 16.513 2 16.5 2h-13a.5.5 0 0 0 0 1h13c.013 0 .023-.006.035-.007.035.396.092.747.174 1.007H3.5C2.673 4 2 3.327 2 2.5S2.673 1 3.5 1z" />
          )}
        </svg>
      )}
    </button>
  );
}
