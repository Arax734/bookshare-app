"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { collection, query, where, getDocs } from "firebase/firestore"; // Assuming you are using Firestore
import { db } from "@/firebase/config";

interface NotificationsContextType {
  pendingInvites: number;
  setPendingInvites: (count: number) => void;
  refreshPendingInvites: () => void;
  acceptedContactsCount: number;
  setAcceptedContactsCount: (count: number) => void;
  refreshAcceptedContactsCount: () => void;
  pendingExchanges: number;
  setPendingExchanges: (count: number) => void;
  refreshPendingExchanges: () => void;
  historyExchangesCount: number;
  setHistoryExchangesCount: (count: number) => void;
  refreshHistoryExchangesCount: () => void;
  incrementHistoryCount: () => void;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

export const NotificationsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [pendingInvites, setPendingInvites] = useState(0);
  const [acceptedContactsCount, setAcceptedContactsCount] = useState(0);
  const [pendingExchanges, setPendingExchanges] = useState(0);
  const [historyExchangesCount, setHistoryExchangesCount] = useState(0);

  const { user } = useAuth();

  const refreshPendingInvites = useCallback(() => {
    setPendingInvites((prev) => Math.max(0, prev - 1));
  }, []);

  const refreshAcceptedContactsCount = useCallback(() => {
    setAcceptedContactsCount((prev) => prev + 1);
  }, []);

  const refreshPendingExchanges = useCallback(async () => {
    if (!user) return;

    try {
      const incomingQuery = query(
        collection(db, "bookExchanges"),
        where("contactId", "==", user.uid),
        where("status", "==", "pending")
      );

      const querySnapshot = await getDocs(incomingQuery);
      setPendingExchanges(querySnapshot.size);
    } catch (error) {
      console.error("Error refreshing pending exchanges:", error);
    }
  }, [user]);

  const refreshHistoryExchangesCount = useCallback(async () => {
    if (!user) return;

    try {
      const historyQuery1 = query(
        collection(db, "bookExchanges"),
        where("contactId", "==", user.uid),
        where("status", "in", ["completed", "declined"])
      );

      const historyQuery2 = query(
        collection(db, "bookExchanges"),
        where("userId", "==", user.uid),
        where("status", "in", ["completed", "declined"])
      );

      const [historySnapshot1, historySnapshot2] = await Promise.all([
        getDocs(historyQuery1),
        getDocs(historyQuery2),
      ]);

      setHistoryExchangesCount(historySnapshot1.size + historySnapshot2.size);
    } catch (error) {
      console.error("Error refreshing history exchanges count:", error);
    }
  }, [user]);

  const incrementHistoryCount = useCallback(() => {
    setHistoryExchangesCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (user) {
      refreshPendingInvites();
      refreshAcceptedContactsCount();
      refreshPendingExchanges();
      refreshHistoryExchangesCount();
    }
  }, [
    user,
    refreshPendingInvites,
    refreshAcceptedContactsCount,
    refreshPendingExchanges,
    refreshHistoryExchangesCount,
  ]);

  return (
    <NotificationsContext.Provider
      value={{
        pendingInvites,
        setPendingInvites,
        refreshPendingInvites,
        acceptedContactsCount,
        setAcceptedContactsCount,
        refreshAcceptedContactsCount,
        pendingExchanges,
        setPendingExchanges,
        refreshPendingExchanges,
        historyExchangesCount,
        setHistoryExchangesCount,
        refreshHistoryExchangesCount,
        incrementHistoryCount,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
}
