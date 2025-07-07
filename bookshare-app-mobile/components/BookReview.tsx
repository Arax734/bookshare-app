import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  runTransaction,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useAuth } from '../hooks/useAuth';
import { StarIcon } from './svg-icons/StarIcon';
import { TrashIcon } from './svg-icons/TrashIcon';
import { TabParamList } from '../types/navigation';

interface Review {
  id: string;
  bookId: string;
  rating: number;
  comment: string;
  userId: string;
  userEmail: string;
  userName?: string;
  createdAt: any;
  userPhotoURL?: string;
  userDisplayName?: string;
}

interface BookReviewProps {
  bookId: string;
}

interface UserData {
  photoURL?: string;
  displayName?: string;
}

const REVIEWS_PER_PAGE = 5;

export default function BookReview({ bookId }: BookReviewProps) {
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<TabParamList>>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setHoveredStar] = useState(0);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [, setUsersData] = useState<{ [key: string]: UserData }>({});
  const [displayedReviews, setDisplayedReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(0);
  const paddedBookId = bookId.padStart(14, '0');

  useEffect(() => {
    setRating(0);
    setComment('');
    setReviews([]);
    setIsSubmitting(false);
    setHoveredStar(0);
    setUserReview(null);
    setUsersData({});
    setDisplayedReviews([]);
    setTotalReviews(0);
    setIsLoadingMore(false);
    setAverageRating(0);
  }, [bookId]);

  useEffect(() => {
    if (!paddedBookId || !user) return;

    const countQuery = query(collection(db, 'reviews'), where('bookId', '==', paddedBookId));

    getDocs(countQuery).then((snapshot) => {
      setTotalReviews(snapshot.size);
    });

    const q = query(
      collection(db, 'reviews'),
      where('bookId', '==', paddedBookId),
      orderBy('createdAt', 'desc'),
      limit(REVIEWS_PER_PAGE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];

      const existingUserReview = reviewsData.find((review) => review.userId === user.uid);
      setUserReview(existingUserReview || null);

      const sortedReviews = reviewsData.sort((a, b) => {
        if (a.userId === user.uid) return -1;
        if (b.userId === user.uid) return 1;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });

      setReviews(sortedReviews);
      setDisplayedReviews(sortedReviews);
    });

    return () => unsubscribe();
  }, [paddedBookId, user]);
  useEffect(() => {
    if (!paddedBookId) return;

    const reviewsQuery = query(collection(db, 'reviews'), where('bookId', '==', paddedBookId));

    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
      const reviews = snapshot.docs.map((doc) => doc.data());
      setTotalReviews(snapshot.size);

      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        const average = totalRating / reviews.length;
        setAverageRating(Number(average.toFixed(1)));
      } else {
        setAverageRating(0);
      }
    });

    return () => unsubscribe();
  }, [paddedBookId]);
  useEffect(() => {
    if (!paddedBookId) return;

    const bookStatsRef = query(collection(db, 'reviews'), where('bookId', '==', paddedBookId));

    const unsubscribe = onSnapshot(bookStatsRef, (snapshot) => {
      const reviews = snapshot.docs.map((doc) => doc.data());

      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        const average = totalRating / reviews.length;
        setAverageRating(Number(average.toFixed(1)));
        setTotalReviews(reviews.length);
      } else {
        setAverageRating(0);
        setTotalReviews(0);
      }
    });

    return () => unsubscribe();
  }, [paddedBookId]);

  const handleSubmitReview = async () => {
    if (!user || !rating) return;

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const currentUserData = userDoc.data();

      await runTransaction(db, async (transaction) => {
        const userData = userDoc.data();
        const currentReviewsCount = userData.reviewsCount || 0;
        const currentTotalRating = (userData.averageRating || 0) * currentReviewsCount;

        const newReviewsCount = currentReviewsCount + 1;
        const newAverageRating = (currentTotalRating + rating) / newReviewsCount;

        transaction.update(userRef, {
          reviewsCount: newReviewsCount,
          averageRating: Number(newAverageRating.toFixed(1)),
        });

        const reviewRef = doc(collection(db, 'reviews'));
        transaction.set(reviewRef, {
          bookId: paddedBookId,
          rating,
          comment,
          userId: user.uid,
          userEmail: user.email,
          userPhotoURL: currentUserData.photoURL || user.photoURL,
          userDisplayName: currentUserData.displayName || user.displayName,
          createdAt: serverTimestamp(),
        });
      });

      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error adding review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;

    try {
      const reviewToDelete = reviews.find((r) => r.id === reviewId);
      if (!reviewToDelete) return;

      const userRef = doc(db, 'users', user.uid);
      const reviewRef = doc(db, 'reviews', reviewId);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const reviewDoc = await transaction.get(reviewRef);

        if (!userDoc.exists() || !reviewDoc.exists()) {
          throw new Error('Document not found');
        }

        const userData = userDoc.data();
        const reviewData = reviewDoc.data();
        const currentReviewsCount = userData.reviewsCount || 0;
        const currentTotalRating = (userData.averageRating || 0) * currentReviewsCount;

        const newReviewsCount = currentReviewsCount - 1;
        const newAverageRating =
          newReviewsCount > 0 ? (currentTotalRating - reviewData.rating) / newReviewsCount : 0;

        transaction.update(userRef, {
          reviewsCount: newReviewsCount,
          averageRating: Number(newAverageRating.toFixed(1)),
        });

        transaction.delete(reviewRef);
      });

      setUserReview(null);
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const loadMoreReviews = async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const lastReview = displayedReviews[displayedReviews.length - 1];
      const nextReviewsQuery = query(
        collection(db, 'reviews'),
        where('bookId', '==', paddedBookId),
        orderBy('createdAt', 'desc'),
        startAfter(lastReview.createdAt),
        limit(REVIEWS_PER_PAGE)
      );

      const snapshot = await getDocs(nextReviewsQuery);
      const newReviews = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];

      setDisplayedReviews((prev) => [...prev, ...newReviews]);
    } catch (error) {
      console.error('Error loading more reviews:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const renderStars = (value: number, onPress?: (rating: number) => void) => {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <TouchableOpacity key={star} onPress={() => onPress?.(star)} disabled={!onPress}>
            <StarIcon width={16} height={16} fill={star <= value ? '#FFD700' : '#D1D5DB'} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const formatRelativeTime = (timestamp: any): string => {
    if (!timestamp) return '';

    const now = new Date();
    const createdAtDate = timestamp.toDate();

    const diffMs = now.getTime() - createdAtDate.getTime();

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMonths > 1) {
      return `${diffMonths} miesiące temu`;
    } else if (diffMonths === 1) {
      return `około miesiąc temu`;
    } else if (diffDays > 1) {
      return `${diffDays} dni temu`;
    } else if (diffDays === 1) {
      return `wczoraj`;
    } else {
      return `dzisiaj`;
    }
  };

  const defaultAvatar = require('../assets/images/default-avatar.png');

  return (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#1F2937' }}>
          Opinie czytelników
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <StarIcon width={16} height={16} fill="#FFD700" />
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            {averageRating > 0 ? `${averageRating}/10` : '-/10'} ({totalReviews})
          </Text>
        </View>
      </View>

      {user ? (
        !userReview ? (
          <View style={{ marginBottom: 24 }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ marginBottom: 8, fontSize: 14, color: '#4B5563' }}>Twoja ocena:</Text>
              {renderStars(rating, setRating)}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Napisz swoją opinię..."
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 12,
                backgroundColor: '#F9FAFB',
                color: '#1F2937',
                textAlignVertical: 'top',
                minHeight: 100,
              }}
            />

            <TouchableOpacity
              onPress={handleSubmitReview}
              disabled={!rating || isSubmitting}
              style={{
                marginTop: 12,
                backgroundColor: rating ? '#007304' : '#9CA3AF',
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{ color: 'white', fontSize: 16 }}>
                {isSubmitting ? 'Dodawanie...' : 'Dodaj opinię'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null
      ) : (
        <Text style={{ color: '#4B5563', marginBottom: 16 }}>Zaloguj się, aby dodać opinię</Text>
      )}

      <View style={{ gap: 12 }}>
        {displayedReviews.map((review) => (
          <View
            key={review.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
            }}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Profile', { userId: review.userId })}>
                  {review.userPhotoURL ? (
                    <Image
                      source={{ uri: review.userPhotoURL }}
                      defaultSource={defaultAvatar}
                      style={{ width: 28, height: 28, borderRadius: 14 }}
                    />
                  ) : (
                    <Image
                      source={defaultAvatar}
                      style={{ width: 28, height: 28, borderRadius: 14 }}
                    />
                  )}
                </TouchableOpacity>
                <View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Profile', { userId: review.userId })}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
                      {review.userDisplayName || review.userEmail}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>
                    {review.userDisplayName && review.userDisplayName !== review.userEmail
                      ? review.userEmail + ' • '
                      : ''}
                    {formatRelativeTime(review.createdAt)}
                  </Text>
                </View>
              </View>
              {review.userId === user?.uid && (
                <TouchableOpacity
                  onPress={() => handleDeleteReview(review.id)}
                  style={{
                    padding: 4,
                    borderRadius: 4,
                  }}>
                  <TrashIcon width={20} height={20} />
                </TouchableOpacity>
              )}
            </View>

            {renderStars(review.rating)}

            {review.comment && (
              <Text style={{ marginTop: 8, color: '#4B5563', fontSize: 14 }}>{review.comment}</Text>
            )}
          </View>
        ))}

        {displayedReviews.length < totalReviews && (
          <TouchableOpacity
            onPress={loadMoreReviews}
            disabled={isLoadingMore}
            style={{
              paddingVertical: 8,
              alignItems: 'center',
            }}>
            {isLoadingMore ? (
              <ActivityIndicator color="#007304" />
            ) : (
              <Text style={{ color: '#007304', fontSize: 14 }}>Załaduj więcej opinii</Text>
            )}
          </TouchableOpacity>
        )}

        {reviews.length === 0 && (
          <Text style={{ textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
            Brak opinii dla tej książki
          </Text>
        )}
      </View>
    </View>
  );
}
