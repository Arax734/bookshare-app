import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
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
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TabParamList } from '../types/navigation';
import { useContacts } from '../contexts/ContactsContext';
import { useNotifications } from '../contexts/NotificationsContext';

interface Invitation {
  id: string;
  userId: string;
  contactId: string;
  createdAt: any;
  status: 'pending' | 'accepted';
  senderData?: {
    displayName: string;
    email: string;
    photoURL: string | null;
  };
}

export default function InvitesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<TabParamList>>();
  const { refreshContacts, refreshPendingInvites, refreshAcceptedContactsCount } = useContacts();
  const { refreshNotifications } = useNotifications();

  const [invites, setInvites] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const defaultAvatar = require('../assets/images/default-avatar.png');

  const fetchInvites = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const invitesQuery = query(
        collection(db, 'userContacts'),
        where('contactId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(invitesQuery);
      const invitesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Invitation[];

      const invitesWithSenderData = await Promise.all(
        invitesData.map(async (invite) => {
          const senderDoc = await getDoc(doc(db, 'users', invite.userId));
          const senderData = senderDoc.data();
          return {
            ...invite,
            senderData: {
              displayName: senderData?.displayName || 'Użytkownik',
              email: senderData?.email || '',
              photoURL: senderData?.photoURL || null,
            },
          };
        })
      );

      setInvites(invitesWithSenderData);
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvites();
  }, [fetchInvites]);
  const handleAcceptInvite = async (inviteId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'userContacts', inviteId), {
        status: 'accepted',
      });
      setInvites((prevInvites) => prevInvites.filter((invite) => invite.id !== inviteId));

      refreshContacts();
      refreshPendingInvites();
      refreshAcceptedContactsCount();
      refreshNotifications();

      Alert.alert('Sukces', 'Zaproszenie zostało zaakceptowane');
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Błąd', 'Nie udało się zaakceptować zaproszenia');
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'userContacts', inviteId));
      setInvites((prevInvites) => prevInvites.filter((invite) => invite.id !== inviteId));

      refreshPendingInvites();
      refreshNotifications();

      Alert.alert('Sukces', 'Zaproszenie zostało odrzucone');
    } catch (error) {
      console.error('Error rejecting invite:', error);
      Alert.alert('Błąd', 'Nie udało się odrzucić zaproszenia');
    }
  };

  const renderInviteItem = ({ item }: { item: Invitation }) => {
    return (
      <View style={styles.inviteCard}>
        <View style={styles.inviteContent}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId: item.userId })}>
            <Image
              source={item.senderData?.photoURL ? { uri: item.senderData.photoURL } : defaultAvatar}
              style={styles.avatar}
            />
          </TouchableOpacity>

          <View style={styles.inviteInfo}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile', { userId: item.userId })}>
              <Text style={styles.inviteName}>{item.senderData?.displayName}</Text>
            </TouchableOpacity>
            <Text style={styles.inviteEmail}>{item.senderData?.email}</Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptInvite(item.id)}>
                <Text style={styles.acceptButtonText}>Akceptuj</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectInvite(item.id)}>
                <Text style={styles.rejectButtonText}>Odrzuć</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="transparent" translucent={true} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Zaproszenia do kontaktów ({invites.length})</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007304" />
        </View>
      ) : invites.length > 0 ? (
        <FlatList
          data={invites}
          renderItem={renderInviteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.invitesList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nie masz żadnych oczekujących zaproszeń</Text>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitesList: {
    padding: 16,
  },
  inviteCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inviteContent: {
    flexDirection: 'row',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  inviteInfo: {
    marginLeft: 12,
    flex: 1,
  },
  inviteName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  inviteEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});
