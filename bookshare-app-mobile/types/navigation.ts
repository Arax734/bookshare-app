import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Registration: undefined;
  Login: undefined;
  MainTabs: undefined;
};

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Bookshelf: undefined;
  Contacts: undefined;
  ContactInvites: undefined;
  Exchanges: undefined;
  Menu: undefined;
  Profile: { userId: string };
  Settings: undefined;
  Book: {
    bookId: string;
    sourceScreen?: keyof Omit<TabParamList, 'Book'>;
    userId?: string;
    userName?: string;
  };
  Exchange: { userId: string; userName?: string };
  UserExchange: { userId: string; userName: string };
  Desires: { userId: string; userName?: string };
  Favorites: { userId: string; userName?: string };
  Reviews: { userId: string; userName?: string };
};

export type StackNavigationProps = NativeStackNavigationProp<RootStackParamList>;
export type TabNavigationProps = BottomTabNavigationProp<TabParamList>;

export type StackRouteProps<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;
export type TabRouteProps<T extends keyof TabParamList> = RouteProp<TabParamList, T>;

export type NavigationProps = StackNavigationProps;
