import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Rect, Line } from 'react-native-svg';
import LoadingSpinner from '../components/LoadingSpinner';
import BookCover from '../components/BookCover';
import { BookOpenIcon } from '../components/svg-icons/BookOpenIcon';
import { UserIcon } from '../components/svg-icons/UserIcon';
import { TabParamList } from '../navigation/BottomTabNavigator';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { splitAuthors } from '../utils/stringUtils';

interface BookItem {
  genre: any;
  id: number;
  zone: string;
  language: string;
  subject: string;
  author: string;
  title: string;
  publisher: string;
  kind?: string;
  publicationYear: string;
  isbnIssn?: string;
  averageRating?: number;
  totalReviews?: number;
}

interface FavoriteBook {
  id: string;
  bookId: string;
  userId: string;
  createdAt: any;
  bookData?: BookItem;
}

type FavoritesScreenRouteParams = {
  userId: string;
  userName?: string;
};

const FavoritesScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<TabParamList>>();
  const { userId, userName } = route.params as FavoritesScreenRouteParams;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [favoriteBooks, setFavoriteBooks] = useState<FavoriteBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<FavoriteBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'author'>('title');
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookDetails = async (bookId: string) => {
    try {
      const paddedId = bookId.padStart(14, '0');
      const bookDoc = await getDoc(doc(db, 'books', paddedId));

      if (bookDoc.exists()) {
        return bookDoc.data();
      }

      const response = await fetch(`https://data.bn.org.pl/api/networks/bibs.json?id=${paddedId}`);

      if (!response.ok) return null;
      const data = await response.json();
      if (data.bibs && data.bibs[0]) {
        return data.bibs[0];
      }

      return null;
    } catch (error) {
      console.error('Error fetching book details:', error);
      return null;
    }
  };

  const fetchBookRatings = async (bookId: string) => {
    const q = query(collection(db, 'reviews'), where('bookId', '==', bookId));
    const querySnapshot = await getDocs(q);
    const reviews = querySnapshot.docs.map((doc) => doc.data());

    if (reviews.length === 0) return { average: 0, total: 0 };

    const sum = reviews.reduce((acc: number, review: any) => acc + review.rating, 0);
    return {
      average: Number((sum / reviews.length).toFixed(1)),
      total: reviews.length,
    };
  };

  async function fetchFavoriteBooks() {
    if (!userId) return;

    setLoading(true);
    try {
      const favoritesQuery = query(collection(db, 'bookFavorites'), where('userId', '==', userId));

      const favoritesSnapshot = await getDocs(favoritesQuery);

      if (favoritesSnapshot.empty) {
        setFavoriteBooks([]);
        setFilteredBooks([]);
        setLoading(false);
        return;
      }

      const favorites = favoritesSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            bookId: doc.data().bookId,
            userId: doc.data().userId,
            createdAt: doc.data().createdAt,
          }) as FavoriteBook
      );

      const booksWithDetails = await Promise.all(
        favorites.map(async (favorite) => {
          try {
            const bookData = await fetchBookDetails(favorite.bookId);

            if (bookData) {
              const ratings = await fetchBookRatings(favorite.bookId);

              return {
                ...favorite,
                bookData: {
                  ...bookData,
                  averageRating: ratings.average,
                  totalReviews: ratings.total,
                },
              };
            }

            return favorite;
          } catch (error) {
            console.error(`Błąd podczas pobierania danych książki ${favorite.bookId}:`, error);
            return favorite;
          }
        })
      );

      const validBooks = booksWithDetails.filter((book) => book.bookData);
      setFavoriteBooks(validBooks);
      setFilteredBooks(validBooks);
    } catch (error) {
      console.error('Błąd podczas pobierania ulubionych książek:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFavoriteBooks();
  }, [userId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBooks(favoriteBooks);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = favoriteBooks.filter((book) => {
      if (!book.bookData) return false;

      if (searchType === 'title') {
        return book.bookData.title.toLowerCase().includes(query);
      } else {
        return book.bookData.author.toLowerCase().includes(query);
      }
    });

    setFilteredBooks(filtered);
  }, [searchQuery, searchType, favoriteBooks]);

  const formatBookTitle = (title: string | undefined): string => {
    if (!title) return 'Tytuł niedostępny';

    if (title.includes('/')) {
      const firstPart = title.split('/')[0].trim();
      if (firstPart.length > 40) {
        return firstPart.substring(0, 37) + '...';
      }
      return firstPart;
    }

    if (title.length > 40) {
      return title.substring(0, 37) + '...';
    }

    return title;
  };

  const renderBookItem = ({ item }: { item: FavoriteBook }) => {
    if (!item.bookData) return null;
    const book = item.bookData;
    const hasIsbn = !!book.isbnIssn && book.isbnIssn.trim().length > 0;

    return (
      <View style={styles.bookCard}>
        <View style={styles.bookCardHeader}>
          <Text style={styles.bookTitle} numberOfLines={1}>
            {formatBookTitle(book.title)}
          </Text>
          <View style={styles.ratingBadge}>
            <Svg width={12} height={12} viewBox="0 0 20 20" fill="#fde047">
              <Path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </Svg>
            <Text style={styles.ratingText}>
              {book.averageRating ? book.averageRating.toFixed(1) : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.bookCardContent}>
          <View style={styles.bookCoverContainer}>
            {hasIsbn ? (
              <BookCover isbn={book.isbnIssn} title={book.title} size="M" />
            ) : (
              <View style={styles.placeholderCover}>
                <BookOpenIcon width={36} height={36} fill="#d1d5db" />
              </View>
            )}
          </View>

          <View style={styles.bookDetails}>
            <View style={styles.bookDetail}>
              <View style={styles.detailHeader}>
                <UserIcon width={12} height={12} fill="#eab308" />
                <Text style={styles.detailLabel}>Autor:</Text>
              </View>
              {book.author ? (
                splitAuthors(book.author).length > 2 ? (
                  <View>
                    <Text style={styles.detailText} numberOfLines={1}>
                      {splitAuthors(book.author)[0]}
                    </Text>
                    <Text style={styles.detailText} numberOfLines={1}>
                      {splitAuthors(book.author)[1]}
                    </Text>
                    <Text style={styles.detailTextMuted}>
                      {`i ${splitAuthors(book.author).length - 2} więcej`}
                    </Text>
                  </View>
                ) : (
                  splitAuthors(book.author).map((author, i) => (
                    <Text key={i} style={styles.detailText} numberOfLines={1}>
                      {author}
                    </Text>
                  ))
                )
              ) : (
                <Text style={styles.detailText}>Nieznany autor</Text>
              )}
            </View>

            <View style={styles.bookMeta}>
              {book.publicationYear && (
                <View style={styles.metaItem}>
                  <Svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#eab308"
                    strokeWidth="2"
                    width={12}
                    height={12}>
                    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <Line x1="16" y1="2" x2="16" y2="6" />
                    <Line x1="8" y1="2" x2="8" y2="6" />
                    <Line x1="3" y1="10" x2="21" y2="10" />
                  </Svg>
                  <Text style={styles.metaText}>{book.publicationYear}</Text>
                </View>
              )}
              {book.language && (
                <View style={styles.metaItem}>
                  <Svg width={12} height={12} viewBox="0 0 20 20" fill="#eab308">
                    <Path
                      fillRule="evenodd"
                      d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                      clipRule="evenodd"
                    />
                  </Svg>
                  <Text style={[styles.metaText, styles.capitalize]}>{book.language}</Text>
                </View>
              )}
            </View>

            {book.genre && (
              <View style={styles.genreContainer}>
                <View style={styles.genreBadge}>
                  <Text style={styles.genreText}>{book.genre}</Text>
                </View>
              </View>
            )}

            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => {
                  navigation.navigate('Book', {
                    bookId: item.bookId,
                    sourceScreen: 'Favorites' as const,
                    userId: userId,
                    userName: userName,
                  });
                }}>
                <Text style={styles.detailsButtonText}>Zobacz szczegóły →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const isCurrentUser = user && user.uid === userId;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavoriteBooks();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { userId })}
          style={styles.backButton}>
          <Svg width={24} height={24} fill="none">
            <Path
              stroke="#1f2937"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 18l-6-6 6-6"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isCurrentUser
            ? 'Twoje ulubione książki'
            : userName
              ? `Ulubione książki użytkownika ${userName}`
              : 'Ulubione książki'}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={searchType === 'title' ? 'Wyszukaj po tytule...' : 'Wyszukaj po autorze...'}
          placeholderTextColor="#9ca3af"
        />

        <View style={styles.searchTypeContainer}>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === 'title' && styles.searchTypeButtonActive,
            ]}
            onPress={() => setSearchType('title')}>
            <Text
              style={[
                styles.searchTypeText,
                searchType === 'title' && styles.searchTypeTextActive,
              ]}>
              Tytuł
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === 'author' && styles.searchTypeButtonActive,
            ]}
            onPress={() => setSearchType('author')}>
            <Text
              style={[
                styles.searchTypeText,
                searchType === 'author' && styles.searchTypeTextActive,
              ]}>
              Autor
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredBooks.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpenIcon width={64} height={64} fill="#9ca3af" />
          <Text style={styles.emptyStateText}>
            {searchQuery
              ? 'Nie znaleziono pasujących książek'
              : isCurrentUser
                ? 'Nie masz jeszcze ulubionych książek'
                : 'Użytkownik nie ma jeszcze ulubionych książek'}
          </Text>
          {searchQuery && (
            <Text style={styles.emptyStateSubtext}>Spróbuj zmienić kryteria wyszukiwania</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          renderItem={renderBookItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.booksList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#eab308']} // Yellow color to match the theme
              tintColor="#eab308"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    gap: 12,
  },
  searchInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
  },
  searchTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  searchTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  searchTypeButtonActive: {
    backgroundColor: '#eab308', // yellow-500
  },
  searchTypeText: {
    fontSize: 12,
    color: '#4b5563',
  },
  searchTypeTextActive: {
    color: 'white',
  },
  booksList: {
    padding: 16,
    gap: 16,
  },
  bookCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  bookCardHeader: {
    backgroundColor: '#eab308', // yellow-500
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
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
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    marginLeft: 2,
  },
  bookCardContent: {
    padding: 8,
    flexDirection: 'row',
    gap: 8,
  },
  bookCoverContainer: {
    width: 80,
    aspectRatio: 2 / 3,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  placeholderCover: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  bookDetails: {
    flex: 1,
    minWidth: 0,
  },
  bookDetail: {
    marginBottom: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  detailText: {
    fontSize: 12,
    color: '#4b5563',
  },
  detailTextMuted: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  bookMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#4b5563',
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  genreBadge: {
    backgroundColor: '#fff7ed',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  genreText: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 'auto',
  },
  detailsButton: {
    backgroundColor: '#eab308',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default FavoritesScreen;
