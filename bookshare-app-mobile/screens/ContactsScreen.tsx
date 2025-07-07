import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TabParamList } from '../types/navigation';
import { useContacts } from '../contexts/ContactsContext';
import { useNotifications } from '../contexts/NotificationsContext';

interface UserContact {
  id?: string;
  userId: string;
  contactId: string;
  createdAt: any;
  status: 'pending' | 'accepted';
  isReverse?: boolean;
}

interface UserSearchResult {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
}

interface ExtendedUserContact extends UserContact {
  contactPhotoURL?: string;
  contactDisplayName?: string;
  contactEmail?: string;
}

export default function ContactsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<TabParamList>>();
  const { refreshTrigger, pendingInvitesCount } = useContacts();
  const { refreshNotifications } = useNotifications();

  const [contacts, setContacts] = useState<ExtendedUserContact[]>([]);
  const [acceptedContacts, setAcceptedContacts] = useState<ExtendedUserContact[]>([]);
  const [pendingContacts, setPendingContacts] = useState<ExtendedUserContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const searchInputRef = React.useRef<TextInput>(null);

  const defaultAvatar = require('../assets/images/default-avatar.png');

  const fetchContacts = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const contactsAsUserQuery = query(
        collection(db, 'userContacts'),
        where('userId', '==', user.uid)
      );

      const contactsAsContactQuery = query(
        collection(db, 'userContacts'),
        where('contactId', '==', user.uid),
        where('status', '==', 'accepted')
      );

      const [userQuerySnapshot, contactQuerySnapshot] = await Promise.all([
        getDocs(contactsAsUserQuery),
        getDocs(contactsAsContactQuery),
      ]);

      const contactsData = [
        ...userQuerySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        ...contactQuerySnapshot.docs.map((doc) => ({
          id: doc.id,
          isReverse: true,
          userId: doc.data().contactId,
          contactId: doc.data().userId,
          ...doc.data(),
        })),
      ] as UserContact[];

      const contactsWithUserData = await Promise.all(
        contactsData.map(async (contact) => {
          const userIdToFetch = contact.isReverse ? contact.userId : contact.contactId;
          const userDocRef = doc(db, 'users', userIdToFetch);
          const userDocSnap = await getDoc(userDocRef);
          const userData = userDocSnap.data();

          return {
            ...contact,
            contactPhotoURL: userData?.photoURL || null,
            contactDisplayName: userData?.displayName || 'Użytkownik',
            contactEmail: userData?.email || 'Brak emaila',
          };
        })
      );

      setContacts(contactsWithUserData);
      setAcceptedContacts(contactsWithUserData.filter((contact) => contact.status === 'accepted'));
      setPendingContacts(
        contactsWithUserData.filter((contact) => contact.status === 'pending' && !contact.isReverse)
      );
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts, refreshTrigger]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContacts();
  }, [fetchContacts]);

  const searchUsers = async () => {
    if (!user || !searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const queryLower = searchQuery.toLowerCase();

      const sentInvitesQuery = query(
        collection(db, 'userContacts'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const sentInvitesSnapshot = await getDocs(sentInvitesQuery);
      const sentInvites = new Set(sentInvitesSnapshot.docs.map((doc) => doc.data().contactId));

      const pendingInvitesQuery = query(
        collection(db, 'userContacts'),
        where('contactId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const pendingInvitesSnapshot = await getDocs(pendingInvitesQuery);
      const pendingInvites = new Map(
        pendingInvitesSnapshot.docs.map((doc) => [doc.data().userId, { id: doc.id, ...doc.data() }])
      );

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const results = new Map<string, UserSearchResult>();

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        const docId = doc.id;

        if (docId === user.uid) return;

        const displayName = userData.displayName?.toLowerCase() || '';
        const email = userData.email?.toLowerCase() || '';
        const phoneNumber = userData.phoneNumber?.toLowerCase() || '';

        if (
          displayName.includes(queryLower) ||
          email.includes(queryLower) ||
          phoneNumber.includes(queryLower)
        ) {
          results.set(docId, {
            id: docId,
            ...userData,
          } as UserSearchResult);
        }
      });

      setSearchResults(Array.from(results.values()));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };
  const addContact = async (contactId: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'userContacts'), {
        userId: user.uid,
        contactId: contactId,
        createdAt: Timestamp.now(),
        status: 'pending',
      });
      setSearchQuery('');
      setSearchResults([]);

      Alert.alert('Sukces', 'Zaproszenie zostało wysłane');
      fetchContacts();
      refreshNotifications();
    } catch (error) {
      console.error('Error adding contact:', error);
      Alert.alert('Błąd', 'Nie udało się wysłać zaproszenia');
    }
  };

  const removeContact = async (contactId: string) => {
    if (!user) return;

    try {
      const contactToDelete = contacts.find(
        (c) =>
          (c.userId === user.uid && c.contactId === contactId) ||
          (c.userId === contactId && c.contactId === user.uid)
      );
      if (contactToDelete?.id) {
        await deleteDoc(doc(db, 'userContacts', contactToDelete.id));
        Alert.alert('Sukces', 'Kontakt został usunięty');
        fetchContacts();
        refreshNotifications();
      }
    } catch (error) {
      console.error('Error removing contact:', error);
      Alert.alert('Błąd', 'Nie udało się usunąć kontaktu');
    }
  };

  const renderContactItem = ({ item }: { item: ExtendedUserContact }) => {
    return (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() =>
          navigation.navigate('Profile', {
            userId: item.isReverse ? item.userId : item.contactId,
          })
        }>
        <View style={styles.contactCardContent}>
          <Image
            source={item.contactPhotoURL ? { uri: item.contactPhotoURL } : defaultAvatar}
            style={styles.contactAvatar}
          />
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{item.contactDisplayName}</Text>
            <Text style={styles.contactEmail}>{item.contactEmail}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => {
            Alert.alert(
              'Potwierdź usunięcie',
              `Czy na pewno chcesz usunąć ${item.contactDisplayName} z kontaktów?`,
              [
                { text: 'Anuluj', style: 'cancel' },
                {
                  text: 'Usuń',
                  style: 'destructive',
                  onPress: () => removeContact(item.isReverse ? item.userId : item.contactId),
                },
              ]
            );
          }}>
          <Text style={styles.removeButtonText}>Usuń</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  const headerButton = (
    text: string,
    onPress: () => void,
    showBadge: boolean = false,
    badgeCount: number = 0,
    isPending: boolean = false
  ) => (
    <TouchableOpacity
      style={[styles.headerButton, isPending ? styles.pendingButton : {}]}
      onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.headerButtonText}>{text}</Text>
        {showBadge && badgeCount > 0 && (
          <View style={styles.badgeContainerSmall}>
            <Text style={styles.badgeTextSmall}>{badgeCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSearchResultItem = ({ item }: { item: UserSearchResult }) => {
    const isAlreadyContact = acceptedContacts.some(
      (contact) =>
        (contact.userId === user?.uid && contact.contactId === item.id) ||
        (contact.userId === item.id && contact.contactId === user?.uid)
    );

    const isPending = pendingContacts.some((contact) => contact.contactId === item.id);

    return (
      <View style={styles.searchResultItem}>
        <TouchableOpacity
          style={styles.searchResultContent}
          onPress={() => navigation.navigate('Profile', { userId: item.id })}>
          <Image
            source={item.photoURL ? { uri: item.photoURL } : defaultAvatar}
            style={styles.resultAvatar}
          />
          <View style={styles.resultInfo}>
            <Text style={styles.resultName}>{item.displayName}</Text>
            <Text style={styles.resultEmail}>{item.email}</Text>
          </View>
        </TouchableOpacity>

        {!isAlreadyContact ? (
          <TouchableOpacity style={styles.addButton} onPress={() => addContact(item.id)}>
            <Text style={styles.addButtonText}>Dodaj</Text>
          </TouchableOpacity>
        ) : isPending ? (
          <View style={styles.pendingButton}>
            <Text style={styles.pendingButtonText}>Oczekujące</Text>
          </View>
        ) : (
          <View style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Kontakt</Text>
          </View>
        )}
      </View>
    );
  };
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kontakty</Text>
        <View style={styles.headerButtons}>
          {headerButton(
            'Zaproszenia',
            () => navigation.navigate('ContactInvites'),
            true,
            pendingInvitesCount,
            pendingInvitesCount > 0
          )}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Szukaj kontaktów (min. 3 znaki)..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchUsers}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={searchUsers}>
          <Text style={styles.searchButtonText}>Szukaj</Text>
        </TouchableOpacity>
      </View>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007304" />
        </View>
      )}

      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Wyniki wyszukiwania</Text>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResultItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.resultsList}
          />
        </View>
      )}

      {!isSearching && searchResults.length === 0 && (
        <>
          <View style={styles.contactsContainer}>
            <Text style={styles.sectionTitle}>Twoje kontakty ({acceptedContacts.length})</Text>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007304" />
              </View>
            ) : acceptedContacts.length > 0 ? (
              <FlatList
                data={acceptedContacts}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id || item.contactId}
                contentContainerStyle={styles.contactsList}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nie masz jeszcze żadnych kontaktów</Text>
              </View>
            )}
          </View>

          {pendingContacts.length > 0 && (
            <View style={styles.pendingContainer}>
              <Text style={styles.sectionTitle}>Oczekujące ({pendingContacts.length})</Text>
              <FlatList
                data={pendingContacts}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id || item.contactId}
                contentContainerStyle={styles.contactsList}
              />
            </View>
          )}
        </>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    backgroundColor: '#007304',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  headerButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#007304',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    color: '#111827',
  },
  resultsList: {
    paddingHorizontal: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  resultInfo: {
    marginLeft: 12,
    flex: 1,
  },
  resultName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111827',
  },
  resultEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButton: {
    backgroundColor: '#007304',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pendingButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    position: 'relative',
  },
  pendingButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  contactButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  contactButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  contactsContainer: {
    flex: 1,
  },
  contactsList: {
    paddingHorizontal: 16,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  contactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contactName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111827',
  },
  contactEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  removeButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  pendingContainer: {
    marginTop: 10,
  },
  badgeContainerSmall: {
    backgroundColor: '#FF4136',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: 'white',
  },
  badgeTextSmall: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
});
