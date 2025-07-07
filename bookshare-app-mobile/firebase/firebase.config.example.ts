// filepath: firebase/firebase.config.example.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'your-api-key-here',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.firebasestorage.app',
  messagingSenderId: 'your-messaging-sender-id',
  appId: 'your-app-id',
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
