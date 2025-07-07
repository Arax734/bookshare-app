import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/firebase.config';
import { useUser } from '../context/UserContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
interface NotificationsContextType {
  pendingInvites: number;
  setPendingInvites: (count: number) => void;
  pendingExchanges: number;
  setPendingExchanges: (count: number) => void;
  outgoingExchangesCount: number;
  historyExchangesCount: number;
  refreshNotifications: () => void;
  refreshPendingExchanges: () => Promise<void>;
  refreshHistoryExchangesCount: () => Promise<void>;
  refreshOutgoingExchangesCount: () => Promise<void>;
  incrementHistoryCount: () => void;
  decrementOutgoingCount: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  pendingInvites: 0,
  setPendingInvites: () => {},
  pendingExchanges: 0,
  setPendingExchanges: () => {},
  outgoingExchangesCount: 0,
  historyExchangesCount: 0,
  refreshNotifications: () => {},
  refreshPendingExchanges: async () => {},
  refreshHistoryExchangesCount: async () => {},
  refreshOutgoingExchangesCount: async () => {},
  incrementHistoryCount: () => {},
  decrementOutgoingCount: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingInvites, setPendingInvites] = useState(0);
  const [pendingExchanges, setPendingExchanges] = useState(0);
  const [outgoingExchangesCount, setOutgoingExchangesCount] = useState(0);
  const [historyExchangesCount, setHistoryExchangesCount] = useState(0);
  const { currentUser: user } = useUser();

  const refreshPendingExchanges = async () => {
    if (!user) return;

    try {
      const exchangesQuery = query(
        collection(db, 'bookExchanges'),
        where('contactId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const exchangesSnapshot = await getDocs(exchangesQuery);
      setPendingExchanges(exchangesSnapshot.size);
    } catch (error) {
      console.error('Error fetching pending exchanges:', error);
    }
  };

  const refreshHistoryExchangesCount = async () => {
    if (!user) return;

    try {
      const historyQuery = query(
        collection(db, 'bookExchanges'),
        where('status', 'in', ['completed', 'declined']),
        where('contactId', '==', user.uid)
      );

      const historySnapshot = await getDocs(historyQuery);
      setHistoryExchangesCount(historySnapshot.size);
    } catch (error) {
      console.error('Error fetching history exchanges count:', error);
    }
  };

  const refreshOutgoingExchangesCount = async () => {
    if (!user) return;

    try {
      const outgoingQuery = query(
        collection(db, 'bookExchanges'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const outgoingSnapshot = await getDocs(outgoingQuery);
      setOutgoingExchangesCount(outgoingSnapshot.size);
    } catch (error) {
      console.error('Error fetching outgoing exchanges count:', error);
    }
  };

  const refreshNotifications = async () => {
    if (!user) {
      setPendingInvites(0);
      setPendingExchanges(0);
      setOutgoingExchangesCount(0);
      setHistoryExchangesCount(0);
      return;
    }

    try {
      const invitesQuery = query(
        collection(db, 'userContacts'),
        where('contactId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const invitesSnapshot = await getDocs(invitesQuery);
      setPendingInvites(invitesSnapshot.size);

      await Promise.all([
        refreshPendingExchanges(),
        refreshHistoryExchangesCount(),
        refreshOutgoingExchangesCount(),
      ]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const incrementHistoryCount = () => {
    setHistoryExchangesCount((prev) => prev + 1);
  };

  const decrementOutgoingCount = () => {
    setOutgoingExchangesCount((prev) => Math.max(0, prev - 1));
  };
  useEffect(() => {
    refreshNotifications();
  }, [user]);

  return (
    <NotificationsContext.Provider
      value={{
        pendingInvites,
        setPendingInvites,
        pendingExchanges,
        setPendingExchanges,
        outgoingExchangesCount,
        historyExchangesCount,
        refreshNotifications,
        refreshPendingExchanges,
        refreshHistoryExchangesCount,
        refreshOutgoingExchangesCount,
        incrementHistoryCount,
        decrementOutgoingCount,
      }}>
      {children}
    </NotificationsContext.Provider>
  );
};
