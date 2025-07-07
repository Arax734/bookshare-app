'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';

interface ContactsContextType {
  refreshContacts: () => void;
  refreshTrigger: number;
  pendingInvitesCount: number;
  acceptedContactsCount: number;
  refreshPendingInvites: () => Promise<void>;
  refreshAcceptedContactsCount: () => Promise<void>;
}

const ContactsContext = createContext<ContactsContextType>({
  refreshContacts: () => {},
  refreshTrigger: 0,
  pendingInvitesCount: 0,
  acceptedContactsCount: 0,
  refreshPendingInvites: async () => {},
  refreshAcceptedContactsCount: async () => {},
});

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [acceptedContactsCount, setAcceptedContactsCount] = useState(0);
  const { user } = useAuth();

  const refreshContacts = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const refreshPendingInvites = useCallback(async () => {
    if (!user) return;

    try {
      const invitesQuery = query(
        collection(db, 'userContacts'),
        where('contactId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(invitesQuery);
      setPendingInvitesCount(querySnapshot.size);
    } catch (error) {
      console.error('Error refreshing pending invites:', error);
    }
  }, [user]);

  const refreshAcceptedContactsCount = useCallback(async () => {
    if (!user) return;

    try {
      const q1 = query(
        collection(db, 'userContacts'),
        where('userId', '==', user.uid),
        where('status', '==', 'accepted')
      );
      const q2 = query(
        collection(db, 'userContacts'),
        where('contactId', '==', user.uid),
        where('status', '==', 'accepted')
      );

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      setAcceptedContactsCount(snapshot1.size + snapshot2.size);
    } catch (error) {
      console.error('Error refreshing accepted contacts count:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshPendingInvites();
    refreshAcceptedContactsCount();
  }, [refreshPendingInvites, refreshAcceptedContactsCount, user]);

  useEffect(() => {
    refreshPendingInvites();
    refreshAcceptedContactsCount();
  }, [refreshTrigger, refreshPendingInvites, refreshAcceptedContactsCount]);

  return (
    <ContactsContext.Provider
      value={{
        refreshContacts,
        refreshTrigger,
        pendingInvitesCount,
        acceptedContactsCount,
        refreshPendingInvites,
        refreshAcceptedContactsCount,
      }}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
}
