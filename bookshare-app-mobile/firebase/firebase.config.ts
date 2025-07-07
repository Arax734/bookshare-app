import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyD2MixUN2ydKc7r1rgrxvj3or7Snqztjlo',
  authDomain: 'bookshare-app-1debf.firebaseapp.com',
  projectId: 'bookshare-app-1debf',
  storageBucket: 'bookshare-app-1debf.firebasestorage.app',
  messagingSenderId: '680412936960',
  appId: '1:680412936960:web:fa3d8887d81e68ec3451e5',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = !getApps().length
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    })
  : getAuth(app);

const storage = getStorage(app);
const db = getFirestore(app);

export { app, auth, storage, db };
