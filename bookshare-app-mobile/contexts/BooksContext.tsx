import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';

interface Book {
  id: string;
  title: string;
  author: string;
  createdAt: Date;
}

interface BooksContextType {
  exchangeBooks: Book[];
  desiredBooks: Book[];
  favoriteBooks: Book[];
  totalExchangeBooks: number;
  totalDesiredBooks: number;
  totalFavoriteBooks: number;
  isLoading: boolean;
}

const BooksContext = createContext<BooksContextType | undefined>(undefined);

export const BooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [exchangeBooks, setExchangeBooks] = useState<Book[]>([]);
  const [desiredBooks, setDesiredBooks] = useState<Book[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<Book[]>([]);
  const [totalExchangeBooks, setTotalExchangeBooks] = useState(0);
  const [totalDesiredBooks, setTotalDesiredBooks] = useState(0);
  const [totalFavoriteBooks, setTotalFavoriteBooks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setExchangeBooks([]);
      setDesiredBooks([]);
      setFavoriteBooks([]);
      setTotalExchangeBooks(0);
      setTotalDesiredBooks(0);
      setTotalFavoriteBooks(0);
      setIsLoading(false);
      return;
    }

    const exchangeBooksQuery = query(
      collection(db, 'bookOwnership'),
      where('userId', '==', user.uid),
      where('status', '==', 'forExchange'),
      orderBy('createdAt', 'desc')
    );

    const desiredBooksQuery = query(
      collection(db, 'bookDesire'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const favoriteBooksQuery = query(
      collection(db, 'bookFavorites'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeExchange = onSnapshot(exchangeBooksQuery, (snapshot) => {
      const books = snapshot.docs.map((doc) => ({
        id: doc.data().bookId,
        title: doc.data().title || 'Książka niedostępna',
        author: doc.data().author || 'Autor nieznany',
        createdAt: doc.data().createdAt.toDate(),
      }));
      setExchangeBooks(books);
      setTotalExchangeBooks(snapshot.size);
    });

    const unsubscribeDesired = onSnapshot(desiredBooksQuery, (snapshot) => {
      const books = snapshot.docs.map((doc) => ({
        id: doc.data().bookId,
        title: doc.data().title || 'Książka niedostępna',
        author: doc.data().author || 'Autor nieznany',
        createdAt: doc.data().createdAt.toDate(),
      }));
      setDesiredBooks(books);
      setTotalDesiredBooks(snapshot.size);
    });

    const unsubscribeFavorite = onSnapshot(favoriteBooksQuery, (snapshot) => {
      const books = snapshot.docs.map((doc) => ({
        id: doc.data().bookId,
        title: doc.data().title || 'Książka niedostępna',
        author: doc.data().author || 'Autor nieznany',
        createdAt: doc.data().createdAt.toDate(),
      }));
      setFavoriteBooks(books);
      setTotalFavoriteBooks(snapshot.size);
    });

    setIsLoading(false);

    return () => {
      unsubscribeExchange();
      unsubscribeDesired();
      unsubscribeFavorite();
    };
  }, [user]);

  return (
    <BooksContext.Provider
      value={{
        exchangeBooks,
        desiredBooks,
        favoriteBooks,
        totalExchangeBooks,
        totalDesiredBooks,
        totalFavoriteBooks,
        isLoading,
      }}>
      {children}
    </BooksContext.Provider>
  );
};

export const useBooks = () => {
  const context = useContext(BooksContext);
  if (context === undefined) {
    throw new Error('useBooks must be used within a BooksProvider');
  }
  return context;
};
