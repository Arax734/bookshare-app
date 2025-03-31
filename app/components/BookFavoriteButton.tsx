import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";

interface BookFavoriteButtonProps {
  bookId: string;
}

export default function BookFavoriteButton({
  bookId,
}: BookFavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "bookFavorites", `${user.uid}_${bookId}`);
        const docSnap = await getDoc(docRef);
        setIsFavorite(docSnap.exists());
      } catch (error) {
        console.error("Error checking favorite status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFavorite();
  }, [user, bookId]);

  const toggleFavorite = async () => {
    if (!user) {
      return;
    }

    try {
      setIsLoading(true);
      const docRef = doc(db, "bookFavorites", `${user.uid}_${bookId}`);

      if (!isFavorite) {
        await setDoc(docRef, {
          userId: user.uid,
          bookId: bookId,
          createdAt: new Date(),
        });
        setIsFavorite(true);
      } else {
        await deleteDoc(docRef);
        setIsFavorite(false);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      title={isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
      className={`ml-2 p-2 rounded-lg transition-colors bg-amber-400 text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
    >
      {isLoading ? (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        </div>
      ) : (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          {isFavorite ? (
            // Filled star
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" />
          ) : (
            // Outlined star
            <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" />
          )}
        </svg>
      )}
    </button>
  );
}
