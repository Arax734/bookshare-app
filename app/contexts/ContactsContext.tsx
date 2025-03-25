"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ContactsContextType {
  refreshContacts: () => void;
  refreshTrigger: number;
}

const ContactsContext = createContext<ContactsContextType | undefined>(
  undefined
);

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshContacts = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <ContactsContext.Provider value={{ refreshContacts, refreshTrigger }}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error("useContacts must be used within a ContactsProvider");
  }
  return context;
}
