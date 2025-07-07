import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

import Registration from '../Registration';
import Login from '../Login';
import BottomTabNavigator from './BottomTabNavigator';

import BackgroundVideo from '../components/BackgroundVideo';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  const [currentRoute, setCurrentRoute] = React.useState<string | undefined>();

  return (
    <View style={styles.container}>
      {(currentRoute === 'Registration' || currentRoute === 'Login') && (
        <>
          <View style={styles.videoContainer}>
            <BackgroundVideo />
          </View>

          <View style={styles.overlay} />
        </>
      )}

      <View style={styles.contentContainer}>
        <NavigationContainer
          onStateChange={(state) => {
            const routes = state?.routes;
            const currentRouteName = routes ? routes[routes.length - 1]?.name : undefined;
            setCurrentRoute(currentRouteName);
          }}>
          <Stack.Navigator
            initialRouteName="Registration"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
              animation: 'none',
            }}>
            <Stack.Screen name="Registration" component={Registration} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen
              name="MainTabs"
              component={BottomTabNavigator}
              options={{
                contentStyle: { backgroundColor: '#ffffff' },
                animation: 'fade',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  },
  contentContainer: {
    flex: 1,
    zIndex: 3,
  },
});
