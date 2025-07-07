import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { BookOpenIcon } from './svg-icons/BookOpenIcon';

interface BookCoverProps {
  isbn?: string;
  title: string;
  size: 'L' | 'M' | 'S';
  onError?: () => void;
}

export default function BookCover({ isbn, title, size, onError }: BookCoverProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setImageLoaded(false);

    if (isbn) {
      const cleanIsbn = isbn.replace(/-/g, '');
      if (!/^\d{10,13}$/.test(cleanIsbn)) {
        console.log(`Invalid ISBN format: ${isbn}`);
        setLoading(false);
        setError(true);
      }
    }
  }, [isbn]);

  useEffect(() => {
    if (error && size === 'L' && onError) {
      onError();
    }
  }, [error, size, onError]);

  useEffect(() => {
    if (loading && !error) {
      const timer = setTimeout(() => {
        if (!imageLoaded) {
          console.log(`Timeout loading cover for ISBN: ${isbn}`);
          setLoading(false);
          setError(true);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [loading, error, isbn, imageLoaded]);

  const getIconSize = () => {
    switch (size) {
      case 'S':
        return 24;
      case 'M':
        return 36;
      case 'L':
        return 48;
      default:
        return 36;
    }
  };

  if (!isbn || isbn === '') {
    return (
      <View style={styles.placeholderContainer}>
        <BookOpenIcon width={getIconSize()} height={getIconSize()} fill="#d1d5db" />
      </View>
    );
  }

  return (
    <View style={styles.coverContainer}>
      <View
        style={[
          styles.defaultCoverContainer,
          error ? styles.visible : imageLoaded && !loading ? styles.hidden : styles.visible,
        ]}>
        <BookOpenIcon width={getIconSize()} height={getIconSize()} fill="#d1d5db" />
      </View>

      {loading && !error && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      )}

      {!error && (
        <Image
          source={{
            uri: `https://covers.openlibrary.org/b/isbn/${isbn?.replace(/-/g, '')}-${size}.jpg`,
            cache: 'reload',
          }}
          alt={`Cover: ${title}`}
          accessibilityLabel={`Cover: ${title}`}
          style={[styles.coverImage, { opacity: imageLoaded && !loading ? 1 : 0 }]}
          onLoad={(event) => {
            const { width, height } = event.nativeEvent.source;

            if (width <= 1 || height <= 1 || (width < 10 && height < 10)) {
              console.log(`Empty cover returned for ISBN: ${isbn}, using default`);
              setLoading(false);
              setError(true);
              return;
            }

            console.log(`Cover loaded for ISBN: ${isbn} (${width}x${height})`);
            setImageLoaded(true);
            setTimeout(() => setLoading(false), 200);
          }}
          onError={() => {
            console.log(`Failed to load cover for ISBN: ${isbn}`);
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  coverContainer: {
    position: 'relative',
    aspectRatio: 2 / 3,
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  placeholderContainer: {
    position: 'relative',
    aspectRatio: 2 / 3,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  defaultCoverContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    zIndex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    zIndex: 2,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    zIndex: 3,
  },
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
});
