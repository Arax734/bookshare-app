import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { db } from './firebase/config';
import { BookOpenIcon } from './components/svg-icons/BookOpenIcon';
import { UserIcon } from './components/svg-icons/UserIcon';
import BookCover from './components/BookCover';
import { splitAuthors } from './utils/stringUtils';
import { useUser } from './context/UserContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { TabParamList } from './navigation/BottomTabNavigator';

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
interface RecommendationItem {
  category: string;
  books?: any[];
  byGenre?: string;
  byAuthor?: string;
  byLanguage?: string;
}

interface RecommendationGroups {
  byGenre: RecommendationItem[];
  byAuthor: RecommendationItem[];
  byLanguage: RecommendationItem[];
}

interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  publicationYear: number;
  coverUrl?: string;
  isbn?: string;
  isbnIssn?: string;
  averageRating?: number;
  totalReviews?: number;
}

interface ExpandedSections {
  [key: string]: boolean;
}

interface LoadedCategories {
  [key: string]: boolean;
}

export default function Home() {
  const navigation = useNavigation<StackNavigationProp<TabParamList>>();
  const { currentUser: user, loading: authLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendationGroups>({
    byGenre: [],
    byAuthor: [],
    byLanguage: [],
  });
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({});
  const [loadedCategories, setLoadedCategories] = useState<LoadedCategories>({});
  const [loadingCategories, setLoadingCategories] = useState<{ [key: string]: boolean }>({});

  const [selectedFilters, setSelectedFilters] = useState({
    genre: null as string | null,
    author: null as string | null,
    language: null as string | null,
  });
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecommendationCategories = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('userId', '==', user.uid),
        where('rating', '>=', 7)
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);
      const highlyRatedBooks = reviewsSnapshot.docs.map((doc) => ({
        bookId: doc.data().bookId,
        rating: doc.data().rating,
      }));

      const bookDetailsPromises = highlyRatedBooks.map(async ({ bookId }) => {
        const paddedId = bookId.padStart(14, '0');
        const url = `https://data.bn.org.pl/api/institutions/bibs.json?id=${paddedId}`;

        try {
          const response = await fetch(url);
          if (!response.ok) return null;

          const data = await response.json();
          if (!data.bibs?.[0]) return null;

          return {
            id: paddedId,
            ...data.bibs[0],
          };
        } catch (error) {
          console.error(`Error fetching book details for ID ${bookId}:`, error);
          return null;
        }
      });

      const books = await Promise.all(bookDetailsPromises);
      const validBooks = books.filter((book) => book !== null);

      const getTopItems = (
        books: any[],
        key: string,
        limit: number = 3
      ): { category: string }[] => {
        const counts: { [key: string]: number } = {};
        books.forEach((book) => {
          if (book?.[key]) {
            counts[book[key]] = (counts[book[key]] || 0) + 1;
          }
        });

        return Object.entries(counts)
          .map(([item, count]) => ({ item, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
          .map((item) => ({ category: item.item }));
      };

      const genreCategories = getTopItems(validBooks, 'genre');
      const authorCategories = getTopItems(validBooks, 'author');
      const languageCategories = getTopItems(validBooks, 'language');

      setRecommendations({
        byGenre: genreCategories,
        byAuthor: authorCategories,
        byLanguage: languageCategories,
      });
    } catch (error) {
      console.error('Error fetching recommendation categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Resetuj wszystkie stany przed odświeżeniem
      setExpandedSections({});
      setLoadedCategories({});
      setLoadingCategories({});
      setSelectedFilters({
        genre: null,
        author: null,
        language: null,
      });
      setFilteredBooks([]);

      // Pobierz dane ponownie
      await fetchRecommendationCategories();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendationCategories();
  }, [user]);

  const fetchFilteredBooks = async () => {
    if (!user) return;

    if (!selectedFilters.genre && !selectedFilters.author && !selectedFilters.language) {
      setFilteredBooks([]);
      return;
    }

    setIsLoading(true);

    try {
      const userReviewsQuery = query(collection(db, 'reviews'), where('userId', '==', user.uid));
      const userReviews = await getDocs(userReviewsQuery);
      const reviewedBookIds = new Set(userReviews.docs.map((doc) => doc.data().bookId));

      const baseUrl = 'https://data.bn.org.pl/api/networks/bibs.json';
      let url = `${baseUrl}?formOfWork=Książki`;

      const filters = [];

      if (selectedFilters.genre) {
        filters.push(`genre=${selectedFilters.genre}`);
      }

      if (selectedFilters.language) {
        filters.push(`language=${selectedFilters.language}`);
      }

      const fetchLimit = 50;
      filters.push(`limit=${fetchLimit}`);

      if (selectedFilters.author) {
        const authorName = selectedFilters.author
          .split(' ')[0]
          .replace(/[.,;:]/g, '')
          .trim();
        filters.push(`author=${authorName}`);
      }

      url += filters.length > 0 ? '&' + filters.join('&') : '';

      console.log(`[fetchFilteredBooks] API request URL: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      let data = await response.json();
      let books = data.bibs || [];
      console.log(`[fetchFilteredBooks] Received ${books.length} books from API before filtering`);

      if (selectedFilters.genre || selectedFilters.author || selectedFilters.language) {
        books = books.filter((book: any) => {
          let matchesGenre =
            !selectedFilters.genre ||
            (book.genre && book.genre.toLowerCase().includes(selectedFilters.genre.toLowerCase()));

          let matchesLanguage =
            !selectedFilters.language ||
            (book.language && book.language === selectedFilters.language);

          let matchesAuthor = !selectedFilters.author || false;

          if (selectedFilters.author && book.author) {
            const authorNameNormalized = selectedFilters.author
              .trim()
              .toLowerCase()
              .replace(/\([^)]*\)/g, '')
              .replace(/[.,;:]/g, '')
              .replace(/\s+/g, ' ');

            const bookAuthorNormalized = book.author
              .toLowerCase()
              .replace(/\([^)]*\)/g, '')
              .replace(/[.,;:]/g, '')
              .replace(/\s+/g, ' ')
              .trim();

            if (
              bookAuthorNormalized.includes(authorNameNormalized) ||
              authorNameNormalized.includes(bookAuthorNormalized)
            ) {
              matchesAuthor = true;
            } else {
              const authorParts = bookAuthorNormalized.split(/\s+/);
              const searchTermParts = authorNameNormalized.split(/\s+/);

              const significantMatches = searchTermParts.filter(
                (part) =>
                  part.length > 2 &&
                  authorParts.some(
                    (authorPart: any) => authorPart.includes(part) || part.includes(authorPart)
                  )
              );

              matchesAuthor = significantMatches.length >= Math.min(2, searchTermParts.length);
            }
          }

          return matchesGenre && matchesLanguage && matchesAuthor;
        });
      }

      console.log(`[fetchFilteredBooks] ${books.length} books after client-side filtering`);
      books = books.slice(0, 20);

      const padBookId = (id: string | number): string => {
        const idString = String(id);
        return idString.padStart(14, '0');
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

      const booksWithRatings = await Promise.all(
        books.map(async (book: any) => {
          const bookId = padBookId(book.id || '');
          const ratings = await getBookRatings(bookId);

          return {
            ...book,
            id: bookId,
            averageRating: ratings?.average || null,
            totalReviews: ratings?.total || 0,
          };
        })
      );

      const filteredResults = booksWithRatings.filter((book: any) => !reviewedBookIds.has(book.id));
      console.log(`[fetchFilteredBooks] Final filtered results: ${filteredResults.length} books`);

      setFilteredBooks(filteredResults);
    } catch (error) {
      console.error('Error fetching filtered books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredBooks();
  }, [selectedFilters.genre, selectedFilters.author, selectedFilters.language, user]);

  const fetchCategoryBooks = async (categoryType: string, category: string) => {
    const key = `${categoryType}-${category}`;
    setLoadingCategories((prev) => ({ ...prev, [key]: true }));

    try {
      console.log(`[fetchCategoryBooks] Fetching books for ${categoryType}: "${category}"`);

      const userReviewsQuery = query(collection(db, 'reviews'), where('userId', '==', user?.uid));
      const userReviews = await getDocs(userReviewsQuery);
      const reviewedBookIds = new Set(userReviews.docs.map((doc) => doc.data().bookId));
      console.log(
        `[fetchCategoryBooks] Found ${reviewedBookIds.size} already reviewed books to filter out`
      );

      const baseUrl = 'https://data.bn.org.pl/api/networks/bibs.json';
      let url = `${baseUrl}?formOfWork=Książki&limit=10`;

      if (categoryType === 'genre') {
        url = `${baseUrl}?formOfWork=Książki&limit=10&genre=${category}`;
        console.log(`[fetchCategoryBooks] Genre search URL: ${url}`);
      } else if (categoryType === 'author') {
        let author = category;

        const mediaRodzinaIndex = author.indexOf('Media Rodzina');
        if (mediaRodzinaIndex > -1) {
          author = author.substring(0, mediaRodzinaIndex).trim();
        }

        const authorParts = author.split(' ');
        if (authorParts.length > 4) {
          const lastName = authorParts[1].replace(/,/g, '');
          const duplicateIndex = authorParts.findIndex(
            (part, index) => index > 1 && part.replace(/,/g, '') === lastName
          );

          if (duplicateIndex > -1) {
            author = authorParts.slice(0, duplicateIndex).join(' ');
          }
        }

        author = author.replace(/ /g, '+');
        url = `${baseUrl}?formOfWork=Książki&limit=10&author=${author}`;
        console.log(`[fetchCategoryBooks] Author search URL: ${url}`);
      } else if (categoryType === 'language') {
        url += `&language=${encodeURIComponent(category)}`;
        console.log(`[fetchCategoryBooks] Language search URL: ${url}`);
      }

      console.log(`[fetchCategoryBooks] Sending request to: ${url}`);
      let response = await fetch(url);
      let data;
      let books = [];

      if (!response.ok) {
        console.error(`[fetchCategoryBooks] API Error: ${response.status} ${response.statusText}`);
        throw new Error(`API responded with status: ${response.status}`);
      }

      data = await response.json();
      books = data.bibs || [];
      console.log(`[fetchCategoryBooks] Received ${books.length} books from API`);

      if (categoryType === 'author' && category.trim()) {
        console.log(`[fetchCategoryBooks] Performing additional author filtering`);
        const authorNameNormalized = category
          .trim()
          .toLowerCase()
          .replace(/\([^)]*\)/g, '')
          .replace(/[.,;:]/g, '')
          .replace(/\s+/g, ' ');

        const initialCount = books.length;

        books = books.filter((book: any) => {
          if (!book.author) return false;

          const bookAuthorNormalized = book.author
            .toLowerCase()
            .replace(/\([^)]*\)/g, '')
            .replace(/[.,;:]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (bookAuthorNormalized.includes(authorNameNormalized)) {
            return true;
          }

          const authorParts = bookAuthorNormalized.split(/\s+/);
          const searchTermParts = authorNameNormalized.split(/\s+/);

          return searchTermParts.every(
            (part) =>
              part.length > 2 &&
              authorParts.some(
                (authorPart: string) => authorPart.includes(part) || part.includes(authorPart)
              )
          );
        });

        console.log(
          `[fetchCategoryBooks] After author filtering: ${books.length} books (removed ${initialCount - books.length})`
        );
      }

      console.log(`[fetchCategoryBooks] Adding ratings for ${books.length} books`);
      const padBookId = (id: string | number): string => {
        const idString = String(id);
        return idString.padStart(14, '0');
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

      const booksWithRatings = await Promise.all(
        books.map(async (book: any) => {
          const bookId = padBookId(book.id || '');
          const ratings = await getBookRatings(bookId);

          return {
            ...book,
            id: bookId,
            averageRating: ratings?.average || null,
            totalReviews: ratings?.total || 0,
          };
        })
      );

      const initialBooksCount = booksWithRatings.length;
      const filteredBooks = booksWithRatings.filter((book: any) => !reviewedBookIds.has(book.id));
      console.log(
        `[fetchCategoryBooks] After filtering reviewed books: ${filteredBooks.length} books (removed ${initialBooksCount - filteredBooks.length})`
      );

      setRecommendations((prev) => {
        const updated = { ...prev };
        const typeKey =
          categoryType === 'genre'
            ? 'byGenre'
            : categoryType === 'author'
              ? 'byAuthor'
              : 'byLanguage';

        const updatedItems = updated[typeKey].map((group) => {
          if (group.category === category) {
            console.log(
              `[fetchCategoryBooks] Updated ${typeKey} category "${category}" with ${filteredBooks.length} books`
            );
            return { ...group, books: filteredBooks };
          }
          return group;
        });

        updated[typeKey] = updatedItems;
        return updated;
      });

      setLoadedCategories((prev) => ({ ...prev, [key]: true }));
    } catch (error) {
      console.error(
        `[fetchCategoryBooks] Error fetching books for ${categoryType}: ${category}:`,
        error
      );
    } finally {
      setLoadingCategories((prev) => ({ ...prev, [key]: false }));
      console.log(`[fetchCategoryBooks] Completed fetching for ${categoryType}: "${category}"`);
    }
  };

  const toggleSection = (categoryType: string, category: string) => {
    const key = `${categoryType}-${category}`;

    setExpandedSections((prev) => {
      const newState = { ...prev };
      newState[key] = !prev[key];

      if (newState[key] && !loadedCategories[key]) {
        fetchCategoryBooks(categoryType, category);
      }

      return newState;
    });
  };

  const selectFilter = (type: 'genre' | 'author' | 'language', value: string | null) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [type]: prev[type] === value ? null : value,
    }));
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

  const hasValidCover = (book: Book): boolean => {
    const isbn = book.isbn || book.isbnIssn;
    return !!isbn && isbn.trim().length > 0 && /^\d{10}(\d{3})?$/.test(isbn.replace(/-/g, ''));
  };

  const renderBookCard = (book: Book) => (
    <View key={book.id} style={styles.bookCard}>
      <View style={styles.bookCardHeader}>
        <View style={styles.bookCardHeaderContent}>
          <Text style={styles.bookCardTitle} numberOfLines={1}>
            {formatBookTitle(book.title)}
          </Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingIcon}>★</Text>
            <Text style={styles.ratingText}>{book.averageRating ? book.averageRating : '—'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.bookCardBody}>
        <View style={styles.bookCoverContainer}>
          {hasValidCover(book) ? (
            <BookCover
              isbn={book.isbn || book.isbnIssn}
              title={book.title}
              size={'M'}
              onError={() => {
                console.log(`Cover loading failed for book: ${book.title}`);
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
              {book.author ? (
                splitAuthors(book.author).length > 2 ? (
                  <View>
                    <Text style={styles.authorText}>{splitAuthors(book.author)[0]}</Text>
                    <Text style={styles.authorText}>{splitAuthors(book.author)[1]}</Text>
                    <Text style={styles.authorMoreText}>
                      {`i ${splitAuthors(book.author).length - 2} więcej`}
                    </Text>
                  </View>
                ) : (
                  splitAuthors(book.author).map((author, i) => (
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
              <Text style={styles.metadataText}>{book.publicationYear || '—'}</Text>
            </View>
            {book.language && (
              <View style={styles.metadataItem}>
                <Svg width={12} height={12} viewBox="0 0 20 20" fill={theme.primaryColor}>
                  <Path
                    fillRule="evenodd"
                    d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                    clipRule="evenodd"
                  />
                </Svg>
                <Text style={styles.metadataText}>{book.language}</Text>
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
                  bookId: book.id.toString(),
                  sourceScreen: 'Home',
                });
              }}>
              <Text style={styles.detailsButtonText}>Zobacz szczegóły →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const BookSkeleton = () => (
    <View style={styles.bookCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonHeaderContent}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonRating} />
        </View>
      </View>

      <View style={styles.bookCardBody}>
        <View style={styles.skeletonCover} />

        <View style={styles.bookDetails}>
          <View style={styles.skeletonAuthorContainer}>
            <View style={styles.skeletonAuthorLabel} />
            <View style={styles.skeletonAuthorLine1} />
            <View style={styles.skeletonAuthorLine2} />
          </View>

          <View style={styles.metadataContainer}>
            <View style={styles.skeletonMetadataItem1} />
            <View style={styles.skeletonMetadataItem2} />
          </View>

          <View style={styles.skeletonGenreContainer}>
            <View style={styles.skeletonGenreBadge} />
          </View>

          <View style={styles.actionContainer}>
            <View style={styles.skeletonDetailsButton} />
          </View>
        </View>
      </View>
    </View>
  );

  const getActiveRecommendations = () => {
    return [
      {
        type: 'genre',
        recommendations: recommendations.byGenre,
        title: 'Gatunki',
      },
      {
        type: 'author',
        recommendations: recommendations.byAuthor,
        title: 'Autorzy',
      },
      {
        type: 'language',
        recommendations: recommendations.byLanguage,
        title: 'Języki',
      },
    ];
  };

  const hasAnyRecommendations =
    recommendations.byGenre.length > 0 ||
    recommendations.byAuthor.length > 0 ||
    recommendations.byLanguage.length > 0;
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primaryColor]}
            tintColor={theme.primaryColor}
          />
        }>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Witaj w BookShare</Text>
            <Text style={styles.subtitle}>Odkryj książki dopasowane do Twoich zainteresowań</Text>
          </View>

          {hasAnyRecommendations ? (
            <>
              <View style={styles.filtersContainer}>
                <Text style={styles.filtersTitle}>Filtruj rekomendacje</Text>

                <View style={styles.filterGroups}>
                  <View style={styles.filterGroup}>
                    <View style={styles.filterGroupHeader}>
                      <Svg width={14} height={14} viewBox="0 0 20 20" fill={theme.primaryColor}>
                        <Path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </Svg>
                      <Text style={styles.filterGroupTitle}>Gatunki</Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filtersScrollView}>
                      <View style={styles.filtersList}>
                        {recommendations.byGenre.map((item) => (
                          <TouchableOpacity
                            key={item.category}
                            onPress={() => selectFilter('genre', item.category)}
                            style={[
                              styles.filterButton,
                              selectedFilters.genre === item.category && styles.filterButtonActive,
                            ]}>
                            <Text
                              style={[
                                styles.filterButtonText,
                                selectedFilters.genre === item.category &&
                                  styles.filterButtonTextActive,
                              ]}>
                              {item.category}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={styles.filterGroup}>
                    <View style={styles.filterGroupHeader}>
                      <Svg width={14} height={14} viewBox="0 0 20 20" fill={theme.primaryColor}>
                        <Path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </Svg>
                      <Text style={styles.filterGroupTitle}>Autorzy</Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filtersScrollView}>
                      <View style={styles.filtersList}>
                        {recommendations.byAuthor.flatMap((item) => {
                          const authors = splitAuthors(item.category);

                          return authors
                            .map((author, index) => {
                              if (author.length < 4) return null;
                              const cleanAuthor = author
                                .replace(/\(\d{4}-\d{4}\)/g, '')
                                .replace(/\(\d{4}-\s*\)/g, '')
                                .trim();

                              return (
                                <TouchableOpacity
                                  key={`${item.category}-${index}`}
                                  onPress={() => selectFilter('author', cleanAuthor)}
                                  style={[
                                    styles.filterButton,
                                    selectedFilters.author === cleanAuthor &&
                                      styles.filterButtonActive,
                                  ]}>
                                  <Text
                                    style={[
                                      styles.filterButtonText,
                                      selectedFilters.author === cleanAuthor &&
                                        styles.filterButtonTextActive,
                                    ]}>
                                    {cleanAuthor}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })
                            .filter(Boolean);
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={styles.filterGroup}>
                    <View style={styles.filterGroupHeader}>
                      <Svg width={14} height={14} viewBox="0 0 20 20" fill={theme.primaryColor}>
                        <Path
                          fillRule="evenodd"
                          d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                          clipRule="evenodd"
                        />
                      </Svg>
                      <Text style={styles.filterGroupTitle}>Języki</Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filtersScrollView}>
                      <View style={styles.filtersList}>
                        {recommendations.byLanguage.map((item) => (
                          <TouchableOpacity
                            key={item.category}
                            onPress={() => selectFilter('language', item.category)}
                            style={[
                              styles.filterButton,
                              selectedFilters.language === item.category &&
                                styles.filterButtonActive,
                            ]}>
                            <Text
                              style={[
                                styles.filterButtonText,
                                selectedFilters.language === item.category &&
                                  styles.filterButtonTextActive,
                              ]}>
                              {item.category}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </View>

              {(selectedFilters.genre || selectedFilters.author || selectedFilters.language) && (
                <View style={styles.activeFiltersContainer}>
                  <Text style={styles.activeFiltersLabel}>Aktywne filtry:</Text>

                  {selectedFilters.genre && (
                    <View style={styles.activeFilter}>
                      <BookOpenIcon width={12} height={12} fill="white" opacity={0.7} />
                      <Text style={styles.activeFilterText}>{selectedFilters.genre}</Text>
                      <TouchableOpacity
                        onPress={() => selectFilter('genre', null)}
                        style={styles.removeFilterButton}>
                        <Text style={styles.removeFilterButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedFilters.author && (
                    <View style={styles.activeFilter}>
                      <UserIcon width={12} height={12} fill="white" opacity={0.7} />
                      <Text style={styles.activeFilterText}>{selectedFilters.author}</Text>
                      <TouchableOpacity
                        onPress={() => selectFilter('author', null)}
                        style={styles.removeFilterButton}>
                        <Text style={styles.removeFilterButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedFilters.language && (
                    <View style={styles.activeFilter}>
                      <Svg width={12} height={12} viewBox="0 0 20 20" fill="white" opacity={0.7}>
                        <Path
                          fillRule="evenodd"
                          d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                          clipRule="evenodd"
                        />
                      </Svg>
                      <Text style={styles.activeFilterText}>{selectedFilters.language}</Text>
                      <TouchableOpacity
                        onPress={() => selectFilter('language', null)}
                        style={styles.removeFilterButton}>
                        <Text style={styles.removeFilterButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {(selectedFilters.genre ||
                    selectedFilters.author ||
                    selectedFilters.language) && (
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedFilters({
                          genre: null,
                          author: null,
                          language: null,
                        })
                      }
                      style={styles.clearFiltersButton}>
                      <Text style={styles.clearFiltersButtonText}>Wyczyść wszystkie</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.recommendationsContainer}>
                {selectedFilters.genre || selectedFilters.author || selectedFilters.language ? (
                  <View>
                    <View style={styles.sectionHeaderContainer}>
                      <Text style={styles.sectionHeaderTitle}>
                        Rekomendacje dopasowane do filtrów
                      </Text>
                    </View>

                    {isLoading ? (
                      <View>
                        {[1, 2, 3, 4].map((i) => (
                          <BookSkeleton key={i} />
                        ))}
                      </View>
                    ) : filteredBooks.length > 0 ? (
                      <View>{filteredBooks.map((book) => renderBookCard(book))}</View>
                    ) : (
                      <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateTitle}>
                          Nie znaleziono książek spełniających wszystkie kryteria
                        </Text>
                        <Text style={styles.emptyStateText}>
                          Spróbuj użyć mniejszej liczby filtrów lub wybierz inne kategorie
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    {getActiveRecommendations().map(({ type, recommendations, title }) => (
                      <View key={type} style={styles.categorySection}>
                        <View style={styles.sectionHeaderContainer}>
                          {type === 'genre' ? (
                            <Svg
                              width={22}
                              height={22}
                              viewBox="0 0 20 20"
                              fill={theme.primaryColor}>
                              <Path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                            </Svg>
                          ) : type === 'author' ? (
                            <Svg
                              width={22}
                              height={22}
                              viewBox="0 0 20 20"
                              fill={theme.primaryColor}>
                              <Path
                                fillRule="evenodd"
                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clipRule="evenodd"
                              />
                            </Svg>
                          ) : (
                            <Svg
                              width={22}
                              height={22}
                              viewBox="0 0 20 20"
                              fill={theme.primaryColor}>
                              <Path
                                fillRule="evenodd"
                                d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                                clipRule="evenodd"
                              />
                            </Svg>
                          )}
                          <Text style={styles.sectionHeaderTitle}>{title}</Text>
                        </View>

                        <View style={styles.categoryGroups}>
                          {recommendations.length > 0 ? (
                            recommendations.map((group) => {
                              const key = `${type}-${group.category}`;
                              const isExpanded = expandedSections[key] ?? false;
                              const isLoading = loadingCategories[key] ?? false;

                              return (
                                <View key={key} style={styles.categoryCard}>
                                  <TouchableOpacity
                                    onPress={() => toggleSection(type, group.category)}
                                    style={styles.categoryCardHeader}>
                                    <Text style={styles.categoryCardTitle}>{group.category}</Text>
                                    <View style={styles.categoryCardActions}>
                                      {isExpanded && isLoading && (
                                        <ActivityIndicator
                                          size="small"
                                          color={theme.primaryColor}
                                          style={styles.loadingIndicator}
                                        />
                                      )}
                                      <Text
                                        style={[
                                          styles.expandIcon,
                                          isExpanded && styles.expandIconRotated,
                                        ]}>
                                        {'▼'}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>

                                  {isExpanded && (
                                    <View style={styles.expandedContent}>
                                      {isLoading ? (
                                        <View style={styles.expandedContentInner}>
                                          {[1, 2].map((i) => (
                                            <BookSkeleton key={i} />
                                          ))}
                                        </View>
                                      ) : group.books && group.books.length > 0 ? (
                                        <View style={styles.expandedContentInner}>
                                          {group.books?.map((book) => renderBookCard(book))}
                                        </View>
                                      ) : (
                                        <View style={styles.emptyContentContainer}>
                                          <Text style={styles.emptyContentText}>
                                            Nie znaleziono książek
                                            {type === 'genre'
                                              ? 'w tej kategorii'
                                              : type === 'author'
                                                ? 'tego autora'
                                                : 'w tym języku'}
                                            .
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  )}
                                </View>
                              );
                            })
                          ) : (
                            <View style={styles.emptyCategory}>
                              <Text style={styles.emptyCategoryText}>
                                Nie znaleziono rekomendacji dla
                                {type === 'genre'
                                  ? 'gatunków'
                                  : type === 'author'
                                    ? 'autorów'
                                    : 'języków'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noRecommendationsContainer}>
              <BookOpenIcon width={48} height={48} fill={theme.gray400} />
              <Text style={styles.noRecommendationsTitle}>
                Brak spersonalizowanych rekomendacji
              </Text>
              <Text style={styles.noRecommendationsText}>
                Aby otrzymać spersonalizowane rekomendacje:
              </Text>
              <View style={styles.recommendationTips}>
                <Text style={styles.recommendationTip}>
                  • Oceń więcej książek (minimum 7/10 gwiazdek)
                </Text>
                <Text style={styles.recommendationTip}>
                  • Przeglądaj i oceniaj książki z różnych gatunków
                </Text>
                <Text style={styles.recommendationTip}>• Sprawdź książki różnych autorów</Text>
              </View>
            </View>
          )}
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
  content: {
    padding: 16,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
  },
  filtersContainer: {
    backgroundColor: '#f9fafb',
    paddingTop: 16,
    paddingBottom: 12,
    marginBottom: 24,
  },
  filtersTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    color: '#374151',
  },
  filterGroups: {
    gap: 12,
  },
  filterGroup: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterGroupTitle: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    color: theme.primaryColor,
  },
  filtersScrollView: {
    maxHeight: 96,
  },
  filtersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingRight: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: theme.primaryColor,
    borderWidth: 0,
  },
  filterButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#6b7280',
    alignSelf: 'center',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeFilterText: {
    marginLeft: 4,
    fontSize: 12,
    color: 'white',
  },
  removeFilterButton: {
    marginLeft: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFilterButtonText: {
    color: 'white',
    fontSize: 10,
  },
  clearFiltersButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 4,
  },
  clearFiltersButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  recommendationsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 12,
    marginBottom: 24,
  },
  sectionHeaderTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryGroups: {
    gap: 16,
  },
  categoryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  categoryCardHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryCardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  categoryCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  expandIcon: {
    fontSize: 18,
    color: '#9ca3af',
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
  },
  expandedContentInner: {
    paddingTop: 8,
  },
  emptyContentContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContentText: {
    color: '#6b7280',
  },
  emptyCategory: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
  },
  emptyCategoryText: {
    color: '#6b7280',
  },
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
  skeletonHeader: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  skeletonHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  skeletonTitle: {
    height: 12,
    backgroundColor: '#d1d5db',
    borderRadius: 4,
    width: '75%',
  },
  skeletonRating: {
    height: 12,
    backgroundColor: '#d1d5db',
    borderRadius: 4,
    width: 32,
  },
  skeletonCover: {
    width: 80,
    height: 112,
    backgroundColor: '#e5e7eb',
  },
  skeletonAuthorContainer: {
    marginBottom: 8,
  },
  skeletonAuthorLabel: {
    height: 8,
    backgroundColor: '#d1d5db',
    borderRadius: 4,
    width: 64,
    marginBottom: 4,
  },
  skeletonAuthorLine1: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    width: '100%',
    marginBottom: 4,
  },
  skeletonAuthorLine2: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    width: '66%',
  },
  skeletonMetadataItem1: {
    height: 8,
    backgroundColor: '#d1d5db',
    borderRadius: 4,
    width: 48,
  },
  skeletonMetadataItem2: {
    height: 8,
    backgroundColor: '#d1d5db',
    borderRadius: 4,
    width: 64,
  },
  skeletonGenreContainer: {
    marginBottom: 8,
  },
  skeletonGenreBadge: {
    height: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    width: 80,
  },
  skeletonDetailsButton: {
    height: 24,
    backgroundColor: '#d1d5db',
    borderRadius: 4,
    width: 96,
  },
  emptyStateContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  noRecommendationsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noRecommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  noRecommendationsText: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  recommendationTips: {
    alignItems: 'center',
  },
  recommendationTip: {
    color: '#6b7280',
    fontSize: 12,
  },
});
