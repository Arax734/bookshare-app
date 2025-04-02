"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { doc, setDoc, deleteDoc, getDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/app/hooks/useAuth";
import { FireIcon } from "./svg-icons/FireIcon";
import { useNotifications } from "@/app/contexts/NotificationsContext";

interface BookDesireButtonProps {
  bookId: string;
}

export default function BookDesireButton({ bookId }: BookDesireButtonProps) {
  const { user } = useAuth();
  const [isDesired, setIsDesired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDesired = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "bookDesire", `${user.uid}_${bookId}`);
        const docSnap = await getDoc(docRef);
        setIsDesired(docSnap.exists());
      } catch (error) {
        console.error("Error checking desire status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkDesired();
  }, [user, bookId]);

  const toggleDesire = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const docRef = doc(db, "bookDesire", `${user.uid}_${bookId}`);

      if (!isDesired) {
        await setDoc(docRef, {
          userId: user.uid,
          bookId: bookId,
          createdAt: Timestamp.now(),
        });
        setIsDesired(true);
      } else {
        await deleteDoc(docRef);
        setIsDesired(false);
      }
    } catch (error) {
      console.error("Error toggling desire:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <button
      onClick={toggleDesire}
      disabled={isLoading}
      title={isDesired ? "Usuń z chcę przeczytać" : "Dodaj do chcę przeczytać"}
      className={`ml-2 p-2 rounded-lg transition-colors ${
        isDesired
          ? "bg-purple-600 text-white hover:bg-purple-700"
          : "bg-purple-600 text-white hover:bg-purple-700"
      } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
    >
      {isLoading ? (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
        </div>
      ) : (
        <FireIcon className="w-6 h-6" filled={isDesired} />
      )}
    </button>
  );
}
