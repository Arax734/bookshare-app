import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TabParamList } from '../navigation/BottomTabNavigator';
import BookCover from '../components/BookCover';
import { UserIcon } from '../components/svg-icons/UserIcon';
import { BookOpenIcon } from '../components/svg-icons/BookOpenIcon';
import { MapPinIcon } from '../components/svg-icons/MapPinIcon';
import { TagIcon } from '../components/svg-icons/TagIcon';
import { BackIcon } from '../components/svg-icons/BackIcon';
import { BookmarkIcon } from '../components/svg-icons/BookmarkIcon';
import { FireIcon } from '../components/svg-icons/FireIcon';
import { StarIcon } from '../components/svg-icons/StarIcon';
import { db } from '../firebase/config';
import { doc, setDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { splitAuthors } from '../utils/stringUtils';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import BookReview from '../components/BookReview';

type BookScreenRouteProp = RouteProp<TabParamList, 'Book'>;
type BookScreenNavigationProp = StackNavigationProp<TabParamList, 'Book'>;

type Props = {
  route: BookScreenRouteProp;
  navigation: BookScreenNavigationProp;
};

const handleGoBack = (navigation: BookScreenNavigationProp, route: BookScreenRouteProp) => {
  const { sourceScreen, userId, userName } = route.params;

  if (!sourceScreen) {
    navigation.goBack();
    return;
  }

  switch (sourceScreen) {
    case 'Profile':
      if (userId) {
        navigation.navigate('Profile', { userId });
      }
      break;
    case 'Exchange':
    case 'Desires':
    case 'Favorites':
    case 'Reviews':
      if (userId) {
        navigation.navigate(sourceScreen, { userId, userName });
      }
      break;
    case 'Home':
    case 'Library':
    case 'Bookshelf':
    case 'Contacts':
    case 'Exchanges':
    case 'Menu':
    case 'Settings':
      navigation.navigate(sourceScreen);
      break;
    default:
      navigation.goBack();
  }
};

interface BookDetails {
  id: number;
  title: string;
  author: string;
  publicationYear: string;
  publisher: string;
  placeOfPublication: string;
  language: string;
  subject: string;
  genre: string;
  domain: string;
  isbnIssn?: string;
  nationalBibliographyNumber?: string;
  marc: {
    leader: string;
    fields: Array<any>;
  };
  averageRating?: number;
  totalReviews?: number;
  kind: string;
  formOfWork: string;
  subjectPlace: string;
  subjectTime: string;
  languageOfOriginal: string;
  zone: string;
  createdDate: string;
  updatedDate: string;
}

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

const BookScreen = ({ route, navigation }: Props) => {
  const { bookId } = route.params;
  const { user } = useAuth();
  const [book, setBook] = useState<BookDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverVisible, setCoverVisible] = useState(true);
  const [hasBook, setHasBook] = useState(false);
  const [wantsToRead, setWantsToRead] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

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
  useEffect(() => {
    setBook(null);
    setIsLoading(true);
    setError(null);
    setCoverVisible(true);

    const fetchBookDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const paddedId = bookId.padStart(14, '0');
        const response = await fetch(
          `https://data.bn.org.pl/api/networks/bibs.json?id=${paddedId}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!data.bibs || !data.bibs[0]) {
          throw new Error('Book not found');
        }

        setBook(data.bibs[0]);
      } catch (err: any) {
        setError('Nie udało się pobrać szczegółów książki');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookDetails();
  }, [bookId]);

  useEffect(() => {
    if (book) {
      if (!book.isbnIssn || book.isbnIssn.trim() === '') {
        setCoverVisible(false);
      } else {
        setCoverVisible(true);
      }
    }
  }, [book]);

  useEffect(() => {
    const checkStatuses = async () => {
      if (!user) return;

      try {
        const ownershipRef = doc(db, 'bookOwnership', `${user.uid}_${bookId}`);
        const desireRef = doc(db, 'bookDesire', `${user.uid}_${bookId}`);
        const favoriteRef = doc(db, 'bookFavorites', `${user.uid}_${bookId}`);

        const [ownershipSnap, desireSnap, favoriteSnap] = await Promise.all([
          getDoc(ownershipRef),
          getDoc(desireRef),
          getDoc(favoriteRef),
        ]);

        setHasBook(ownershipSnap.exists());
        setWantsToRead(desireSnap.exists());
        setIsFavorite(favoriteSnap.exists());
      } catch (error) {
        console.error('Error checking book statuses:', error);
      }
    };

    checkStatuses();
  }, [user, bookId]);

  const toggleHasBook = async () => {
    if (!user) return;

    try {
      setIsActionLoading(true);
      const docRef = doc(db, 'bookOwnership', `${user.uid}_${bookId}`);
      if (!hasBook) {
        await setDoc(docRef, {
          userId: user.uid,
          bookId: bookId,
          status: null,
          createdAt: Timestamp.now(),
        });
        setHasBook(true);
      } else {
        await deleteDoc(docRef);
        setHasBook(false);
      }
    } catch (error) {
      console.error('Error toggling ownership:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleWantsToRead = async () => {
    if (!user) return;

    try {
      setIsActionLoading(true);
      const docRef = doc(db, 'bookDesire', `${user.uid}_${bookId}`);

      if (!wantsToRead) {
        await setDoc(docRef, {
          userId: user.uid,
          bookId: bookId,
          createdAt: Timestamp.now(),
        });
        setWantsToRead(true);
      } else {
        await deleteDoc(docRef);
        setWantsToRead(false);
      }
    } catch (error) {
      console.error('Error toggling desire:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) return;

    try {
      setIsActionLoading(true);
      const docRef = doc(db, 'bookFavorites', `${user.uid}_${bookId}`);

      if (!isFavorite) {
        await setDoc(docRef, {
          userId: user.uid,
          bookId: bookId,
          createdAt: Timestamp.now(),
        });
        setIsFavorite(true);
      } else {
        await deleteDoc(docRef);
        setIsFavorite(false);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007304" />
          <Text style={styles.loadingText}>Ładowanie...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => handleGoBack(navigation, route)}>
            <Text style={styles.buttonText}>Wróć do listy książek</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.notFoundText}>Nie znaleziono książki</Text>
          <TouchableOpacity style={styles.button} onPress={() => handleGoBack(navigation, route)}>
            <Text style={styles.buttonText}>Wróć do listy książek</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => handleGoBack(navigation, route)}
            accessibilityLabel="Wróć do poprzedniego ekranu">
            <BackIcon width={24} height={24} stroke="white" />
          </TouchableOpacity>
          <Text style={styles.title}>{formatBookTitle(book.title)}</Text>
        </View>

        <View style={styles.actionButtonsContainerTop}>
          <TouchableOpacity
            style={[styles.actionButtonTop, styles.ownButton, hasBook && styles.ownButtonActive]}
            onPress={toggleHasBook}
            disabled={isActionLoading}
            accessibilityLabel="Oznacz, że posiadasz tę książkę">
            {isActionLoading ? (
              <ActivityIndicator size="small" color={hasBook ? 'white' : '#3b82f6'} />
            ) : (
              <BookmarkIcon width={28} height={28} fill={hasBook ? 'white' : '#3b82f6'} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButtonTop,
              styles.wantToReadButton,
              wantsToRead && styles.wantToReadButtonActive,
            ]}
            onPress={toggleWantsToRead}
            disabled={isActionLoading}
            accessibilityLabel="Oznacz, że chcesz przeczytać tę książkę">
            {isActionLoading ? (
              <ActivityIndicator size="small" color={wantsToRead ? 'white' : '#8b5cf6'} />
            ) : (
              <FireIcon width={28} height={28} fill={wantsToRead ? 'white' : '#8b5cf6'} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButtonTop,
              styles.favoriteButton,
              isFavorite && styles.favoriteButtonActive,
            ]}
            onPress={toggleFavorite}
            disabled={isActionLoading}
            accessibilityLabel="Dodaj do ulubionych">
            {isActionLoading ? (
              <ActivityIndicator size="small" color={isFavorite ? 'white' : '#eab308'} />
            ) : (
              <StarIcon width={28} height={28} fill={isFavorite ? 'white' : '#eab308'} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.bookMainInfo}>
            {coverVisible && (
              <View style={styles.coverContainer}>
                <BookCover
                  isbn={book.isbnIssn}
                  title={book.title}
                  size="M"
                  onError={() => setCoverVisible(false)}
                />
              </View>
            )}

            <View style={styles.infoContainer}>
              <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                  <UserIcon width={16} height={16} fill="#007304" />
                  <Text style={styles.sectionTitle}>Autorzy</Text>
                </View>
                {book.author ? (
                  <View style={styles.authorsList}>
                    {splitAuthors(book.author).map((author, index) => (
                      <View key={index} style={styles.authorItem}>
                        <View style={styles.authorBullet} />
                        <Text style={styles.authorName} numberOfLines={1}>
                          {author}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyValue}>Nieznany autor</Text>
                )}
              </View>
            </View>
          </View>

          {/* Book details grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
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
                <Text style={styles.detailTitle}>Rok</Text>
              </View>
              <Text style={styles.detailValue}>{book.publicationYear || '—'}</Text>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <Svg width={12} height={12} viewBox="0 0 20 20" fill={theme.primaryColor}>
                  <Path
                    fillRule="evenodd"
                    d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                    clipRule="evenodd"
                  />
                </Svg>
                <Text style={styles.detailTitle}>Język</Text>
              </View>
              <Text style={styles.detailValue}>{book.language || '—'}</Text>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <BookOpenIcon width={16} height={16} fill="#007304" />
                <Text style={styles.detailTitle}>Wydawca</Text>
              </View>
              <Text style={styles.detailValue}>{book.publisher || '—'}</Text>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MapPinIcon width={16} height={16} fill="#007304" />
                <Text style={styles.detailTitle}>Miejsce wydania</Text>
              </View>
              <Text style={styles.detailValue}>
                {book.placeOfPublication?.split(':')[0].trim() || '—'}
              </Text>
            </View>
          </View>

          {(book.genre || book.subject || book.domain) && (
            <View style={styles.tagsContainer}>
              {book.genre && <Text style={styles.genreTag}>{book.genre}</Text>}
              {book.subject && <Text style={styles.subjectTag}>{book.subject}</Text>}
              {book.domain && <Text style={styles.domainTag}>{book.domain}</Text>}
            </View>
          )}

          {(book.isbnIssn || book.nationalBibliographyNumber) && (
            <View style={styles.identifiersContainer}>
              {book.isbnIssn && (
                <View style={styles.identifierItem}>
                  <Text style={styles.identifierLabel}>ISBN/ISSN</Text>
                  <Text style={styles.identifierValue}>{book.isbnIssn}</Text>
                </View>
              )}
              {book.nationalBibliographyNumber && (
                <View style={styles.identifierItem}>
                  <Text style={styles.identifierLabel}>Nr bibl. narodowej</Text>
                  <Text style={styles.identifierValue}>{book.nationalBibliographyNumber}</Text>
                </View>
              )}
            </View>
          )}

          {(book.kind || book.formOfWork || book.subjectPlace || book.subjectTime) && (
            <View style={styles.additionalInfoContainer}>
              <View style={styles.additionalInfoHeader}>
                <TagIcon width={16} height={16} fill="#007304" />
                <Text style={styles.additionalInfoTitle}>Dodatkowe informacje</Text>
              </View>
              <View style={styles.additionalInfoGrid}>
                {book.kind && (
                  <View style={styles.additionalInfoItem}>
                    <Text style={styles.additionalInfoLabel}>Rodzaj: </Text>
                    <Text style={styles.additionalInfoValue}>{book.kind}</Text>
                  </View>
                )}
                {book.formOfWork && (
                  <View style={styles.additionalInfoItem}>
                    <Text style={styles.additionalInfoLabel}>Forma: </Text>
                    <Text style={styles.additionalInfoValue}>
                      {book.formOfWork
                        .toLowerCase()
                        .split(' ')
                        .filter((word) => word !== 'i')
                        .join(', ')
                        .replace(/,$/, '')}
                    </Text>
                  </View>
                )}
                {book.subjectPlace && (
                  <View style={styles.additionalInfoItem}>
                    <Text style={styles.additionalInfoLabel}>Zakres terytorialny: </Text>
                    <Text style={styles.additionalInfoValue}>{book.subjectPlace}</Text>
                  </View>
                )}
                {book.subjectTime && (
                  <View style={styles.additionalInfoItem}>
                    <Text style={styles.additionalInfoLabel}>Zakres czasowy: </Text>
                    <Text style={styles.additionalInfoValue}>{book.subjectTime}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.reviewsContainer}>
            <BookReview bookId={bookId} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  reviewsContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  scrollContent: {
    padding: 16,
  },
  actionButtonsContainerTop: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  actionButtonTop: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  ownButton: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  ownButtonActive: {
    backgroundColor: '#ef4444',
    borderWidth: 0,
  },
  wantToReadButton: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  wantToReadButtonActive: {
    backgroundColor: '#8b5cf6',
    borderWidth: 0,
  },
  favoriteButton: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#eab308',
  },
  favoriteButtonActive: {
    backgroundColor: '#eab308',
    borderWidth: 0,
  },
  header: {
    backgroundColor: '#007304',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookMainInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  coverContainer: {
    width: 120,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  infoSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  authorsList: {
    gap: 4,
  },
  authorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007304',
    marginRight: 8,
  },
  authorName: {
    fontSize: 14,
    color: '#4b5563',
  },
  emptyValue: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  detailItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    width: '48%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#4b5563',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 6,
  },
  genreTag: {
    backgroundColor: '#e0f2fe',
    color: '#075985',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  subjectTag: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  domainTag: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  identifiersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  identifierItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    width: '48%',
  },
  identifierLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 4,
  },
  identifierValue: {
    fontSize: 14,
    color: '#111827',
  },
  additionalInfoContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  additionalInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  additionalInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  additionalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  additionalInfoItem: {
    flexDirection: 'row',
    width: '48%',
    marginBottom: 4,
  },
  additionalInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  additionalInfoValue: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563',
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
    marginBottom: 16,
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007304',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  actionButtonsContainer: {
    display: 'none',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: theme.primaryColor,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.primaryColor,
    textAlign: 'center',
  },
  actionButtonTextActive: {
    color: 'white',
  },
});

export default BookScreen;
