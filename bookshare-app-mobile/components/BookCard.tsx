import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';
import { StarIcon } from './svg-icons/StarIcon';
import { UserIcon } from './svg-icons/UserIcon';
import { CalendarIcon } from './svg-icons/CalendarIcon';
import { ArrowDownIcon } from './svg-icons/ArrowDownIcon';
import { BookOpenIcon } from './svg-icons/BookOpenIcon';
import BookCover from './BookCover';
import Svg, { Path } from 'react-native-svg';

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

interface Book {
  id: string;
  title: string;
  author: string;
  genre?: string;
  language?: string;
  publicationYear?: number;
  coverUrl?: string;
  isbn?: string;
  isbnIssn?: string;
  averageRating?: number;
  totalReviews?: number;
}

interface BookCardProps {
  book: Book;
  onPress: () => void;
}

const BookCard = ({ book, onPress }: BookCardProps) => {
  const formatTitle = (title: string) => {
    if (title.length > 60) {
      return title.substring(0, 57) + '...';
    }
    return title;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {formatTitle(book.title)}
        </Text>
        {book.averageRating && (
          <View style={styles.ratingContainer}>
            <StarIcon width={12} height={12} fill="#FFD700" />
            <Text style={styles.ratingText}>{book.averageRating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        {book.isbn || book.isbnIssn ? (
          <View style={styles.coverContainer}>
            <BookCover isbn={book.isbn || book.isbnIssn} title={book.title} size={'S'} />
          </View>
        ) : (
          <View style={styles.placeholderCover}>
            <BookOpenIcon width={32} height={32} fill="#d1d5db" />
          </View>
        )}

        <View style={styles.details}>
          <View style={styles.infoRow}>
            <UserIcon width={14} height={14} fill={colors.primary} />
            <Text style={styles.infoText} numberOfLines={1}>
              {book.author}
            </Text>
          </View>

          {book.publicationYear && (
            <View style={styles.infoRow}>
              <CalendarIcon width={14} height={14} stroke={colors.primary} />
              <Text style={styles.infoText}>{book.publicationYear}</Text>
            </View>
          )}

          {book.language && (
            <View style={styles.infoRow}>
              <Svg width={14} height={14} viewBox="0 0 20 20" fill={theme.primaryColor}>
                <Path
                  fillRule="evenodd"
                  d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
                  clipRule="evenodd"
                />
              </Svg>
              <Text style={styles.infoText}>{book.language}</Text>
            </View>
          )}

          {book.genre && (
            <View style={styles.genreContainer}>
              <Text style={styles.genreText}>{book.genre}</Text>
            </View>
          )}

          <View style={styles.detailsLink}>
            <Text style={styles.detailsText}>Zobacz szczegóły</Text>
            <ArrowDownIcon width={16} height={16} stroke={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
    marginRight: 5,
  },
  ratingContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  content: {
    padding: 10,
    flexDirection: 'row',
  },
  cover: {
    width: 70,
    height: 100,
    borderRadius: 4,
    backgroundColor: colors.backgroundLight,
  },
  coverContainer: {
    width: 70,
    height: 100,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLight,
  },
  placeholderCover: {
    width: 70,
    height: 100,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    marginLeft: 10,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  genreContainer: {
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  genreText: {
    fontSize: 12,
    color: colors.text,
  },
  detailsLink: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  detailsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default BookCard;
