import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRoute, useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import BookCover from '../components/BookCover';
import { BookOpenIcon } from '../components/svg-icons/BookOpenIcon';
import { useAuth } from '../hooks/useAuth';

interface UserExchangeScreenRouteParams {
  userId: string;
  userName: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  isbnIssn?: string;
  bookId: string;
  addedAt: Date;
}

export default function UserExchangeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId, userName } = route.params as UserExchangeScreenRouteParams;
  const { user: currentUser } = useAuth();

  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [userExchangeBooks, setUserExchangeBooks] = useState<Book[]>([]);
  const [selectedMyBooks, setSelectedMyBooks] = useState<string[]>([]);
  const [selectedUserBooks, setSelectedUserBooks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookDetails = async (bookId: string) => {
    try {
      const paddedId = bookId.padStart(14, '0');
      const response = await fetch(`https://data.bn.org.pl/api/networks/bibs.json?id=${paddedId}`);
      if (!response.ok) return null;
      const data = await response.json();

      if (data.bibs && Array.isArray(data.bibs) && data.bibs.length > 0) {
        const book = data.bibs[0];
        return {
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          isbnIssn: book.isbnIssn,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching book details:', error);
      return null;
    }
  };

  const fetchBooks = async () => {
    if (!currentUser) return;

    try {
      setError(null);
      const myBooksQuery = query(
        collection(db, 'bookOwnership'),
        where('userId', '==', currentUser.uid),
        where('status', '==', 'forExchange'),
        orderBy('createdAt', 'desc')
      );

      const myBooksSnapshot = await getDocs(myBooksQuery);
      const myBooksData = await Promise.all(
        myBooksSnapshot.docs.map(async (doc) => {
          const bookData = doc.data();
          const bookDetails = await fetchBookDetails(bookData.bookId);
          return {
            id: doc.id,
            title: bookDetails?.title || 'Brak tytułu',
            author: bookDetails?.author || 'Nieznany autor',
            coverUrl: bookDetails?.coverUrl,
            isbnIssn: bookDetails?.isbnIssn,
            bookId: bookData.bookId,
            addedAt: bookData.createdAt?.toDate() || new Date(),
          };
        })
      );
      setMyBooks(myBooksData.filter((book) => book !== null) as Book[]);

      const userBooksQuery = query(
        collection(db, 'bookOwnership'),
        where('userId', '==', userId),
        where('status', '==', 'forExchange'),
        orderBy('createdAt', 'desc')
      );

      const userBooksSnapshot = await getDocs(userBooksQuery);
      const userBooksData = await Promise.all(
        userBooksSnapshot.docs.map(async (doc) => {
          const bookData = doc.data();
          const bookDetails = await fetchBookDetails(bookData.bookId);
          return {
            id: doc.id,
            title: bookDetails?.title || 'Brak tytułu',
            author: bookDetails?.author || 'Nieznany autor',
            coverUrl: bookDetails?.coverUrl,
            isbnIssn: bookDetails?.isbnIssn,
            bookId: bookData.bookId,
            addedAt: bookData.createdAt?.toDate() || new Date(),
          };
        })
      );
      setUserExchangeBooks(userBooksData.filter((book) => book !== null) as Book[]);
    } catch (error) {
      console.error('Error fetching books:', error);
      setError('Nie udało się załadować książek');
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchBooks().finally(() => setIsLoading(false));
  }, [currentUser, userId]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchBooks().finally(() => setRefreshing(false));
  }, [currentUser, userId]);

  const toggleBookSelection = (bookId: string, listType: 'my' | 'user') => {
    if (listType === 'my') {
      setSelectedMyBooks((prev) =>
        prev.includes(bookId)
          ? prev.filter((id) => id !== bookId)
          : prev.length >= 5
            ? prev
            : [...prev, bookId]
      );
    } else {
      setSelectedUserBooks((prev) =>
        prev.includes(bookId)
          ? prev.filter((id) => id !== bookId)
          : prev.length >= 5
            ? prev
            : [...prev, bookId]
      );
    }
  };

  const getSelectedBooks = (ids: string[], sourceList: Book[]): Book[] => {
    return sourceList.filter((book) => ids.includes(book.id));
  };

  const proposeExchange = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const mySelectedBooks = getSelectedBooks(selectedMyBooks, myBooks);
      const userSelectedBooks = getSelectedBooks(selectedUserBooks, userExchangeBooks);
      const userBooksData = mySelectedBooks.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || null,
        isbn: book.isbnIssn || null,
        bookId: book.bookId,
      }));

      const contactBooksData = userSelectedBooks.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || null,
        isbn: book.isbnIssn || null,
        bookId: book.bookId,
      }));

      const bookExchangesRef = collection(db, 'bookExchanges');
      const newExchange = {
        userId: currentUser.uid,
        contactId: userId,
        statusDate: new Date(),
        userBooks: userBooksData,
        contactBooks: contactBooksData,
        status: 'pending',
      };

      await addDoc(bookExchangesRef, newExchange);
      navigation.navigate('Exchanges' as never);
    } catch (error) {
      console.error('Error proposing exchange:', error);
      setError('Wystąpił błąd podczas proponowania wymiany');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBookItem = (book: Book, isSelected: boolean, onSelect: () => void) => (
    <TouchableOpacity
      key={book.id}
      style={[styles.bookItem, isSelected && styles.selectedBookItem]}
      onPress={onSelect}>
      <View style={styles.bookCoverContainer}>
        {book.isbnIssn ? (
          <BookCover isbn={book.isbnIssn} title={book.title} size="M" />
        ) : (
          <View style={styles.placeholderCover}>
            <BookOpenIcon width={24} height={24} fill="#9CA3AF" />
          </View>
        )}
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>
          {book.author}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
      <View style={styles.header}>
        <Text style={styles.title}>Wymiana z {userName}</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Twoje książki do wymiany</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookList}>
            {myBooks.map((book) =>
              renderBookItem(book, selectedMyBooks.includes(book.id), () =>
                toggleBookSelection(book.id, 'my')
              )
            )}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Książki {userName} do wymiany</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookList}>
            {userExchangeBooks.map((book) =>
              renderBookItem(book, selectedUserBooks.includes(book.id), () =>
                toggleBookSelection(book.id, 'user')
              )
            )}
          </ScrollView>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {(selectedMyBooks.length > 0 || selectedUserBooks.length > 0) && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Wybrano do wymiany: {selectedMyBooks.length} za {selectedUserBooks.length}
            </Text>
            <TouchableOpacity
              style={[
                styles.proposeButton,
                (!selectedMyBooks.length || !selectedUserBooks.length) &&
                  styles.proposeButtonDisabled,
              ]}
              onPress={proposeExchange}
              disabled={!selectedMyBooks.length || !selectedUserBooks.length || isSubmitting}>
              <Text style={styles.proposeButtonText}>
                {isSubmitting ? 'Wysyłanie...' : 'Zaproponuj wymianę'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  bookList: {
    flexGrow: 0,
  },
  bookItem: {
    width: 120,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedBookItem: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  bookCoverContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    marginBottom: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#6B7280',
  },
  summary: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  proposeButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  proposeButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  proposeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    padding: 16,
  },
});
