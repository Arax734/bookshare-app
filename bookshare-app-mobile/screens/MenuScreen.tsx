import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { TabNavigationProps } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookshelfIcon } from '../navigation/BottomTabNavigator';
import { ContactsIcon } from '../navigation/BottomTabNavigator';
import { BookOpenIcon } from '../components/svg-icons/BookOpenIcon';
import { SettingsIcon } from '../components/svg-icons/SettingsIcon';
import { LogoutIcon } from '../components/svg-icons/LogoutIcon';
import { StarIcon } from '../components/svg-icons/StarIcon';
import { FireIcon } from '../components/svg-icons/FireIcon';
import { BookmarkIcon } from '../components/svg-icons/BookmarkIcon';

import { useUser } from '../context/UserContext';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useContacts } from '../contexts/ContactsContext';

export default function MenuScreen() {
  const navigation = useNavigation<TabNavigationProps>();
  const { currentUser: user } = useUser();
  const { logout } = useAuth();
  const [userData, setUserData] = useState<{ displayName?: string; photoURL?: string } | null>(
    null
  );
  const { pendingInvitesCount } = useContacts();
  const defaultAvatar = require('../assets/images/default-avatar.png');
  const screenWidth = Dimensions.get('window').width;
  const insets = useSafeAreaInsets();
  const handleLogout = async () => {
    try {
      await logout();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    } catch (error) {
      console.error('Błąd wylogowania:', error);
      Alert.alert('Błąd', 'Wystąpił problem podczas wylogowywania');
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);
  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={styles.profileTile}
        onPress={() => user && navigation.navigate('Profile', { userId: user.uid })}>
        <View style={styles.profileContent}>
          <Image
            source={userData?.photoURL ? { uri: userData.photoURL } : defaultAvatar}
            style={styles.avatarImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userData?.displayName || 'Użytkownik'}</Text>
            <Text style={styles.viewProfileText}>Zobacz profil</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.menuItemsContainer}>
        <View style={styles.menuRow}>
          <TouchableOpacity
            style={[styles.menuItem, { width: (screenWidth - 48) / 2 }]}
            onPress={() => navigation.navigate('Bookshelf')}>
            <View style={styles.iconContainer}>
              <BookshelfIcon color="#007304" size={24} />
            </View>
            <Text style={styles.menuItemText}>Moja półka</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { width: (screenWidth - 48) / 2 }]}
            onPress={() => navigation.navigate('Contacts')}>
            <View style={styles.iconContainer}>
              <ContactsIcon color="#007304" size={24} />
              {pendingInvitesCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{pendingInvitesCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.menuItemText}>Kontakty</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuRow}>
          <TouchableOpacity
            style={[styles.menuItem, { width: (screenWidth - 48) / 2 }]}
            onPress={() =>
              user &&
              navigation.navigate('Exchange', {
                userId: user.uid,
                userName: userData?.displayName,
              })
            }>
            <View style={styles.iconContainer}>
              <BookOpenIcon width={24} height={24} fill="#007304" />
            </View>
            <Text style={styles.menuItemText}>Do wymiany</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { width: (screenWidth - 48) / 2 }]}
            onPress={() =>
              user &&
              navigation.navigate('Reviews', {
                userId: user.uid,
                userName: userData?.displayName,
              })
            }>
            <View style={styles.iconContainer}>
              <FireIcon width={24} height={24} fill="#007304" />
            </View>
            <Text style={styles.menuItemText}>Recenzje</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuRow}>
          <TouchableOpacity
            style={[styles.menuItem, { width: (screenWidth - 48) / 2 }]}
            onPress={() =>
              user &&
              navigation.navigate('Desires', {
                userId: user.uid,
                userName: userData?.displayName,
              })
            }>
            <View style={styles.iconContainer}>
              <BookmarkIcon width={24} height={24} fill="#007304" />
            </View>
            <Text style={styles.menuItemText}>Poszukiwane</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { width: (screenWidth - 48) / 2 }]}
            onPress={() =>
              user &&
              navigation.navigate('Favorites', {
                userId: user.uid,
                userName: userData?.displayName,
              })
            }>
            <View style={styles.iconContainer}>
              <StarIcon width={24} height={24} fill="#007304" />
            </View>
            <Text style={styles.menuItemText}>Ulubione</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuRow}>
          <TouchableOpacity
            style={[styles.menuItem, { width: (screenWidth - 48) / 2 }]}
            onPress={() => navigation.navigate('Settings')}>
            <View style={styles.iconContainer}>
              <SettingsIcon width={24} height={24} fill="#007304" />
            </View>
            <Text style={styles.menuItemText}>Ustawienia</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={styles.logoutIconContainer}>
            <LogoutIcon width={20} height={20} fill="#fff" />
          </View>
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  profileTile: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  viewProfileText: {
    fontSize: 14,
    color: '#007304',
  },
  menuItemsContainer: {
    padding: 16,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e63946',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutIconContainer: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  badgeContainer: {
    position: 'absolute',
    right: -6,
    top: -2,
    backgroundColor: '#FF4136',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    borderWidth: 1,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
