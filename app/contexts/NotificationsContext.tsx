"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface NotificationsContextType {
  pendingInvites: number;
  setPendingInvites: (count: number) => void;
  refreshPendingInvites: () => void;
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

  const refreshPendingInvites = useCallback(() => {
    setPendingInvites((prev) => Math.max(0, prev - 1));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ pendingInvites, setPendingInvites, refreshPendingInvites }}
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
