import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BookOpenIcon } from '../components/svg-icons/BookOpenIcon';
import { UserIcon } from '../components/svg-icons/UserIcon';
import BookCover from '../components/BookCover';
import LoadingSpinner from '../components/LoadingSpinner';
import { TabParamList } from '../navigation/BottomTabNavigator';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { splitAuthors } from '../utils/stringUtils';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

const theme = {
  primaryColor: '#007304',
  primaryColorLight: '#00a305',
  background: '#f9fafb',
  cardBackground: '#ffffff',
  foreground: '#111827',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  genreBg: '#dcfce7',
  genreText: '#166534',
};

interface Marc {
  leader: string;
  fields: Array<any>;
}

interface BookItem {
  id: number;
  zone: string;
  createdDate: string;
  updatedDate: string;
  deleted: boolean;
  deletedDate: null | string;
  language: string;
  subject: string;
  author: string;
  placeOfPublication: string;
  title: string;
  publisher: string;
  kind: string;
  domain: string;
  formOfWork: string;
  genre: string;
  publicationYear: string;
  marc: Marc;
  isbnIssn?: string;
  nationalBibliographyNumber?: string;
  averageRating?: number;
  totalReviews?: number;
}

interface ApiResponse {
  nextPage: string;
  bibs: BookItem[];
}

export default function LibraryScreen() {
  const navigation = useNavigation<StackNavigationProp<TabParamList>>();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<'title' | 'author' | 'isbn'>('title');
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(true);

  const padBookId = (id: number): string => {
    return id.toString().padStart(14, '0');
  };
  const fetchBooks = async (
    requestType: 'initial' | 'search' | 'loadMore',
    append: boolean = false
  ) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      let apiUrl = `https://data.bn.org.pl/api/institutions/bibs.json?limit=10&kind=książka`;

      if (requestType === 'search' && searchQuery) {
        const formattedQuery = searchQuery.trim();

        switch (searchType) {
          case 'title':
            apiUrl += `&title=${formattedQuery}`;
            break;
          case 'author':
            apiUrl += `&author=${formattedQuery}`;
            break;
          case 'isbn':
            apiUrl += `&isbnIssn=${formattedQuery}`;
            break;
          default:
            apiUrl += `&search=${formattedQuery}`;
        }
      } else if (requestType === 'loadMore' && nextPage) {
        const nextPageUrl = new URL(nextPage);
        const sinceId = nextPageUrl.searchParams.get('sinceId');
        if (sinceId) {
          apiUrl += `&sinceId=${sinceId}`;
        }

        if (searchQuery) {
          const formattedQuery = searchQuery.trim();

          switch (searchType) {
            case 'title':
              apiUrl += `&title=${formattedQuery}`;
              break;
            case 'author':
              apiUrl += `&author=${formattedQuery}`;
              break;
            case 'isbn':
              apiUrl += `&isbnIssn=${formattedQuery}`;
              break;
          }
        }
      }

      console.log('[LibraryScreen] API request URL:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.bibs && Array.isArray(data.bibs)) {
        const booksOnly = data.bibs.filter(
          (item) =>
            item.kind?.toLowerCase().includes('książka') ||
            item.kind?.toLowerCase().includes('książki') ||
            item.kind?.toLowerCase() === 'book' ||
            item.kind?.toLowerCase() === 'books'
        );

        const booksWithRatings = await Promise.all(
          booksOnly.map(async (book) => {
            const bookId = padBookId(book.id);

            const ratings = await getBookRatings(bookId);

            return {
              ...book,
              averageRating: ratings?.average || 0,
              totalReviews: ratings?.total || 0,
            };
          })
        );

        if (append) {
          if (booksWithRatings.length === 0) {
            setHasMoreResults(false);
            return;
          }
          setBooks((prevBooks) => [...prevBooks, ...booksWithRatings]);
        } else {
          setBooks(booksWithRatings);
          setHasMoreResults(booksWithRatings.length >= 10);
        }

        if (data.nextPage) {
          setNextPage(data.nextPage);
        } else {
          setNextPage(null);
          setHasMoreResults(false);
        }
      } else {
        throw new Error('Nieprawidłowy format danych');
      }
    } catch (error) {
      console.error('Błąd pobierania danych:', error);
      setError('Nie udało się pobrać listy książek. Spróbuj ponownie później.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };
  useEffect(() => {
    fetchBooks('initial');
  }, []);
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setBooks([]);
      setNextPage(null);
      setHasMoreResults(true);
      fetchBooks('search');
    }
  };

  const formatBookTitle = (title: string | undefined): string => {
    if (!title) return 'Tytuł niedostępny';

    if (title.includes('/')) {
      const firstPart = title.split('/')[0].trim();

      if (firstPart.length > 60) {
        return firstPart.substring(0, 57) + '...';
      }

      return firstPart;
    }

    if (title.length > 60) {
      return title.substring(0, 57) + '...';
    }

    return title;
  };

  const hasValidCover = (book: BookItem): boolean => {
    const isbn = book.isbnIssn;
    return !!isbn && isbn.trim().length > 0 && /^\d{10}(\d{3})?$/.test(isbn.replace(/-/g, ''));
  };

  const renderBookItem = ({ item }: { item: BookItem }) => (
    <View style={styles.bookCard}>
      <View style={styles.bookCardHeader}>
        <View style={styles.bookCardHeaderContent}>
          <Text style={styles.bookCardTitle} numberOfLines={1}>
            {formatBookTitle(item.title)}
          </Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingIcon}>★</Text>
            <Text style={styles.ratingText}>{item.averageRating ? item.averageRating : '—'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.bookCardBody}>
        <View style={styles.bookCoverContainer}>
          {hasValidCover(item) ? (
            <BookCover
              isbn={item.isbnIssn}
              title={item.title}
              size={'M'}
              onError={() => {
                console.log(`Cover loading failed for book: ${item.title}`);
              }}
            />
          ) : (
            <View style={styles.placeholderCover}>
              <BookOpenIcon width={36} height={36} fill="#d1d5db" />
            </View>
          )}
        </View>

        <View style={styles.bookDetails}>
          <View style={styles.authorContainer}>
            <View style={styles.sectionHeader}>
              <UserIcon width={12} height={12} fill={theme.primaryColor} />
              <Text style={styles.sectionLabel}>Autor:</Text>
            </View>
            <View>
              {item.author ? (
                splitAuthors(item.author).length > 2 ? (
                  <View>
                    <Text style={styles.authorText}>{splitAuthors(item.author)[0]}</Text>
                    <Text style={styles.authorText}>{splitAuthors(item.author)[1]}</Text>
                    <Text style={styles.authorMoreText}>
                      {`i ${splitAuthors(item.author).length - 2} więcej`}
                    </Text>
                  </View>
                ) : (
                  splitAuthors(item.author).map((author, i) => (
                    <Text key={i} style={styles.authorText}>
                      {author}
                    </Text>
                  ))
                )
              ) : (
                <Text style={styles.authorText}>Nieznany autor</Text>
              )}
            </View>
          </View>
          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <Svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.primaryColor}
                strokeWidth="2"
                width={12}
                height={12}>
                <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <Line x1="16" y1="2" x2="16" y2="6" />
                <Line x1="8" y1="2" x2="8" y2="6" />
                <Line x1="3" y1="10" x2="21" y2="10" />
              </Svg>
              <Text style={styles.metadataText}>{item.publicationYear || '—'}</Text>
            </View>
            {item.language && (
              <View style={styles.metadataItem}>
                <Svg width={12} height={12} viewBox="0 0 20 20" fill={theme.primaryColor}>
                  <Path
                    fillRule="evenodd"
                    d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                    clipRule="evenodd"
                  />
                </Svg>
                <Text style={styles.metadataText}>{item.language}</Text>
              </View>
            )}
          </View>
          {item.genre && (
            <View style={styles.genreContainer}>
              <View style={styles.genreBadge}>
                <Text style={styles.genreText}>{item.genre}</Text>
              </View>
            </View>
          )}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => {
                navigation.navigate('Book', {
                  bookId: item.id.toString(),
                  sourceScreen: 'Library',
                });
              }}>
              <Text style={styles.detailsButtonText}>Zobacz szczegóły →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!nextPage) return null;

    if (isLoadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#007304" />
          <Text style={styles.footerText}>Ładowanie...</Text>
        </View>
      );
    }

    if (!hasMoreResults && nextPage) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Nie znaleziono więcej wyników dla podanych kryteriów
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              fetchBooks('initial');
            }}
            style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Wróć do wszystkich książek</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };
  const handleLoadMore = () => {
    if (nextPage && !isLoadingMore && hasMoreResults) {
      fetchBooks('loadMore', true);
    }
  };

  const getBookRatings = async (bookId: string) => {
    try {
      const reviewsQuery = query(collection(db, 'reviews'), where('bookId', '==', bookId));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviews = reviewsSnapshot.docs.map((doc) => doc.data().rating);

      if (reviews.length === 0) return null;

      const average = reviews.reduce((sum, rating) => sum + rating, 0) / reviews.length;
      return {
        average: Number(average.toFixed(1)),
        total: reviews.length,
      };
    } catch (error) {
      console.error('Error fetching ratings:', error);
      return null;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchBooks('initial')} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
      <View style={styles.header}>
        <Text style={styles.title}>Biblioteka książek</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            searchType === 'title'
              ? 'Wyszukaj po tytule...'
              : searchType === 'author'
                ? 'Wyszukaj po autorze...'
                : 'Wyszukaj po ISBN...'
          }
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={isLoading}>
          <Text style={styles.searchButtonText}>{isLoading ? 'Szukam...' : 'Szukaj'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, searchType === 'title' && styles.activeTab]}
          onPress={() => setSearchType('title')}
          disabled={isLoading}>
          <Text style={[styles.tabText, searchType === 'title' && styles.activeTabText]}>
            Tytuł
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, searchType === 'author' && styles.activeTab]}
          onPress={() => setSearchType('author')}
          disabled={isLoading}>
          <Text style={[styles.tabText, searchType === 'author' && styles.activeTabText]}>
            Autor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, searchType === 'isbn' && styles.activeTab]}
          onPress={() => setSearchType('isbn')}
          disabled={isLoading}>
          <Text style={[styles.tabText, searchType === 'isbn' && styles.activeTabText]}>ISBN</Text>
        </TouchableOpacity>
      </View>
      {books.length === 0 ? (
        <View style={styles.emptyContainer}>
          <BookOpenIcon width={64} height={64} fill="#9ca3af" />
          <Text style={styles.emptyTitle}>Nie znaleziono książek</Text>
          <Text style={styles.emptySubtitle}>Spróbuj zmienić kryteria wyszukiwania</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBookItem}
          contentContainerStyle={styles.bookList}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: '#007304',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#007304',
  },
  tabText: {
    fontSize: 12,
    color: '#4b5563',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '500',
  },
  bookList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  // Book card styles to match Home.tsx
  bookCard: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  bookCardHeader: {
    backgroundColor: theme.primaryColor,
    padding: 8,
  },
  bookCardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookCardTitle: {
    fontWeight: '600',
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingIcon: {
    color: 'yellow',
    marginRight: 2,
  },
  ratingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  bookCardBody: {
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  bookCoverContainer: {
    width: 80,
    height: 112,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  placeholderCover: {
    width: 80,
    height: 112,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  bookDetails: {
    flex: 1,
  },
  authorContainer: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionLabel: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 12,
  },
  authorText: {
    fontSize: 12,
    color: '#4b5563',
  },
  authorMoreText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: '#4b5563',
  },
  genreContainer: {
    marginBottom: 8,
  },
  genreBadge: {
    backgroundColor: theme.genreBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  genreText: {
    fontSize: 10,
    color: theme.genreText,
  },
  actionContainer: {
    marginTop: 'auto',
    alignItems: 'flex-end',
  },
  detailsButton: {
    backgroundColor: theme.primaryColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  // Keep the rest of the styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 8,
    padding: 4,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#007304',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007304',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
