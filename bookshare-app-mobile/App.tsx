import { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from './context/UserContext';
import { BooksProvider } from './contexts/BooksContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { ContactsProvider } from './contexts/ContactsContext';
import MainNavigation from './navigation/MainNavigation';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'ios') {
      StatusBar.setBarStyle('dark-content', true);
    }
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="white" translucent={false} />
      <UserProvider>
        <BooksProvider>
          <NotificationsProvider>
            <ContactsProvider>
              <MainNavigation />
            </ContactsProvider>
          </NotificationsProvider>
        </BooksProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
