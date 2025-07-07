import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TabParamList } from '../types/navigation';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  deleteField,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';

interface Book {
  id: string;
  bookId: string;
  userId: string;
  createdAt: Date;
  status?: string;
  bookTitle?: string;
  bookAuthor?: string;
}

interface SearchParams {
  title: string;
  author: string;
}

const BOOKS_PER_PAGE = 10;

const fetchBookDetails = async (bookId: string) => {
  try {
    const paddedId = bookId.padStart(14, '0');
    const bookDoc = await getDoc(doc(db, 'books', paddedId));

    if (bookDoc.exists()) {
      const data = bookDoc.data();
      return {
        title: data.title,
        author: data.author,
      };
    }

    const response = await fetch(`https://data.bn.org.pl/api/networks/bibs.json?id=${paddedId}`);
    if (!response.ok) {
      console.log('API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.bibs && Array.isArray(data.bibs) && data.bibs.length > 0) {
      const bookData = data.bibs[0];
      return {
        title: bookData.title || 'Książka niedostępna',
        author: bookData.author || 'Autor nieznany',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching book details:', error);
    return null;
  }
};

export default function BookshelfScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<TabParamList>>();
  const [ownedBooks, setOwnedBooks] = useState<Book[]>([]);
  const [exchangeBooks, setExchangeBooks] = useState<Book[]>([]);
  const [desiredBooks, setDesiredBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [lastVisibleDoc, setLastVisibleDoc] = useState<{
    owned: any | null;
    exchange: any | null;
    desired: any | null;
  }>({ owned: null, exchange: null, desired: null });

  const [, setHasMoreBooks] = useState({
    owned: false,
    exchange: false,
    desired: false,
  });

  const [searchParams, setSearchParams] = useState<SearchParams>({
    title: '',
    author: '',
  });

  const filterBooks = (books: Book[]) => {
    return books.filter((book) => {
      const titleMatch =
        book.bookTitle?.toLowerCase().includes(searchParams.title.toLowerCase()) ?? false;
      const authorMatch =
        book.bookAuthor?.toLowerCase().includes(searchParams.author.toLowerCase()) ?? false;

      if (searchParams.title && searchParams.author) {
        return titleMatch && authorMatch;
      } else if (searchParams.title) {
        return titleMatch;
      } else if (searchParams.author) {
        return authorMatch;
      }
      return true;
    });
  };

  const fetchBooks = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const ownershipsQuery = query(
        collection(db, 'bookOwnership'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(BOOKS_PER_PAGE * 2)
      );

      const desiresQuery = query(
        collection(db, 'bookDesire'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(BOOKS_PER_PAGE)
      );

      const [ownershipsSnapshot, desiresSnapshot] = await Promise.all([
        getDocs(ownershipsQuery),
        getDocs(desiresQuery),
      ]);

      const lastVisible = {
        owned:
          ownershipsSnapshot.docs.length > 0
            ? ownershipsSnapshot.docs[ownershipsSnapshot.docs.length - 1]
            : null,
        desired:
          desiresSnapshot.docs.length > 0
            ? desiresSnapshot.docs[desiresSnapshot.docs.length - 1]
            : null,
      };

      setLastVisibleDoc({
        ...lastVisibleDoc,
        owned: lastVisible.owned,
        desired: lastVisible.desired,
      });

      setHasMoreBooks({
        owned: ownershipsSnapshot.docs.length >= BOOKS_PER_PAGE,
        exchange: ownershipsSnapshot.docs.length >= BOOKS_PER_PAGE,
        desired: desiresSnapshot.docs.length >= BOOKS_PER_PAGE,
      });

      const processBooks = async (docs: any[]) => {
        return Promise.all(
          docs.map(async (doc) => {
            const bookDetails = await fetchBookDetails(doc.data().bookId);
            return {
              id: doc.id,
              bookId: doc.data().bookId,
              userId: doc.data().userId,
              ...doc.data(),
              createdAt: doc.data().createdAt.toDate(),
              bookTitle: bookDetails?.title || 'Książka niedostępna',
              bookAuthor: bookDetails?.author || 'Autor nieznany',
            };
          })
        );
      };

      const ownerships = await processBooks(ownershipsSnapshot.docs);
      const desires = await processBooks(desiresSnapshot.docs);

      const owned = ownerships.filter((book) => !book.status);
      const exchange = ownerships.filter((book) => book.status === 'forExchange');

      setOwnedBooks(owned);
      setExchangeBooks(exchange);
      setDesiredBooks(desires);

      if (exchange.length > 0) {
        const lastExchangeDoc = ownershipsSnapshot.docs.find(
          (doc) => doc.data().status === 'forExchange'
        );
        setLastVisibleDoc((prev) => ({
          ...prev,
          exchange: lastExchangeDoc || null,
        }));
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setError('Wystąpił błąd podczas ładowania książek');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchBooks();
  }, []);

  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user]);

  const updateBookStatus = async (bookOwnershipId: string, newStatus: string | undefined) => {
    if (!user) return;

    try {
      if (newStatus) {
        await updateDoc(doc(db, 'bookOwnership', bookOwnershipId), {
          status: newStatus,
        });
      } else {
        await updateDoc(doc(db, 'bookOwnership', bookOwnershipId), {
          status: deleteField(),
        });
      }

      if (newStatus === 'forExchange') {
        const bookToMove = ownedBooks.find((book) => book.id === bookOwnershipId);
        if (bookToMove) {
          setOwnedBooks(ownedBooks.filter((book) => book.id !== bookOwnershipId));
          setExchangeBooks([...exchangeBooks, { ...bookToMove, status: 'forExchange' }]);
        }
      } else {
        const bookToMove = exchangeBooks.find((book) => book.id === bookOwnershipId);
        if (bookToMove) {
          setExchangeBooks(exchangeBooks.filter((book) => book.id !== bookOwnershipId));
          setOwnedBooks([...ownedBooks, { ...bookToMove, status: undefined }]);
        }
      }
    } catch (error) {
      console.error('Error updating book status:', error);
      setError('Wystąpił błąd podczas aktualizacji statusu książki');
    }
  };

  const deleteDesiredBook = async (bookDesireId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'bookDesire', bookDesireId));
      setDesiredBooks(desiredBooks.filter((book) => book.id !== bookDesireId));
    } catch (error) {
      console.error('Error deleting desired book:', error);
      setError('Wystąpił błąd podczas usuwania książki');
    }
  };
  const renderBookItem = ({
    book,
    type,
  }: {
    book: Book;
    type: 'owned' | 'exchange' | 'desired';
  }) => (
    <View style={styles.bookCard}>
      <TouchableOpacity
        style={styles.bookInfo}
        onPress={() =>
          navigation.navigate('Book', { bookId: book.bookId, sourceScreen: 'Bookshelf' })
        }>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {book.bookTitle}
        </Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>
          {book.bookAuthor}
        </Text>
      </TouchableOpacity>
      <View style={styles.bookActions}>
        {type === 'owned' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateBookStatus(book.id, 'forExchange')}>
            <MaterialIcons name="sync" size={20} color="#4B5563" />
          </TouchableOpacity>
        )}
        {type === 'exchange' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateBookStatus(book.id, undefined)}>
            <MaterialIcons name="book" size={20} color="#4B5563" />
          </TouchableOpacity>
        )}
        {type === 'desired' && (
          <TouchableOpacity style={styles.actionButton} onPress={() => deleteDesiredBook(book.id)}>
            <MaterialIcons name="delete" size={20} color="#4B5563" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const BookSection = ({
    title,
    books,
    type,
    color,
  }: {
    title: string;
    books: Book[];
    type: 'owned' | 'exchange' | 'desired';
    color: string;
  }) => (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { backgroundColor: color }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {books.length > 0 ? (
          books.map((book) => <View key={book.id}>{renderBookItem({ book, type })}</View>)
        ) : (
          <Text style={styles.emptyText}>Brak książek</Text>
        )}
      </View>
    </View>
  );

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const filteredOwnedBooks = filterBooks(ownedBooks);
  const filteredExchangeBooks = filterBooks(exchangeBooks);
  const filteredDesiredBooks = filterBooks(desiredBooks);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.title}>Moja półka</Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj po tytule..."
            value={searchParams.title}
            onChangeText={(text) => setSearchParams({ ...searchParams, title: text })}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj po autorze..."
            value={searchParams.author}
            onChangeText={(text) => setSearchParams({ ...searchParams, author: text })}
          />
        </View>

        <View style={styles.sectionsContainer}>
          <BookSection
            title="Moje książki"
            books={filteredOwnedBooks}
            type="owned"
            color="#6366F1"
          />
          <BookSection
            title="Książki do wymiany"
            books={filteredExchangeBooks}
            type="exchange"
            color="#10B981"
          />
          <BookSection
            title="Chcę przeczytać"
            books={filteredDesiredBooks}
            type="desired"
            color="#8B5CF6"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#111827',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  sectionsContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sectionHeader: {
    padding: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionContent: {
    padding: 16,
  },
  bookCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  bookInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#4B5563',
  },
  bookActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    padding: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 16,
  },
});
