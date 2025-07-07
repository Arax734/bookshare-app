import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  deleteDoc,
  addDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useAuth } from '../hooks/useAuth';
import { Svg, Path } from 'react-native-svg';
import LoadingSpinner from '../components/LoadingSpinner';
import { TabParamList } from '../navigation/BottomTabNavigator';

interface Review {
  id: string;
  userId: string;
  bookId: string;
  rating: number;
  comment: string;
  userEmail: string;
  userDisplayName?: string;
  userPhotoURL?: string;
  createdAt: any;
  bookTitle?: string;
  bookAuthor?: string;
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  reviewsCount: number;
  averageRating: number;
  phoneNumber?: string;
  creationTime?: string;
  bio?: string;
  booksCount: number;
}

type ProfileScreenRouteParams = {
  userId: string;
};

const ProfileScreen = () => {
  const navigation = useNavigation<StackNavigationProp<TabParamList>>();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { userId } = route.params as ProfileScreenRouteParams;
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [displayedReviews, setDisplayedReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContact, setIsContact] = useState(false);
  const [contactDocId, setContactDocId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [invitationDirection, setInvitationDirection] = useState<'sent' | 'received' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [displayedDesiredBooks, setDisplayedDesiredBooks] = useState<
    {
      id: string;
      title: string;
      author: string;
      createdAt: Date;
    }[]
  >([]);
  const [displayedExchangeBooks, setDisplayedExchangeBooks] = useState<
    {
      id: string;
      title: string;
      author: string;
      createdAt: Date;
    }[]
  >([]);
  const [totalExchangeBooks, setTotalExchangeBooks] = useState(0);
  const [totalOwnedBooks, setTotalOwnedBooks] = useState(0);
  const [displayedFavoriteBooks, setDisplayedFavoriteBooks] = useState<
    {
      id: string;
      title: string;
      author: string;
      createdAt: Date;
    }[]
  >([]);
  const [totalFavoriteBooks, setTotalFavoriteBooks] = useState(0);

  const checkContactStatus = async (profileUserId: string) => {
    if (!user) return;

    try {
      const contactAsUserQuery = query(
        collection(db, 'userContacts'),
        where('userId', '==', user.uid),
        where('contactId', '==', profileUserId)
      );

      const contactAsContactQuery = query(
        collection(db, 'userContacts'),
        where('userId', '==', profileUserId),
        where('contactId', '==', user.uid)
      );

      const [userQuerySnapshot, contactQuerySnapshot] = await Promise.all([
        getDocs(contactAsUserQuery),
        getDocs(contactAsContactQuery),
      ]);

      if (!userQuerySnapshot.empty) {
        const userContact = userQuerySnapshot.docs[0].data();
        if (userContact.status === 'accepted') {
          setIsContact(true);
          setContactDocId(userQuerySnapshot.docs[0].id);
          setIsPending(false);
          setInvitationDirection(null);
        } else if (userContact.status === 'pending') {
          setIsContact(false);
          setIsPending(true);
          setInvitationDirection('sent');
        }
      } else if (!contactQuerySnapshot.empty) {
        const profileContact = contactQuerySnapshot.docs[0].data();
        if (profileContact.status === 'accepted') {
          setIsContact(true);
          setContactDocId(contactQuerySnapshot.docs[0].id);
          setIsPending(false);
          setInvitationDirection(null);
        } else if (profileContact.status === 'pending') {
          setIsContact(false);
          setIsPending(true);
          setContactDocId(contactQuerySnapshot.docs[0].id);
          setInvitationDirection('received');
        }
      } else {
        setIsContact(false);
        setIsPending(false);
        setInvitationDirection(null);
      }
    } catch (error) {
      console.error('Error checking contact status:', error);
      setIsContact(false);
      setIsPending(false);
      setInvitationDirection(null);
    }
  };
  const fetchBookDetails = async (bookId: string) => {
    const paddedId = bookId.padStart(14, '0');
    try {
      const bookDoc = await getDoc(doc(db, 'books', paddedId));
      if (bookDoc.exists()) {
        return bookDoc.data();
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
          title: bookData.title,
          author: bookData.author,
        };
      }

      console.log('Nie znaleziono książki o ID:', paddedId);
      return null;
    } catch (error) {
      console.error('Error fetching book details:', error);
      return null;
    }
  };
  useEffect(() => {
    setUserProfile(null);
    setDisplayedReviews([]);
    setIsLoading(true);
    setError(null);
    setIsContact(false);
    setContactDocId(null);
    setIsPending(false);
    setInvitationDirection(null);
    setDisplayedDesiredBooks([]);
    setDisplayedExchangeBooks([]);
    setDisplayedFavoriteBooks([]);
    setTotalExchangeBooks(0);
    setTotalOwnedBooks(0);
    setTotalFavoriteBooks(0);
  }, [userId]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      console.log('Rozpoczynam pobieranie profilu użytkownika dla ID:', userId);
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.log('Nie znaleziono dokumentu użytkownika');
          setError('Nie znaleziono użytkownika');
          return;
        }
        console.log('Dokument użytkownika znaleziony');

        const userData = userDoc.data();

        const desiredBooksQuery = query(
          collection(db, 'bookDesire'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const exchangeBooksQuery = query(
          collection(db, 'bookOwnership'),
          where('userId', '==', userId),
          where('status', '==', 'forExchange'),
          orderBy('createdAt', 'desc')
        );

        const favoriteBooksQuery = query(
          collection(db, 'bookFavorites'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const unsubscribeDesired = onSnapshot(desiredBooksQuery, async (snapshot) => {
          const booksCount = snapshot.size;
          setTotalOwnedBooks(booksCount);

          const bookIds = snapshot.docs.slice(0, 5).map((doc) => ({
            id: doc.data().bookId,
            createdAt: doc.data().createdAt.toDate(),
          }));

          const books = await Promise.all(
            bookIds.map(async ({ id, createdAt }) => {
              const bookDetails = await fetchBookDetails(id);
              return {
                id,
                title: bookDetails?.title || 'Książka niedostępna',
                author: bookDetails?.author || 'Autor nieznany',
                createdAt,
              };
            })
          );
          console.log('Poszukiwane książki (real-time):', books);
          setDisplayedDesiredBooks(books);
        });

        const unsubscribeExchange = onSnapshot(exchangeBooksQuery, async (snapshot) => {
          setTotalExchangeBooks(snapshot.size);

          const bookIds = snapshot.docs.slice(0, 5).map((doc) => ({
            id: doc.data().bookId,
            createdAt: doc.data().createdAt.toDate(),
          }));

          const books = await Promise.all(
            bookIds.map(async ({ id, createdAt }) => {
              const bookDetails = await fetchBookDetails(id);
              return {
                id,
                title: bookDetails?.title || 'Książka niedostępna',
                author: bookDetails?.author || 'Autor nieznany',
                createdAt,
              };
            })
          );
          console.log('Książki na wymianę (real-time):', books);
          setDisplayedExchangeBooks(books);
        });

        const unsubscribeFavorite = onSnapshot(favoriteBooksQuery, async (snapshot) => {
          setTotalFavoriteBooks(snapshot.size);

          const bookIds = snapshot.docs.slice(0, 5).map((doc) => ({
            id: doc.data().bookId,
            createdAt: doc.data().createdAt.toDate(),
          }));

          const books = await Promise.all(
            bookIds.map(async ({ id, createdAt }) => {
              const bookDetails = await fetchBookDetails(id);
              return {
                id,
                title: bookDetails?.title || 'Książka niedostępna',
                author: bookDetails?.author || 'Autor nieznany',
                createdAt,
              };
            })
          );
          console.log('Ulubione książki (real-time):', books);
          setDisplayedFavoriteBooks(books);
        });
        const allBooksQuery = query(collection(db, 'bookOwnership'), where('userId', '==', userId));
        const allBooksSnapshot = await getDocs(allBooksQuery);
        const totalBooksCount = allBooksSnapshot.size;

        const userProfile = {
          id: userId,
          email: userData.email,
          displayName: userData.displayName || 'Użytkownik anonimowy',
          photoURL: userData.photoURL,
          reviewsCount: userData.reviewsCount || 0,
          averageRating: userData.averageRating || 0.0,
          phoneNumber: userData.phoneNumber,
          creationTime: userData.createdAt?.toDate()?.toISOString(),
          bio: userData.bio,
          booksCount: totalBooksCount,
        };

        setUserProfile(userProfile);

        if (user && user.uid !== userId) {
          await checkContactStatus(userId);
        }

        const unsubscribeUser = onSnapshot(userDocRef, (userSnapshot) => {
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setUserProfile((prevProfile) =>
              prevProfile
                ? {
                    ...prevProfile,
                    reviewsCount: userData.reviewsCount || 0,
                    averageRating: userData.averageRating || 0.0,
                  }
                : null
            );
          }
        });

        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        const unsubscribeReviews = onSnapshot(reviewsQuery, async (snapshot) => {
          const reviewsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Review[];

          const reviewsWithBooks = await Promise.all(
            reviewsData.map(async (review) => {
              const bookDetails = await fetchBookDetails(review.bookId);
              return {
                ...review,
                bookTitle: bookDetails?.title || 'Książka niedostępna',
                bookAuthor: bookDetails?.author || 'Autor nieznany',
              };
            })
          );
          console.log('Zaktualizowane recenzje:', reviewsWithBooks);
          setDisplayedReviews(reviewsWithBooks);
        });

        return () => {
          unsubscribeUser();
          unsubscribeReviews();
          unsubscribeDesired();
          unsubscribeExchange();
          unsubscribeFavorite();
        };
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Nie udało się załadować profilu użytkownika');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, user]);

  interface Book {
    id: string;
    title: string;
    author: string;
    imageUrl?: string;
  }

  interface ReviewWithBook extends Review {
    book?: Book;
  }

  const [userReviews, setUserReviews] = useState<ReviewWithBook[]>([]);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeUser = onSnapshot(userDocRef, (userSnapshot) => {
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        setUserProfile((prevProfile) =>
          prevProfile
            ? {
                ...prevProfile,
                reviewsCount: userData?.reviewsCount || 0,
                averageRating: userData?.averageRating || 0.0,
              }
            : null
        );
      }
    });

    const unsubscribeReviews = onSnapshot(reviewsQuery, async (snapshot) => {
      setIsLoading(true);
      try {
        const reviewsData = await Promise.all(
          snapshot.docs.map(async (docSnapshot) => {
            const reviewData = {
              id: docSnapshot.id,
              ...docSnapshot.data(),
            } as Review;

            const bookRef = doc(db, 'books', reviewData.bookId);
            const bookSnapshot = await getDoc(bookRef);
            const bookData = bookSnapshot.exists()
              ? ({ id: bookSnapshot.id, ...bookSnapshot.data() } as Book)
              : undefined;

            return {
              ...reviewData,
              book: bookData,
            } as ReviewWithBook;
          })
        );
        setUserReviews(reviewsData);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeReviews();
    };
  }, [user]);

  const defaultAvatar = require('../assets/images/default-avatar.png');

  const formatPhoneNumber = (phone: string | undefined) => {
    if (!phone) return 'Nie podano';

    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.length === 9) {
      return digitsOnly.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('48')) {
      return digitsOnly.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
    } else if (digitsOnly.length > 9) {
      return digitsOnly.match(/.{1,3}/g)?.join(' ') || digitsOnly;
    }

    return phone;
  };
  const performFullRefresh = useCallback(async () => {
    if (!user) return;

    setRefreshing(true);
    setError(null);

    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('Nie znaleziono użytkownika');
        return;
      }

      const userData = userDoc.data();

      const allBooksQuery = query(collection(db, 'bookOwnership'), where('userId', '==', userId));
      const allBooksSnapshot = await getDocs(allBooksQuery);
      const totalBooksCount = allBooksSnapshot.size;

      const refreshedProfile = {
        id: userId,
        email: userData.email,
        displayName: userData.displayName || 'Użytkownik anonimowy',
        photoURL: userData.photoURL,
        reviewsCount: userData.reviewsCount || 0,
        averageRating: userData.averageRating || 0.0,
        phoneNumber: userData.phoneNumber,
        creationTime: userData.createdAt?.toDate()?.toISOString(),
        bio: userData.bio,
        booksCount: totalBooksCount,
      };

      setUserProfile(refreshedProfile);

      if (user && user.uid !== userId) {
        await checkContactStatus(userId);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setError('Nie udało się odświeżyć profilu użytkownika');
    } finally {
      setRefreshing(false);
    }
  }, [user, userId]);

  if (isLoading || !userProfile) return <LoadingSpinner />;

  if (error)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );

  console.log('Rendering user profile with data:', {
    displayedExchangeBooks: displayedExchangeBooks.length,
    displayedDesiredBooks: displayedDesiredBooks.length,
    displayedReviews: displayedReviews.length,
  });
  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={performFullRefresh}
          colors={['#4F46E5']}
          tintColor="#4F46E5"
        />
      }>
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Image
            source={userProfile.photoURL ? { uri: userProfile.photoURL } : defaultAvatar}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{userProfile.displayName}</Text>
            <View style={styles.contactInfoItem}>
              <Svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7280"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: 4 }}>
                <Path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </Svg>
              <Text style={styles.email}>{userProfile.email}</Text>
            </View>
            <View style={styles.contactInfoItem}>
              <Svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7280"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: 4 }}>
                <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </Svg>
              <Text style={styles.phone}>{formatPhoneNumber(userProfile.phoneNumber)}</Text>
            </View>
          </View>
        </View>

        {user && user.uid !== userId && (
          <View style={styles.contactActions}>
            {isContact ? (
              <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.exchangeButton]}
                  onPress={() =>
                    navigation.navigate('UserExchange', {
                      userId: userProfile.id,
                      userName: userProfile.displayName || 'Użytkownik',
                    })
                  }>
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonIcon}>
                      <Svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <Path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </Svg>
                    </View>
                    <Text style={styles.buttonText}>Wymiana z użytkownikiem</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={async () => {
                    if (!contactDocId) return;
                    try {
                      await deleteDoc(doc(db, 'userContacts', contactDocId));
                      setIsContact(false);
                      setContactDocId(null);
                    } catch (error) {
                      console.error('Error removing contact:', error);
                    }
                  }}>
                  <Text style={styles.buttonText}>Usuń ze znajomych</Text>
                </TouchableOpacity>
              </View>
            ) : isPending ? (
              invitationDirection === 'received' ? (
                <View style={styles.invitationContainer}>
                  <Text style={styles.invitationText}>Ta osoba wysłała Ci zaproszenie:</Text>
                  <View style={styles.invitationButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={async () => {
                        if (!contactDocId) return;
                        try {
                          await updateDoc(doc(db, 'userContacts', contactDocId), {
                            status: 'accepted',
                          });
                          setIsContact(true);
                          setIsPending(false);
                        } catch (error) {
                          console.error('Error accepting invite:', error);
                        }
                      }}>
                      <Text style={styles.buttonText}>Akceptuj</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={async () => {
                        if (!contactDocId) return;
                        try {
                          await deleteDoc(doc(db, 'userContacts', contactDocId));
                          setIsContact(false);
                          setContactDocId(null);
                          setIsPending(false);
                        } catch (error) {
                          console.error('Error rejecting invite:', error);
                        }
                      }}>
                      <Text style={styles.buttonText}>Odrzuć</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.pendingButton]}
                  disabled={true}>
                  <Text style={styles.buttonText}>Zaproszenie wysłane</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.addButton]}
                onPress={async () => {
                  if (!user) return;
                  try {
                    await addDoc(collection(db, 'userContacts'), {
                      userId: user.uid,
                      contactId: userProfile.id,
                      createdAt: new Date(),
                      status: 'pending',
                    });
                    setIsPending(true);
                  } catch (error) {
                    console.error('Error adding contact:', error);
                  }
                }}>
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIcon}>
                    <Svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <Path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </Svg>
                  </View>
                  <Text style={styles.buttonText}>Wyślij zaproszenie</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {userProfile.bio && (
          <View style={styles.bioSection}>
            <View style={styles.bioHeader}>
              <Svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4b5563"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: 6 }}>
                <Path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </Svg>
              <Text style={styles.bioHeaderText}>O mnie</Text>
            </View>
            <Text style={styles.bioText}>{userProfile.bio}</Text>
          </View>
        )}

        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <Path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </Svg>
            </View>
            <Text style={styles.statValue}>{userProfile.booksCount}</Text>
            <Text style={styles.statLabel}>Książek</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <Path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </Svg>
            </View>
            <Text style={styles.statValue}>{userProfile.reviewsCount}</Text>
            <Text style={styles.statLabel}>Recenzji</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <Path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </Svg>
            </View>
            <Text style={styles.statValue}>{userProfile.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Średnia ocen</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHeader, styles.exchangeHeader]}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionIcon}>
              <Svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <Path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Książki na wymianę</Text>
          </View>
          {totalExchangeBooks > 0 && (
            <Text style={styles.sectionCount}>({totalExchangeBooks})</Text>
          )}
        </View>
        {displayedExchangeBooks.length > 0 ? (
          <>
            <ScrollView horizontal style={styles.horizontalList}>
              {displayedExchangeBooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.bookCard, styles.exchangeBookCard]}
                  onPress={() =>
                    navigation.navigate('Book', {
                      bookId: book.id,
                      sourceScreen: 'Profile',
                      userId: userId,
                      userName: userProfile?.displayName,
                    })
                  }>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {book.author}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {totalExchangeBooks > 5 && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() =>
                  navigation.navigate('Exchange', {
                    userId: userProfile.id,
                    userName: userProfile.displayName,
                  })
                }>
                <Text style={styles.seeMoreButtonText}>Zobacz więcej ({totalExchangeBooks})</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.emptyStateText}>Brak książek na wymianę</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHeader, styles.desiredHeader]}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionIcon}>
              <Svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <Path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Książki poszukiwane</Text>
          </View>
          {totalOwnedBooks > 0 && <Text style={styles.sectionCount}>({totalOwnedBooks})</Text>}
        </View>
        {displayedDesiredBooks.length > 0 ? (
          <>
            <ScrollView horizontal style={styles.horizontalList}>
              {displayedDesiredBooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.bookCard, styles.desiredBookCard]}
                  onPress={() =>
                    navigation.navigate('Book', {
                      bookId: book.id,
                      sourceScreen: 'Profile',
                      userId: userId,
                      userName: userProfile?.displayName,
                    })
                  }>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {book.author}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {totalOwnedBooks > 5 && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() =>
                  navigation.navigate('Desires', {
                    userId: userProfile.id,
                    userName: userProfile.displayName,
                  })
                }>
                <Text style={styles.seeMoreButtonText}>Zobacz więcej ({totalOwnedBooks})</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.emptyStateText}>Brak poszukiwanych książek</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHeader, styles.favoriteHeader]}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionIcon}>
              <Svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <Path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Ulubione książki</Text>
          </View>
          {totalFavoriteBooks > 0 && (
            <Text style={styles.sectionCount}>({totalFavoriteBooks})</Text>
          )}
        </View>
        {displayedFavoriteBooks.length > 0 ? (
          <>
            <ScrollView horizontal style={styles.horizontalList}>
              {displayedFavoriteBooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.bookCard, styles.favoriteBookCard]}
                  onPress={() =>
                    navigation.navigate('Book', {
                      bookId: book.id,
                      sourceScreen: 'Profile',
                      userId: userId,
                      userName: userProfile?.displayName,
                    })
                  }>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {book.author}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {totalFavoriteBooks > 5 && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() =>
                  navigation.navigate('Favorites', {
                    userId: userProfile.id,
                    userName: userProfile.displayName,
                  })
                }>
                <Text style={styles.seeMoreButtonText}>Zobacz więcej ({totalFavoriteBooks})</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.emptyStateText}>Brak ulubionych książek</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHeader, styles.reviewsHeader]}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionIcon}>
              <Svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <Path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Ostatnie recenzje</Text>
          </View>
        </View>
        {displayedReviews.length > 0 ? (
          <>
            {displayedReviews.map((review) => (
              <TouchableOpacity
                key={review.id}
                style={styles.reviewCard}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('Book', {
                    bookId: review.bookId,
                    sourceScreen: 'Profile',
                    userId: userId,
                    userName: userProfile?.displayName,
                  })
                }>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewBookTitle}>{review.bookTitle}</Text>
                  <View style={styles.reviewRating}>
                    <Text style={styles.ratingText}>{review.rating}/10</Text>
                  </View>
                </View>
                <Text style={styles.reviewBookAuthor}>{review.bookAuthor}</Text>
                {review.comment && (
                  <Text style={styles.reviewComment} numberOfLines={3}>
                    "{review.comment}"
                  </Text>
                )}
                <Text style={styles.reviewDate}>
                  {review.createdAt.toDate().toLocaleDateString('pl-PL')}
                </Text>
              </TouchableOpacity>
            ))}
            {userProfile.reviewsCount > 5 && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() =>
                  navigation.navigate('Reviews', {
                    userId: userProfile.id,
                    userName: userProfile.displayName,
                  })
                }>
                <Text style={styles.seeMoreButtonText}>
                  Zobacz więcej ({userProfile.reviewsCount})
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.emptyStateText}>Brak recenzji</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingBottom: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  profileCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  contactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
  },
  phone: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactActions: {
    marginTop: 16,
  },
  contactButtons: {
    gap: 8,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4f46e5',
  },
  exchangeButton: {
    backgroundColor: '#059669',
  },
  removeButton: {
    backgroundColor: '#9ca3af',
  },
  pendingButton: {
    backgroundColor: '#9ca3af',
  },
  acceptButton: {
    backgroundColor: '#059669',
    flex: 1,
    marginRight: 8,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  invitationContainer: {
    marginBottom: 8,
  },
  invitationText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  invitationButtons: {
    flexDirection: 'row',
  },
  bioSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bioHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  bioText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '30%',
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statIconText: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    justifyContent: 'space-between',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionIconText: {
    fontSize: 14,
  },
  exchangeHeader: {
    borderBottomColor: '#d1fae5',
  },
  desiredHeader: {
    borderBottomColor: '#fee2e2',
  },
  reviewsHeader: {
    borderBottomColor: '#dbeafe',
  },
  favoriteHeader: {
    borderBottomColor: '#fef3c7',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sectionCount: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  horizontalList: {
    paddingVertical: 8,
  },
  bookCard: {
    width: 150,
    marginRight: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 100,
  },
  exchangeBookCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  desiredBookCard: {
    backgroundColor: '#eef2ff',
    borderColor: '#818cf8',
  },
  favoriteBookCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fbbf24',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#6b7280',
  },
  reviewCard: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#818cf8',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewBookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  reviewBookAuthor: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  reviewRating: {
    backgroundColor: '#fef3c7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d97706',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4b5563',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  reviewDate: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'right',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
  seeMoreButton: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  seeMoreButtonText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
});

export default ProfileScreen;
