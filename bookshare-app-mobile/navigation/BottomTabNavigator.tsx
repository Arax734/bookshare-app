import { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, Text, Image, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useNotifications } from '../contexts/NotificationsContext';
import { useUser } from '../context/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useAuth } from '../hooks/useAuth';

import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import BookshelfScreen from '../screens/BookshelfScreen';
import ContactsScreen from '../screens/ContactsScreen';
import InvitesScreen from '../screens/InvitesScreen';
import ExchangesScreen from '../screens/ExchangesScreen';
import MenuScreen from '../screens/MenuScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BookScreen from '../screens/BookScreen';
import ExchangeScreen from '../screens/ExchangeScreen';
import UserExchangeScreen from '../screens/UserExchangeScreen';
import DesiresScreen from '../screens/DesiresScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ReviewsScreen from '../screens/ReviewsScreen';

const theme = {
  primaryColor: '#007304',
  primaryColorHover: '#00a305',
  background: '#f9fafb',
  foreground: '#111827',
};

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Bookshelf: undefined;
  Contacts: undefined;
  ContactInvites: undefined;
  Exchanges: undefined;
  UserExchange: { userId: string; userName: string };
  Menu: undefined;
  Profile: { userId: string };
  Settings: undefined;
  Book: {
    bookId: string;
    sourceScreen?:
      | 'Home'
      | 'Library'
      | 'Bookshelf'
      | 'Contacts'
      | 'Exchanges'
      | 'Menu'
      | 'Profile'
      | 'Settings'
      | 'Exchange'
      | 'Desires'
      | 'Favorites'
      | 'Reviews';
    userId?: string;
    userName?: string;
  };
  Exchange: { userId: string; userName?: string };
  Desires: { userId: string; userName?: string };
  Favorites: { userId: string; userName?: string };
  Reviews: { userId: string; userName?: string };
};

const Tab = createBottomTabNavigator<TabParamList>();

function CustomTabBar({
  state,
  descriptors,
  navigation,
}: {
  state: any;
  descriptors: any;
  navigation: any;
}) {
  const insets = useSafeAreaInsets();
  const { pendingExchanges } = useNotifications();
  const { currentUser: user } = useUser();
  const { logout } = useAuth();
  const [, setShowProfileMenu] = useState(false);
  const [userData, setUserData] = useState<{ displayName?: string; photoURL?: string } | null>(
    null
  );
  const defaultAvatar = require('../assets/images/default-avatar.png');

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
    <View
      style={[
        styles.tabBarContainer,
        { paddingBottom: insets.bottom, height: 60 + insets.bottom },
      ]}>
      {state.routes.map((route: { key: string; name: string }, index: number) => {
        const { options } = descriptors[route.key];

        if (options.tabBarButton && options.tabBarButton() === null) {
          return null;
        }

        const label = options.tabBarLabel || options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        if (index === 2) {
          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={() => {
                if (user) {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: state.routes[2].key,
                    canPreventDefault: true,
                  });

                  if (!event.defaultPrevented) {
                    navigation.navigate('Profile', { userId: user.uid });
                  }
                } else {
                  navigation.navigate('Login');
                }
              }}
              style={styles.centerButton}>
              <Image
                source={userData?.photoURL ? { uri: userData.photoURL } : defaultAvatar}
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          );
        }

        let iconComponent;
        if (route.name === 'Home') {
          iconComponent = (
            <HomeIcon color={isFocused ? theme.primaryColor : theme.foreground} size={24} />
          );
        } else if (route.name === 'Library') {
          iconComponent = (
            <LibraryIcon color={isFocused ? theme.primaryColor : theme.foreground} size={24} />
          );
        } else if (route.name === 'Contacts') {
          iconComponent = (
            <View style={styles.iconContainer}>
              <ContactsIcon color={isFocused ? theme.primaryColor : theme.foreground} size={24} />
            </View>
          );
        } else if (route.name === 'Exchanges') {
          iconComponent = (
            <View style={styles.iconContainer}>
              <ExchangesIcon color={isFocused ? theme.primaryColor : theme.foreground} size={24} />
              {pendingExchanges > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{pendingExchanges.toString()}</Text>
                </View>
              )}
            </View>
          );
        } else if (route.name === 'Menu') {
          iconComponent = (
            <MenuIcon color={isFocused ? theme.primaryColor : theme.foreground} size={24} />
          );
        }
        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabButton}>
            {iconComponent}
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? theme.primaryColor : theme.foreground },
              ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function BottomTabNavigator() {
  const { currentUser: user } = useUser();
  useNotifications();
  const userId = user?.uid;

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Główna',
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Biblioteka',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ userId }}
        options={{
          tabBarLabel: '',
        }}
      />
      <Tab.Screen
        name="Exchanges"
        component={ExchangesScreen}
        options={{
          tabBarLabel: 'Wymiany',
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menu',
        }}
      />
      <Tab.Screen
        name="Bookshelf"
        component={BookshelfScreen}
        options={{
          tabBarLabel: 'Moja półka',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarLabel: 'Kontakty',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="ContactInvites"
        component={InvitesScreen}
        options={{
          tabBarLabel: 'Zaproszenia',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ustawienia',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Book"
        component={BookScreen}
        options={{
          tabBarLabel: 'Book',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Exchange"
        component={ExchangeScreen}
        options={{
          tabBarLabel: 'Exchange',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="UserExchange"
        component={UserExchangeScreen}
        options={{
          tabBarLabel: 'Wymiana',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Desires"
        component={DesiresScreen}
        options={{
          tabBarLabel: 'Desires',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Favorites',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{
          tabBarLabel: 'Reviews',
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

export const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <View>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
        fill={color}
      />
    </Svg>
  </View>
);

export const LibraryIcon = ({ color, size }: { color: string; size: number }) => (
  <View>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 005.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"
        fill={color}
      />
    </Svg>
  </View>
);

export const BookshelfIcon = ({ color, size }: { color: string; size: number }) => (
  <View>
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path
        d="M259.031,156.638c-0.009-8.693-0.009-16.24,1.061-23.4l-6.258,7.169 c-10.95,12.627-38.637,20.788-61.835,18.237c-23.215-2.561-33.138-14.859-22.179-27.494l82.473-86.306 c1.601-1.684,2.055-4.161,1.138-6.301c-0.91-2.123-3.016-3.521-5.341-3.521h-13.283c-3.892,0-7.614,1.55-10.336,4.33 l-71.548,72.499c-14.681,15.365-13.999,23.898-13.999,47.802c0,17.066,0,276.892,0,276.892c0,20.494,25.758,37.417,48.964,39.96 c23.207,2.57,54.996-5.61,65.946-18.228l7.287-8.474c-1.306-4.228-2.089-8.642-2.089-13.258V156.638z"
        fill={color}
      />
      <Path
        d="M120.113,156.638c-0.009-8.693-0.009-16.24,1.062-23.4l-6.267,7.169 c-10.95,12.627-38.629,20.788-61.835,18.237c-23.207-2.561-33.138-14.859-22.179-27.494l82.481-86.306 c1.591-1.684,2.054-4.161,1.137-6.301c-0.91-2.123-3.016-3.521-5.34-3.521H95.879c-3.883,0-7.597,1.55-10.326,4.33l-71.548,72.499 c-14.682,15.365-14,23.898-14,47.802c0,17.066,0,276.892,0,276.892c0,20.494,25.75,37.417,48.965,39.96 c23.197,2.57,54.988-5.61,65.938-18.228l7.303-8.474c-1.314-4.228-2.098-8.642-2.098-13.258V156.638z"
        fill={color}
      />
      <Path
        d="M506.197,35.022h-14.379c-4.195,0-8.188,1.82-10.951,4.978l-87.51,100.406 c-10.95,12.627-38.638,20.788-61.835,18.237c-23.215-2.561-33.137-14.859-22.179-27.494l82.473-86.306 c1.601-1.684,2.055-4.161,1.145-6.301c-0.918-2.123-3.024-3.521-5.34-3.521H374.33c-3.883,0-7.607,1.55-10.336,4.33l-71.548,72.499 c-14.682,15.365-13.999,23.898-13.999,47.802c0,17.066,0,276.892,0,276.892c0,20.494,25.758,37.417,48.964,39.96 c23.214,2.57,54.996-5.61,65.946-18.228L501.454,332.72c6.806-7.918,10.546-17.992,10.546-28.42V40.826 C512,37.625,509.397,35.022,506.197,35.022z"
        fill={color}
      />
    </Svg>
  </View>
);

export const ContactsIcon = ({ color, size }: { color: string; size: number }) => (
  <View>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
        fill={color}
      />
    </Svg>
  </View>
);

export const ExchangesIcon = ({ color, size }: { color: string; size: number }) => (
  <View>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z"
        fill={color}
      />
    </Svg>
  </View>
);

export const MenuIcon = ({ color, size }: { color: string; size: number }) => (
  <View>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
        fill={color}
      />
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#a8d994',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  centerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 50,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  profileMenu: {
    position: 'absolute',
    top: 55,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 180,
    padding: 8,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  profileMenuItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    color: theme.foreground,
  },
  contactsTab: {
    position: 'relative',
  },
});
