import { useState, useEffect } from 'react';
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
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import BookCover from '../components/BookCover';
import { useExchanges, type ExchangeType, type Exchange } from '../hooks/useExchanges';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../contexts/NotificationsContext';

const defaultAvatar = require('../assets/images/default-avatar.png');

export default function ExchangesScreen() {
  const [activeTab, setActiveTab] = useState<ExchangeType>('incoming');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const {
    exchanges,
    loading,
    fetchExchanges,
    handleAcceptExchange,
    handleDeclineExchange,
    handleCancelExchange,
  } = useExchanges(activeTab);
  const { refreshPendingExchanges, refreshHistoryExchangesCount, refreshOutgoingExchangesCount } =
    useNotifications();

  useEffect(() => {
    if (user) {
      refreshPendingExchanges();
      refreshHistoryExchangesCount();
      refreshOutgoingExchangesCount();
    }
  }, [user, refreshPendingExchanges, refreshHistoryExchangesCount, refreshOutgoingExchangesCount]);

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="transparent" translucent={true} />

      <View style={styles.header}>
        <Text style={styles.title}>Wymiany</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
            onPress={() => setActiveTab('incoming')}>
            <Text style={[styles.tabText, activeTab === 'incoming' && styles.activeTabText]}>
              Przychodzące
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'outgoing' && styles.activeTab]}
            onPress={() => setActiveTab('outgoing')}>
            <Text style={[styles.tabText, activeTab === 'outgoing' && styles.activeTabText]}>
              Wychodzące
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              Historia
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={async () => {
                setIsRefreshing(true);
                await fetchExchanges();
                if (user) {
                  refreshPendingExchanges();
                  refreshHistoryExchangesCount();
                  refreshOutgoingExchangesCount();
                }
                setIsRefreshing(false);
              }}
              colors={['#16a34a']}
              tintColor="#16a34a"
            />
          }>
          {exchanges.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {activeTab === 'incoming'
                  ? 'Nie masz żadnych propozycji wymiany'
                  : activeTab === 'outgoing'
                    ? 'Nie masz żadnych wysłanych propozycji wymiany'
                    : 'Historia wymian jest pusta'}
              </Text>
            </View>
          ) : (
            <View style={styles.exchangesList}>
              {exchanges.map((exchange) => (
                <View key={exchange.id} style={styles.exchangeCard}>
                  <View style={styles.exchangeHeader}>
                    <View style={styles.userInfo}>
                      <Image
                        source={
                          activeTab === 'incoming' ||
                          (activeTab === 'history' && exchange.status === 'completed')
                            ? exchange.userPhotoURL
                              ? { uri: exchange.userPhotoURL }
                              : defaultAvatar
                            : exchange.contactPhotoURL
                              ? { uri: exchange.contactPhotoURL }
                              : defaultAvatar
                        }
                        style={styles.avatar}
                        contentFit="cover"
                      />
                      <View>
                        <Text style={styles.userName}>
                          {activeTab === 'incoming'
                            ? `Propozycja od ${exchange.userName}`
                            : activeTab === 'outgoing'
                              ? `Propozycja do ${exchange.contactName}`
                              : exchange.status === 'completed'
                                ? 'Wymiana zakończona'
                                : 'Wymiana odrzucona'}
                        </Text>
                        <Text style={styles.date}>{formatDate(exchange.createdAt)}</Text>
                      </View>
                    </View>
                    {activeTab === 'incoming' && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.button, styles.acceptButton]}
                          onPress={() => handleAcceptExchange(exchange)}>
                          <Text style={styles.buttonText}>Akceptuj</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.button, styles.declineButton]}
                          onPress={() => handleDeclineExchange(exchange)}>
                          <Text style={styles.buttonText}>Odrzuć</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {activeTab === 'outgoing' && (
                      <TouchableOpacity
                        style={[styles.button, styles.declineButton]}
                        onPress={() => handleCancelExchange(exchange)}>
                        <Text style={styles.buttonText}>Anuluj</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.booksContainer}>
                    <View style={styles.bookSection}>
                      <Text style={styles.sectionTitle}>
                        {activeTab === 'incoming' ? 'Oferowane książki:' : 'Twoje książki:'}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.bookList}>
                        {exchange.userBooksDetails?.map((book: any) => (
                          <View key={book.id} style={styles.bookCard}>
                            <View style={styles.bookCover}>
                              <BookCover isbn={book.isbn} title={book.title} size="M" />
                            </View>
                            <Text style={styles.bookTitle} numberOfLines={2}>
                              {book.title}
                            </Text>
                            <Text style={styles.bookAuthor} numberOfLines={1}>
                              {book.author}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.bookSection}>
                      <Text style={styles.sectionTitle}>
                        {activeTab === 'incoming'
                          ? 'Książki, które chce od ciebie:'
                          : 'Książki, które chcesz:'}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.bookList}>
                        {exchange.contactBooksDetails?.map((book: any) => (
                          <View key={book.id} style={styles.bookCard}>
                            <View style={styles.bookCover}>
                              <BookCover isbn={book.isbn} title={book.title} size="M" />
                            </View>
                            <Text style={styles.bookTitle} numberOfLines={2}>
                              {book.title}
                            </Text>
                            <Text style={styles.bookAuthor} numberOfLines={1}>
                              {book.author}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#16a34a',
  },
  tabText: {
    fontSize: 14,
    color: '#4b5563',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exchangesList: {
    padding: 16,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  exchangeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exchangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
    overflow: 'hidden',
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#16a34a',
  },
  declineButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  booksContainer: {
    gap: 16,
  },
  bookSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  bookList: {
    flexGrow: 0,
  },
  bookCard: {
    width: 120,
    marginRight: 12,
  },
  bookCover: {
    width: 120,
    height: 160,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#6b7280',
  },
});
