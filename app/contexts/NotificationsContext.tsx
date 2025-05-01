"use client";

import { createContext, useContext, useState, useCallback } from "react";

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
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingInvites, setPendingInvites] = useState(0);
  const [acceptedContactsCount, setAcceptedContactsCount] = useState(0);
  const [pendingExchanges, setPendingExchanges] = useState(0);

  const refreshPendingInvites = useCallback(() => {
    setPendingInvites((prev) => Math.max(0, prev - 1));
  }, []);

  const refreshAcceptedContactsCount = useCallback(() => {
    setAcceptedContactsCount((prev) => prev + 1);
  }, []);

  const refreshPendingExchanges = useCallback(() => {
    setPendingExchanges((prev) => Math.max(0, prev - 1));
  }, []);

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
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
}
